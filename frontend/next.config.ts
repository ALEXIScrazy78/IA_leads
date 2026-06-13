import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En las versiones más recientes va en la raíz del objeto, no en experimental
  allowedDevOrigins: ['192.168.176.1', 'localhost:3000'],
};

export default nextConfig;