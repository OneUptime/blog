# Flush Sentry Events Before Serverless Jobs and Processes Exit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, Serverless, Node.js, Error Tracking, AWS Lambda

Description: Preserve Sentry events in short-lived jobs by awaiting a bounded flush and using serverless wrappers correctly.

---

A Sentry capture call can return an event ID before the event has left the process. If a job exits immediately afterward, the event may still be waiting for processing or transport. Serverless runtimes introduce another boundary: returning from an invocation can end the opportunity to perform background work even when the process is later reused.

The solution is to await the SDK's queue drain before the lifecycle boundary, reserve enough execution time for it, and distinguish transport completion from successful ingestion.

## Choose flush or close deliberately

The JavaScript SDK exposes two related functions:

| Function | Effect | Typical use |
| --- | --- | --- |
| `await Sentry.flush(timeout)` | Drains pending events and keeps the client enabled | Reused serverless worker |
| `await Sentry.close(timeout)` | Drains pending events and disables the client | Final process shutdown |

Timeouts are in milliseconds. Both return a promise of a boolean. A false result means the drain did not complete successfully within its constraints; it is not a reason to submit the same exception repeatedly. Closing a client makes it unavailable for subsequent captures, so do not close it after each invocation in a warm runtime. See the [JavaScript SDK APIs](https://docs.sentry.io/platforms/javascript/guides/node/apis/).

A successful flush is not a guarantee that an event is visible in Sentry. Filtering, quotas, server rejection, and downstream processing are separate stages. Keep the event ID for diagnosis and verify the event in the intended project.

## Await the boundary in a standalone job

For a standalone Node.js command, capture once, give the SDK a bounded drain period, and let the process exit naturally. This complete example deliberately throws when `FAIL_JOB=1` so that you can exercise the error path in a test project.

```javascript
// job.mjs
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: process.env.APP_RELEASE,
  environment: process.env.APP_ENV ?? "development",
});

async function runJob() {
  if (process.env.FAIL_JOB === "1") {
    throw new Error("Synthetic nightly job failure");
  }
  // Perform and await the actual job work here.
}

try {
  await runJob();
} catch (error) {
  const eventId = Sentry.captureException(error);
  process.stderr.write(`Job failed; Sentry event ID: ${eventId}\n`);
  process.exitCode = 1;
} finally {
  const drained = await Sentry.close(2000);
  if (!drained) {
    process.stderr.write("Sentry queue did not drain successfully\n");
  }
}
```

Setting `process.exitCode` preserves the failure status without immediately terminating pending work. Calling `process.exit(1)` directly after capture would bypass the awaited cleanup. Node documents that forced exit can abandon asynchronous operations, including output writes. See [Node.js process exit behavior](https://nodejs.org/api/process.html#processexitcode).

Use a local diagnostic output that does not route back into Sentry. Reporting a flush failure through the same unavailable transport cannot reliably notify you and may add more pending work.

## Prefer the Lambda integration for Lambda handlers

Sentry's AWS Lambda wrapper captures handler failures and performs a flush before completion. Its documented `flushTimeout` default is two seconds and can be configured in milliseconds. Use this lifecycle integration when it owns capture for your handler. See the [Lambda wrapper configuration](https://docs.sentry.io/platforms/javascript/guides/aws-lambda/configuration/lambda-wrapper/).

```javascript
import * as Sentry from "@sentry/aws-serverless";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: process.env.APP_RELEASE,
});

async function processEvent(event) {
  if (event.syntheticFailure === true) {
    throw new Error("Synthetic Lambda failure");
  }
  return { ok: true };
}

export const handler = Sentry.wrapHandler(processEvent, {
  flushTimeout: 1500,
});
```

The wrapper can capture the thrown error, so an additional catch-and-capture block is unnecessary here. A caught error that you intentionally handle without throwing may still need an explicit capture at the handling boundary.

Increasing `flushTimeout` does not extend Lambda's maximum execution duration. Leave a margin for cleanup before the platform timeout. A hard timeout, abrupt kill, or machine failure can prevent any application cleanup from running. Timeout warnings are useful advance signals, not proof that the final exception can always be delivered.

## Handle other serverless runtimes by their lifecycle contract

For a reusable job worker without a Sentry-specific wrapper, put a bounded `flush` in an awaited `finally` block before acknowledging completion. Keep the client initialized across invocations. Use request or job isolation so context from one invocation does not leak into the next.

Some platforms provide a mechanism for explicitly extending work beyond a response. Follow that platform's supported mechanism; a detached promise is not equivalent to an extension. Browser unload handlers are also a different lifecycle and are not repaired by copying server-side shutdown code.

Avoid flushing after every event in a long-running server. That turns a buffered telemetry pipeline into a synchronous dependency for ordinary requests. Drain at actual job completion, shutdown, or another explicit lifecycle boundary.

## Diagnose failures after adding the flush

Test a synthetic failure, then run two invocations in the same process. If the first works and the second does not, look for `close` being called too early. If both return event IDs but neither arrives, inspect DSN configuration, filtering hooks, network egress, and server responses.

Simulate a slow or unreachable ingest endpoint in an isolated environment. Confirm the job stops waiting after its chosen budget and keeps the correct application exit status. Confirm that the diagnostic output names the event ID without exposing the payload.

Finally, compare ordinary completion with forced termination. The latter test establishes the reliability limit of your cleanup path. Critical business recovery should rely on durable job state and retry semantics; telemetry flushing provides observability of that process but cannot substitute for it.

## References

- [Sentry JavaScript flush and close APIs](https://docs.sentry.io/platforms/javascript/guides/node/apis/)
- [AWS Lambda wrapper options](https://docs.sentry.io/platforms/javascript/guides/aws-lambda/configuration/lambda-wrapper/)
- [Node.js process lifecycle](https://nodejs.org/api/process.html)
