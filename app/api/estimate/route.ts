import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const schema = {
  type: Type.OBJECT,
  properties: {
    vegetable: { type: Type.STRING },
    count: { type: Type.INTEGER },
    reference_found: { type: Type.BOOLEAN },
    confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
    dimensions_cm: {
      type: Type.OBJECT,
      properties: {
        length: { type: Type.NUMBER },
        width: { type: Type.NUMBER },
        height: { type: Type.NUMBER },
      },
      required: ["length", "width", "height"],
    },
    volume_cm3: { type: Type.NUMBER },
    density_g_cm3: { type: Type.NUMBER },
    weight_g: {
      type: Type.OBJECT,
      properties: { min: { type: Type.NUMBER }, best: { type: Type.NUMBER }, max: { type: Type.NUMBER } },
      required: ["min", "best", "max"],
    },
    notes: { type: Type.STRING },
  },
  required: ["vegetable", "count", "reference_found", "confidence", "dimensions_cm", "volume_cm3", "density_g_cm3", "weight_g", "notes"],
};

const PRIMARY = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK = process.env.GEMINI_FALLBACK_MODEL; // optional second model to try

// Retry busy/overloaded errors (503, 429) with a short wait, then try the fallback model if set.
async function withRetry<T>(fn: (model: string) => Promise<T>): Promise<T> {
  const models = FALLBACK ? [PRIMARY, FALLBACK] : [PRIMARY];
  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fn(model);
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (!/503|429|UNAVAILABLE|overloaded|high demand/i.test(msg)) throw e;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

export async function POST(req: Request) {
  try {
    const { images, reference } = await req.json();
    if (!Array.isArray(images) || images.length === 0 || images.length > 4)
      return NextResponse.json({ error: "Send 1 to 4 photos." }, { status: 400 });

    const multi = images.length > 1;
    const prompt = `You estimate the total weight of vegetables in ${multi ? images.length + " photos" : "a photo"}.
${multi ? "The photos show the SAME vegetable(s) from different angles, in the order given, labeled below. Combine them: take length and width from the top view and height/thickness from the side view, and cross-check sizes across photos. If photos disagree, prefer the one where the reference object is clearest and lower your confidence.\nLabels: " + images.map((i: { label: string }, n: number) => `${n + 1}=${i.label}`).join(", ") : ""}
Reference object for scale: ${reference}. If it is not visible, set reference_found=false, confidence="low", and say so in notes.
Steps: identify the vegetable and count; use the reference object to estimate length, width and height in cm; approximate volume with the closest simple shape (ellipsoid, cylinder, etc.); multiply by typical density for that vegetable (account for hollow ones like bell peppers); return best estimate plus a realistic min/max range in grams for ALL items together. Keep notes to one short sentence.`;

    const result = await withRetry((model) => ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [...images.map((i: { data: string }) => ({ inlineData: { mimeType: "image/jpeg", data: i.data } })), { text: prompt }] }],
      config: {
        responseMimeType: "application/json", responseSchema: schema, temperature: 0.2,
        // skip hidden "thinking": biggest speed win
        maxOutputTokens: 2048,
      },
    }));

    return NextResponse.json(JSON.parse(result.text ?? "{}"));
  } catch (e) {
    console.error(e);
    const detail = e instanceof Error ? e.message : String(e);
    const hint = !process.env.GEMINI_API_KEY ? "GEMINI_API_KEY is missing. Check your .env.local file and restart the app." : "";
    return NextResponse.json({ error: `Estimation failed: ${hint || detail}`.slice(0, 400) }, { status: 500 });
  }
}
