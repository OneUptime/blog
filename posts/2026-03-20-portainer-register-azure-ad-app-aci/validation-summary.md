# Validation Summary: How to Register an Azure AD Application for Portainer ACI

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Azure Container Instances (ACI)
- Microsoft Entra ID (Azure AD)
- Azure CLI
- Azure RBAC

## Sources Consulted
- Microsoft Graph app registration guide: https://learn.microsoft.com/en-us/graph/auth-register-app-v2
- Microsoft Entra application and service principal objects: https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals
- Azure CLI `az ad app` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest
- Azure CLI `az ad sp` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Azure CLI `az role assignment` reference: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Azure RBAC role assignment guidance: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Entra delegated app-registration permissions: https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/delegate-app-roles
- Azure RBAC overview: https://learn.microsoft.com/en-us/azure/role-based-access-control/overview
- Portainer ACI environment setup: https://docs.portainer.io/admin/environments/add/aci

## Issues Found
- The prerequisites implied that only Global Administrator or Application Administrator would work. I corrected this to reflect current Microsoft Entra guidance: the real requirement is permission to register applications, and Cloud Application Administrator is the least-privileged built-in role Microsoft documents for the registration flow.
- The portal path and the later CLI steps were inconsistent. The original Step 4 and later commands assumed `APP_ID`, `TENANT_ID`, and `SUBSCRIPTION_ID` already existed, which was only true if the reader chose the CLI method. I added a short export snippet so portal users can continue with the CLI-based RBAC steps.
- The CLI example unnecessarily depended on `jq` and used fragile shell parsing. I replaced that with Azure CLI `--query` and `-o tsv` usage so the example works without an extra dependency.
- The service-principal step always created a new service principal. I changed it to check for an existing service principal first and create one only when needed.
- The RBAC commands assigned the role by application ID immediately after service-principal creation. I updated them to use `--assignee-object-id` and `--assignee-principal-type ServicePrincipal`, which matches current Azure RBAC guidance and avoids the Graph lookup and replication problems Microsoft documents for new principals.
- The summary section implied `Subscription ID` and `Resource Group` were Portainer connection fields. I clarified that Portainer uses tenant/application/client-secret values, while subscription and resource group are used for Azure-side RBAC scoping.
- I updated the body text from Azure Active Directory / Azure AD to Microsoft Entra ID where needed so the wording matches current Microsoft terminology.

## Review Notes
- Portainer's current ACI environment documentation asks for `Application ID`, `Tenant ID`, and an `Authentication Key` (client secret) when connecting the environment.
- The title and tags still use `Azure AD`, which is acceptable for discoverability, but the validated body now uses current Microsoft Entra ID terminology.
- If users later deploy containers that depend on other protected Azure resources, such as a private Azure Container Registry, they may need additional Azure RBAC assignments beyond the resource-group `Contributor` role covered in this post.
