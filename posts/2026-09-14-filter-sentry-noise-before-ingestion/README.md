# How to Filter Noisy Sentry Events Before Ingestion Without Burning Your Quota

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, JavaScript, Filtering, Error Tracking, Observability

Description: Reduce Sentry error volume with narrow SDK filters, explicit expected-failure classification, and measured rollout while preserving actionable failures.

A noisy error stream is rarely fixed well by lowering every event's sampling probability. A checkout outage and a harmless cancellation would both become less visible. Start by deciding which failures are expected, then discard only those at the earliest layer that has reliable evidence.

Sentry recommends client-side filtering because it avoids transmitting events you do not want. Server-side inbound filters remain useful too: Sentry explicitly states that events removed by those filters do not consume quota. The distinction is transmission overhead and available context, not a claim that only SDK filtering saves quota. See [SDK filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/) and [inbound filtering](https://docs.sentry.io/concepts/data-management/filtering/).

## Classify the noise before creating a rule

Take representative events from the dominant issue. Compare exception type, message, mechanism, stack, release, route, and customer effect. A large count does not establish that a failure is harmless.

Record a narrow reason for suppression, such as an upload deliberately cancelled through your application's cancel action. A generic `AbortError` is weaker evidence because timeouts, navigation, and unexpected application cancellation can share that name. Similarly, broadly filtering `Failed to fetch` can hide a broken API or a browser policy problem affecting customers.

Give each rule an owner, a review date, and a positive case that must continue reporting. The operational test is whether an actionable failure still reaches the team after the filter ships.

## Match stable messages precisely

For a known message your application owns, `ignoreErrors` is concise:

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://PUBLIC_KEY@o123.ingest.sentry.io/456",
  ignoreErrors: [/^Optional preview was dismissed by the user$/],
});
```

Strings in `ignoreErrors` are partial matches. Anchored regular expressions express an exact match. This matters when a broad phrase also appears in real failures, such as `Unable to cancel upload after connection loss`. Sentry describes that matching behavior in its [filtering guide](https://docs.sentry.io/platforms/javascript/configuration/filtering/#using-ignore-errors).

Do not copy a large public ignore list without checking your application. SDK defaults and browser behavior evolve, and a message that another product ignores may indicate a meaningful failure in yours.

## Use application evidence in `beforeSend`

When you own a failure classification, attach it deliberately at the capture boundary. The following filter requires a handled exception and an explicit combination of operation and reason:

```javascript
const expectedReasons = new Set(["user_cancelled"]);

export function filterExpectedUploadCancellation(event) {
  const values = event.exception?.values ?? [];
  const isHandled = values.length > 0 &&
    values.every(value => value.mechanism?.handled === true);

  const isExpected =
    event.tags?.operation === "upload" &&
    expectedReasons.has(event.tags?.failure_reason);

  return isHandled && isExpected ? null : event;
}
```

Connect the function to initialization:

```javascript
Sentry.init({
  dsn: "https://PUBLIC_KEY@o123.ingest.sentry.io/456",
  beforeSend: filterExpectedUploadCancellation,
});
```

The application can supply these tags in the capture context when it has verified the cancellation path. Do not derive `failure_reason` from arbitrary text supplied by a remote service. Unknown mechanisms are preserved, and the rule keeps message-only events because they do not establish a handled exception.

Often the best implementation is earlier still: if an expected result is not an error, do not call `captureException` for it. Keep an ordinary application counter or breadcrumb when useful. The hook is valuable when a shared reporting boundary already receives many failure types.

The [beforeSend contract](https://docs.sentry.io/platforms/javascript/configuration/options/#beforeSend) permits modifying an event or returning `null`. All scope data is already attached at that point. Return the event explicitly for every allowed path, and avoid network calls or Sentry capture calls inside the hook.

## Handle third-party code conservatively

Stack URL filters can remove exceptions attributed to scripts from selected domains, but they inspect stack frames rather than the current page URL. They are not complete classifiers for application ownership.

Sentry also provides `thirdPartyErrorFilterIntegration`, which uses application keys injected by supported bundler plugins. Begin with its tagging behavior, inspect the resulting events, then decide whether to drop events consisting entirely of third-party frames. Dropping every event that contains even one third-party frame can hide failures that cross your application's dependency boundary. The integration requires compatible build instrumentation and does not work with the Loader Script or CDN bundles; see the [official integration guidance](https://docs.sentry.io/platforms/javascript/configuration/filtering/#using-thirdpartyerrorfilterintegration).

## Distinguish ingestion controls from issue organization

Grouping similar events into one issue reduces the number of issues, but it does not mean only one occurrence was ingested. Resolving, archiving, or hiding an issue is also different from preventing future events from being sent. Use a filter for a known unwanted class, not a cosmetic change to the issue list.

Keep the product category explicit. `beforeSend` handles error and message events. It is not a universal filter for spans, replay, sessions, or structured logs. Configure their documented controls independently. Likewise, `sampleRate` is random error sampling, while `tracesSampleRate` controls tracing. A trace-sampling change will not fix excessive error intake. See [SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/).

## Measure suppression without reporting the suppressed error

Test the filter with fixtures for a handled upload cancellation, the same reason on another operation, an unhandled cancellation, a missing mechanism, a message-only event, and an unexpected upload failure. Only the first should be dropped.

Then deploy to a limited audience. Compare accepted errors, client discards, and inbound-filter outcomes in [Sentry Stats](https://docs.sentry.io/product/stats/), alongside your application's independent failure counters. Client reports can explain SDK discards, but they are not complete accounting when the SDK itself cannot communicate.

Do not report each dropped event back to Sentry as a diagnostic message. That defeats the filter and can recurse. Use aggregated counters outside the error-capture path, with bounded reason labels and no event payloads.

After rollout, trigger one expected failure and one actionable failure through application code. Confirm that the first is suppressed and the second still arrives with useful context. Revisit rules when the feature changes; a filter that was correct six months ago can otherwise become a permanent blind spot.

## References

- [Sentry JavaScript filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
- [Sentry JavaScript options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Sentry inbound filters](https://docs.sentry.io/concepts/data-management/filtering/)
- [Sentry Stats and discard categories](https://docs.sentry.io/product/stats/)
