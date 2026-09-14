# Validation Summary: Tune Sentry Error and Trace Sampling While Preserving Rare Failures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Sentry JavaScript SDK
- Sentry Node.js SDK (`@sentry/node`)
- Error-event sampling
- Distributed tracing and head-based trace sampling
- JavaScript

## Sources Consulted
- [Sentry JavaScript sampling configuration](https://docs.sentry.io/platforms/javascript/configuration/sampling/)
- [Sentry JavaScript SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Sentry JavaScript data filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
- [Official Sentry JavaScript SDK migration guide](https://github.com/getsentry/sentry-javascript/blob/develop/MIGRATION.md)

## Issues Found
- The post described `beforeSendTransaction` as an active processing hook without a current-version caveat. In Sentry JavaScript SDK versions 9 and 10 it processes only recorded transactions and cannot recover unsampled trace history. In version 11's default span-streaming mode it is a no-op because transaction events are no longer produced. The text now states both behaviors and directs version 11 users to span-processing options.

## Review Notes
- The `inheritOrSampleWith` example requires Sentry JavaScript SDK version 9 or later, as the post states.
- `sampleRate: 1` disables SDK-side random error sampling but does not guarantee delivery through filters, quotas, rate limits, transport failures, or abrupt process termination; the post correctly preserves this caveat.
- The probability calculation for independently retained error occurrences is correct: at `p = 0.1` and `n = 5`, the miss probability is `0.9^5`, approximately 59%.
