# Why the `roles` Claim Is Missing from an Entra Access Token

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, App Roles, Access Tokens, Application Permissions, OAuth 2.0, Troubleshooting

Description: Restore a missing Entra roles claim by defining roles on the resource API, assigning the correct principal in the resource tenant, and requesting a fresh token for that API.

---

Microsoft Entra emits an app-role value only when a role exists on the **resource application**, the token's subject has an effective assignment to that role, and the token is issued for that resource. A missing `roles` claim therefore usually means one of those relationships is absent or the application is inspecting the wrong token.

Use this order:

1. verify it is an access token for your API;
2. identify whether the caller is a user or workload;
3. verify the role is defined on the resource app;
4. verify the correct principal is assigned in the resource tenant;
5. request a fresh token; and
6. verify that claim customization has not replaced app roles.

## First: Make Sure This Token Should Contain Your Role

An OIDC sign-in can return an ID token and one or more access tokens. Roles can appear in different tokens according to the scenario:

- roles assigned for a user signing in to an application can appear in that application's ID token;
- roles defined by an API can appear in an access token whose audience is that API;
- Microsoft Graph access tokens carry Graph's contract, not arbitrary roles defined by your client; and
- app-only roles appear in an access token after the client service principal is assigned an application permission for the resource.

Check `aud` before `roles`. If `aud` identifies Microsoft Graph while you expected `Orders.Approver` from your Orders API, the client requested the wrong resource.

Clients should treat access tokens for Microsoft APIs as opaque. Only inspect a custom API token in a secure diagnostic environment when you own and document that token contract.

## User Roles and Application Roles Use Different Assignments

### User or Group Assignment

For a user-facing role:

1. Define the role on the application/API app registration with `allowedMemberTypes` including `User`.
2. Open the corresponding **Enterprise application** in the tenant.
3. Under **Users and groups**, assign the user or group and select the role.
4. Request a new ID token for sign-in or an access token for that API, according to the architecture.

If a user signs in but has no applicable role assignment, Entra has no role value to emit.

### Workload or Application Assignment

For client credentials:

1. Define the role on the resource API with `allowedMemberTypes` including `Application`.
2. Add it to the calling client's API permissions as an **Application permission**.
3. Grant admin consent in the resource tenant.
4. Confirm the resulting app-role assignment from the **client service principal** to the **resource service principal**.
5. Request `{resource}/.default` with `grant_type=client_credentials`.

The token should contain the granted application role in `roles`:

```json
{
  "aud": "resource-api-client-id",
  "azp": "calling-client-id",
  "idtyp": "app",
  "oid": "calling-service-principal-object-id",
  "roles": ["Orders.Read.All"]
}
```

Adding a role with only `User` as an allowed member type does not create an application permission.

## Define the Role on the Resource, Not the Client

Suppose Frontend calls Orders API. There are two registrations:

```text
Frontend registration -> client requesting a token
Orders API registration -> resource accepting a token
```

`Orders.Reader` must be defined by Orders API because that resource owns the authorization contract. Defining it only on Frontend can affect Frontend's own sign-in token but cannot make the role appear in an access token addressed to Orders API.

In the portal, use:

1. **App registrations > Orders API > App roles** to define the role.
2. **Enterprise applications > Orders API > Users and groups** to assign users/groups.
3. **App registrations > Frontend > API permissions** to request application permissions when Frontend is an app-only caller.

Use Application IDs to find related objects and Object IDs for assignments. Display names are not unique.

## Verify the Assignment in the Resource Tenant

App-role assignments are tenant-local. In a multitenant SaaS deployment, an assignment in the publisher's home tenant does not authorize a user or workload in a customer tenant.

Microsoft Graph exposes both directions:

```http
GET /servicePrincipals/<client-sp-object-id>/appRoleAssignments
GET /servicePrincipals/<resource-sp-object-id>/appRoleAssignedTo
```

For each assignment, confirm:

- `principalId` is the expected user, group, or client service principal;
- `resourceId` is the resource service principal;
- `appRoleId` matches the role definition's GUID; and
- the query is authenticated to the tenant issuing the token.

Do not compare `appRoleId` with the human-readable role value. The definition maps the GUID to a value such as `Orders.Read.All`, which is what appears in `roles`.

## Understand Consent vs Assignment

For application permissions, portal admin consent creates the service-principal app-role assignment. For user app roles, assigning the user/group through the enterprise application is the relevant operation.

For delegated API scopes, consent produces `scp` values, not app roles by itself. A user can have a valid delegated token with:

```json
{
  "scp": "Orders.Read"
}
```

and no `roles` claim. That is correct unless the API's policy also requires an assigned app role.

Do not “fix” a missing role by switching from delegated to application permissions without changing the intended actor. The two models have different security authority.

## Acquire a Fresh Token

Tokens are snapshots. An access token issued before a role assignment does not gain a claim when the directory changes.

After assignment:

- sign out/in or force a new interactive token request;
- bypass or clear the appropriate MSAL token cache during a controlled test;
- ensure the client requests your API's scope;
- verify every application replica loaded the intended client/tenant configuration; and
- account for directory propagation without using repeated destructive changes as a diagnostic.

Do not decide that the assignment failed merely because an existing session continues to use an older token.

## Group Assignment Caveats

Group assignment can make user-role management scalable, but test its semantics:

- group-based enterprise-application assignment requires Microsoft Entra ID P1 or P2;
- nested group membership is not universally supported across assignment features;
- token group overage is separate from app-role emission; and
- Microsoft explicitly documents that placing a **service principal** in a group and assigning an app role to that group does not produce a `roles` claim for the service principal.

Assign app roles directly to workload service principals.

## Check Claim Customization

Microsoft Entra group-claim configuration has an option to emit groups as role claims. When enabled, Microsoft states that only group values appear in the role claim; assigned application roles do not also appear there.

If `roles` contains group identifiers or names but not the application values:

1. inspect **Enterprise applications > Single sign-on > Attributes & Claims**;
2. check whether groups are emitted as roles;
3. decide whether the application expects compatibility group values or actual app roles; and
4. use one explicit contract rather than merging ambiguous values.

Custom claims mappings and SAML role-claim configuration can also affect a SAML assertion. Keep SAML troubleshooting separate from JWT access-token behavior.

## Enabled State and Revocation

The app role definition must be valid and available for new assignment. However, disabling a role is not a reliable way to revoke current users. Microsoft documents that existing role assignments remain and the role can continue to pass in tokens even after the role definition is disabled.

To revoke:

1. remove the relevant app-role assignments;
2. prevent new assignments or disable the role as appropriate;
3. acquire fresh tokens; and
4. apply any session/token revocation controls required by the risk model.

## Troubleshooting Matrix

| Symptom | Likely cause | Check |
| --- | --- | --- |
| `aud` is Graph | Wrong resource requested | Client scopes |
| `scp` present, `roles` absent | Delegated permission but no user app role | Enterprise-app user/group assignment |
| App token has no role | Missing application permission/assignment | Client SP to resource SP app-role assignment |
| Role appears in ID token, not API token | Role defined on client rather than API | Resource app registration |
| One tenant works, another does not | Assignment exists only in one tenant | Customer enterprise application |
| User got role before assignment change | Cached token | Force fresh acquisition |
| Group IDs appear in `roles` | “Emit groups as role claims” enabled | Claims configuration |
| Workload SP assigned through group gets no role | Unsupported group-to-SP behavior | Direct SP assignment |

## API-Side Safety

The API must not treat a missing `roles` claim as a default administrator or fall back to trusting any authenticated caller.

Validate:

- exact issuer/tenant model;
- signature and allowed algorithm;
- intended audience;
- lifetime and token version;
- delegated versus app-only identity context; and
- required scope or role for the operation.

Then apply object ownership, tenant isolation, and business policy. A valid `Orders.Reader` role does not grant update permission by implication.

## Official Documentation

- [Add app roles to your application and receive them in the token](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps)
- [Configure the role claim](https://learn.microsoft.com/en-us/entra/identity-platform/enterprise-app-role-management)
- [Protected web API: verify scopes and app roles](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-verification-scope-app-roles)
- [Scopes and permissions in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc)
- [Access token claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)

## Conclusion

A `roles` claim appears only in the token context for which a resource-defined app role is effectively assigned. Verify the token audience, define the role on the API, assign the correct user/group or client service principal in the issuing tenant, and request a fresh token for that API. Keep delegated scopes, user roles, and workload application permissions distinct, and never weaken API authorization because the expected claim is missing.
