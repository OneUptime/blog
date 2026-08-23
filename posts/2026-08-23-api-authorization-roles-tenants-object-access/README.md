# How to Test API Authorization for Roles, Tenants, and Object-Level Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Testing, Security, Authorization, Multi-Tenancy, OWASP

Description: Build an API authorization test matrix that covers roles, tenant boundaries, object ownership, sensitive properties, and denied operations.

---

Authorization tests should answer more than whether an administrator receives `200` and an anonymous caller receives an error. Real API policy usually depends on several dimensions at once: the authenticated principal, role or permission, tenant, target object, operation, object ownership, resource state, and sometimes individual properties.

Testing only the happy path leaves three major OWASP API Security risks exposed: broken object-level authorization, broken function-level authorization, and broken object-property-level authorization. A systematic suite varies one policy dimension at a time and proves both allowed and denied outcomes.

## Separate Authentication from Authorization

Authentication establishes who the caller is. Authorization decides what that caller can do to this resource. Keep their test cases distinct:

- no credentials, malformed credentials, and expired credentials test authentication;
- a valid identity with the wrong permission tests function-level authorization;
- a valid identity requesting another user's or tenant's object tests object-level authorization; and
- a valid identity reading or writing a forbidden field tests property-level authorization.

RFC 9110 defines `401 Unauthorized` for requests that lack valid authentication credentials and `403 Forbidden` for a server that understands the request but refuses it. A server may use `404 Not Found` instead of `403` to hide a forbidden resource's existence. Assert the API's documented policy consistently. Do not force every product to reveal resource existence with `403`.

## Model Policy as a Matrix

Before writing requests, list the meaningful actors and resources. For a tenant-aware project API, a small fixture set might contain:

- `tenantAOwner`, who owns a project and can manage it;
- `tenantAViewer`, who can read but not update projects in tenant A;
- `tenantAOutsider`, who belongs to tenant A but is not assigned to a private project;
- `tenantBAdmin`, who is powerful inside tenant B but has no tenant A access;
- `projectAOwned`, owned by the first actor;
- `projectAPrivate`, owned by another tenant A user; and
- `projectB`, owned by tenant B.

Then write expected decisions explicitly:

| Actor | Target | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| tenant A owner | owned project A | allow | allow | allow |
| tenant A viewer | owned project A | allow | deny | deny |
| tenant A outsider | private project A | deny | deny | deny |
| tenant B admin | project A | deny | deny | deny |

This matrix is a policy artifact. Review it with the team that owns authorization rules. The tests should not guess policy from whichever result the implementation currently returns.

## Create Independent, Identifiable Fixtures

Create users, tenant memberships, roles, and resources through documented setup APIs when practical. If a privileged test-support path or database factory is necessary, keep it out of production and make it produce the same relationships the application expects.

Every test should know the authoritative tenant and owner for its target object. Use unique names and IDs per test or worker. Sharing one mutable project among cases makes authorization failures order-dependent: an update or deletion in one test can change the preconditions of another.

Issue credentials separately for each actor. Avoid taking one token and editing JWT claims. A modified token should fail signature verification and does not prove the authorization service correctly handles a legitimately issued role or membership.

## Test Object-Level Access Everywhere an ID Appears

OWASP notes that object identifiers can appear in paths, query parameters, headers, and request bodies. Test each location the API accepts. For every object-taking operation:

1. prove the authorized actor can access its intended object;
2. keep the same actor and replace only the object ID with another user's object in the same tenant;
3. replace it with an object in another tenant;
4. try a syntactically valid but nonexistent ID; and
5. repeat for read, update, delete, and action endpoints.

Do not stop at `GET /projects/{id}`. Common misses include bulk endpoints, exports, file downloads, nested routes, and body references such as `projectId` or `ownerId`. A secure detail endpoint does not compensate for an insecure `POST /reports/export` operation.

Lists require special assertions. A cross-tenant list that returns `200` can still leak rows. Assert that every returned object's tenant is allowed and that known forbidden fixture IDs are absent. Also test counts, search, sorting, pagination, and aggregation endpoints because metadata can leak even when rows are filtered.

## Test Roles and Functions as Denials

Function-level authorization protects operations such as user suspension, billing changes, exports, and administrative configuration. For each protected operation, call the exact HTTP method and path with:

- the intended privileged role;
- every nearby but insufficient role;
- an ordinary authenticated user;
- a privileged user from a different tenant; and
- no valid authentication.

Test alternate methods and equivalent routes. Protecting the UI's `POST` request does not prove a direct `DELETE`, bulk endpoint, or legacy version is protected. OWASP recommends a consistent authorization module that denies access by default rather than relying on controllers to remember each check.

## Verify Property-Level Read and Write Rules

Authorization also applies inside representations. A viewer may be allowed to read a user while fields such as recovery settings, internal risk flags, or billing details remain restricted.

For reads, assert an allowlist or specifically assert sensitive fields are absent. For writes, add forbidden properties to an otherwise valid request and verify both the response and fresh server state. The safe expected behavior may be a clear client error or documented rejection, but silently ignoring a property is acceptable only if that is the contract and the state remains unchanged.

Test writable fields individually. A mass-assignment test that sends ten forbidden properties and receives one error does not show that all ten are protected.

## Keep Each Test to One Changed Dimension

The following Playwright pattern makes a decision table visible. The routes and actors are application-specific and should map to fixtures in the system under test:

```typescript
import { test, expect, APIRequestContext } from '@playwright/test';

type Case = {
  name: string;
  client: APIRequestContext;
  projectId: string;
  expected: number[];
};

for (const c of authorizationCases as Case[]) {
  test(c.name, async () => {
    const response = await c.client.get(`/projects/${c.projectId}`);
    expect(c.expected).toContain(response.status());

    if (response.ok()) {
      const body = await response.json();
      expect(body.id).toBe(c.projectId);
    }
  });
}
```

In production test code, prefer one exact expected status when policy has chosen it. An array can be useful only while the same suite intentionally targets deployments with documented `403` versus concealed `404` behavior. Never accept every `4xx`, because a validation error can hide a missing authorization check.

For denied mutations, capture state before the request and fetch it again afterward with an authorized observer. The denial is correct only if no update, deletion, event, email, or queued side effect occurred.

## Test Tenant Context as Untrusted Input

Applications may select a tenant from a path segment, subdomain, header, token claim, or request property. Treat every client-controlled tenant selector as untrusted. Keep the credential fixed and change the selector to another tenant. Then keep the selector fixed and use credentials from another tenant.

Also test conflicting context, such as a tenant A token with a tenant B path and a tenant C body property. The server should derive or validate one authoritative context and reject ambiguity. A global administrator needs its own explicit cases; do not let that powerful credential become the default for the entire suite.

## Make Failures Actionable and Safe

Record the case dimensions, endpoint, expected decision, actual status, and a sanitized correlation ID. Do not log bearer tokens or sensitive response bodies. If a denial unexpectedly succeeds, capture enough evidence to reproduce it, then clean up any unauthorized mutation with a privileged test fixture.

Run the matrix whenever endpoints, role definitions, tenant resolution, or resource relationships change. Security tests are most useful when policy changes produce a small, reviewable matrix diff rather than an unexplained wave of status changes.

## Official Documentation

- [OWASP API1:2023 - Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP API3:2023 - Broken Object Property Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/)
- [OWASP API5:2023 - Broken Function Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [RFC 9110 Section 15.5.2 - 401 Unauthorized](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2)
- [RFC 9110 Section 15.5.4 - 403 Forbidden](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.4)

## Conclusion

Strong authorization testing starts with an explicit policy matrix and fixtures that represent real roles, tenants, owners, and objects. Prove allowed behavior, then change one dimension to prove denials at function, object, and property levels. Finally, verify that a denied request caused no hidden state change or side effect.
