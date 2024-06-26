const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");
var { decrypt } = require("../utils/encryption");

require("dotenv").config();

const proxyHandler = async (req, res) => {
  const { endpoint } = req.params;
  const { endpointRecord } = req;

  if (endpointRecord.url.endsWith("/")) {
    endpointRecord.url = endpointRecord.url.slice(0, -1);
  }

  const proxy = createProxyMiddleware({
    target:
      endpointRecord.url +
      req.originalUrl.replace(`/${endpoint}`, ""),
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req, res) => {
        proxyReq.path = proxyReq.path.replace(req.url, "");
        endpointRecord.injections.forEach((injection) => {
          if (injection.type.toLowerCase() == "header") {
            proxyReq.setHeader(
              injection.key,
              decrypt(injection.value, process.env.KEY_ENCRYPTION_SECRET)
            );
          } else if (injection.type.toLowerCase() == "query") {
            const url = new URL(proxyReq.path, endpointRecord.url);
            url.searchParams.set(
              injection.key,
              decrypt(injection.value, process.env.KEY_ENCRYPTION_SECRET)
            );
            proxyReq.path = `${url.pathname}?${url.searchParams}`;
          }
        });
        proxyReq.method = req.method;
        fixRequestBody(proxyReq, req);
      },
      proxyRes: (proxyRes, req, res) => {
        res.statusCode = proxyRes.statusCode;
      },
    },
  });

  res.setHeader("Proxy-Status", 200);
  proxy(req, res);
};

module.exports = {
  proxyHandler,
};
