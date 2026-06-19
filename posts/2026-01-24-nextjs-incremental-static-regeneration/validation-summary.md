# Validation Summary: How to Handle Incremental Static Regeneration (ISR)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js App Router
- Next.js Pages Router
- Incremental Static Regeneration (ISR)
- Time-based and on-demand revalidation
- Cache tags
- TypeScript

## Sources Consulted
- Next.js App Router ISR guide: https://nextjs.org/docs/app/guides/incremental-static-regeneration
- Next.js Pages Router ISR guide: https://nextjs.org/docs/pages/guides/incremental-static-regeneration
- Next.js `generateStaticParams` API reference: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- Next.js `dynamicParams` route segment config reference: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/dynamicParams
- Next.js `getStaticPaths` API reference: https://nextjs.org/docs/pages/api-reference/functions/get-static-paths
- Next.js `getStaticProps` API reference: https://nextjs.org/docs/pages/api-reference/functions/get-static-props
- Next.js `notFound` API reference: https://nextjs.org/docs/app/api-reference/functions/not-found
- Next.js `revalidatePath` API reference: https://nextjs.org/docs/app/api-reference/functions/revalidatePath
- Next.js `revalidateTag` API reference: https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- Next.js Edge Runtime reference: https://nextjs.org/docs/app/api-reference/edge

## Issues Found
- App Router examples used a local `notFound()` implementation that threw a generic error. Replaced those with `import { notFound } from 'next/navigation'`, matching the official API that throws Next.js's 404 control-flow error and renders the route segment's not-found UI.
- The App Router on-demand revalidation example used deprecated `revalidateTag(tag)` single-argument syntax. Updated it to `revalidateTag(tag, 'max')`, which is the recommended stale-while-revalidate form in current Next.js docs.
- The error handling example caught the `notFound()` control flow and would have rendered a generic error UI for missing posts. Moved the null check outside the `try/catch` so 404s remain 404s while API failures still render the fallback error UI.
- The monitoring example called an async tracking function without awaiting it. Updated the example to `await trackISRRegeneration(...)` so the monitoring request is actually scheduled as part of the server render.
- Clarified wording around `revalidate: 0` and on-demand revalidation to avoid implying ISR is used for real-time data or that every on-demand invalidation regenerates content immediately.
- Adjusted the summary table label from "Fallback UI" to "Loading/fallback UI" because App Router uses `loading.tsx` for loading UI, while Pages Router has `router.isFallback`.

## Review Notes
The reviewed code follows the current documented Next.js behavior for the App Router and Pages Router. One version caveat: current Next.js docs list `revalidate` route segment config as part of the previous caching model, and note that it is removed when Cache Components are enabled in Next.js 16.
