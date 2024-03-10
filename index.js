import proxy from "http-proxy";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { TARGET_DOMAIN_URL, LOCAL_DOMAIN, LOCAL_PROXY_PORT } = process.env;

if (!TARGET_DOMAIN_URL) throw new Error("TARGET_DOMAIN_URL is not defined");
if (!LOCAL_DOMAIN) throw new Error("LOCAL_DOMAIN is not defined");
if (!LOCAL_PROXY_PORT) throw new Error("LOCAL_PROXY_PORT is not defined");

const options = {
  target: TARGET_DOMAIN_URL,
  changeOrigin: true,
  secure: true,
};

// Create a proxy server with custom application logic
const proxyServer = proxy.createServer(options);

proxyServer
  .on("proxyRes", (proxyResponse, request, response) => {
    const setCookie = proxyResponse.headers["set-cookie"];
    if (Array.isArray(setCookie)) {
      proxyResponse.headers["set-cookie"] = setCookie.map((cookie) => {
        return cookie
          .split(";")
          .filter((v) => v.trim().toLowerCase() !== "secure") // any cookie with SameSite=None must also specify Secure
          .map((v) =>
            v.trim().toLowerCase().startsWith("domain")
              ? `Domain=${LOCAL_DOMAIN}`
              : v
          )
          .join("; ");
      });
    }
    const origin = request.headers["origin"];
    if (origin) {
      proxyResponse.headers["access-control-allow-origin"] = origin;
      proxyResponse.headers["access-control-allow-credentials"] = "true";
      proxyResponse.headers["access-control-allow-headers"] = [
        proxyResponse.headers["access-control-allow-headers"],
        "content-type",
        "authorization",
      ].join(", ");
      proxyResponse.headers["access-control-expose-headers"] = [
        proxyResponse.headers["access-control-expose-headers"],
      ].join(", ");
    }

    console.log("proxyRes headers", proxyResponse.headers);
    console.log("proxyRes statusCode", proxyResponse.statusCode);
    console.log("==============================");
  })
  .listen(Number(LOCAL_PROXY_PORT));

console.log(
  `Proxying ${TARGET_DOMAIN_URL} to http://${LOCAL_DOMAIN}:${LOCAL_PROXY_PORT}`
);
