import { API_BASE_URL } from "./../src/api/nurseries";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path, ...queryParams } = req.query;

  // Reconstruct the API path
  const apiPath = Array.isArray(path) ? path.join("/") : path || "";

  // Backend server URL
  const backendUrl = API_BASE_URL;

  // Reconstruct query string without 'path' parameter
  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value) {
      params.append(key, value);
    }
  });

  const queryString = params.toString();
  const fullUrl = `${backendUrl}/api/${apiPath}${
    queryString ? `?${queryString}` : ""
  }`;

  console.log("Proxying request to:", fullUrl);

  try {
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : undefined,
    });

    const data = await response.json();

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Headers", "*");

    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res
      .status(500)
      .json({ error: "Proxy request failed", details: String(error) });
  }
}
