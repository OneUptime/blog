# Why a Gel Access Policy Can Hide Every Object

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, Access Policies, Authorization, EdgeQL, Troubleshooting

Description: Debug empty Gel query results by checking default deny, request globals, policy resolution, linked-object visibility, and operation type.

---

When a Gel access policy makes a query return `{}`, the objects may still exist. Select policies filter the visible object set before the query result is produced. That is deliberately different from an `insert` or `update write` policy violation, which raises an `AccessPolicyError`.

The most important rule is easy to miss: when an object type has no access policies, authenticated clients can access it subject to other authorization layers. As soon as any access policy is defined on that type, operations are denied by default unless applicable policies explicitly allow them.

One new write-only policy can therefore make every select return empty.

## Reproduce With the Smallest Schema

Consider a tenant-owned document:

```gel
global current_tenant_id: uuid;

type Tenant {
  required name: str;
}

type Document {
  required title: str;
  required tenant: Tenant;

  access policy tenant_can_read
    allow select
    using (global current_tenant_id ?= .tenant.id);
}
```

With the correct global, the tenant sees its documents. With no global, a different UUID, or a client that never applied the global, the result is empty:

```edgeql
select Document {
  id,
  title
};
```

That empty set is not proof that the table or branch has no data.

## Check the Actual Branch and Role First

Before changing policy logic, confirm the connection target:

```edgeql
select sys::get_current_branch();
select sys::get_version_as_str();
```

Then record the role, DSN source, application environment, and branch selection without logging secrets. A surprising empty result often comes from a clean test branch, not authorization.

On Gel 7 and later, role permissions are a separate authorization mechanism. A role can be blocked by permissions even if an object policy would allow access. Diagnose the connection credential layer and object-policy layer separately.

## Verify Request Globals on the Same Configured Client

The current JavaScript client configures globals by returning a new client object that shares the original connection pool:

```ts
import { createClient } from 'gel';

const pool = createClient();

const tenantClient = pool.withGlobals({
  current_tenant_id: tenantId,
});

const context = await tenantClient.querySingle(`
  select global current_tenant_id;
`);

const documents = await tenantClient.query(`
  select Document { id, title };
`);
```

Common bugs include:

- calling `withGlobals` but running the query on `pool` instead of `tenantClient`;
- using a global name whose module or casing differs from the schema;
- passing `undefined`, `null`, or an unvalidated identity;
- configuring one request and storing that configured client globally;
- creating a new connection pool for every request; and
- setting a global in a REPL session and assuming application sessions inherit it.

Log whether a validated tenant ID was attached, not the full credentials or token. Query the global through the same configured client used for the failing operation.

## Understand Empty-set Boolean Behavior

An optional global with no value is an empty set. Ordinary element-wise comparison with an empty operand also produces an empty set, not `false`:

```edgeql
global current_tenant_id = .tenant.id
```

The access result is still not allowed, but the empty semantics can make more complex expressions surprising. The official policy examples use coalescing comparison:

```edgeql
global current_tenant_id ?= .tenant.id
```

Or coalesce a boolean explicitly:

```edgeql
(global current_user.is_admin ?? false)
```

These operators make absence behavior explicit. Here, `.tenant.id` is non-empty because `tenant` is required, so a missing identity remains denied. Because `?=` considers two empty operands equal, guard the comparison explicitly if its other side can also be empty.

## Inventory Policies by Operation

`allow all` is shorthand for select, insert, update, and delete. A narrower policy applies only to the named operations.

This policy allows inserts but no reads:

```gel
type Event {
  required body: json;

  access policy public_ingest
    allow insert;
}
```

Because the type now has a policy, `select Event` is denied by default. Assuming the schema defines a computed `current_user` global whose target has an `is_admin` property, the corrected `Event` definition adds an explicit select policy:

```gel
type Event {
  required body: json;

  access policy public_ingest
    allow insert;

  access policy admins_read
    allow select
    using ((global current_user.is_admin) ?? false);
}
```

The same rule affects updates. An object that cannot be selected cannot be updated. Gel distinguishes:

- `update read`, which decides which existing objects are eligible; and
- `update write`, which validates the resulting object state.

An `allow update write` policy alone does not make an invisible object selectable for update.

## Apply Policy Resolution in the Right Order

Official documentation defines the resolution model:

1. With no policies on the type, access is allowed.
2. Applicable allow policies form a union.
3. Applicable deny policies subtract from that union and override allows.
4. The final result is intersected across the relevant operation checks.

For example:

```gel
type Document {
  required title: str;
  required tenant: Tenant;
  required archived: bool {
    default := false;
  };

  access policy tenant_reads
    allow select
    using (global current_tenant_id ?= .tenant.id);

  access policy hide_archived
    deny select
    using (.archived);
}
```

The tenant allow does not override `hide_archived`. Deny wins for archived objects.

Check inherited policies too. Subtypes inherit policies from supertypes and may add more, so the policy causing the result may live on an abstract parent rather than beside the concrete type.

## Inspect Visibility of Linked Types

Access policies define the visible object graph, not only top-level queries. If a user may see `Document` but not its linked `Tenant`, an optional link can appear empty. For the required `Document.tenant` link shown here, normal dereference instead raises a `CardinalityViolationError` saying that the required link is hidden by an access policy.

Test each type directly with the same request globals:

```edgeql
select Document { id, title };
select Tenant { id, name };
select Document { id, tenant: { id, name } };
```

The official docs demonstrate a related trap: an admin-only policy on `User` can hide author links from non-admins unless a policy also lets the current user see the appropriate `User` object.

Since EdgeDB 3, policy expressions themselves do not recursively apply other access policies while being evaluated. This avoids policy recursion, but the returned graph and subsequent query paths are still filtered according to policies on their object types. Test the final shaped query, not only a policy expression in isolation.

## Distinguish Filtered Reads From Rejected Writes

Gel's operation order explains different symptoms:

| Operation | Typical denied behavior |
| --- | --- |
| `select` | Restricted objects are absent from the result |
| `delete` | Restricted objects are not selected for deletion |
| `update read` | Restricted objects are not selected for update |
| `insert` | A violating new object raises `AccessPolicyError` |
| `update write` | A violating final state raises `AccessPolicyError` |

`count(Document)` counts the visible set, so `{0}` does not bypass a select policy. A bulk update returning an empty set may mean no visible objects rather than a successful authorization check.

Custom `errmessage` text helps insert and update-write incidents, but it cannot force a select denial to reveal that hidden objects exist. Revealing that distinction could itself leak information.

## Use Policy Bypass Only as an Isolated Diagnostic

Gel offers the `apply_access_policies` configuration parameter and a Gel UI control that can temporarily disable policies for that UI session. Use an administrative, isolated session to establish whether data exists and whether policies cause the difference.

Do not disable policies in the application pool, production DSN, or shared session. Preserve the failing role, globals, and query first, compare results, then restore policy enforcement immediately. The objective is diagnosis, not a workaround.

## Build a Policy Test Matrix

For every protected type, test at least:

- no identity;
- correct owner or tenant;
- a different tenant;
- administrator;
- blocked or archived object;
- subtype objects with inherited policies;
- select, insert, delete, update-read, and update-write behavior; and
- nested shapes containing other protected types.

Run these tests through the real client configuration path so they catch missing `withGlobals` calls. Include an assertion that the base shared client has no request identity and that configured request clients are not reused across requests.

## Official Documentation

- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)
- [Gel globals](https://docs.geldata.com/reference/datamodel/globals)
- [Gel JavaScript client configuration](https://docs.geldata.com/reference/using/js/client)
- [EdgeQL sets and empty values](https://docs.geldata.com/reference/edgeql/sets)
- [Gel permissions](https://docs.geldata.com/reference/datamodel/permissions)
- [Gel server configuration](https://docs.geldata.com/reference/running/configuration)

## Conclusion

An empty result is the expected select-policy denial signal. Check the actual branch and role, verify request globals through the same configured client, enumerate policies by operation and inheritance, apply allow-union and deny-override rules, and test linked types. Never make missing identity permissive merely to turn an empty set into data.
