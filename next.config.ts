import type { NextConfig } from "next";
import dns from "node:dns";

// Fix IPv6 fetch timeouts for Google APIs and Groq (common issue with some ISPs)
dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
