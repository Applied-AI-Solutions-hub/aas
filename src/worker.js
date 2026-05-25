function rewriteAssetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

function assetPath(pathname) {
  if (pathname === "/" || pathname === "/index.html") return "/client/index.html";
  if (pathname === "/beacon" || pathname === "/beacon/") return "/client/beacon/index.html";
  if (
    pathname.startsWith("/_astro/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/models/")
  ) {
    return `/client${pathname}`;
  }
  return pathname;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    return env.ASSETS.fetch(rewriteAssetRequest(request, assetPath(url.pathname)));
  },
};
