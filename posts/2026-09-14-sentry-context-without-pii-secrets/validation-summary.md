# Validation Summary: How to Add User, Request, and Business Context to Sentry Without Leaking PII or Secrets

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Sentry JavaScript SDK 10.74.0
- Sentry Node.js SDK
- JavaScript and Node.js
- Privacy-safe observability and telemetry filtering
- Asynchronous request and background-job context isolation

## Sources Consulted
- [Sentry JavaScript SDK configuration options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Sentry Node.js async context documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/async-context/)
- [Sentry Node.js sensitive-data documentation](https://docs.sentry.io/platforms/javascript/guides/node/data-management/sensitive-data/)
- [Sentry JavaScript SDK 10.74.0 `DataCollection` type definition](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/types/datacollection.ts)
- [Sentry JavaScript SDK 10.74.0 client option definitions](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/types/options.ts)
- [Sentry JavaScript SDK 10.74.0 data-collection option resolver](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/utils/data-collection/resolveDataCollectionOptions.ts)
- [Sentry JavaScript SDK 10.57.0 `DataCollection` type definition](https://github.com/getsentry/sentry-javascript/blob/10.57.0/packages/core/src/types/datacollection.ts)

## Issues Found
- The SDK 10.74.0 configuration example included `queues: false`, but `queues` is not a field in that version's `DataCollection` type. Removed the unsupported property so the example matches the documented, versioned API and passes TypeScript option-shape validation.

## Review Notes
- The post correctly warns that explicitly providing `dataCollection` in SDK 10.74.0 activates the option's permissive defaults for omitted categories; the example explicitly disables all supported categories that it discusses.
- `sendDefaultPii` is deprecated in SDK 10.74.0, and manually attached data such as `setUser` is outside that automatic-collection control.
- The `withIsolationScope`, `setTag`, `setContext`, `captureException`, and `setUser(null)` usages are consistent with the Sentry JavaScript SDK APIs. The warning about avoiding duplicate exception capture is appropriate.
- `beforeSend`, `beforeSendSpan`, and `beforeSendLog` are distinct hooks in the reviewed SDK. The post correctly cautions that filtering one telemetry type does not sanitize every telemetry surface.
