# Why “Grant Admin Consent” Does Not Limit an Entra App to One User

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, Admin Consent, Enterprise Applications, User Assignment, OAuth 2.0, Application Permissions

Description: Separate tenant-wide API consent from user access assignment so approving an Entra application does not accidentally become an access-control decision.

---

The **Grant admin consent** button approves an application's requested API permissions for a tenant. It does not mean “let only this administrator use the app,” and it does not create a one-user allowlist. Consent answers whether the client may exercise specified API permissions; user assignment answers who may sign in to the enterprise application.

If an administrator approves a consent request submitted by one employee, the resulting tenant-wide grant can apply beyond that employee. Microsoft explicitly recommends requiring user assignment when tenant-wide admin consent should coexist with a limited user population.

## Consent Grants Authority to a Client

In OAuth, the client asks to access a resource API. Microsoft Entra records permission grants between the client service principal and the resource service principal.

The effect depends on permission type:

| Permission | Admin-consent effect | Token context |
| --- | --- | --- |
| Delegated permission | Can approve scopes on behalf of users in the organization | Client acts with a signed-in user |
| Application permission | Assigns an API app role to the client service principal | Client acts as itself, with no user |

For delegated permissions, the user's own data access and the API's policy still matter. Tenant-wide consent does not automatically elevate every user to an administrator. It does, however, mean users do not each need to approve the same delegated permissions before the client can request them.

For application permissions, there is no signed-in user to limit the request. The service principal's granted app roles define the app-only authority. If an app receives a broad Microsoft Graph application permission, the human who clicked consent is not the token subject and is not a boundary on which directory objects the app may access.

## Why the Requestor Is Not an Assignment

The admin consent workflow records who requested approval and lets authorized reviewers evaluate the application and permissions. Approving the request grants consent. Microsoft documents that approval allows users in the tenant to access the application unless access is separately restricted through user assignment.

The requestor is workflow context, not an access-control list. Otherwise, organizations could not centrally preapprove an application for a department or the whole company.

The same applies when an admin opens **App registrations > API permissions** and selects **Grant admin consent for \<tenant\>**. The operation acts for the organization; it is not scoped to the signed-in administrator merely because that administrator performed it.

## Consent and Sign-In Are Separate Planes

Use the enterprise application's **Assignment required?** property and its **Users and groups** assignments to restrict who can obtain access through Microsoft Entra:

1. Open **Entra ID > Enterprise applications**.
2. Select the application's service principal in the correct tenant.
3. Under **Properties**, set **Assignment required?** to **Yes**.
4. Under **Users and groups**, assign only the approved users or groups.
5. Test with one assigned and one unassigned account.

Microsoft also exposes the service-principal property as `appRoleAssignmentRequired` through Microsoft Graph.

When assignment is required, users and services must be assigned appropriately before they can sign in or obtain a token for the resource. For a user-facing application, an unassigned user typically receives an assignment-related failure rather than a consent prompt.

Microsoft documents one important exception: the user-assignment requirement doesn't apply to Global Administrators. Do not treat assignment required as an absolute boundary for those highly privileged accounts.

Group-based enterprise-application assignment requires Microsoft Entra ID P1 or P2. Verify current licensing before designing a group-only onboarding process. Individual assignment and the exact capabilities available can vary with the application's integration type and subscription.

## A Concrete Example

Suppose the Expense Portal requests delegated Microsoft Graph permissions:

```text
User.Read
Files.Read
```

An employee in Finance asks for the app, and an administrator grants tenant-wide admin consent.

Without assignment required:

- other users can potentially sign in to the Expense Portal;
- they are not prompted to consent again for those approved scopes;
- delegated Graph calls remain constrained by each signed-in user's Graph access; and
- the Expense Portal itself must still authorize which users may use expense features.

With assignment required and only the Finance group assigned:

- the tenant-wide permission grant still exists;
- assigned Finance users can sign in without individual consent;
- unassigned users are blocked by Entra at the enterprise application; and
- the application should still enforce its own roles and business authorization.

Consent grants and assignments remain separate directory objects: changing one does not create or remove the other. However, requiring assignment disables individual user consent, so an administrator must grant the app's needed permissions.

## What If Exactly One User Needs Delegated Access?

There are two distinct designs.

### Tenant-Wide Consent Plus One Assignment

If the permission requires administrator approval but only one user should enter the app, an administrator can grant tenant-wide consent, enable assignment required, and assign that user. This is easy to operate, but the permission grant itself remains tenant-wide. Review the service principal and assignments as one control set.

### Principal-Specific Delegated Consent

Microsoft documents that an administrator can use Microsoft Graph to grant delegated consent on behalf of a specific user rather than the whole organization. This is an `oauth2PermissionGrant` with a principal-specific consent model.

Use this only when the API permission, tenant policy, and operational tooling support the intended design. It does not replace application sign-in authorization, and it is not how application permissions work. App-only permissions attach to the client service principal and have no user principal to scope them to.

For most managed enterprise applications, tenant-wide approval plus explicit assignment is clearer than manually maintaining user-specific grants.

## Admin Consent Does Not Guarantee Application Authorization

Even an assigned user with approved consent should not automatically be allowed to perform every operation inside the application. Entra determines authentication and token issuance; the application or API still needs business authorization.

Use app roles or an application-owned authorization store for capabilities such as:

- expense submitter versus approver;
- read-only versus administrator;
- tenant or department boundary;
- record ownership; and
- separation of duties.

Do not use the identity of the consent administrator as an implicit “owner” claim. That relationship is not part of the access token's authorization contract.

## Application Permissions Need Extra Care

Application permissions are frequently misunderstood because administrators encounter them on the same API permissions screen as delegated scopes. In client credentials, an `application/x-www-form-urlencoded` token request body looks like:

```text
client_id=<application-client-id>&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=<url-encoded-secret>&grant_type=client_credentials
```

There is no username. The token represents the client service principal. If the granted Graph role permits organization-wide data access, assigning one user to the app's sign-in experience does not necessarily narrow the daemon's app-only API authority.

Where an API offers a resource-specific application access policy, use it when appropriate, but do not assume every API supports one. Start with the least privileged application permission, prefer delegated access when a user is genuinely present, and monitor service-principal sign-ins.

## Verify the Result Instead of Trusting the Button

After changing consent or assignment:

1. Review **Enterprise applications > Permissions** and confirm whether grants are delegated or application permissions.
2. Review **Users and groups** and the **Assignment required?** value.
3. Acquire a fresh token through the intended flow.
4. For an API you control, validate the token audience and expected `scp` or `roles` claims at the API. Treat access tokens for Microsoft-owned APIs such as Microsoft Graph as opaque; decode them only as a debugging aid, and never log the raw token.
5. Test assigned and unassigned users.
6. Separately test app-only authentication if the service uses client credentials.
7. Review sign-in logs in the correct category: interactive/noninteractive user, service principal, or managed identity.

Existing consent grants remain after changing tenant user-consent policy. Revoke unwanted grants explicitly; tightening future user-consent settings is not retroactive.

## Common Misconceptions

### “The admin consent request was opened by Alice, so only Alice is approved”

The requestor is workflow metadata. Tenant-wide approval is broader unless assignment or another access policy narrows use.

### “Assignment required limits an app-only Graph token to assigned employees”

App-only authority belongs to the client service principal, not an employee. Control its application permissions and any API-specific workload restrictions directly.

### “Removing a user assignment revokes the permission grant”

Assignment and consent are different directory objects. Review and revoke each independently.

### “Disabling user consent removes prior consent”

Microsoft states that changes to user-consent settings affect future operations. Existing permission grants remain until revoked.

## Official Documentation

- [Application consent management and evaluation of consent requests](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-consent-requests)
- [Review and take action on admin consent requests](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/review-admin-consent-requests)
- [Restrict a Microsoft Entra app to a set of users](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users)
- [Manage users and groups assignment to an application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal)
- [Configure how users consent to applications](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent)
- [Overview of permissions and consent](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)

## Conclusion

Grant admin consent approves API permissions; it does not select one user. To limit sign-in, enable assignment required and assign the intended users or groups, while retaining application-level authorization. Treat app-only permissions separately because no user participates in client credentials. Review consent, assignments, and workload authority as three related but independent controls.
