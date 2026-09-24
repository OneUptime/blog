# How to Handle Client Writes That Time Out During a Leader Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Failover, Idempotency, Database, High Availability

Description: Resolve ambiguous commits during leader failover using stable operation identities, atomic deduplication, bounded retries, and recovery-aware reconciliation.

A write timeout during failover does not tell you whether the database committed. The old leader might have rejected the request, committed before losing its response, or committed a transaction that never reached the promoted follower.

Reconnect and retry is therefore only a transport strategy. The application also needs a durable operation identity, a way to distinguish known rollback from an unknown outcome, and a policy for writes absent from the new database history.

## Classify evidence before choosing a retry

| Observed result | Interpretation | Application action |
| --- | --- | --- |
| Request rejected before execution | No protected effect started | Correct or retry according to the error |
| Confirmed transaction abort | This attempt did not commit | If the error is retryable, retry the whole operation within its deadline; otherwise correct or report the error |
| Successful commit response | Acknowledged under the active durability policy | Preserve the result |
| Connection lost or timeout around commit | Outcome unknown | Reconcile using the original operation identity |

A PostgreSQL serialization failure has a defined retry path: repeat the complete transaction, including the logic that chose its statements and values. The [serialization-failure documentation](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html) also distinguishes deadlocks and errors that may not be transient.

Do not infer rollback from a client deadline. Cancellation and lost connections do not supply the same evidence as a confirmed abort response.

## Make retries refer to the same intent

Generate an operation ID before sending the first attempt and persist it in the client or initiating workflow. Reuse it with the same payload after reconnection. An attempt number can change for logging, but the business identity must remain stable.

A PostgreSQL table for a local database operation might be:

```sql
CREATE TABLE operation_results (
    tenant_id bigint NOT NULL,
    operation_id uuid NOT NULL,
    request_fingerprint text NOT NULL,
    response jsonb,
    PRIMARY KEY (tenant_id, operation_id)
);
```

Scope the key to the appropriate tenant and operation type; include the endpoint or business action in the fingerprint or key schema. Define canonical payload hashing, retention, and payload-mismatch handling as part of the API contract.

## Claim, mutate, and save the result atomically

Run the claim and business mutation in one transaction on the authoritative writer. For a `READ COMMITTED` implementation, the outline is:

```text
BEGIN
INSERT operation identity and fingerprint
    ON CONFLICT DO NOTHING
    RETURNING operation_id

if this transaction inserted the identity:
    perform the database business mutation
    save the complete replayable response
else:
    SELECT the stored fingerprint and response in a new statement
    reject mismatched payloads
    replay the completed matching result
COMMIT
send the saved response
```

`ON CONFLICT` uses the unique constraint to arbitrate concurrent attempts. PostgreSQL's [INSERT reference](https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT) documents that behavior. The separate follow-up statement matters because a conflict can be detected against a row that was not visible to the original statement snapshot.

The winner must never commit the placeholder row without its completed result. Any failure before completion rolls back the claim and mutation together. Do not delete live deduplication records during the retry window. If a completed row is unexpectedly absent or incomplete, stop and reconcile; do not bypass the claim.

This pattern protects effects inside that database transaction. It does not atomically include an HTTP payment request or an email already delivered elsewhere.

## Reconnect to the current authority

Discard broken connections and refresh role-aware service discovery. libpq supports multiple hosts and `target_session_attrs=read-write`:

```text
host=pg-a.internal,pg-b.internal,pg-c.internal
dbname=app
user=app
target_session_attrs=read-write
connect_timeout=3
```

Configure authentication and TLS separately for the deployment. The [libpq connection documentation](https://www.postgresql.org/docs/current/libpq-connect.html) explains host selection and that connection timeouts apply separately to candidate hosts.

The read-write check is a connection filter, not fencing or proof of current leadership. A stale unfenced primary can still appear writable. The HA system must establish one effective writer before the client trusts the new route.

Use an overall monotonic-clock deadline, exponential backoff with jitter, and a retry budget. Reconnect once per failed attempt rather than making thousands of waiting requests immediately probe every database host. Return a durable pending operation reference when interactive waiting ends.

## Account for data lost during promotion

After an asynchronous failover, absence on the new primary does not prove the operation never happened. The old primary may have committed both the business row and the deduplication record, then lost both from the selected history.

If every relevant effect lives only in the authoritative database history, reexecution may be the chosen recovery policy after fencing. External observers or side effects make that decision harder: a payment provider may already have charged the customer even though the new database has no record.

For external work, use a transactional outbox or durable intent and preserve the same downstream idempotency key. Reconcile the provider's state before declaring failure or initiating a new business action. Choose replication durability that covers the intent and deduplication records as well as the primary business tables.

Synchronous replication narrows the loss problem but does not remove unknown responses. PostgreSQL's [synchronous-replication discussion](https://www.postgresql.org/docs/current/warm-standby.html#SYNCHRONOUS-REPLICATION) distinguishes successful client acknowledgment from transactions still waiting when failure occurs.

## Test each uncertain boundary

Inject failures before the claim, after mutation but before commit, after commit but before response, and during external delivery. Repeat them during failover with delayed replication. For each stable operation ID, compare the client result, authoritative database result, deduplication record, and any external effect.

Track unresolved age, replay count, payload conflicts, and operations requiring manual reconciliation. A recovered connection is useful, but the incident is resolved only when the application can explain what happened to the user's original intent.
