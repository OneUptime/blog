# Make Argo Event Handlers Idempotent Across Sensor Redelivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Idempotency, Sensor, Argo Workflows, Kubernetes, At-Least-Once, Event Processing

Description: Prevent duplicate business effects when Argo Events retries or redelivers by carrying stable keys, claiming them atomically, and resuming safely.

---

An Argo Sensor can redeliver or retry after a crash precisely because it cannot always know whether the previous attempt completed. The safe response is not to hope duplicates are rare. Make the handler produce the same business result when the same logical request is processed more than once.

Idempotency belongs at the effect boundary. A Sensor-side five-minute duplicate cache or a unique CloudEvent ID can reduce some duplicates, but it cannot cover every crash window, producer replay, retention interval, or manually resubmitted event.

## Define the Logical Operation

First decide what "same" means. A transport ID and a business operation are often different:

- GitHub `X-GitHub-Delivery` identifies one delivery and is valuable for tracing.
- Repository plus commit plus operation may identify one build even after GitHub creates a new delivery ID.
- Service plus environment plus revision may identify one deployment.
- An upstream command ID is ideal if the producer creates one per intended operation.

Build a namespaced key:

```text
deploy:v1:payments:production:8b65f2a
```

Include a version so future key semantics do not collide with old records.

## Pass the Key into the Workflow

Normalize it in the producer or Sensor and map it into an argument and label. Kubernetes label values have a restricted syntax and length, so use a safe hash for the label while keeping the full key as a parameter or annotation.

```yaml
spec:
  arguments:
    parameters:
      - name: operation-id
        value: unset
      - name: delivery-id
        value: unset
```

Do not generate a random ID inside each duplicate Workflow. That makes every retry look new.

## Claim Before the Irreversible Effect

A robust claim table can store:

```sql
CREATE TABLE automation_operation (
  operation_id text PRIMARY KEY,
  state text NOT NULL CHECK (state IN ('claimed', 'running', 'succeeded', 'failed')),
  owner_token text NOT NULL,
  request_hash text NOT NULL,
  result_json jsonb,
  lease_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

The first handler inserts the key with a unique constraint. A duplicate that sees `succeeded` returns the recorded result. A duplicate that sees an unexpired active lease waits or exits successfully, depending on the contract. A handler may take over an expired lease only with an atomic compare-and-set on the owner token or version.

Never do this:

```text
SELECT whether key exists
if absent, perform side effect
INSERT key
```

Two Workflows can both observe absence and both act. Claim atomically before the effect.

## Handle Request-Key Collisions

Store a canonical request hash with the operation ID. If the same key arrives with different service, revision, amount, or target, reject it as a conflict. Silently returning the old result could apply one request's success to another request.

Canonicalization must be deterministic. Choose fields explicitly rather than hashing raw JSON whose key order or irrelevant metadata may change.

## Make Each Workflow Step Resumable

One top-level claim prevents concurrent duplicate Workflows from both owning an operation, but the owner can still crash halfway through. Record checkpoints around nontransactional effects:

```text
claimed -> artifact_built -> image_pushed -> deployment_applied -> verified
```

On retry, inspect authoritative state:

- if the image digest already exists and matches, reuse it;
- if the Deployment already references the desired digest, do not patch again;
- if a migration version is recorded, do not rerun a non-repeatable migration;
- if an external API accepted an idempotency key, retrieve its original result.

Prefer declarative upsert or desired-state reconciliation over imperative "create another" actions.

## Use Deterministic Kubernetes Resources Carefully

A deterministic Workflow name can suppress duplicate creation:

```yaml
metadata:
  name: deploy-payments-8b65f2a
```

Kubernetes then returns `AlreadyExists` for a repeated create. This helps only if:

- the name is a valid DNS subdomain and within the length limit;
- the retained object still exists;
- the existing object's operation ID and request hash match;
- the trigger treats an identical existing resource as success;
- the original Workflow status is acceptable for the duplicate request.

Argo Events' create trigger does not automatically turn every `AlreadyExists` response into semantic success. A small idempotency gateway or claim-first Workflow can provide clearer behavior. `generateName` always permits another object and therefore does not deduplicate.

## Separate Execution Retry from New Intent

Use the same operation ID when recovering the same intended action. Use a new operation ID when a human intentionally requests a new execution, even if service and revision match. Record the relationship:

```json
{
  "operationId": "deploy:v1:payments:prod:8b65f2a:attempt-2",
  "supersedes": "deploy:v1:payments:prod:8b65f2a:attempt-1",
  "reason": "approved manual rerun"
}
```

This prevents an idempotency layer from blocking legitimate re-execution while keeping an audit chain.

## Do Not Use a Short-Lived Cache as the Ledger

Argo Events documentation describes an in-memory recent event-ID cache for some delivery paths. It is an optimization, not a business ledger:

- it is local to process behavior and time-bounded;
- producer replays may use another ID;
- a duplicate can occur after the cache window;
- it cannot prove an external side effect's state.

Retain idempotency records for at least the maximum source replay, EventBus retention, retry, manual recovery, and audit window. Some financial or provisioning operations need permanent records.

## Handle Concurrent and Stale Owners

Use leases only when a Workflow can genuinely recover an abandoned operation. Store `owner_token`, expiry, and heartbeat. Taking over requires comparing the expected old owner/version atomically.

Do not simply declare every record older than ten minutes dead. A long migration may still be running. Heartbeat from the actual step, use workload-specific timeouts, and verify the target state before takeover.

Argo Workflows synchronization can limit concurrency, but it is not a substitute for durable idempotency. Locks can be released after controller or Workflow termination while an external side effect remains committed.

## Return Prior Results

Idempotency is easier when duplicates receive the first result. Store useful references:

```json
{
  "state": "succeeded",
  "workflow": "deploy-payments-x7q2m",
  "imageDigest": "sha256:...",
  "deployedRevision": "8b65f2a",
  "completedAt": "2026-08-05T10:30:00Z"
}
```

A duplicate handler can report success without recreating work. Keep sensitive results out of labels and ordinary logs.

## Test Crash Windows

An idempotency test suite should kill the handler:

1. before claiming;
2. after claiming but before acting;
3. after the external system commits but before checkpointing;
4. after checkpointing but before Sensor acknowledgment;
5. while two duplicate Workflows race;
6. after the lease expires;
7. when the same key carries a different request hash.

Assert one final business effect, not merely one Workflow. Multiple duplicate Workflows may exist while the claim protocol correctly allows only one owner.

## Official Documentation

- [Argo Events trigger delivery and retries](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events trigger parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Workflows synchronization](https://argo-workflows.readthedocs.io/en/latest/synchronization/)
- [Kubernetes object names and IDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

## Conclusion

Carry one stable operation key through the event and Workflow, claim it atomically before irreversible work, store a canonical request hash, and checkpoint resumable effects. Sensor deduplication reduces noise, but only a durable target-side protocol can make redelivery safe across crashes and replays.
