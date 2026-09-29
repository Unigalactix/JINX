import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, relative, isAbsolute, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain", ".md": "text/plain", ".json": "application/json", ".pdf": "application/pdf", ".epub": "application/epub+zip", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webm": "video/webm", ".vtt": "text/vtt" };
const binary = new Set([".png", ".pdf", ".epub", ".woff", ".woff2", ".ttf", ".webm"]);

export function createPreviewServer(basePath = "/") {
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(basePath)) throw new Error("The base path must be / or a path such as /JINX/.");
  return createServer(async (request, response) => {
    const send = (status, message, headers = {}) => {
      response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff", ...headers });
      response.end(request.method === "HEAD" ? undefined : message);
    };
    if (!["GET", "HEAD"].includes(request.method)) return send(405, "Method not allowed.", { Allow: "GET, HEAD" });
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
    catch (error) {
      if (!(error instanceof URIError || error instanceof TypeError)) throw error;
      return send(400, "Malformed request URL.");
    }
    if (pathname === "/" && basePath !== "/") return send(302, "Open the project path.", { Location: basePath });
    if (!pathname.startsWith(basePath)) return send(404, "Not found.");
    const path = pathname.slice(basePath.length) || "index.html";
    if (!(path === "index.html" || path === "jinxed.html" || path === "SOT.md" || /^assets\/[^/]+\.(?:js|css|svg|png)$/.test(path) || /^assets\/books\/(?:en|te|hi|es|jinxed-te|jinxed-hi|jinxed-es)\.json$/.test(path) || /^assets\/books\/jinx-(?:en|te|hi|es)\.(?:pdf|epub)$/.test(path) || /^assets\/jinxed-videos\/(?:approach|breakup|ring)\.(?:webm|vtt|svg|png)$/.test(path) || /^assets\/fonts\/[A-Za-z0-9_.-]+\.(?:woff2?|ttf|txt)$/.test(path) || /^Story\/[^/]+\/[^/]+\.txt$/.test(path))) {
      return send(404, "Not found.");
    }
    const fullPath = resolve(root, path);
    const localPath = relative(root, fullPath);
    if (localPath.startsWith("..") || isAbsolute(localPath)) return send(403, "Forbidden.");
    try {
      const content = await readFile(fullPath);
      const headers = {
        "Content-Type": mime[extname(path)] + (binary.has(extname(path)) ? "" : "; charset=utf-8"),
        "Content-Length": content.length,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      };
      if (extname(path) === ".webm") {
        headers["Accept-Ranges"] = "bytes";
        if (request.method === "GET" && request.headers.range) {
          const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
          let start = range?.[1] ? Number(range[1]) : 0;
          let end = range?.[2] ? Number(range[2]) : content.length - 1;
          if (range && !range[1] && range[2]) {
            start = Math.max(0, content.length - end);
            end = content.length - 1;
          }
          if (!range || (!range[1] && !range[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
              start > end || start >= content.length) {
            return send(416, "Requested range is not available.", { "Content-Range": `bytes */${content.length}` });
          }
          end = Math.min(end, content.length - 1);
          response.writeHead(206, {
            ...headers, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${content.length}`,
          });
          response.end(content.subarray(start, end + 1));
          return;
        }
      }
      response.writeHead(200, headers);
      response.end(request.method === "HEAD" ? undefined : content);
    } catch (error) {
      if (["ENOENT", "ENOTDIR"].includes(error.code)) return send(404, "Not found.");
      console.error("Preview server could not read a public file:", error);
      return send(500, "Could not read the requested file.");
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const portArgument = process.argv.find((argument) => argument.startsWith("--port="));
  const baseArgument = process.argv.find((argument) => argument.startsWith("--base="));
  const port = portArgument ? Number(portArgument.slice(7)) : 4173;
  const base = baseArgument ? baseArgument.slice(7) : "/";
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Port must be an integer from 0 to 65535.");
  const server = createPreviewServer(base);
  server.on("error", (error) => {
    console.error(`Preview server failed: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`JINX preview: http://127.0.0.1:${server.address().port}${base}`);
  });
}
