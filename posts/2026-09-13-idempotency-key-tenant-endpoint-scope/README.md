# Scope Idempotency Keys by Tenant and Endpoint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, Multi-Tenancy, PostgreSQL, API Security, Authorization

Description: Isolate idempotency records with authenticated tenant and operation scope, protect replay authorization, and keep key identity stable across routes and credentials.

---

Two customers can send the same idempotency key. That should not let one customer retrieve the other's order response or prevent the second customer from submitting an unrelated order.

Random keys reduce accidental collisions, but randomness is not an isolation boundary. The server needs an explicit namespace that determines which operations share a key and which are independent.

A useful default for a tenant-based API is `(tenant_id, logical_operation, idempotency_key)`. Build all three components deliberately and use them consistently in the database, application cache, and recovery tools.

## Get the tenant from authenticated context

Authenticate the caller, resolve their authorized tenant, and only then perform the idempotency lookup. A request body field or `X-Tenant-ID` header can identify a requested tenant, but it cannot establish permission to use that tenant.

The request flow should look like this:

```text
authenticate credentials
resolve authorized tenant
authorize the requested operation and target resource
validate the idempotency key and operation inputs
claim or look up (tenant, operation, key)
compare the original request fingerprint
authorize access to any stored result
execute once or replay the permitted response
```

Checking authorization before replay is essential. A user might lose access after the original request, a resource might be transferred, or a credential might be revoked. Possessing a previously valid key must not bypass the current access policy.

For APIs where different users in a tenant have different response visibility, decide whether the scope also needs a stable actor identifier. Alternatively, retain tenant-wide operation identity but gate response disclosure separately. Be explicit about this tradeoff instead of accidentally exposing a tenant administrator's saved response to every member.

## Use a composite database key

```sql
CREATE TABLE scoped_idempotency (
    tenant_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    resource_id text NOT NULL,
    response_status integer NOT NULL,
    response_body bytea NOT NULL,
    PRIMARY KEY (tenant_id, operation, idempotency_key)
);
```

The tuple expresses the namespace directly. A primary key also rejects null scope components, unlike a naive nullable unique constraint. See [PostgreSQL primary and unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

Every read, update, and deletion must constrain the complete tuple:

```sql
SELECT request_hash, resource_id, response_status, response_body
FROM scoped_idempotency
WHERE tenant_id = $1
  AND operation = $2
  AND idempotency_key = $3;
```

Do not look up globally by key and compare the tenant afterward. That approach increases the chance of leaking whether another customer has used the key, especially through error messages, latency, or debug logs.

The schema above stores completed results. An implementation using this table must reserve ownership and perform the local effect atomically, or use an equivalent unique business constraint. A correctly scoped table alone does not fix a check-then-act race.

## Name the operation independently of routing

Use a server-defined value such as `orders.create` or `refunds.create`. Avoid deriving it directly from arbitrary request URLs.

Consider aliases: `/orders` and `/v1/orders` might reach the same operation. If the namespace follows the literal route, a client retry through a newer route could create another order. Conversely, two operations should not share a namespace just because a generic gateway exposes both at `/execute`.

For a resource-specific action, choose whether the target belongs in the scope or the fingerprint. With `(tenant, refunds.create, key)` and a target payment ID in the fingerprint, reusing one key for two payments produces a mismatch. With the payment ID in the scope, it identifies two independent operations. Either can be coherent; clients need one stable contract.

API versions deserve the same care. Cosmetic response changes need not create a new business namespace. A fundamentally different operation may need one. Preserve old namespaces through deployments for as long as clients can retry accepted work.

## Avoid credential and delimiter traps

An API key identifies credentials, not necessarily the business owner. If you scope records by the raw credential ID, rotating credentials can turn a retry into a fresh operation. Resolve credentials to a stable tenant or integration identity instead.

Do not build a cache key by unescaped concatenation:

```text
tenant + ':' + operation + ':' + key
```

If components permit separators, different tuples can produce the same string. Encode a structured array, use length prefixes, or hash a deterministic encoding of the tuple. The encoding is a storage detail; preserve the original tuple in an auditable record.

Set a key length limit and a clear case policy. Treat key bytes as opaque unless your contract explicitly normalizes them. Truncation, case folding, or trimming can merge distinct client keys.

## Add row security as a second boundary

PostgreSQL row-level security can restrict visible tenant rows even when an application query omits a predicate. For a role that receives trusted tenant context from the application:

```sql
ALTER TABLE scoped_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoped_idempotency FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_idempotency
ON scoped_idempotency
USING (tenant_id = current_setting('app.tenant_id', true))
WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
```

Set `app.tenant_id` transaction-locally from authenticated server state on every transaction. A custom setting is not secure against a caller allowed to run arbitrary SQL as that application role. This is defense against application mistakes, within a trusted service boundary.

Use a non-superuser application role without `BYPASSRLS`, and test with that role. PostgreSQL documents that superusers and bypass roles ignore these policies; table owners normally bypass them unless forced. See [row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Prove isolation with adversarial fixtures

Submit the same literal key as two tenants and expect independent resource IDs. Reuse it for two operations and verify the documented namespace behavior. Rotate credentials and confirm the same tenant can replay its original result.

Finally, revoke access before retrying, attempt a forged tenant header, and run a query missing its tenant predicate under the application role. Check the response and database state, including error paths. A successful happy-path replay does not exercise the isolation boundary.

## Conclusion

Scope keys with authenticated business identity and stable operation names. Apply that tuple consistently, recheck authorization on replay, and test tenant isolation with the real application role. That makes key collisions predictable without turning idempotency records into a cross-customer data channel.

## Official Documentation

- [PostgreSQL primary and unique constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
