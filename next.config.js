/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse references a test fixture file path at module load; mark as external for server bundles
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({ 'pdf-parse': 'commonjs pdf-parse' });
    }
    return config;
  },
};
module.exports = nextConfig;
