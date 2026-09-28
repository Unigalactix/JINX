import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, relative, isAbsolute, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".txt": "text/plain", ".md": "text/plain" };

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
    if (!(path === "index.html" || path === "SOT.md" || /^assets\/[^/]+\.(?:js|css|svg)$/.test(path) || /^Story\/[^/]+\/[^/]+\.txt$/.test(path))) {
      return send(404, "Not found.");
    }
    const fullPath = resolve(root, path);
    const localPath = relative(root, fullPath);
    if (localPath.startsWith("..") || isAbsolute(localPath)) return send(403, "Forbidden.");
    try {
      const content = await readFile(fullPath);
      response.writeHead(200, {
        "Content-Type": `${mime[extname(path)]}; charset=utf-8`,
        "Content-Length": content.length,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      });
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
