# Tune Sentry Error and Trace Sampling While Preserving Rare Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, Sampling, Distributed Tracing, Error Tracking, Observability

Description: Tune Sentry error and trace sampling independently, preserve rare error reports, and understand the limits of head-based trace sampling.

---

Reducing tracing volume should not require randomly discarding rare errors. Sentry's JavaScript SDK has separate controls for error events and traces. Keeping all error events while sampling ordinary traces is a practical starting point for services whose failures matter more than complete request histories.

There is a limit to the title's promise: preserving an error report does not guarantee preserving its entire trace. A trace sampling decision made when work starts cannot know that the request will fail later. Nor can SDK settings prevent loss caused by quotas, filters, network failures, or process termination.

## Separate the two budgets

`sampleRate` controls random error-event sampling and defaults to `1`. `tracesSampleRate` controls the fraction of transactions selected for tracing. `tracesSampler` provides a function for contextual trace decisions. Sentry documents these separately in its [JavaScript sampling guide](https://docs.sentry.io/platforms/javascript/configuration/sampling/).

A simple Node configuration is:

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sampleRate: 1.0,
  tracesSampleRate: 0.05,
});
```

This expresses an SDK policy of retaining error reports and sampling about five percent of root traces under ordinary conditions. Distributed parent decisions and other configured processing still matter. For browser applications, follow the platform setup for browser tracing as well; configuring a rate does not replace the relevant instrumentation.

Do not set `sampleRate: 0.05` expecting it to reduce only successful requests. That setting samples error events, including failures that occur only once.

## Quantify what random error sampling can miss

If an error occurs `n` times and each event is retained independently with probability `p`, the probability of missing every occurrence is:

```text
P(no retained occurrence) = (1 - p)^n
```

At a ten-percent error sample rate, a one-off failure has a ninety-percent chance of being missed. Even an error occurring five times has roughly a fifty-nine-percent chance of leaving no retained example.

This calculation is an illustrative model, not a claim about every server-side sampling mechanism. It explains why blanket error sampling is a poor first response when the goal is to detect rare failures. Begin by removing known noise with narrow filters and understanding high-volume sources.

## Give important root operations a larger trace sample

For modern JavaScript SDKs, `inheritOrSampleWith` lets a sampler respect an incoming sampling decision and choose a fallback for a new root trace. It was introduced in SDK version 9. Use it when end-to-end trace consistency matters. See [Sentry's sampling-context documentation](https://docs.sentry.io/platforms/javascript/configuration/sampling/).

```javascript
export function chooseTraceRate({ name, inheritOrSampleWith }) {
  const fallback = name === "checkout.submit" ? 1.0 : 0.05;
  return inheritOrSampleWith(fallback);
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sampleRate: 1.0,
  tracesSampler: chooseTraceRate,
});
```

The operation name in this example is an application-defined root span name. Inspect actual names supplied to the sampler; automatic framework instrumentation may begin before a final route template is available. Use values available at span creation rather than attributes added after the operation finishes.

An incoming unsampled checkout trace remains unsampled in this policy. If you deliberately override that decision, you may collect a local segment without the upstream history. Make that tradeoff explicit and configure the root of the distributed operation where possible.

Keep the decision stable and understandable. A small table of operation classes and fallback rates is easier to maintain than dozens of broad substring rules. Do not put customer identifiers or raw request bodies into sampling predicates.

## Do not try to resurrect a trace after an error

Calling `captureException` records the error independently; it does not reconstruct spans that were never recorded. In SDK versions 9 and 10, `beforeSendTransaction` only processes transactions that reach that stage, so it cannot recover unsampled history. In version 11's default span-streaming mode, it is a no-op because the SDK no longer produces transaction events; use the version 11 span-processing options for recorded spans instead. Sentry documents the relevant [SDK event and tracing options](https://docs.sentry.io/platforms/javascript/configuration/options/).

If a workflow requires every failing request's complete history, evaluate that requirement separately. You may need to retain a larger sample at the root, preserve selected important operations, or use an observability architecture that supports an appropriate tail-sampling workflow. Do not claim that a late error callback makes ordinary head sampling failure-aware.

Preserve useful safe error context even when its trace is absent: operation name, deployment release, retry attempt, dependency classification, and a diagnostic correlation ID can still make a standalone error actionable.

## Filter known noise carefully

A narrowly defined expected exception can be dropped with `beforeSend`, while unknown failures continue through. Keep the filter based on a stable application classification instead of matching arbitrary user-controlled error text.

Filters deserve review whenever a dependency or error class changes. An overly broad rule can hide a new failure that happens to share an old message. Keep a count of deliberately dropped classes using a suitable independent metric, and periodically compare those counts with application behavior.

Server quotas and rate limits can also drop events. A configuration with `sampleRate: 1` means the SDK does not randomly sample errors; it does not reserve ingest capacity for them. Monitor your actual accepted and discarded volumes.

## Verify the policy before rolling it out

Test the sampler as a pure function with new root operations, sampled parents, and unsampled parents. Confirm the default operation receives the intended fallback and the important operation receives its larger fallback.

Then generate several kinds of synthetic failure in staging: an exception within a sampled trace, one within an unsampled trace, and a failure outside any trace. All three should produce error reports when no other filters or limits intervene. The unsampled case should also demonstrate the expected absence of a full trace.

Compare volumes over a representative interval after deployment. Measure error retention, trace coverage by operation, dropped-event reasons, and debugging usefulness. Adjust one policy dimension at a time so a cost reduction does not silently become a loss of rare-error visibility.

## References

- [JavaScript sampling configuration](https://docs.sentry.io/platforms/javascript/configuration/sampling/)
- [Error and tracing SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Sentry data filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
