# Why Sentry `ignoreErrors` Misses Handled Exceptions—and How to Filter Them with `beforeSend`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, JavaScript, Error Handling, Filtering, Debugging

Description: Diagnose apparent ignoreErrors failures by checking message matching and SDK integrations, then use beforeSend for precise handled-exception policies.

The title describes a common observation, but handled status is not a general limitation of `ignoreErrors`. In the current JavaScript SDK, a matching exception captured with `Sentry.captureException` can be filtered even though it is handled. If it still arrives, inspect the event's actual message and the active filtering integration before adding a workaround.

The distinction matters because `beforeSend` is useful for a richer policy, such as ignoring one expected handled failure while preserving the same failure when it escapes uncaught. It is not required merely because an exception was caught.

## Establish what `ignoreErrors` matches

`ignoreErrors` takes strings or regular expressions that match error messages. Strings match substrings; anchored regular expressions can match an entire message. It does not search arbitrary breadcrumb text, custom tags, a business error code, or everything printed in an issue title. See [Sentry's filtering documentation](https://docs.sentry.io/platforms/javascript/configuration/filtering/#using-ignoreerrors).

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://PUBLIC_KEY@o123.ingest.sentry.io/456",
  ignoreErrors: [/^Optional preview dismissed$/],
});

try {
  throw new Error("Optional preview dismissed");
} catch (error) {
  Sentry.captureException(error);
}
```

With the normal filtering integration active, that handled capture matches the rule. Sentry's [version 10.74.0 EventFilters implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/integrations/eventFilters.ts) applies message matching without requiring `mechanism.handled` to be false. This is a concrete version reference, not a guarantee about every historical or custom SDK integration.

## Compare the captured value with the expected value

An issue heading is a presentation of an event. Inspect the event JSON, particularly `message`, `exception.values`, and any linked exceptions. If your application wraps the original error, the value being captured may be `Preview operation failed` even when the cause says `Optional preview dismissed`.

These captures are not interchangeable:

```javascript
Sentry.captureException(new Error("Optional preview dismissed"));
Sentry.captureException({ code: "PREVIEW_DISMISSED" });
Sentry.captureMessage("Preview operation failed", "error");
```

A plain object is not an `Error`. The SDK may describe its keys as a non-error exception rather than treat `code` as the message you expected. Sentry's [non-error exception guidance](https://docs.sentry.io/platforms/javascript/troubleshooting/#events-with-non-error-exception) recommends passing actual `Error` objects for better diagnostics.

Also check for punctuation, prefixes, localization, and added context. An anchored expression matching `Optional preview dismissed` will not match `Optional preview dismissed: component=gallery`. Broaden a pattern only after proving which variants are intended; otherwise, keep a stable message and move dynamic details into structured context.

## Confirm the filter is actually installed

Look for `defaultIntegrations: false`, a custom integration callback that removes filtering, or a second SDK client. Setting a top-level option does not make an integration that was removed execute.

In SDK 10.74.0, filtering is implemented by `eventFiltersIntegration`; older documentation and SDKs may refer to `inboundFiltersIntegration`. Match the integration name to your installed version and preserve the default integrations unless you have a reason to replace them. The [integration source](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/integrations/eventFilters.ts) documents the current name and its compatibility alias.

Temporarily enable `debug: true` in a controlled build and capture a unique matching exception through application code. Check the SDK discard message and Network panel. An event processor can drop an event before `beforeSend`, so a hook that never runs does not prove filtering is broken.

## Filter a specific handled failure with `beforeSend`

Suppose dismissing an optional preview is expected when caught by its UI boundary, but an uncaught occurrence indicates a missing handler. A message-only filter would suppress both. Use the original exception and the event mechanism instead:

```javascript
export class PreviewDismissedError extends Error {
  constructor() {
    super("Optional preview dismissed");
    this.name = "PreviewDismissedError";
  }
}

export function filterHandledPreviewDismissal(event, hint) {
  const original = hint.originalException;
  const exceptions = event.exception?.values ?? [];
  const explicitlyHandled = exceptions.length > 0 &&
    exceptions.every(value => value.mechanism?.handled === true);

  if (original instanceof PreviewDismissedError && explicitlyHandled) {
    return null;
  }
  return event;
}

Sentry.init({
  dsn: "https://PUBLIC_KEY@o123.ingest.sentry.io/456",
  beforeSend: filterHandledPreviewDismissal,
});
```

In this policy, remove the broad `ignoreErrors` rule for the same message; otherwise, it could discard the unhandled variant before the hook can preserve it. Unknown or missing mechanism information is kept deliberately. Linked exceptions with incomplete mechanism data are also kept, which favors visibility over aggressive suppression.

`hint.originalException` provides the original captured value, while the event contains the serialized data being sent. These are documented in [Sentry's hint guidance](https://docs.sentry.io/platforms/javascript/configuration/filtering/#using-hints). `instanceof` assumes the error uses the same class identity; duplicate package copies and different browser realms can defeat that check. If your application crosses those boundaries, define a deliberate, bounded classification at the capture site rather than guessing from the error name alone.

## Test both sides of the policy

Create fixtures for the custom error with `handled: true`, the same error with `handled: false`, a missing mechanism, an unrelated error, and a message-only event. Only the explicit handled custom error should return `null`.

Then exercise a caught capture and an uncaught application failure in a nonproduction Sentry project. Use fresh error objects so SDK duplicate suppression does not confuse the results. Confirm that the handled event produces no error envelope and that the unexpected failure still arrives.

Keep the hook synchronous and deterministic when possible. Do not capture another Sentry error or call a captured logger inside it. Always return either the event or `null`; a hook with a missing return introduces a separate reporting defect. The [beforeSend option](https://docs.sentry.io/platforms/javascript/configuration/options/#beforesend) is the final policy boundary for error and message events, so small, explicit rules are easier to maintain than a generic catch-all suppression function.

## References

- [Sentry error filtering and hints](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
- [Sentry beforeSend configuration](https://docs.sentry.io/platforms/javascript/configuration/options/#beforesend)
- [Sentry non-error exception troubleshooting](https://docs.sentry.io/platforms/javascript/troubleshooting/)
- [Sentry 10.74.0 EventFilters implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/integrations/eventFilters.ts)
