# Idempotent Infrastructure Automation After Partial Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Automation, Idempotency, Terraform, Reliability, Cloud API, Distributed Systems

Description: Build infrastructure automation that converges after crashes and ambiguous API outcomes without duplicating resources, replaying unsafe actions, or assuming rollback.

---

Infrastructure automation rarely fails cleanly before doing anything. A cloud API may create a resource and lose the response, a runner may stop after three of five changes, or a provider may update one attribute before returning an error. Retrying the whole script is safe only if every step can determine and converge from the state that now exists.

Idempotency does not mean "run the same commands twice." It means repeating the same intent produces the same desired outcome without creating additional unintended effects.

That requires stable identity, durable checkpoints, conditional writes, careful retry classification, and reconciliation against live state.

## Model Desired State, Not a Sequence of Hopes

An imperative workflow often looks like:

```text
create network
create database
create service
publish DNS
send completion message
```

If the process crashes after publishing DNS but before recording completion, a blind restart may try to create everything again.

An idempotent reconciler asks a different question for each object:

```text
What should exist?
What exists now?
What durable operation did we already request?
What is the smallest safe action that closes the difference?
```

Store one immutable intent:

```json
{
  "operation_id": "env-2026-18472",
  "boundary": "payments/production/eu-west-1",
  "desired_revision": "git:4d3c2b1f",
  "requested_by": "platform-api",
  "parameters_hash": "sha256:9b6f..."
}
```

The same operation ID may be retried only with the same normalized parameters. If parameters differ, reject the request and require a new operation ID. Otherwise, an idempotency key becomes a mutable alias and can return the result of the wrong operation.

## Persist the Operation Before Side Effects

Use a durable operation ledger outside the ephemeral runner:

```sql
CREATE TABLE infrastructure_operations (
  operation_id     text PRIMARY KEY,
  boundary_key     text NOT NULL,
  parameters_hash  text NOT NULL,
  desired_revision text NOT NULL,
  status           text NOT NULL,
  checkpoint       jsonb NOT NULL,
  created_at       timestamptz NOT NULL,
  updated_at       timestamptz NOT NULL
);
```

Insert the record atomically before calling a mutating API. A duplicate request reads the existing record, verifies the parameters hash, and resumes or returns the recorded result.

A useful state machine is:

```text
ACCEPTED -> OBSERVING -> APPLYING -> VERIFYING -> SUCCEEDED
                         |             |
                         +-> AMBIGUOUS +-> NEEDS_RECONCILIATION
                         +-> FAILED_TERMINAL
```

Do not let a runner write arbitrary status transitions. Update only from the expected current state, for example `APPLYING` to `VERIFYING`. Conditional transitions prevent two workers from both committing the same transition, but they do not fence a worker that already held ownership and later resumes.

## Give Every Resource a Stable Identity

Names such as `payments-db` are useful only if they are unique in a defined scope and enforced by the target. Prefer provider-issued immutable IDs after creation, and store the mapping immediately.

Before creation, derive a deterministic external identity where the API supports it:

```text
owner=team-payments
environment=production
automation-operation=env-2026-18472
logical-resource=orders-database
```

Tags are discovery evidence, not a universal uniqueness guarantee. Another caller may omit or copy them, and some APIs do not make tags atomically visible with creation. Use a server-enforced name, client token, conditional create, or dedicated registry whenever possible.

For Terraform, state is the binding between a resource address and the remote object. HashiCorp expects each remote object to be bound to one resource address. If an object exists but is missing from state after an ambiguous create, investigate and import it rather than immediately creating another object with a different name.

## Use Native Idempotency Tokens Correctly

Many cloud APIs provide a client token or request ID for mutating calls. Amazon EC2 documents that supported operations complete no more than once when retries reuse the same client token and parameters. Reuse with different parameters returns an idempotency mismatch for those operations.

The scope varies by operation. EC2 documents regional and, for some calls, zonal idempotency. Token length, retention, parameter comparison, and supported operations also vary. Read the exact API reference instead of assuming a token named `request_id` has deduplication semantics.

Generate the provider token deterministically from the operation and logical step:

```text
sha256(operation_id + ":" + logical_resource + ":create")
```

Persist it before the request. A process that generates a new random token on every retry defeats provider idempotency.

An API token covers one API operation, not the entire infrastructure workflow. Keep the higher-level operation ledger too.

## Treat Timeouts as Unknown Outcomes

A network timeout has at least three meanings:

1. the request never reached the service;
2. the service rejected or failed it but the response was lost;
3. the service accepted it and may still be completing asynchronously.

Do not map all three to `FAILED`.

Use this protocol:

1. Mark the step `AMBIGUOUS` with request ID, token, endpoint, and time.
2. Query the operation status if the API provides one.
3. Read by immutable ID, deterministic name, or supported token lookup.
4. Verify parameters and ownership before adopting a discovered object.
5. Retry with the same native idempotency token only when the operation is documented as safe.
6. Escalate rather than guessing when identity cannot be proven.

Do not use list-and-pick-first logic in a shared account. It can adopt a resource created by another team.

## Add Preconditions to Updates and Deletes

Idempotent create does not prevent a stale worker from overwriting newer configuration. Use the target system's compare-and-set mechanism, generation number, ETag, resource version, or conditional header.

Persist the version observed while planning:

```yaml
resource_id: network-184
observed_version: "42"
desired_cidr: 10.42.0.0/16
```

The update succeeds only if version `42` is still current. A conflict triggers a new read and re-plan, not an unconditional force.

For delete, verify stable identity, owner, lifecycle state, dependent set, and observed version. Repeated deletion should treat a documented not-found response as converged only after proving the identifier is the intended object. Never treat authorization failure as not found.

## Make Each Reconcile Step Restartable

Separate planning, side effect, and observation:

```text
PREPARE
  calculate action and persist token/preconditions
EXECUTE
  make one bounded API call
OBSERVE
  read until documented terminal state
COMMIT CHECKPOINT
  persist remote ID, version, and verified result
```

If the worker stops between execute and checkpoint, the next worker first tries to observe using the persisted token or stable resource identity. If the API offers no lookup path, it may resend the same create request with the same token when the API documents that retry as safe. It does not generate a new token or change the request parameters.

Keep checkpoints semantic:

```json
{
  "database": {
    "phase": "OBSERVING_CREATE",
    "client_token": "71a8...",
    "remote_id": "db-5KT...",
    "last_observed_status": "creating"
  }
}
```

Do not store only a step number. Workflow code changes can give step 4 a different meaning after deployment. Store schema and workflow versions, and migrate active operations deliberately.

## Bound Parallelism and Serialize Conflicts

Two idempotent operations can still conflict if they express different desired states. Serialize mutations per environment or other shared boundary. Use monotonically increasing fencing tokens with leased locks, and require every protected write and checkpoint update to reject stale tokens, so an old worker cannot resume after a new worker takes ownership.

Within one operation, parallelize only independent nodes of the dependency graph. Persist each result independently. When one branch fails, allow safe branches to finish only if that does not increase impact or prevent recovery.

Respect provider rate limits. Retrying every branch at once after throttling creates a retry storm. Use bounded retries, exponential backoff with jitter, provider `Retry-After` guidance, and a shared retry budget.

## Do Not Pretend Infrastructure Has Transactions

Most cloud control planes do not offer an atomic transaction across networks, identities, databases, and DNS. "Rollback everything" is usually another multi-step workflow that can fail.

Choose one of these strategies per step:

- **roll forward** to the intended state;
- **compensate** with a separately designed safe action;
- **retain and quarantine** an orphan until ownership is proven;
- **restore** data from a tested recovery artifact;
- **require human decision** because neither direction is automatically safe.

Compensation is not simply the inverse API call. Deleting a database created during a failed workflow may destroy writes that arrived after it became reachable. Replacing a route may disrupt traffic that already failed over.

Record the rollback boundary explicitly. Once external consumers use the new object, recovery may require forward convergence instead of deletion.

## Understand Terraform's Failure Model

HashiCorp documents that when an apply step errors, Terraform logs the error, updates state with changes made so far, unlocks state, and exits. Terraform does not automatically roll back a partially completed apply. After resolving the cause, create a new plan and apply again to converge.

This behavior is compatible with reconciliation, but it is not magic idempotency. Provider implementations translate create, read, update, and delete calls. An ambiguous or poorly implemented provider create can leave an object that state cannot identify.

For provider authors, write returned state even when earlier sub-operations succeeded and a later sub-operation produced an error. The Terraform Plugin Framework documents that state returned with error diagnostics is still persisted for exactly this type of partial modification. Provider create logic should also return a clear existing-resource error so practitioners import rather than accidentally manage the same object twice.

For practitioners:

- use a remote backend with locking;
- pin provider versions;
- preserve complete apply logs and request IDs;
- inspect live infrastructure and state after errors;
- create a fresh plan instead of replaying an old saved plan;
- use import, refresh-only, or `-replace` only after understanding the exact discrepancy;
- reserve `-target` for exceptional recovery, not routine partial deployment.

## Test Failure at Every Boundary

Inject failure:

- before persisting intent;
- after persisting intent but before the API call;
- after the service accepts create but before the response;
- during asynchronous polling;
- after remote success but before checkpoint commit;
- while renewing the environment lock;
- after one parallel branch succeeds;
- during compensation;
- while the provider is throttling;
- after the automation version changes.

For each point, restart the worker and assert:

- no duplicate object exists;
- a stale worker cannot write;
- the same token and parameters are reused correctly;
- terminal errors do not loop forever;
- ambiguous outcomes remain visible;
- the system converges or stops for a named human decision.

Track duplicate suppression, idempotency parameter mismatches, ambiguous operation age, reconcile attempts, orphan discoveries, compensation frequency, stale-fence rejections, and mean time to convergence.

## Official Documentation

- [Amazon EC2 API idempotency](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html)
- [Google Cloud Storage retry and idempotency guidance](https://cloud.google.com/storage/docs/retry-strategy)
- [Terraform apply errors and partial-state behavior](https://developer.hashicorp.com/terraform/tutorials/cli/apply#errors-during-apply)
- [Terraform state and one-to-one object bindings](https://developer.hashicorp.com/terraform/language/state)
- [Terraform Plugin Framework create behavior](https://developer.hashicorp.com/terraform/plugin/framework/resources/create)
- [Terraform Plugin Framework errors and state persistence](https://developer.hashicorp.com/terraform/plugin/framework/diagnostics#how-errors-affect-state)

## Conclusion

Idempotent infrastructure automation is a reconciliation protocol, not a retry loop. Persist immutable intent and provider tokens before side effects, treat timeouts as ambiguous, use conditional writes, checkpoint observable progress, and design compensation as its own risky workflow. With those controls, a crash becomes another input to convergence instead of a reason to create the same infrastructure twice.
