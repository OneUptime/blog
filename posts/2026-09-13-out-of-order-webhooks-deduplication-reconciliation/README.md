# Handle Duplicate Webhooks That Arrive Out of Order

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, Stripe, Event Processing, PostgreSQL, Data Consistency

Description: Separate event deduplication from ordering, reject stale versioned updates, and reconcile Stripe objects without letting older workers overwrite newer local state.

---

Your handler applies an event that marks a subscription canceled. A minute later, a delayed event arrives with an older active snapshot. Its event ID is new, so deduplication allows it through and the handler restores access incorrectly.

Nothing failed in the duplicate check. The mistake was treating a previously unseen event as the newest state.

Reliable webhook processing needs separate answers to three questions: have we accepted this delivery, should this information change current state, and has the resulting business action already happened?

## Choose an ordering strategy from the source contract

Different payloads support different processing rules:

| Payload contract | Suitable approach |
| --- | --- |
| Snapshot with a monotonic object revision | Apply only a newer revision |
| Ordered delta with a sequence number | Require the next sequence and recover gaps |
| Notification with no reliable revision | Retrieve current source state and reconcile |
| Independent immutable business fact | Apply once under the fact's business identity |

A snapshot can sometimes skip intermediate revisions because it replaces the full relevant state. A delta such as increment inventory cannot safely skip an earlier sequence merely because a later number is larger.

Stripe does not guarantee event delivery order and specifically warns against using snapshot event `created` timestamps for ordering: different events can share a second. See [Stripe event ordering](https://docs.stripe.com/webhooks#event-ordering). Do not sort Stripe event IDs lexically and assume they encode a sequence either.

## Use conditional updates when real revisions exist

For a provider that explicitly supplies a monotonic per-object revision, retain that revision with the projection:

```sql
CREATE TABLE versioned_projection (
    source_scope text NOT NULL,
    object_id text NOT NULL,
    source_revision bigint NOT NULL,
    state jsonb NOT NULL,
    PRIMARY KEY (source_scope, object_id)
);

INSERT INTO versioned_projection AS current (
    source_scope, object_id, source_revision, state
) VALUES ($1, $2, $3, $4::jsonb)
ON CONFLICT (source_scope, object_id)
DO UPDATE SET
    source_revision = EXCLUDED.source_revision,
    state = EXCLUDED.state
WHERE current.source_revision < EXCLUDED.source_revision
RETURNING object_id;
```

PostgreSQL evaluates the conditional update against the conflicting row as part of its [ON CONFLICT update behavior](https://www.postgresql.org/docs/current/sql-insert.html). Equal or older revisions make no change.

The revision must come from a source guarantee. The example does not turn Stripe's event timestamp into a safe revision. If equal revisions arrive with conflicting state, record that inconsistency for investigation rather than silently choosing one representation.

## Reconcile Stripe state from an accepted notification

For an ordinary subscription status projection, an accepted webhook can mean this subscription needs refreshing. Retrieve the current subscription using the account context associated with that event; Stripe provides a [retrieve subscription API](https://docs.stripe.com/api/subscriptions/retrieve).

Keep the verified original event for audit and use a durable work record to track refresh demand. Do not make the webhook request wait for all downstream API work.

```sql
CREATE TABLE object_refresh (
    source_scope text NOT NULL,
    object_id text NOT NULL,
    requested_generation bigint NOT NULL DEFAULT 1,
    applied_generation bigint NOT NULL DEFAULT 0,
    state jsonb,
    PRIMARY KEY (source_scope, object_id)
);
```

When a new event ID is atomically accepted into your inbox, insert or update this row in the same transaction:

```sql
INSERT INTO object_refresh AS current (source_scope, object_id)
VALUES ($1, $2)
ON CONFLICT (source_scope, object_id)
DO UPDATE SET
    requested_generation = current.requested_generation + 1;
```

This counter is local work coordination, not a Stripe object version. Duplicate delivery of an already-accepted event need not increment it. A periodic reconciliation job can deliberately increment it to request another refresh.

## Prevent a stale worker from completing newer work

Workers poll rows where `applied_generation < requested_generation`. A worker reads a target generation, fetches the source object with bounded retries, and then attempts this update:

```sql
UPDATE object_refresh
SET state = $4::jsonb,
    applied_generation = $3
WHERE source_scope = $1
  AND object_id = $2
  AND requested_generation = $3
  AND applied_generation < $3
RETURNING object_id;
```

If another webhook arrived during the fetch, `requested_generation` advanced and the update affects no rows. The object remains dirty, so a worker fetches again for the newer generation. If two workers fetched for the same generation, only one can mark it applied.

Avoid a separate step that marks every queued refresh complete after an old fetch. That can erase a notification that arrived while the request was in flight. The conditional update ties completion to the exact generation that was observed.

The counter does not prove that a remote API snapshot can never be stale. It prevents a specific local overwrite race. Use per-object worker coordination where helpful and periodic reconciliation to converge after delayed events, transient source behavior, or missing notifications. Treat failures as outstanding work, not as evidence that the object was deleted.

## Protect effects separately from projections

A current subscription projection can be safely refreshed many times. Sending a fulfillment email or issuing a credit requires a different boundary.

Use an action table with a unique business identity, such as `(source_scope, invoice_id, fulfillment_action)`. Create that action and its outbox command atomically when the business condition is satisfied. A later reconciliation can update state without creating another action for the same invoice.

Do not assume every domain has an irreversible status ladder. Some states legitimately return to active, and cancellation scheduling differs from completed cancellation. Encode the source's actual business lifecycle rather than imposing a generic rank such as active less than canceled.

Retain events that are accepted but still pending dependency resolution. If an invoice notification arrives before a subscription notification, fetch the required objects or retry durable work. A missing local row should not cause the handler to acknowledge and discard the event forever.

## Test deliberate disorder

Feed snapshots in revision order `3, 1, 2, 3` and verify that a versioned projection remains at `3`. For notification-driven refreshes, pause worker A after reading generation 1, accept another event to create generation 2, then resume A. Its update must affect zero rows.

Also test two workers at generation 2, duplicate deliveries, retrieval failures, deleted objects, and a periodic refresh after an intentionally omitted webhook. Inspect both the projection and the count of business actions.

## Conclusion

Deduplicate event delivery, apply source-appropriate ordering rules, and give business effects their own durable identity. Where the provider has no reliable revision, reconcile current state and guard worker completion with local generations. That prevents an old unique event from becoming an accidental rollback of newer business state.

## Official Documentation

- [Stripe webhook event ordering](https://docs.stripe.com/webhooks#event-ordering)
- [Stripe retrieve subscription API](https://docs.stripe.com/api/subscriptions/retrieve)
- [PostgreSQL INSERT and conditional conflict updates](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
