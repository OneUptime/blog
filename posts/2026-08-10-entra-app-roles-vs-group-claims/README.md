# Entra App Roles vs Group Claims for Application Authorization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, App Roles, Group Claims, RBAC, Authorization, SaaS

Description: Compare Entra app roles and group claims for portable, least-privilege application authorization, including token size, multitenancy, assignments, and overage.

---

For most new applications, **app roles scale better than raw group claims**. Microsoft recommends app roles as the preferred Microsoft identity platform RBAC approach, and specifically recommends them over groups when an application can define its own authorization vocabulary and does not require nested-group semantics.

Security groups remain useful as an administrative source of assignment. A strong pattern is:

```text
Tenant administrators manage users in security groups
                 |
                 v
Security groups are assigned to application roles
                 |
                 v
Application authorizes stable roles claim values
```

This gives administrators group-based lifecycle management without coupling application code to tenant-specific group IDs.

## The Core Difference

| Property | App roles | Group claims |
| --- | --- | --- |
| Defined by | Application/API | Entra tenant |
| Token claim | `roles` | `groups` |
| Value | Stable application-defined string | Usually tenant-local group Object ID |
| Portability across tenants | High | Low without a per-tenant mapping |
| Token-size risk | Usually small | Subject to overage limits |
| Business meaning | Explicit, such as `Orders.Approver` | Often indirect, based on directory organization |
| Can support users | Yes | Yes |
| Can support workload applications | Yes, when `allowedMemberTypes` includes `Application` | Not as a substitute for app-role assignment |
| Nested group behavior | Only direct members inherit group assignments; nested memberships aren't supported | Can include transitive memberships depending on group-claim configuration |

The model should describe application capabilities, not mirror an org chart by accident.

## How App Roles Work

The resource application defines roles in its app registration. A role includes:

- a unique GUID;
- a display name;
- a stable value that code expects;
- a description;
- allowed member types (`User`, `Application`, or both); and
- an enabled state.

Example role values:

```text
Orders.Reader
Orders.Approver
Orders.Administrator
```

An administrator assigns users or security groups to roles whose `allowedMemberTypes` includes `User`, and client service principals to roles whose `allowedMemberTypes` includes `Application`; these assignments target the resource application's service principal (enterprise application). When Entra issues the relevant token, role values appear in `roles`.

For a user signing into the application, assigned roles can appear in the ID token. When a client requests an access token for an API, roles defined by that API and assigned in the resource tenant can appear in the access token.

For workload access, define an app role with `Application` as an allowed member type. In portal terminology, that app role appears as an **application permission**. Admin consent assigns it to the calling service principal, and a client-credentials token carries the value in `roles`.

## How Group Claims Work

Group claims emit directory memberships, normally as group Object IDs:

```json
{
  "groups": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ]
}
```

The application then maps those IDs to permissions:

```text
(tenant-a, group-1111) -> Orders.Reader
(tenant-a, group-2222) -> Orders.Approver
```

This can work for an internal application tightly aligned to one directory. It becomes operationally expensive for SaaS because every customer has different group IDs and naming conventions.

Group claims also have hard token limits. Microsoft documents limits of 200 groups for JWT and 150 for SAML, with a much lower limit for tokens issued through the implicit flow. When a limit is exceeded, Entra emits an overage indicator instead of the normal group array; implicit-flow overage uses `hasgroups`. The application must then query Microsoft Graph or use a different authorization design.

## Why App Roles Usually Scale Better

### Stable Contract

Application code can consistently require `Orders.Approver` in every tenant. Customers map their own users or security groups to that role. A redesign of the customer's department groups does not require a code release.

### Smaller Tokens

A user might belong to hundreds of directory groups but only two application roles. Compact tokens avoid header-size problems and Graph lookups caused by group overage.

### Least-Privilege Vocabulary

Groups often exist for email, licensing, device policy, projects, and HR organization. Treating those memberships as application authority creates accidental coupling. Roles express the capabilities the application actually enforces.

### Workload Support

App roles model application permissions for service-to-service calls. A client service principal receives a role on the resource API. Raw user group claims do not provide an equivalent app-only permission model.

### Clearer Testing and Reviews

An access review can ask, “Who is Orders.Approver?” rather than requiring reviewers to remember that a group called `OPS-P3-EU` happens to approve invoices.

## When Group Claims Are Reasonable

Use group claims when:

- the application is internal to one tenant;
- existing group membership is the intended source of truth;
- nested group semantics are required and verified;
- the relevant group set is small and overage is handled;
- the app can maintain tenant-scoped mappings safely; and
- administrators need control through established group processes, with token-lifetime delays accounted for.

Even then, emit only relevant groups where practical. Do not send every membership just because the option exists.

## The Hybrid Pattern

For many organizations, the best design uses security groups for administration and roles for the application contract:

1. The API defines `Orders.Reader` and `Orders.Approver`.
2. A customer administrator creates or reuses local security groups.
3. The admin assigns those groups to the appropriate app roles on the enterprise application.
4. Users receive `roles` values in tokens.
5. The API authorizes role values and tenant/resource policy.

Group-based enterprise-application assignment requires Microsoft Entra ID P1 or P2 and supports security groups. Include that in design and procurement decisions.

Nested group memberships aren't supported for group-based assignment to applications. Assign a security group that directly contains the intended users. Microsoft's app-role guidance also documents a specific limitation: adding a service principal to a group and assigning an app role to that group does not cause Entra to include the `roles` claim in tokens issued for that service principal. Assign application roles directly to workload service principals.

## Multitenant SaaS Design

For SaaS, app roles provide a clean boundary:

```text
Publisher defines: Billing.Reader, Billing.Admin

Contoso maps:
  "Contoso Billing Users" -> Billing.Reader

Fabrikam maps:
  "FIN-OPS" -> Billing.Reader
  "FIN-LEADS" -> Billing.Admin
```

The SaaS code validates the issuer/audience, scopes the subject to an onboarded tenant, and checks stable role values. It does not know either customer's group IDs.

If customer-specific policy still needs group membership, store mappings as a tuple of tenant ID and group Object ID. Never treat a group ID as globally meaningful.

## Migration from Groups to Roles

Migrate without an authorization outage:

1. Inventory every group ID the application currently checks.
2. Define a small role vocabulary based on actual capabilities.
3. Add roles to the resource app registration.
4. Assign existing security groups to the new roles in a pilot tenant.
5. Temporarily accept both old group mappings and new role values, with telemetry.
6. Acquire fresh tokens and test direct, nested, and overage users.
7. Move all tenants and remove raw group authorization.
8. Remove unnecessary group-claim configuration and Graph permissions.

Avoid assigning one role for every existing group. That preserves the complexity instead of creating an application model.

## Token and API Checks

At the API:

1. Validate signature, trusted issuer, audience, lifetime, and token version.
2. Establish whether the request is delegated or app-only.
3. Require the documented scope and/or app role for the operation.
4. Apply tenant, resource ownership, and business policy.
5. Deny unknown role values.

For example:

```text
GET /orders:
  delegated -> require Orders.Read scope plus record policy
  app-only  -> require Orders.Reader role

POST /orders/{id}/approve:
  delegated -> require Orders.Approve scope and Orders.Approver role/policy
  app-only  -> reject unless explicitly designed for workload approval
```

Role presence does not remove the need for object-level authorization.

## Common Mistakes

### Using display names in group authorization

Names are mutable and not unique. Use tenant-scoped Object IDs, or map groups to app roles.

### Defining roles on the client instead of the API

For an access token, define roles on the resource API registration. Assign principals to the resource enterprise application's roles.

### Expecting a Graph token to carry your API roles

Microsoft Graph owns Graph tokens. Request a token for your API and validate roles there.

### Emitting groups as the role claim

Entra can emit groups as role claims for compatibility. Microsoft warns that in this mode only groups appear in the role claim; assigned app roles do not also appear. Do not enable it when code expects both.

### Using role disable as revocation

Microsoft documents that existing assignments can continue to emit a disabled app role. Remove the assignments when revoking authority; newly issued tokens will then omit the role. Already-issued access tokens can remain usable until they expire.

## Official Documentation

- [Add app roles to your application and receive them in the token](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps)
- [Implement role-based access control in applications](https://learn.microsoft.com/en-us/entra/identity-platform/howto-implement-rbac-for-apps)
- [Configure group claims for applications by using Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims)
- [Restrict a Microsoft Entra app to a set of users](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)

## Conclusion

Use app roles as the application's stable authorization language, especially for SaaS, large directories, and workload clients. Use security groups as an administrative mechanism and assign them to roles when licensing and membership semantics support it. Raw group claims remain useful for tightly scoped internal scenarios, but require tenant-specific mappings, overage handling, and careful control of names and nesting.
