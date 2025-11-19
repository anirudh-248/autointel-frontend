/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude native modules and ONNX runtime from webpack bundling
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle these native modules on the server
      config.externals = config.externals || [];
      config.externals.push({
        "onnxruntime-node": "commonjs onnxruntime-node",
        "@xenova/transformers": "commonjs @xenova/transformers",
      });

      // Ignore .node files (native modules)
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /\.node$/,
        use: "node-loader",
      });

      // Add fallbacks for node modules
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Disable minification for API routes to prevent issues with native modules
  experimental: {
    serverMinification: false,
  },
};

module.exports = nextConfig;
