export const targetApi = (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://10.10.28.196:8080").replace(/\/$/, "");

/**
 * Base URL for API calls.
 *
 * In the browser we go through the same-origin rewrite (`/api/proxy` in next.config)
 * instead of the absolute API URL. The deployed site is served over HTTPS while the API
 * is plain HTTP, and browsers block that as mixed content. On the server there is no such
 * restriction, so the API is called directly.
 */
export const apiBase = () => (typeof window !== "undefined" ? "/api/proxy" : targetApi);

export const imgUrl = (url: string | null | undefined) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${apiBase()}${url.startsWith("/") ? "" : "/"}${url}`;
};
