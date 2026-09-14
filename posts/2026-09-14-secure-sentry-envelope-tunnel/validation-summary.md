# Validation Summary: How to Proxy Sentry Envelopes Through a Secure Tunnel Without Creating an Open Relay

## Status
validated

## Post Type
Security-focused technical guide

## Technologies Covered
- Sentry JavaScript browser SDK 10.74.0
- Sentry envelope ingestion protocol
- JavaScript Web `Request`, `Response`, Streams, Fetch, and Encoding APIs
- HTTP proxy security, origin checks, request limits, redirects, and rate limiting

## Sources Consulted
- [Sentry JavaScript tunnel configuration](https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option)
- [Sentry JavaScript SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/#tunnel)
- [Sentry envelope data model](https://develop.sentry.dev/sdk/foundations/envelopes/)
- [Sentry SDK rate-limiting requirements](https://develop.sentry.dev/sdk/foundations/transport/rate-limiting/)
- [Sentry JavaScript 10.74.0 envelope implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/utils/envelope.ts)
- [Sentry JavaScript 10.74.0 rate-limit implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/utils/ratelimit.ts)
- [Sentry JavaScript 10.74.0 base transport implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/transports/base.ts)
- [MDN: `AbortSignal.timeout()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static)
- [Fetch Standard](https://fetch.spec.whatwg.org/)

## Issues Found
- The post said that returning success unconditionally creates unnecessary retry traffic. Sentry JavaScript 10.74.0 does not retry a rejected envelope in this path; it records response rate limits and suppresses later sends in affected categories. Changed the wording to “unnecessary continued traffic during rate-limit windows” so it accurately describes the consequence of hiding `429` and rate-limit headers.

## Review Notes
- The handler deliberately targets Web API-compatible server runtimes; framework-specific adapters may differ in raw-body handling and support for `AbortSignal.timeout()`.
- The pinned Sentry 10.74.0 source links are valid and substantiate the binary envelope serialization and rate-limit behavior discussed in the post.
