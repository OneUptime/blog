# Why Cloud Run Work Stops After the HTTP Response

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Cloud Tasks, Serverless, Troubleshooting

Description: Choose request-based CPU, instance-based billing, or Cloud Tasks by separating background execution from durable work ownership.

---

A report endpoint returns `202 Accepted`, starts a thread, and appears to work in development. On Cloud Run, the report sometimes finishes only when another request arrives. Other reports never finish at all. These are two different failure modes: the process may lack CPU outside requests, and the instance that owned the work may disappear.

Fix the execution model and the ownership model separately. Allocating CPU can help a background thread run, but it cannot make that thread a durable job.

## Identify when responsibility changes

Consider this illustrative handler:

```python
@app.post("/reports")
def reports():
    executor.submit(build_report)
    return {"status": "accepted"}, 202
```

The HTTP response says that responsibility has moved to the server. However, the only record of that responsibility may be a Python future in one process. If the process exits, neither a replacement instance nor the caller knows what remains unfinished.

First log an operation identifier at acceptance, work start, successful persistence, and failure. Include the revision and an application-generated process identifier. Compare missing completions with new process starts and periods without traffic. A worker that advances only while requests are active suggests CPU allocation; work lost around replacement suggests missing durable state. These observations guide investigation but do not independently prove the platform caused the loss.

## Keep short required work inside the request

If the caller needs a completed result, await the operation and send the response after the result is committed. Add bounded downstream timeouts and make retries safe. A request that times out can leave uncertainty about a database write, so a client retry should carry the same operation identifier.

Request-based billing provides CPU during request processing. Instance-based billing provides CPU throughout the instance lifecycle. The older descriptions are CPU only during requests and always-allocated CPU. These are billing settings with execution consequences. [Cloud Run billing settings](https://docs.cloud.google.com/run/docs/configuring/billing-settings).

For short work, awaiting completion often removes an unnecessary queue and makes the success response meaningful. It also means the request remains open. Do not increase the request timeout indefinitely to conceal an operation that should be asynchronous.

## Use instance-based billing for replaceable background activity

Examples include refreshing an expendable cache or running an exporter whose retry and flush behavior tolerates interruption. For an existing service, an illustrative update is:

```bash
gcloud run services update report-api \
  --project=example-project \
  --region=us-central1 \
  --no-cpu-throttling
```

The command creates a new revision. Review the service's traffic allocation so that you know which revision actually receives requests. Inspect the deployed settings rather than assuming an old revision inherited the change.

Full-lifecycle CPU does not reserve one permanent machine. Instances can still be replaced, including minimum instances. Design background activity to restart, discard incomplete local state, or recover from a durable checkpoint. [Background execution considerations](https://docs.cloud.google.com/run/docs/configuring/billing-settings#choosing-background-execution).

A periodic task in every instance also runs multiple times when the service scales out. If only one worker may perform an operation, use a durable claim or lease and handle lease expiry. A module-level Boolean protects one process, not the service.

## Give important asynchronous work a durable owner

For tasks that must survive request completion, persist the operation and enqueue a Cloud Task before acknowledging acceptance. Cloud Tasks invokes the worker over HTTPS; the worker acknowledges success after completing the task. Failed delivery attempts can be retried. [Cloud Run with Cloud Tasks](https://docs.cloud.google.com/run/docs/triggering/using-tasks).

A useful sequence is:

1. Validate the request and assign a stable operation ID.
2. Persist the operation or an outbox entry.
3. Submit the task, recording enough information to reconcile uncertain submission.
4. Return an operation URL the caller can poll.
5. Have the worker claim, execute, and durably record the result.

If the database write and queue submission are separate operations, a crash can occur between them. An outbox dispatcher closes that gap by retrying committed, undispatched entries. Merely moving `executor.submit` to an enqueue call does not automatically make the business write and task creation atomic.

For an existing queue, tune delivery according to worker and downstream capacity:

```bash
gcloud tasks queues update reports \
  --project=example-project \
  --location=us-central1 \
  --max-concurrent-dispatches=10 \
  --max-dispatches-per-second=5
```

These are example limits, not universal defaults. Confirm them against the current [queue update reference](https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/update), then load test representative work.

## Acknowledge the right event

The worker must finish the work before returning success to Cloud Tasks. Returning `200` and starting another detached thread recreates the original bug behind a queue.

Cloud Tasks can deliver a task more than once. An idempotent worker checks the operation record and returns success for an already completed operation. A claim needs recovery semantics if its worker dies; a permanent `processing=true` flag can strand work forever. [Cloud Tasks execution limitations](https://docs.cloud.google.com/tasks/docs/common-pitfalls).

Set application and downstream deadlines inside the task dispatch deadline. HTTP tasks have a maximum dispatch deadline of 30 minutes; use Cloud Run jobs or split work when the operation cannot fit. Record partial progress durably where replaying everything would be expensive.

## Verify the failure cases

Exercise the design in staging with one operation ID. Repeat the same request, repeat the task delivery, interrupt a worker after its business write, and retry after a simulated enqueue timeout. Check that the operation eventually reaches a terminal state and the business effect occurs once according to your application's rules.

Also leave the service idle between tests. A successful run under constant traffic does not show that a detached background design is correct. These are validation scenarios, not claims that the examples have been deployed.

## Conclusion

Choose CPU allocation based on when code needs to run. Choose Cloud Tasks and durable operation state based on who must remember unfinished work. Keeping these decisions separate prevents a successful HTTP response from becoming the last evidence that an important task existed.

## Official Documentation

- [Cloud Run billing settings](https://docs.cloud.google.com/run/docs/configuring/billing-settings)
- [Execute asynchronous tasks](https://docs.cloud.google.com/run/docs/triggering/using-tasks)
- [Cloud Tasks issues and limitations](https://docs.cloud.google.com/tasks/docs/common-pitfalls)
- [Cloud Tasks queue update command](https://docs.cloud.google.com/sdk/gcloud/reference/tasks/queues/update)
