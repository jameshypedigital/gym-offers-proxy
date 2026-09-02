export default function BridgePage() {
  return null;
}

export async function getServerSideProps(context) {
  try {
    const {
      lpurl,
      location_id,
      slug,
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

    // ===================================
    // CLEAN QUERY VALUES
    // ===================================

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
    const finalLocationId = cleanValue(location_id);
    const finalSlug = cleanValue(slug);

    // ===================================
    // REQUIRE GOOGLE TRANSPARENT URL
    // ===================================

    if (!finalLpurl) {
      console.error("Missing lpurl");

      return {
        notFound: true
      };
    }

    // ===================================
    // VALIDATE LPURL
    // ===================================

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

    // ===================================
    // NORMALIZE GOOGLE ATTRIBUTION
    // ===================================

    const utm = {
      utm_source: cleanValue(utm_source) || "google",
      utm_medium: cleanValue(utm_medium) || "cpc",
      utm_campaign: cleanValue(utm_campaign),
      utm_content: cleanValue(utm_content),
      utm_term: cleanValue(utm_term),
      utm_adgroup: cleanValue(utm_adgroup),
      utm_adid: cleanValue(utm_adid),
      gclid: cleanValue(gclid),
      landing_page: finalSlug
    };

    // ===================================
    // SEND TO N8N
    // Same basic payload structure as redirect.js
    // ===================================

    try {
      const response = await fetch(
        "https://dashtraq.app.n8n.cloud/webhook/redirect-track",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            club: finalLocationId,
            slug: finalSlug,
            utm: utm,

            // Google transparency information
            lpurl: finalLpurl,
            source: "google",

            other_params: otherParams,
            timestamp: Date.now()
          })
        }
      );

      if (!response.ok) {
        console.error(
          "n8n tracking returned status:",
          response.status
        );
      }
    } catch (trackingError) {
      // Tracking failure should not prevent the redirect
      console.error(
        "Google tracking failed:",
        trackingError
      );
    }

    // ===================================
    // GOOGLE TRANSPARENT REDIRECT
    //
    // IMPORTANT:
    // Do NOT construct destination from slug.
    // lpurl is the authoritative destination.
    // ===================================

    return {
      redirect: {
        destination: finalLpurl,
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
