# How to Prevent Overlapping Cron Runs from Repeating Side Effects with a Stable Business Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, CronJob, Kubernetes, PostgreSQL, Concurrency

Description: Give scheduled work a durable business identity so overlapping runs, delayed executions, and manual retries converge on one database effect and one outbound intent.

---

A monthly billing job starts twice. One execution came from the scheduler; an operator launched the other after seeing a timeout. Both executions have different process IDs, Job names, and start times. They still represent the same invoice for the same customer and billing period.

Preventing duplicate effects starts by identifying that business operation. A lock can reduce overlap, but a durable uniqueness rule must survive the lock, process, and scheduler.

## Define identity independently of execution

For this example, the operation is one subscription invoice per tenant and calendar month. Represent it as three explicit fields:

```text
tenant_id: tenant-42
invoice_kind: subscription
period_start: 2026-08-01
```

The August invoice keeps that identity when it runs in September, after a deployment, or during a manual backfill. A new attempt ID belongs in logs, outside the business key.

Do not derive the billing period from the worker's current clock on every attempt. Persist the requested period when creating work, or calculate it from a documented schedule occurrence. Define the business time zone and how daylight-saving transitions affect intervals. UTC timestamps alone do not define a customer's local billing month.

Also define legitimate corrections. If an August invoice needs adjustment, create a credit or adjustment operation with its own identity and a reference to the original invoice. Appending a random suffix to bypass deduplication silently changes the contract.

## Use scheduler controls to limit overlap

For a Kubernetes CronJob, these fields reduce unnecessary concurrent work:

```yaml
spec:
  schedule: "0 2 1 * *"
  timeZone: "Etc/UTC"
  concurrencyPolicy: Forbid
```

This is a fragment to merge into an existing CronJob. `Forbid` applies to Jobs created by that CronJob; separate CronJobs and manually created Jobs do not share that coordination. Kubernetes also documents approximate scheduling and the possibility of duplicate or missing Job creation. The application still needs idempotency. [Kubernetes CronJob documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)

Kubernetes 1.32 and later annotate the created Job with `batch.kubernetes.io/cronjob-scheduled-timestamp`. That can help recover the intended schedule occurrence. It is a Job annotation, so do not assume it automatically appears in the Pod's environment through the Downward API. Explicitly resolve the owning Job or have orchestration pass the logical period to the worker.

## Make the business record the durable guard

The following PostgreSQL tables record both the invoice and the intent to deliver it:

```sql
CREATE TABLE scheduled_invoice (
    invoice_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id text NOT NULL,
    invoice_kind text NOT NULL,
    period_start date NOT NULL,
    amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
    currency text NOT NULL,
    UNIQUE (tenant_id, invoice_kind, period_start)
);

CREATE TABLE invoice_delivery (
    invoice_id bigint PRIMARY KEY REFERENCES scheduled_invoice(invoice_id),
    delivery_state text NOT NULL DEFAULT 'pending'
);
```

The non-null key columns matter: ordinary unique constraints allow multiple nulls unless configured otherwise. Here every identity component is mandatory. PostgreSQL enforces the composite uniqueness rule across connections and application replicas. [PostgreSQL constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)

Create the invoice and its delivery intent in one statement:

```sql
WITH created AS (
    INSERT INTO scheduled_invoice (
        tenant_id, invoice_kind, period_start, amount_minor, currency
    ) VALUES (
        'tenant-42', 'subscription', DATE '2026-08-01', 2500, 'GBP'
    )
    ON CONFLICT (tenant_id, invoice_kind, period_start) DO NOTHING
    RETURNING invoice_id
)
INSERT INTO invoice_delivery (invoice_id)
SELECT invoice_id FROM created
RETURNING invoice_id;
```

One successful first execution returns an invoice ID. A duplicate returns no row and creates no delivery intent. An error inserting the delivery intent rolls back the invoice insertion too. The example uses a data-modifying CTE to pass the new row through `RETURNING`. [PostgreSQL WITH queries](https://www.postgresql.org/docs/18/queries-with.html)

An identity sequence can advance on a failed or conflicting insertion. Gaps in `invoice_id` do not indicate duplicate invoices; query the business key and committed rows.

## Distinguish a replay from conflicting input

If the insert returned no row, fetch the existing invoice in a subsequent statement:

```sql
SELECT invoice_id, amount_minor, currency
FROM scheduled_invoice
WHERE tenant_id = 'tenant-42'
  AND invoice_kind = 'subscription'
  AND period_start = DATE '2026-08-01';
```

Compare the stored immutable inputs with the requested amount and currency. Matching inputs are a replay. Different inputs are a conflict requiring the correction workflow, not another invoice.

Use a separate statement at Read Committed isolation because a conflicting concurrent insert may prevent insertion even when that row was not visible to the original statement's snapshot. Do not combine the insert and a fallback table read into one CTE and assume it always returns the winner. Handle a missing follow-up row as an error or bounded retry, never as permission to run an unguarded side effect. [PostgreSQL transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)

Keep these invoice identity fields immutable and restrict deletion through the application's normal roles. If a retention process removes the only uniqueness evidence, an old backfill can recreate the effect. Retain a durable business record or tombstone for the period in which repeats must remain forbidden.

## Deliver external effects through their own boundary

The delivery table guarantees one durable local intent. It does not guarantee one external email, charge, or webhook. A delivery worker can send successfully and crash before changing `delivery_state`.

Pass a stable downstream key such as the persisted invoice ID when the recipient supports idempotency. Otherwise use the recipient's supported reconciliation mechanism and expose uncertain outcomes. Do not mark delivery complete before sending merely to suppress retries. AWS's outbox guidance explains why local atomicity still allows duplicate publication. [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## Verify the failure boundaries

Run two database sessions with the same business key and inputs. Hold the first transaction open, start the second, then commit the first. Check that exactly one invoice and one delivery row exist. Repeat with the first transaction rolling back; the second should be able to create the operation.

Then test a changed amount, a different tenant, the next period, and a rerun whose process clock has crossed a month boundary. Inject an error during delivery-intent insertion and confirm neither row persists. Finally, simulate a delivery-worker crash after external acceptance to verify the downstream protection separately.

The useful operational signals are committed invoices, replay attempts, input conflicts, pending-delivery age, and uncertain external outcomes. A successful duplicate check is expected recovery behavior. A second committed effect for one business identity is the failure to investigate.
