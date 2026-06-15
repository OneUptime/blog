# Validation Summary: How to Build Structured Loggers in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- TypeScript
- Express
- AsyncLocalStorage
- Node.js crypto module
- Structured JSON logging
- Error serialization
- Log sampling
- Sensitive data redaction

## Sources Consulted
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Node.js crypto.randomUUID documentation: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js process documentation: https://nodejs.org/api/process.html
- Express 5.x API documentation: https://expressjs.com/en/api/
- Express Request API documentation: https://expressjs.com/en/5x/api/request/
- TypeScript class documentation: https://www.typescriptlang.org/docs/handbook/2/classes.html
- MDN JSON.stringify documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify

## Issues Found
- The `context-logger.ts` snippet referenced `StructuredLogger` without importing it. Added the missing import.
- The `withContext` helper could overwrite a generated `requestId` with `undefined` if `context.requestId` was explicitly undefined. Moved the generated `requestId` assignment after the context spread.
- The Express middleware snippet used `randomUUID()` without importing it. Added the missing `crypto` import.
- The Express middleware snippet imported `addToContext` but did not use it. Removed the unused import.
- The error logging snippet referenced `ContextAwareLogger` without importing it. Added the missing import.
- The complete setup snippet imported `serializeError`, but the earlier helper was not exported. Exported `serializeError`.
- The complete setup snippet imported `RedactingLogger`, but the class was not exported in the redaction snippet. Exported `RedactingLogger`.
- The complete setup snippet imported `SampledLogger` but did not use it, and it was not exported in the sampling snippet. Replaced that import with the needed `serializeError` import.
- Redaction checked lowercased keys, but the sensitive key set contained camelCase entries such as `apiKey` and `creditCard`, so those exact fields would not be redacted. Normalized those entries to lowercase.
- Additional redaction keys were stored without normalization, so camelCase custom keys such as `internalToken` and `databasePassword` would not match the lowercased lookup. Lowercased additional keys when constructing the set.

## Review Notes
- The core APIs used in the post are current and stable for modern Node.js. `AsyncLocalStorage` is stable and appropriate for request-scoped context propagation.
- The snippets use `JSON.stringify` directly. This is technically valid, but production loggers may need additional handling for circular references, `BigInt`, or other non-serializable values.
- The Express examples are accurate for current Express APIs. Express 5.x requires Node.js 18 or higher.
