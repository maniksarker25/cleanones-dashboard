import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { targetApi } from "@/utils/baseUrl";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Defaults to true, which makes the service worker run location.reload() on every
  // browser "online" event. A flaky LAN/Wi-Fi fires that repeatedly, so the same page
  // gets re-requested over and over. We never want an automatic full reload.
  reloadOnOnline: false,
});


const nextConfig: NextConfig = {
  // Lets a dev server run alongside `next start` without overwriting its build output.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: {},
  experimental: {
    // Next defaults dynamic routes to 0s, so every Link hover re-prefetches the
    // same route and the server logs the same GET over and over. Reuse instead.
    staleTimes: { dynamic: 30, static: 180 },
  },
  allowedDevOrigins: ["https://cleanones.vercel.app", "http://cleanones.vercel.app", "https://cleanones-client-portal.vercel.app", "https://cleanones-dashboard.vercel.app","10.10.28.196"],
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${targetApi}/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
