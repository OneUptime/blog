# Validation Summary: Entra Admin Consent vs User Assignment: Permissions and Sign-In

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- Microsoft Entra ID
- Enterprise applications and service principals
- Entra admin consent and admin consent workflows
- User, group, and workload assignment
- OAuth 2.0 delegated and client credentials flows
- Microsoft Graph permission grants and app-role assignments
- Application roles and token claims
- Azure role-based access control boundaries

## Sources Consulted

- [Overview of permissions and consent in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)
- [Microsoft Graph `oAuth2PermissionGrant` resource type](https://learn.microsoft.com/en-us/graph/api/resources/oauth2permissiongrant?view=graph-rest-1.0)
- [Microsoft Graph `appRoleAssignment` resource type](https://learn.microsoft.com/en-us/graph/api/resources/approleassignment?view=graph-rest-1.0)
- [Microsoft Graph `servicePrincipal` resource type](https://learn.microsoft.com/en-us/graph/api/resources/serviceprincipal?view=graph-rest-1.0)
- [Restrict a Microsoft Entra app to a set of users](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users)
- [Manage users and groups assignment to an application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal)
- [Use a group to manage access to SaaS applications](https://learn.microsoft.com/en-us/entra/identity/users/groups-saasapps)
- [Dynamic membership groups in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership)
- [Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [Microsoft identity platform and the OAuth 2.0 client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Add app roles to your application and receive them in the token](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps)
- [Review and take action on admin consent requests](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/review-admin-consent-requests)
- [Configure the admin consent workflow](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow)
- [Configure how users consent to applications](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent)
- [Access tokens in the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
- [How to use Continuous Access Evaluation enabled APIs](https://learn.microsoft.com/en-us/entra/identity-platform/app-resilience-continuous-access-evaluation)

## Issues Found

- Consent was described as authorizing a client to request permissions. Applications can request permissions before consent; consent authorizes access under the granted permissions. The opening definition and conclusion now describe that authorization accurately.
- Assignment was described as determining who can access an enterprise application without qualifying the assignment-required setting. The definition now explains that assignments form an Entra-enforced allowlist when assignment is required.
- The comparison table called both delegated and application permissions “API scopes.” It now distinguishes delegated scopes from application app roles and uses the documented `oAuth2PermissionGrant` resource-type casing.
- The client credentials example assumed the default `api://<client-id>` Application ID URI without saying so. The assumption is now explicit because `/.default` must suffix the API's configured resource identifier.
- The form-encoded request body was split across literal lines without noting that the breaks were illustrative. It is now on one line so it is a valid `application/x-www-form-urlencoded` body as shown.

## Review Notes

- All seven links in the post's Official Documentation section resolve to the intended current Microsoft Learn pages.
- The documented Global Administrator exception, P1/P2 requirement for group-based enterprise-application assignment, separate dynamic-group licensing caveat, tenant-local service-principal model, and non-retroactive consent-policy behavior were verified as correct.
- Microsoft currently documents that enterprise-application group assignment does not cascade to nested groups. The post's broader warning not to assume transitive group evaluation is accurate.
- The shared-secret client credentials flow remains supported. Microsoft recommends supported authentication libraries and, for higher assurance, certificate or federated credentials where practical.
- The warning that already-issued access tokens can remain usable until expiry unless the resource rejects them earlier is accurate, including the Continuous Access Evaluation caveat.
