# PageSpeed Compare

Analizador con dos modos usando Google PageSpeed Insights API.

- Modo normal: analiza una sola URL.
- Modo comparar: evalua URL A vs URL B.

Stack:

- React + TypeScript + Vite
- TailwindCSS
- Recharts
- Proxy serverless en Vercel (`/api/pagespeed`)

## 1) Configurar API Key (server-side)

1. Crea una API key en Google Cloud para PageSpeed Insights API.
2. Copia `.env.example` a `.env` y coloca tu llave:

```bash
PAGESPEED_API_KEY=tu_api_key
```

Nota: la key se usa en el endpoint server-side y no se expone en el bundle del frontend.

## 2) Desarrollo local

```bash
npm install
npm run dev
```

## 3) Build de produccion

```bash
npm run build
npm run preview
```

## 4) Deploy en Vercel (un comando)

Con Vercel CLI:

```bash
npx vercel --prod
```

Durante el setup en Vercel, agrega la variable de entorno `PAGESPEED_API_KEY`.
