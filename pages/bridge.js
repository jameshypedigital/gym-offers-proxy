export default function BridgePage() {
  return null;
}

export async function getServerSideProps(context) {
  try {
    const {
      lpurl,
      slug,
      location_id,
      offer,
      club,

      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      utm_adgroup,
      utm_adid,

      gclid,

      ...otherParams
    } = context.query;

    // -----------------------------------------
    // CLEAN QUERY VALUES
    // -----------------------------------------
    const cleanValue = (value) => {
      if (Array.isArray(value)) {
        return value[0] || null;
      }

      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return null;
      }

      return String(value);
    };

    const finalLpurl = cleanValue(lpurl);
    const finalSlug = cleanValue(slug);
    const finalLocationId = cleanValue(location_id);
    const finalOffer = cleanValue(offer);
    const finalClub = cleanValue(club);

    // =====================================================
    // GOOGLE MODE
    // =====================================================

    if (finalLpurl) {

      // Validate Google's final destination
      try {
        const destination = new URL(finalLpurl);

        if (
          destination.protocol !== "https:" &&
          destination.protocol !== "http:"
        ) {
          throw new Error("Invalid lpurl protocol");
        }

      } catch (err) {

        console.error("Invalid lpurl:", finalLpurl);

        return {
          notFound: true
        };
      }

      // -----------------------------------------
      // BUILD GOOGLE TRACKING PAYLOAD
      // -----------------------------------------

      const trackingPayload = {
        source: "google",

        slug: finalSlug,
        landing_page: finalSlug,

        location_id: finalLocationId,

        offer: finalOffer,
        club: finalClub,

        lpurl: finalLpurl,

        utm_source: cleanValue(utm_source),
        utm_medium: cleanValue(utm_medium),
        utm_campaign: cleanValue(utm_campaign),
        utm_content: cleanValue(utm_content),
        utm_term: cleanValue(utm_term),
        utm_adgroup: cleanValue(utm_adgroup),
        utm_adid: cleanValue(utm_adid),

        gclid: cleanValue(gclid),

        other_params: otherParams,

        timestamp: Date.now()
      };

      // -----------------------------------------
      // SEND TO N8N
      // -----------------------------------------

      try {

        const response = await fetch(
          "https://dashtraq.app.n8n.cloud/webhook/redirect-track",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(trackingPayload)
          }
        );

        if (!response.ok) {
          console.error(
            "n8n returned status:",
            response.status
          );
        }

      } catch (trackingError) {

        // Tracking failure should NEVER block the customer
        console.error(
          "Google tracking failed:",
          trackingError
        );
      }

      // -----------------------------------------
      // GOOGLE TRANSPARENT REDIRECT
      // -----------------------------------------

      return {
        redirect: {
          destination: finalLpurl,
          permanent: false
        }
      };
    }

    // =====================================================
    // FALLBACK MODE
    // Allows /bridge to work without Google lpurl
    // =====================================================

    const locationId = finalClub || finalLocationId;

    if (!finalSlug || !locationId) {

      return {
        notFound: true
      };
    }

    const cleanSlug = finalSlug
      .trim()
      .toLowerCase();

    // -----------------------------------------
    // TRACK FALLBACK
    // -----------------------------------------

    try {

      await fetch(
        "https://dashtraq.app.n8n.cloud/webhook/redirect-track",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            source: "gym-offers-bridge",

            slug: cleanSlug,
            landing_page: cleanSlug,

            location_id: locationId,
            club: locationId,

            offer: finalOffer,

            utm_source: cleanValue(utm_source),
            utm_medium: cleanValue(utm_medium),
            utm_campaign: cleanValue(utm_campaign),
            utm_content: cleanValue(utm_content),
            utm_term: cleanValue(utm_term),
            utm_adgroup: cleanValue(utm_adgroup),
            utm_adid: cleanValue(utm_adid),

            gclid: cleanValue(gclid),

            other_params: otherParams,

            timestamp: Date.now()
          })
        }
      );

    } catch (trackingError) {

      console.error(
        "Fallback tracking failed:",
        trackingError
      );
    }

    // -----------------------------------------
    // GYM-OFFERS FALLBACK DESTINATION
    //
    // If you already have different slug routing
    // in /api/redirect, we can duplicate that here.
    // -----------------------------------------

    const finalUrl =
      `https://www.anytimefitness.com/offer/local/${cleanSlug}?club=${locationId}`;

    return {
      redirect: {
        destination: finalUrl,
        permanent: false
      }
    };

  } catch (err) {

    console.error("Bridge fatal error:", err);

    return {
      notFound: true
    };
  }
}
