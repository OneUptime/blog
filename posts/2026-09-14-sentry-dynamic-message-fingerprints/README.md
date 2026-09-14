# How to Group Dynamic Sentry Messages with Custom Fingerprints Without Hiding Distinct Root Causes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, JavaScript, Error Tracking, Debugging, Observability

Description: Design bounded Sentry fingerprints that remove incidental message variation while preserving operational distinctions and default stack-based grouping where useful.

A message such as `Invoice 8734 failed on worker 17` contains useful context, but the invoice and worker IDs usually do not define the bug. If those changing values become the grouping identity, one failure pattern can create a stream of issues.

Start by checking whether the events are actually grouped by message. Sentry normally prefers stack information when it is available. A custom fingerprint is appropriate only after you understand which differences are incidental and which should remain distinct.

## Inspect the current grouping evidence

Open two issues you think represent the same problem and examine Event Grouping Information. Compare the exception type, stack frames, message, custom fingerprint, and source-map status. Sentry's [grouping documentation](https://docs.sentry.io/concepts/data-management/event-grouping/) describes the grouping precedence: explicit fingerprint, stack, exception, then message.

A dynamic message attached to a well-symbolicated exception may already group correctly. Conversely, two identical messages can represent different bugs if their stacks differ. Do not replace those distinctions with a universal fingerprint merely to make an issue counter smaller.

For a message-only event, the easiest improvement is often a stable message with dynamic context:

```javascript
import * as Sentry from "@sentry/browser";

export function reportInvoiceExportFailure(invoiceId, reason) {
  Sentry.withScope(scope => {
    scope.setTag("operation", "invoice-export");
    scope.setTag("failure_reason", reason);
    scope.setContext("invoice_export", { invoice_id: invoiceId });
    Sentry.captureMessage("Invoice export failed", "error");
  });
}
```

Use this only for values your data policy allows, and constrain `reason` to application-defined categories. If you have a real exception, capture that exception instead of converting it to a message. Its original stack usually provides more evidence than a synthetic reporting location.

## Decide whether to extend or replace the default

Sentry fingerprints are arrays of strings. The special `{{ default }}` element includes Sentry's normally computed grouping identity. Without it, the supplied fingerprint replaces that identity. This distinction is documented in [SDK fingerprinting](https://docs.sentry.io/platforms/javascript/enriching-events/fingerprinting/).

| Fingerprint | Intended effect |
| --- | --- |
| no custom value | use Sentry's default grouping |
| `["{{ default }}", operation, reason]` | split a default group by additional stable dimensions |
| `["provider-failure-v1", operation, reason]` | group by the explicit application policy |

Adding `{{ default }}` cannot generally merge two events whose default identities differ. It carries that difference into the final identity. Omitting it can merge different stacks, which is powerful but can hide unrelated defects.

Keep customer IDs, timestamps, request IDs, random IDs, full URLs, and release IDs out of a general-purpose fingerprint. Those values often create one group per occurrence, customer, or deploy. Store necessary detail in context or bounded tags instead.

## Use a narrow error class and bounded categories

Consider a provider client that emits one special error type only when it has positively classified a provider response. It should not wrap arbitrary JavaScript exceptions into that class.

```javascript
export class ProviderResponseError extends Error {
  constructor(operation, reason) {
    super(`Provider rejected ${operation}: ${reason}`);
    this.name = "ProviderResponseError";
    this.operation = operation;
    this.reason = reason;
  }
}

const operations = new Set(["create-invoice", "fetch-invoice"]);
const reasons = new Set(["rate-limited", "provider-unavailable"]);

export function groupProviderResponses(event, hint) {
  const error = hint.originalException;
  if (!(error instanceof ProviderResponseError) ||
      !operations.has(error.operation) ||
      !reasons.has(error.reason)) {
    return event;
  }

  event.fingerprint = [
    "billing-provider-response-v1",
    error.operation,
    error.reason,
  ];
  event.tags = {
    ...event.tags,
    operation: error.operation,
    provider_reason: error.reason,
  };
  return event;
}
```

Configure this function as `beforeSend` in the SDK initialization. It creates a deliberately small grouping space: the two operations and two recognized response categories. Unknown reasons retain the default grouping, so a new failure shape does not disappear inside an existing catch-all issue.

The example intentionally groups the same provider response category across call sites. That is an operational policy, not proof that every underlying cause is identical. If a different call stack is an important diagnostic distinction in your application, include `{{ default }}` as the first fingerprint element instead.

Avoid mapping every HTTP `500` in the application to one fingerprint. The provider identity, operation, and positively recognized failure class matter. Authentication failures, response parsing bugs, and application invariants should retain their own exception types and grouping.

## Keep scope changes local

Use `withScope` when setting a fingerprint at a particular capture site. Setting one on a long-lived shared scope can accidentally apply it to later, unrelated errors. For a centralized hook, assign `event.fingerprint` only after the narrow classification succeeds.

Sentry's [fingerprinting examples](https://docs.sentry.io/platforms/javascript/enriching-events/fingerprinting/) show both scope-based configuration and changes in `beforeSend`. The hook already receives scope data, so modify the event itself there rather than setting a new global scope value.

## Validate the grouping contract

Build a small corpus of representative events before rollout. Two different invoice IDs with the same operation and recognized reason should produce the same custom fingerprint. Different operations or reasons should produce different fingerprints. A parsing `TypeError` and an unrecognized provider code should remain untouched.

Also compare stack-bearing examples when deciding whether to include `{{ default }}`. A local test can prove your function's output; only processing representative events in Sentry proves the final project grouping, including project rules and any additional grouping features.

Deploy the policy to a controlled release and inspect new events. Sentry documents that SDK and project fingerprint changes apply to incoming events rather than retroactively regrouping existing issues. Existing issues can be merged separately after review. A future policy version such as `v2` changes identity again, so use it only when you intentionally change the grouping contract.

Monitor event volume as well as issue volume. A successful fingerprint may reduce hundreds of issues to a handful while the underlying failure rate remains unchanged. Grouping improves investigation; it does not fix the failure or reduce how many occurrences were ingested.

## References

- [Sentry issue grouping](https://docs.sentry.io/concepts/data-management/event-grouping/)
- [Sentry SDK fingerprinting](https://docs.sentry.io/platforms/javascript/enriching-events/fingerprinting/)
- [Sentry event filtering and hints](https://docs.sentry.io/platforms/javascript/configuration/filtering/)
- [Sentry beforeSend configuration](https://docs.sentry.io/platforms/javascript/configuration/options/#beforesend)
