// Vercel Serverless Function
// Recibe { action: "status" | "toggle" } desde el Kindle
// y llama a la Tuya Cloud API usando credenciales guardadas
// como variables de entorno en Vercel (nunca expuestas al cliente).
//
// Variables de entorno necesarias en el proyecto de Vercel:
//   TUYA_ACCESS_ID
//   TUYA_ACCESS_SECRET
//   TUYA_DEVICE_ID
//   TUYA_BASE_URL   (ej: https://openapi.tuyaus.com para Western America)

const crypto = require("crypto");

const ACCESS_ID = process.env.TUYA_ACCESS_ID;
const ACCESS_SECRET = process.env.TUYA_ACCESS_SECRET;
const DEVICE_ID = process.env.TUYA_DEVICE_ID;
const BASE_URL = process.env.TUYA_BASE_URL || "https://openapi.tuyaus.com";

function sha256Hex(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

function hmacSha256Upper(str, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(str, "utf8")
    .digest("hex")
    .toUpperCase();
}

async function getToken() {
  const t = Date.now().toString();
  const method = "GET";
  const urlPath = "/v1.0/token?grant_type=1";
  const contentSha256 = sha256Hex("");
  const stringToSign = `${method}\n${contentSha256}\n\n${urlPath}`;
  const signStr = ACCESS_ID + t + stringToSign;
  const signature = hmacSha256Upper(signStr, ACCESS_SECRET);

  const res = await fetch(BASE_URL + urlPath, {
    method: "GET",
    headers: {
      client_id: ACCESS_ID,
      sign: signature,
      t: t,
      sign_method: "HMAC-SHA256",
    },
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error("token: " + (data.msg || JSON.stringify(data)));
  }
  return data.result.access_token;
}

async function callApi(method, urlPath, token, bodyObj) {
  const t = Date.now().toString();
  const body = bodyObj ? JSON.stringify(bodyObj) : "";
  const contentSha256 = sha256Hex(body);
  const stringToSign = `${method}\n${contentSha256}\n\n${urlPath}`;
  const signStr = ACCESS_ID + token + t + stringToSign;
  const signature = hmacSha256Upper(signStr, ACCESS_SECRET);

  const headers = {
    client_id: ACCESS_ID,
    access_token: token,
    sign: signature,
    t: t,
    sign_method: "HMAC-SHA256",
  };
  const opts = { method, headers };
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    opts.body = body;
  }

  const res = await fetch(BASE_URL + urlPath, opts);
  return res.json();
}

async function getSwitchState(token) {
  const data = await callApi(
    "GET",
    `/v1.0/devices/${DEVICE_ID}/status`,
    token
  );
  if (!data.success) {
    throw new Error("status: " + (data.msg || JSON.stringify(data)));
  }
  const item = data.result.find((d) => d.code === "switch_1");
  return !!(item && item.value);
}

async function setSwitch(token, on) {
  const data = await callApi(
    "POST",
    `/v1.0/devices/${DEVICE_ID}/commands`,
    token,
    { commands: [{ code: "switch_1", value: on }] }
  );
  if (!data.success) {
    throw new Error("commands: " + (data.msg || JSON.stringify(data)));
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  if (!ACCESS_ID || !ACCESS_SECRET || !DEVICE_ID) {
    res.status(500).json({
      error:
        "faltan variables de entorno TUYA_ACCESS_ID / TUYA_ACCESS_SECRET / TUYA_DEVICE_ID",
    });
    return;
  }

  try {
    const { action } = req.body || {};
    const token = await getToken();

    if (action === "status") {
      const on = await getSwitchState(token);
      res.status(200).json({ on });
      return;
    }

    if (action === "toggle") {
      const current = await getSwitchState(token);
      const next = !current;
      await setSwitch(token, next);
      res.status(200).json({ on: next });
      return;
    }

    res.status(400).json({ error: "acción inválida" });
  } catch (err) {
    res.status(502).json({ error: err.message || "error desconocido" });
  }
};
