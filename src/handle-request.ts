const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === "string" ? k === key : k.test(key)))) {
      const value = headers.get(key);
      if (typeof value === "string") {
        picked.set(key, value);
      }
    }
  }
  return picked;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

export default async function handleRequest(req: Request & { nextUrl?: URL }) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS,
    });
  }

  const { pathname, search } = req.nextUrl ? req.nextUrl : new URL(req.url);

  // 如果 URL 包含 "static"，直接返回本地文件内容
  if (pathname.includes("static")) {
    const filePath = `.${decodeURIComponent(pathname)}`; // 将 pathname 转换为本地文件路径
    try {
      const fileContent = await fs.readFile(filePath);  // 读取文件
      return new Response(fileContent, {  // 返回文件内容
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=86400",  // 设置缓存时间一天
        },
      });
    } catch (err) {  // 文件不存在或读取错误时，返回 404 响应
      return new Response("File not found", { status: 404 });
    }
  }
  
  const url = new URL(pathname + search, "https://api.openai.com").href;
  const headers = pickHeaders(req.headers, ["content-type", "authorization"]);

  const res = await fetch(url, {
    body: req.body,
    method: req.method,
    headers,
  });

  const resHeaders = {
    ...CORS_HEADERS,
    ...Object.fromEntries(
      pickHeaders(res.headers, ["content-type", /^x-ratelimit-/, /^openai-/])
    ),
  };

  return new Response(res.body, {
    headers: resHeaders,
  });
}
