# Validation Summary: How to Create Event Transformation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Event-driven architecture
- Event transformation pipelines
- TypeScript
- JavaScript Date API
- Schema evolution
- Dead letter queues
- Exponential backoff retry logic
- Avro and Protocol Buffers concepts

## Sources Consulted
- TypeScript TSConfig documentation: `useUnknownInCatchVariables` - https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html
- TypeScript 4.4 release notes: using `unknown` in catch variables - https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html
- TypeScript Handbook: narrowing and type guards - https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- MDN Web Docs: `Date.prototype.getTime()` - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTime
- MDN Web Docs: `Promise` - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
- Google Cloud Pub/Sub documentation: dead-letter topics - https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub documentation: subscription retry policy and exponential backoff - https://cloud.google.com/pubsub/docs/subscription-retry-policy

## Issues Found
- The type-conversion example said a string timestamp was converted to "Unix epoch", while the TypeScript code uses `Date#getTime()`, which returns milliseconds since the Unix epoch. Changed the wording to "epoch milliseconds."
- The TypeScript examples referenced `CustomerService` without defining its shape. Added a minimal `CustomerService` interface so the transformation example is type-checkable.
- The pipeline error handler accessed `error.message` directly from a `catch` variable. In modern strict TypeScript, catch variables are `unknown`; changed the code to narrow with `error instanceof Error` before reading the message.
- The retry snippet assigned a `catch` variable directly to an `Error` variable and passed it to a function typed as `Error`. Changed the retry code to carry `unknown` errors and narrow them inside `isRetryableError`.
- The retry snippet used `sleep(delay)` without defining `sleep`. Added a small Promise-based helper.

## Review Notes
The extracted TypeScript snippets were checked with `npx tsc --noEmit --strict --target ES2020 --skipLibCheck` after the fixes. The first compiler run without `--skipLibCheck` was blocked by this repository's ambient Node type resolution for `undici-types`, not by the blog examples.
