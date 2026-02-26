export default async function handler(req, res) {
  try {
    const { location_id, slug, ...query } = req.query;

    if (!location_id || !slug) {
      return res.status(400).json({
        ok: false,
        error: "Missing location_id or slug"
      });
    }

    /* ===================================
       NORMALIZE UTM PARAMETERS
       (Works for Meta + Google)
    =================================== */

/* ===================================
   NORMALIZE UTM PARAMETERS
   Default utm_source = facebook
=================================== */

const utm = {
  utm_source: query.utm_source || "facebook",
  utm_medium: query.utm_medium || null,
  utm_campaign: query.utm_campaign || null,
  utm_adset: query.utm_adset || null,
  utm_ad: query.utm_ad || null,
  fbclid: query.fbclid || null,
  gclid: query.gclid || null,
  landing_page: slug ? slug.toLowerCase() : "form"
};

    /* ===================================
       BUILD DESTINATION URL
    =================================== */

    let finalUrl = null;

    // 🏋️ 8000 — Single Form
    if (location_id === "8000") {
      finalUrl = "https://forms.club-os.com/weblead/activelife";
    }

    // 🏋️ 8003 — Rebirth Transformation
    else if (location_id === "8003") {
      finalUrl = `https://www.rebirthtransformation.com/${slug.toLowerCase()}`;
    }

    else {
      return res.status(400).json({
        ok: false,
        error: "Unknown location_id"
      });
    }

    /* ===================================
       APPEND UTMS TO DESTINATION
    =================================== */

    const cleanParams = Object.entries(utm)
      .filter(([_, value]) => value !== null)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});

    const paramString = new URLSearchParams(cleanParams).toString();

    if (paramString) {
      finalUrl += finalUrl.includes("?")
        ? `&${paramString}`
        : `?${paramString}`;
    }

    /* ===================================
       SEND TO N8N
    =================================== */

    await fetch("https://dashtraq.app.n8n.cloud/webhook-test/redirect-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: "gym_offers",
        location_id,
        slug: slug.toLowerCase(),
        utm,
        timestamp: Date.now()
      })
    });

    return res.redirect(302, finalUrl);

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
