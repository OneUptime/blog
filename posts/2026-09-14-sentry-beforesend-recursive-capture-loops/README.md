# Sentry `beforeSend` Runs Repeatedly: How to Break Recursive Capture Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, JavaScript, Error Tracking, Debugging, Observability

Description: Diagnose recursive Sentry capture loops and keep beforeSend limited to predictable event transformation and filtering.

---

A `beforeSend` callback that runs repeatedly does not necessarily mean Sentry is retrying one request. Your callback may be creating the next event itself. A single application failure can then produce an unbounded stream of telemetry, hide the original stack trace, and consume the event budget.

The repair starts by separating event capture from event processing. Application code captures a failure once. `beforeSend` decides what the resulting event should contain and whether it should leave the application.

## Understand the callback contract

For JavaScript error and message events, `beforeSend` receives the assembled event and an optional source hint. Return the event to continue processing, or return `null` to drop it. Scope data has already been copied onto the event at this point, so changing the scope inside the callback will not enrich the event currently being processed. See the [Sentry SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/#beforeSend).

This makes the following pattern a feedback loop:

```javascript
// Incorrect: processing one event captures another event.
Sentry.init({
  dsn: "https://PUBLIC_KEY@o0.ingest.sentry.io/PROJECT_ID",
  beforeSend(event) {
    Sentry.captureMessage(`Sending event ${event.event_id}`);
    return event;
  },
});
```

The new message enters the same processing pipeline. Including the changing event ID also prevents a stable message from accidentally being suppressed as a consecutive duplicate. Returning the original event does not cancel the message that was just captured. Returning `null` would discard the original event but still leave the newly captured one.

The same problem can be indirect. A helper called by the hook might report its own errors to Sentry. A logging adapter might turn `console.error` into `captureException`. An HTTP request might fail and reach a shared error handler that captures another event. Review every function called by the hook, including logging and retry wrappers.

## Keep transformation local and predictable

Here is a small browser configuration that removes request details and adds a bounded classification tag. It makes no network requests, captures no events, and returns either an event or `null` on every path.

```javascript
import * as Sentry from "@sentry/browser";

export function prepareEvent(event) {
  if (event.tags?.telemetry_source === "synthetic-healthcheck") {
    return null;
  }

  const { request, ...remaining } = event;
  return {
    ...remaining,
    tags: {
      ...event.tags,
      application_area: "storefront",
    },
  };
}

Sentry.init({
  dsn: "https://PUBLIC_KEY@o0.ingest.sentry.io/PROJECT_ID",
  beforeSend: prepareEvent,
});
```

Removing the entire request object is deliberately conservative. A production policy can allow specific fields once they have been reviewed. Removing request details alone is not complete privacy protection: messages, breadcrumbs, custom context, and other telemetry can also contain sensitive values.

If classification requires business data, attach a small, safe value where the failure occurs. Do not fetch it while preparing the event. The [Sentry context APIs](https://docs.sentry.io/platforms/javascript/enriching-events/context/) allow application context to travel with the original failure.

```javascript
Sentry.withScope((scope) => {
  scope.setTag("operation", "inventory-reservation");
  scope.setContext("reservation", {
    attempt: 2,
    provider: "primary",
  });
  Sentry.captureException(new Error("Inventory reservation failed"));
});
```

Use your actual caught exception where available so its original stack is preserved. Avoid embedding order contents, account identifiers, or full provider responses in the message.

## Distinguish recursion from separate captures

Put a debugger breakpoint in `beforeSend` and inspect the call chain. In a test environment, collect only event IDs and exception types into a bounded in-memory array. Do not log complete events; they may contain sensitive data, and your logger may be part of the loop.

Compare the observations:

| Observation | Likely direction to investigate |
| --- | --- |
| New event IDs with the same hook or helper frames | Capture during event processing |
| One failure appears from both middleware and application catch blocks | Multiple capture owners |
| Events stop when a custom logging integration is removed | Logger-to-Sentry feedback |
| Several envelope requests but no new hook invocations | Transport behavior rather than repeated capture |

An event ID is useful evidence, not definitive proof: custom capture code can preserve or replace IDs. Inspect both the capture path and the outgoing envelopes.

Sentry's [console capture integration](https://docs.sentry.io/platforms/javascript/configuration/integrations/captureconsole/) actively creates events from configured console methods. Ordinary console breadcrumbs are a different feature. Verify which one your application actually installs before assuming every console call captures an event.

## Avoid a global busy flag as the main fix

A boolean such as `processing = true` can hide recursion while introducing another failure: legitimate concurrent events may be dropped. If asynchronous work is involved, a flag might also clear before a nested capture begins. A guard can be a temporary diagnostic measure, but removing the recursive dependency is the durable repair.

Handle hook failures locally. Returning a known minimal event or `null` under an explicit privacy policy is safer than reporting the hook's own exception through the same hook. Never return an `Error` object in place of a Sentry event.

## Verify the repaired path

Run one synthetic exception through a test project. Confirm one expected event appears, the hook returns promptly, and its helper functions make no capture calls. Repeat with two concurrent independent exceptions to ensure neither disappears. Test a malformed optional field and a deliberately dropped health-check event.

For an automated check, call the transformation function with plain event fixtures. Assert that safe tags survive, request details disappear, and the health-check case returns `null`. Separately test the configured SDK with a test transport or staging endpoint; a unit test of the transformer alone cannot prove that the logging stack has stopped recapturing errors.

Keep notification delivery and external incident creation outside `beforeSend`. Sentry's alerting integrations are the appropriate place to react after ingestion. The event hook should finish with a transformed event or a clear decision to discard it.

## References

- [JavaScript event options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Custom event context](https://docs.sentry.io/platforms/javascript/enriching-events/context/)
- [Console capture integration](https://docs.sentry.io/platforms/javascript/configuration/integrations/captureconsole/)
