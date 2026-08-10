# Entra Admin Consent vs User Assignment: How to Control Permissions and Sign-In Separately

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Entra ID, Admin Consent, User Assignment, Enterprise Applications, OAuth 2.0, Access Control

Description: Use Entra consent to approve API authority and enterprise-application assignment to control who can sign in, without treating either control as a substitute for the other.

---

Admin consent and user assignment protect different boundaries in Microsoft Entra ID:

- **Consent** authorizes a client application to access a resource API under specified permissions.
- **Assignment** binds a user, group, or service principal to an enterprise application, optionally in an app role; when assignment is required, those assignments form the Entra-enforced access allowlist.

An application often needs both. Consent without assignment can approve API use for a larger population than intended. Assignment without consent can let a user reach the application but leave its API calls failing with insufficient privileges.

## The Two Control Planes

| Question | Admin consent | User or service assignment |
| --- | --- | --- |
| What does it answer? | May this client use these API permissions? | May this principal access this app, and in which app role? |
| Main objects | `oAuth2PermissionGrant` for delegated grants; `appRoleAssignment` for application permissions | `appRoleAssignment` to the resource application's service principal |
| Managed from | App registrations or Enterprise applications permission views and consent workflows | Enterprise applications > Users and groups, or Microsoft Graph |
| Does it restrict sign-in by itself? | No | Yes, when assignment is required and Entra governs the sign-in |
| Does it grant API permissions by itself? | Yes: delegated scopes or application app roles, depending on permission type | It doesn't grant delegated scopes; an app-role assignment is itself the role grant for that resource |
| Is a signed-in user required? | Delegated consent: yes at runtime; application permission: no | User/group assignment for interactive access; service-principal assignment for workload access |

The reuse of `appRoleAssignment` in both app permissions and enterprise-app role assignments can make the model look circular. Always identify the **principal**, **resource service principal**, and **app role** in the assignment.

## What Admin Consent Changes

Admin consent is necessary when:

- a delegated permission is classified as administrator-only;
- tenant user-consent policy prevents the user from approving the request;
- an administrator intentionally preapproves delegated permissions for the organization; or
- a client needs application permissions for app-only access.

For delegated permissions, tenant-wide admin consent means users do not individually approve those scopes. Their runtime calls are still made in user context and remain subject to the user's own access and resource policy.

For application permissions, consent assigns app roles from the resource API to the client service principal. The workload then requests an app-only token using client credentials and the resource's `.default` scope.

Admin consent is sensitive because it can authorize broad data operations. Review the verified publisher, redirect URIs, requested permissions, business purpose, owners, credentials, and least-privilege alternatives before approval.

## What User Assignment Changes

By default, users may be able to access an enterprise application without an explicit assignment. To create an allowlist:

1. Open **Entra ID > Enterprise applications**.
2. Select the application's service principal.
3. Open **Properties**.
4. Set **Assignment required?** to **Yes**.
5. Open **Users and groups** and add the approved principals.
6. Select an app role where the application exposes roles.

Microsoft Graph calls the toggle `appRoleAssignmentRequired`. Microsoft documents that users and services attempting to access a resource with this requirement must be assigned or they cannot sign in or obtain an access token.

There is a documented exception for Global Administrators: the user-assignment requirement doesn't apply to them. Assignment required should therefore not be treated as an absolute access boundary for those highly privileged accounts.

Assignment is tenant-local. A SaaS publisher cannot rely on assignments in its home tenant to control customer users. Each customer tenant manages its own enterprise-application service principal.

### Licensing Caveat

Group-based assignment to enterprise applications requires Microsoft Entra ID P1 or P2. Confirm current subscription entitlements before making group assignment a deployment prerequisite. Dynamic group membership has its own licensing requirements. If group assignment is unavailable, do not silently leave assignment optional; use supported individual assignment or an application-owned authorization control while resolving licensing.

## Use Both for a Department Application

Consider a Payroll application that signs users in and reads their basic profile from Microsoft Graph.

The identity administrator can:

1. grant tenant-wide admin consent for the required delegated Graph scopes;
2. set assignment required on the Payroll enterprise application;
3. assign the Payroll Users group;
4. assign Payroll Approver and Payroll Reader app roles as needed; and
5. have the application enforce those role values and record-level authorization.

Each layer answers a different question:

```text
Consent:     Payroll may call Graph with approved delegated scopes.
Assignment:  Members of Payroll Users may sign in.
App role:    This user is an Approver or Reader in Payroll.
App policy:  This Approver may act only for the user's legal entity.
```

Removing the Graph consent breaks the profile API call but does not automatically remove the enterprise-app assignment. Removing the user assignment blocks Entra-mediated access but does not revoke the tenant-wide permission grant. Changing the app role affects business capabilities but not the Graph scope.

## Workload Access Needs Its Own Mapping

Suppose a daemon calls a custom Invoicing API. The API exposes `Invoices.Read.All` as an app role with `allowedMemberTypes` containing `Application`. An administrator assigns that app role to the daemon's service principal.

Assuming the API uses the default Application ID URI `api://<invoice-api-client-id>`, the daemon then requests:

```http
POST https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id=<daemon-client-id>&scope=api%3A%2F%2F<invoice-api-client-id>%2F.default&client_secret=<url-encoded-secret>&grant_type=client_credentials
```

The API expects `roles` to contain `Invoices.Read.All`. There is no employee assignment to narrow this token; the daemon service principal is the assigned principal.

For custom APIs, Microsoft also documents a stricter pattern in which assignment is required on the resource service principal. Be explicit about whether the API uses app roles or an internal ACL, and reject unassigned app-only callers.

## Consent Workflows Are Not Access Requests

The admin consent workflow helps users request review when they cannot consent. Reviewers evaluate requested permissions and can approve, deny, or block according to their privileges.

Approval does not mean the requestor is the only user assigned. Microsoft states that approving admin consent lets users access the application unless assignment separately restricts it. If the business request is “give this employee access,” your process needs two tracked actions:

1. permission approval, if new consent is needed; and
2. user/group assignment to the enterprise application.

Do not close an access ticket after only clicking **Grant admin consent**.

## Configuration Order

A safe rollout order is:

1. Inventory the client and resource service principals in the correct tenant.
2. Review requested delegated and application permissions.
3. Remove unnecessary permissions before granting consent.
4. Decide whether the app should be open to the tenant or assignment-only.
5. If restricted, enable assignment required before broad communication.
6. Assign a pilot group or individual users and applicable app roles.
7. Grant the approved consent using a least-privileged administrator role.
8. Acquire fresh tokens and test both allowed and denied cases.
9. Monitor sign-in logs and API authorization failures.
10. Document separate owners and review schedules for grants and assignments.

Use report-only or staged controls where the feature supports them. Keep a tested break-glass and rollback procedure for business-critical applications.

## Troubleshooting Matrix

| Symptom | Consent check | Assignment check |
| --- | --- | --- |
| User gets “needs admin approval” | Required scope lacks an allowed grant | Assignment alone cannot fix consent |
| User gets “not assigned” | Consent might already be valid | Enable or correct user/group assignment |
| Sign-in succeeds but API returns 403 | Token might lack required `scp` or `roles` | App role or business authorization might be missing |
| Unapproved users can sign in | Consent is not the limiter | Check `appRoleAssignmentRequired` and assignments |
| Daemon gets token without expected role | Check application permission/admin consent | Check client service-principal app-role assignment |
| Removing a user did not revoke daemon access | App-only grant remains | User assignment does not represent daemon authority |

Acquire a new token after changing grants or assignments. Existing access tokens can remain usable until their expiry or resource-enforced revocation behavior; deleting a local session does not rewrite a token already issued.

## Important Boundaries

### Assignment protects Entra-mediated access

If the application has a separate local login, shared link, API key, or unauthenticated endpoint, Entra assignment cannot protect that path. The application must enforce a single coherent authorization policy.

### Groups are not always transitively evaluated

Check the documented behavior for the specific assignment and token feature. Do not assume nested group membership is supported for every enterprise-app or app-role scenario.

### Azure RBAC Is Separate

Assigning someone to an enterprise application is not an Azure subscription role assignment. Azure RBAC grants access to Azure management or data-plane resources and uses its own role assignments and scopes.

### Consent Policy Changes Are Not Retroactive

Restricting future user consent does not revoke existing grants. Review and remove unwanted grants explicitly.

## Governance Checklist

- Record each client service principal, resource service principal, permission, consent type, and owner.
- Require assignment for applications that should not be tenant-wide.
- Prefer groups for scalable assignment when licensing and group semantics support the design.
- Review tenant-wide consent on a schedule.
- Remove stale service-principal credentials and unused permission grants.
- Monitor interactive users, service principals, and managed identities in the correct sign-in log categories.
- Keep application authorization independent of portal visibility in My Apps.

## Official Documentation

- [Application consent management and evaluation of consent requests](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-consent-requests)
- [Restrict a Microsoft Entra app to a set of users](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users)
- [Manage users and groups assignment to an application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal)
- [Understand how users are assigned to apps](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/ways-users-get-assigned-to-applications)
- [Configure how users consent to applications](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent)
- [Overview of permissions and consent](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)
- [What is application management?](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/what-is-application-management)

## Conclusion

Use consent to approve which permissions a client may use when accessing an API. Use assignment required and user, group, or service-principal assignments to control who may access an enterprise application and in which app role. Then enforce business authorization inside the application. Keeping these layers separate makes approvals predictable, troubleshooting faster, and access reviews meaningful.
