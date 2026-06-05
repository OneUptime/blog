# Validation Summary: How to Trace Next.js Server Components and API Routes with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Next.js App Router
- React Server Components
- Next.js Route Handlers
- Next.js Server Actions
- OpenTelemetry JavaScript API
- `@vercel/otel`
- Prisma OpenTelemetry instrumentation
- TypeScript

## Sources Consulted
- Next.js instrumentation file convention: https://nextjs.org/docs/pages/guides/instrumentation
- Next.js `page.js` file convention and async `params`: https://nextjs.org/docs/app/api-reference/file-conventions/page
- Next.js `route.js` file convention, HTTP methods, and async `context.params`: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Server Actions and mutations: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- Next.js `revalidatePath` API: https://nextjs.org/docs/app/api-reference/functions/revalidatePath
- Vercel OpenTelemetry instrumentation docs: https://vercel.com/docs/tracing/instrumentation
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- Prisma OpenTelemetry tracing docs: https://www.prisma.io/docs/concepts/components/prisma-client/opentelemetry-tracing
- `@vercel/otel` package type definitions from npm package `@vercel/otel@2.1.2`

## Issues Found
- The post stated that the Next.js instrumentation hook must be enabled in `next.config.js`. Current Next.js detects `instrumentation.ts` automatically, while the `experimental.instrumentationHook` setting is only relevant for older Next.js versions. Updated the text to make the config snippet a Next.js 14-or-earlier caveat and added the documented placement guidance for root vs `src`.
- The post used synchronous `params` typing in App Router pages and route handlers. Current Next.js types `params` and `context.params` as promises. Updated dynamic page and route handler examples to type `params` as `Promise<...>` and `await` the values.
- One comment claimed data fetching was parallel "by default in Next.js" in an example that explicitly used `Promise.all`. Updated the explanation to say the requests are parallel because they are started together and awaited with `Promise.all`.
- The post used numeric OpenTelemetry span status codes. Replaced these with the official `SpanStatusCode` enum for clearer, current TypeScript examples.
- The Prisma auto-instrumentation snippet passed `@prisma/instrumentation` configuration through `getNodeAutoInstrumentations`, which is not the documented Prisma registration pattern and did not match the `@vercel/otel` instrumentation option shape. Replaced it with `PrismaInstrumentation`, loaded only in the Node.js runtime, while preserving default `@vercel/otel` instrumentation with `auto`.
- The Prisma explanation overstated that every query span would show SQL, execution time, and affected rows. Updated it to align with Prisma's documented operation-level tracing spans.
- The serialization section described Next.js as serializing Server Component props directly to the client. Updated the wording to refer to the React Server Component payload and the requirement that data passed to Client Components be serializable.
- The post referred to App Router `app/api` examples as API Routes. Updated the relevant explanatory text to call them App Router route handlers while preserving the blog's broader title and structure.

## Review Notes
- Several manual span examples end spans directly inside async callbacks rather than using nested `try/finally` blocks. They are acceptable as illustrative happy-path examples, but production code should usually end every span in `finally` so thrown errors do not leave spans open.
- The `Buffer.byteLength` serialization-size example assumes the default Node.js runtime. It should be adjusted if the page is explicitly configured for the Edge runtime.
