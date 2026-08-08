# Pass Per-request User Context to Gel Access Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, Access Policies, Global, TypeScript, Connection Pooling

Description: Use a shared Gel connection pool with request-scoped client clones so access-policy identity cannot leak between concurrent users.

---

Gel access policies commonly read a global such as `current_user_id`. In a web service, that value must change per request while the underlying database connections are pooled and reused.

Do not mutate session state on whichever pooled connection happens to be checked out. Create one base client for the process, validate the caller, and use `withGlobals` to derive a request-scoped client. The Gel JavaScript client documents that this returns a new client object while sharing the base client's connection pool.

This gives each query explicit context without creating a pool per user or retaining one user's identity on a shared client object.

## Define an Optional Identity Global

UUID globals keep authentication identity and tenant context separate from application objects:

```gel
global current_user_id: uuid;
global current_tenant_id: uuid;

type User {
  required email: str {
    constraint exclusive;
  };
}

type Document {
  required title: str;
  required owner: User;

  access policy owner_access
    allow all
    using (global current_user_id ?= .owner.id);
}

type AuditEntry {
  required action: str;
  required document_id: uuid;
}
```

The globals are optional by default. An unauthenticated request leaves `current_user_id` empty, and the coalescing equality `?=` makes the comparison false rather than producing a surprising empty boolean. The policy still denies access, as it should.

You can define a computed object global for convenience:

```gel
global current_user := (
  select User
  filter .id = global current_user_id
);
```

Keep the raw identity global as the request input. Do not accept an arbitrary object ID from the request body as proof of identity.

## Create One Base Client

Instantiate the process-level pool in a server-only module:

```ts
import { createClient } from 'gel';

export const gelPool = createClient();
```

The official client reference says each `createClient()` call creates a connection pool. Creating one per HTTP request wastes connections and can overwhelm the server. A long-lived base client lets the server control or negotiate useful concurrency.

The base client should remain unconfigured with user identity. It is suitable only for operations deliberately allowed without that global or for deriving scoped clients.

## Derive a Client Inside Each Request

A request handler should validate the authentication token first and then derive its data client:

```ts
import { gelPool } from './gel-pool';

type Identity = {
  userId: string;
  tenantId: string;
};

export async function listDocuments(request: Request) {
  const identity: Identity = await authenticate(request);

  const db = gelPool.withGlobals({
    current_user_id: identity.userId,
    current_tenant_id: identity.tenantId,
  });

  return db.query(`
    select Document {
      id,
      title
    }
    order by .title;
  `);
}
```

`withGlobals` does not open a new pool. The returned client carries the supplied globals with its operations while sharing the base pool.

Do not assign the derived client back to a module-level variable:

```ts
// Unsafe design: concurrent requests can replace global process state.
sharedClient = sharedClient.withGlobals({
  current_user_id: identity.userId,
});
```

Keep `db` in the request's lexical scope and pass it explicitly to service functions.

## Pass Context, Not a Hidden Singleton

Make database context a parameter:

```ts
import type { Client } from 'gel';

async function loadDocument(db: Client, id: string) {
  return db.querySingle(
    `
      select Document {
        id,
        title
      }
      filter .id = <uuid>$id;
    `,
    { id },
  );
}
```

Then the request handler passes its configured client:

```ts
const db = gelPool.withGlobals({
  current_user_id: identity.userId,
});

return loadDocument(db, documentId);
```

This design is testable: a test can inject a client configured for an owner, another user, or no identity. It also makes code review reveal whether a protected query accidentally uses the unscoped pool.

## Start Transactions From the Scoped Client

When several statements must be atomic, call `transaction` on the request client so its globals are part of the transaction context:

```ts
const db = gelPool.withGlobals({
  current_user_id: identity.userId,
});

const result = await db.transaction(async (tx) => {
  const document = await tx.queryRequiredSingle(
    `
      update Document
      filter .id = <uuid>$id
      set { title := <str>$title }
    `,
    { id: documentId, title: newTitle },
  );

  await tx.execute(
    `
      insert AuditEntry {
        action := 'document.title.changed',
        document_id := <uuid>$id
      }
    `,
    { id: documentId },
  );

  return document;
});
```

The JavaScript client can retry a transaction callback after a retryable network or serialization error. Do not send email, publish a message, charge a card, or perform another non-idempotent external side effect inside that callback. Store an outbox record in the transaction and process it separately.

## Do Not Use `set global` as Request Middleware

The EdgeQL REPL supports session commands such as:

```edgeql
set global current_user_id :=
  <uuid>'00ea8eaa-02f9-11ed-a676-6bd11cc6c557';
```

That is useful interactively. It is a poor abstraction for request identity on a pooled application client. A pool may use different physical connections for later statements, and session state can outlive the request on a reused connection if managed incorrectly.

`withGlobals` lets the client carry configuration with the logical operation. It is the documented application API and shares pool resources safely.

## Treat Authentication and Authorization as Separate Proofs

An access policy trusts the global value supplied to it. It does not prove that a bearer token belongs to that UUID. For application-managed authentication, validate the credential according to its protocol, including its signature, issuer, audience, and expiry where applicable, and enforce any session or revocation rules before deriving the client.

Follow these rules:

- derive user ID from validated authentication state, never a query parameter;
- validate tenant membership before attaching a tenant global, or make the policy prove membership;
- do not let clients provide admin booleans directly;
- use separate server credentials for trusted administrative work;
- keep service credentials and DSNs out of browser bundles; and
- avoid logging tokens, DSNs, or full global maps.

Gel Auth accepts its `auth_token` through the `ext::auth::client_token` global and exposes the authenticated identity as the computed global `ext::auth::ClientTokenIdentity`. If using it, follow the current Auth integration guide rather than parsing its internal JWT yourself.

## Avoid Accidental Context Merging

The client docs say globals supplied to `withGlobals` are merged with globals already configured on that client. This is useful for layering trusted context, but dangerous when deriving from an already user-scoped client.

Prefer this shape:

```ts
const requestDb = gelPool.withGlobals({
  current_user_id: identity.userId,
  current_tenant_id: identity.tenantId,
});
```

Avoid caching `requestDb` and later deriving another user's client from it. Always derive request identity from the known-clean base pool.

If a background job has a different authorization model, give it an explicit function and credential instead of inventing a sentinel user UUID.

## Test for Concurrency Leaks

A sequential happy-path test will not catch shared-state bugs. Run concurrent requests with different identities:

1. Create documents for users A and B.
2. Start many interleaved reads for both users through the same base pool.
3. Assert that A never sees B's IDs and B never sees A's IDs.
4. Run unauthenticated requests and assert an empty result or expected denial.
5. Exercise transactions from each scoped client.
6. Verify the base pool itself has no `current_user_id`.

Also test a request that throws before the query and one that is cancelled. Lexically scoped configured clients require no identity cleanup because the shared base object was never mutated.

## Version-aware Naming

Current JavaScript applications import `createClient` from `gel`; legacy EdgeDB applications imported it from `edgedb`. Current server and connection environment variables use the `GEL_*` prefix, while versions before Gel 6 use `EDGEDB_*`. The request-scoping pattern is the same, but update package and configuration names according to the server and client generation actually deployed.

## Official Documentation

- [Gel JavaScript client and `withGlobals`](https://docs.geldata.com/reference/using/js/client)
- [Gel globals](https://docs.geldata.com/reference/datamodel/globals)
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies)
- [Gel Auth integration](https://docs.geldata.com/reference/auth)
- [Gel connection parameters](https://docs.geldata.com/reference/using/connection)

## Conclusion

Create one unscoped base client, authenticate each request, derive a request-local client with `withGlobals`, and pass that client explicitly through the call graph. Start transactions from the scoped client and keep external side effects outside retryable callbacks. This preserves connection pooling without turning user identity into mutable process or connection state.
