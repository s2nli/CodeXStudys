// Vercel: GET /api/arolinks?url=<page on this same site>  ->  { shortenedUrl }
// Vercel -> Project -> Settings -> Environment Variables:
//   SHORTENER_TOKEN  your LiteShort API token
//   SHORTENER_API    https://liteshort.com/api
module.exports = async (req, res) => {
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  const out = (c, o) => res.status(c).end(JSON.stringify(o));
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const t = new URL(new URL(req.url, "https://" + host).searchParams.get("url") || "");
    if (t.host !== host) return out(400, { error: "bad url" });
    const token = process.env.SHORTENER_TOKEN || process.env.AROLINKS_TOKEN;
    if (!token) return out(500, { error: "token missing" });
    const api = process.env.SHORTENER_API || "https://vplink.in/api";
    const r = await fetch(api + "?api=" + encodeURIComponent(token) + "&url=" + encodeURIComponent(t.href));
    const j = await r.json();
    const s = j && (j.shortenedUrl || j.shortened_url || j.short_url || j.shortUrl);
    return out(200, { shortenedUrl: s || "", status: j && j.status ? j.status : undefined, message: s ? undefined : (j && j.message) || undefined });
  } catch (e) {
    return out(502, { error: "failed" });
  }
};
