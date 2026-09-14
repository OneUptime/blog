# How to Add User, Request, and Business Context to Sentry Without Leaking PII or Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, Security, Privacy, Node.js, Observability

Description: Add useful Sentry context with explicit collection controls, request isolation, approved fields, and practical privacy verification.

---

A useful error report explains which operation failed, which version ran, and which safe business conditions mattered. It rarely needs a complete HTTP request, customer record, or payment-provider response.

Build context from an approved set of fields. Treat automatic collection controls and server-side scrubbing as additional protection, because neither can infer the meaning of every value your application explicitly attaches.

## Define the fields before instrumenting

Start with a small context policy:

| Need | Suitable field | Avoid |
| --- | --- | --- |
| Find a deployment regression | Release and environment | Host credentials |
| Identify a failing operation | Stable route or operation name | Raw URLs containing identifiers |
| Compare business behavior | Plan tier, retry count, provider name | Full account or order objects |
| Investigate one affected account | Approved opaque support reference | Email, phone, or access token |
| Correlate a request | Generated diagnostic request ID | An incoming header copied without validation |

Opaque identifiers can still be personal data when someone can link them to an individual. Keep their use within your organization's approved policy. A plain hash of an email address is also easy to guess from candidate addresses; hashing does not automatically make an identifier anonymous.

## Configure collection explicitly

The current JavaScript SDK documents `dataCollection` from version 10.57.0. It controls automatic collection by category. The older `sendDefaultPii` option is deprecated, and explicitly passing `dataCollection` opts into its defaults. Set the categories you intend to disable rather than assuming omitted fields remain disabled. Values attached manually, including `setUser`, are still sent. See [Sentry's collection options](https://docs.sentry.io/platforms/javascript/configuration/options/#dataCollection).

For a Node.js service, the following option shape is supported by SDK 10.74.0. The SDK's [DataCollection type definition](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/types/datacollection.ts) also includes GraphQL controls, which should be considered when reviewing automatic collection:

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: process.env.APP_RELEASE,
  environment: process.env.APP_ENV,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    graphQL: { document: false, variables: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    frameContextLines: 0,
  },
});
```

Verify the option shape against the SDK version in your lockfile. For older releases, use their documented controls and filtering hooks until you intentionally upgrade. Do not paste a new option into an older SDK and assume an unknown property will enforce a privacy policy.

## Add safe business context at the failure boundary

For background jobs, isolate each job's context. Modern Node integrations isolate supported HTTP requests automatically; custom jobs can use `withIsolationScope`. This prevents one concurrent job from attaching another job's tags or breadcrumbs. See [Sentry's async context guidance](https://docs.sentry.io/platforms/javascript/guides/node/configuration/async-context/).

```javascript
export async function runInvoiceJob(job, processInvoice) {
  return Sentry.withIsolationScope(async (scope) => {
    scope.setTag("operation", "invoice-generation");
    scope.setTag(
      "plan_tier",
      ["free", "team", "enterprise"].includes(job.planTier)
        ? job.planTier
        : "unknown",
    );
    scope.setContext("invoice_job", {
      attempt: Number.isInteger(job.attempt) ? job.attempt : 0,
      batch_size: Number.isInteger(job.batchSize) ? job.batchSize : 0,
    });

    try {
      return await processInvoice(job);
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
}
```

This function owns capture for this boundary. If a framework or queue wrapper already captures the same exception, choose one owner before installing the example.

Use tags for bounded values that you want to search or aggregate. Use structured context for a small collection of related diagnostic fields. Never pass `job` itself to `setContext`, even if today's job schema appears harmless. A future producer could add a customer email or an authentication token without touching this instrumentation.

When user correlation is approved, set only the approved opaque identifier. On browser logout, clear user context with `Sentry.setUser(null)`. On servers, set user context inside the request or job scope, not once during process startup.

## Review every telemetry surface

`beforeSend` handles error and message events. It does not automatically sanitize spans, logs, metrics, replay recordings, or attachments. Sentry provides separate hooks for relevant telemetry types, including `beforeSendSpan` and `beforeSendLog`. In span stream mode, transaction filtering behaves differently, so follow the documentation for the mode you enable. See [Sentry's sensitive-data guidance](https://docs.sentry.io/platforms/javascript/guides/node/data-management/sensitive-data/).

Review exception messages as carefully as context. A database driver or API client can place submitted data into its error message. Likewise, a breadcrumb may contain a URL query or a console statement that printed an entire request object.

Prefer removing unneeded fields to trying to redact every possible secret with a regular expression. For necessary text, define a domain-specific sanitizer and test representative provider responses. Configure server-side scrubbing as a second layer, while remembering that it acts after data has reached the server.

## Test with recognizable fake secrets

Create a staging failure containing unique fake values in a request header, cookie, query parameter, body, exception message, breadcrumb, and custom context. Inspect the serialized outgoing envelope before ingestion as well as the resulting event. A clean event in the UI alone does not prove that sensitive values never left the application.

Run two jobs concurrently with different approved context and confirm they remain separate. Test an anonymous request after an authenticated request, plus browser logout, to catch stale identity. Check that approved fields still answer useful questions: operation, release, retry attempt, and plan tier should remain available.

Record the approved field list beside the instrumentation code. When someone adds a context field or enables a new telemetry integration, review that change against the policy. This keeps privacy checks aligned with application behavior instead of relying on a one-time SDK setting.

## References

- [JavaScript collection options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Node.js async context isolation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/async-context/)
- [Sensitive data and telemetry hooks](https://docs.sentry.io/platforms/javascript/guides/node/data-management/sensitive-data/)
