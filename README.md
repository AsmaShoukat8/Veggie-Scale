# Veggie Scale

Next.js + Gemini API app that estimates vegetable weight from a photo.

## Run
1. `npm install`
2. `cp .env.example .env.local` and add your key from https://aistudio.google.com/apikey
3. `npm run dev` and open http://localhost:3000 (use your phone on the same network for the camera)

## Notes
- The API key stays server-side in `app/api/estimate/route.ts`.
- Accuracy depends on the reference object being flat, visible and near the vegetable.
- Model is set to `gemini-2.5-flash`; swap it in the route file if you want a stronger one.

## UI theme
Pixel-veggie sticker look. Files: `app/sprites.tsx` (12×12 pixel sprites + icons, edit the character grids to redraw),
`app/motion.ts` (spring physics → CSS `linear()` easings), `app/globals.css` (tokens on an 8pt grid, glass, shadows).
The display font (Pixelify Sans) loads through `next/font/google`, so the first `npm run dev` / `build` needs internet.
