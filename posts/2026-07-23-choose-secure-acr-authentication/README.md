# Managed Identity, Service Principal, or Admin User? Choosing Secure ACR Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, Managed Identity, Microsoft Entra ID, Security

Description: Choose an ACR identity that fits the workload while minimizing stored credentials, shared access, and repository permissions.

---

Use a managed identity when a supported Azure resource pulls or pushes images, use a service principal when the workload needs an independent Microsoft Entra identity outside that managed-identity path, and reserve the ACR admin user for narrow compatibility or short-lived troubleshooting. Human developers should normally use their own Microsoft Entra identities rather than any of the shared machine credentials.

Authentication answers “who is calling?” Authorization answers “what may that identity do?” A secure choice needs both. A managed identity with an unnecessarily broad writer role is still overprivileged, while a perfectly scoped identity will still fail if the registry firewall blocks its network path.

## Compare the Options

| Option | Credential handling | Lifecycle | Audit identity | Best fit |
| --- | --- | --- | --- | --- |
| Managed identity | Azure manages credentials; callers cannot retrieve them | system-assigned follows one resource; user-assigned is independent | distinct Entra service principal | supported Azure compute and hosting services |
| Service principal | certificate, secret, or federated credential must be configured | independent application/service identity | distinct Entra service principal | external CI, non-Azure hosts, portable automation, special tenant flows |
| ACR admin user | two registry passwords | tied to the registry | every caller appears as the same admin | limited compatibility and emergency testing |
| Individual Entra user | interactive/token-based user sign-in | follows the person | distinct user | local developer and operator access |

Registry-native tokens with scope maps are a separate option for systems that cannot use Microsoft Entra. They support repository-scoped passwords and are safer than a registry-wide admin password, but they are still secrets that must be stored and rotated.

## First Check the Registry Permission Mode

The correct role name depends on the registry's role-assignment mode:

```bash
ACR_NAME=contosoplatformacr

az acr show \
  --name "$ACR_NAME" \
  --query roleAssignmentMode \
  --output tsv
```

The query returns `AbacRepositoryPermissions` for an ABAC-enabled registry or `LegacyRegistryPermissions` for a legacy RBAC registry. The shorter values `rbac-abac` and `rbac` are inputs to `az acr create` and `az acr update`; they are not the values returned by `az acr show`.

Use this mapping for data access:

| Required action | ABAC-enabled registry (`AbacRepositoryPermissions`) | Legacy RBAC registry (`LegacyRegistryPermissions`) |
| --- | --- | --- |
| Pull | `Container Registry Repository Reader` | `AcrPull` |
| Push and pull, no delete | `Container Registry Repository Writer` | `AcrPush` |
| Pull, push, and delete | `Container Registry Repository Contributor` | `AcrPush` plus `AcrDelete` |

`AcrPull`, `AcrPush`, and `AcrDelete` are not honored by ABAC-enabled registries. Conversely, the newer repository roles are designed for ABAC-enabled mode. An ABAC repository role without a condition applies to every repository; add a repository-name or prefix condition to make it genuinely repository-scoped.

Repository roles govern data access, but the ABAC Repository Reader, Writer, and Contributor roles do not by themselves permit `az acr login`. Microsoft documents the broad `Container Registry Contributor and Data Access Configuration Administrator` role for CLI login and registry configuration; it grants no repository data access, but it can create, configure, and delete registries. Keep that control-plane decision separate instead of reflexively adding the role to every pull or push identity.

## Prefer Managed Identity on Supported Azure Resources

A managed identity removes the deploy-time secret. Azure creates a Microsoft Entra service principal, makes tokens available only to the attached Azure resource, and manages the underlying credential.

There are two forms:

- A system-assigned identity is tied to one Azure resource and is deleted with it.
- A user-assigned identity is a standalone Azure resource that can be pre-authorized and attached to one or more resources.

User-assigned identities are useful for infrastructure-as-code because the principal exists before the application resource and its role assignment can be created first. A system-assigned identity gives each resource a naturally separate identity and lifecycle.

Create a user-assigned identity and grant it pull-only access:

```bash
RESOURCE_GROUP=rg-platform-runtime
IDENTITY_NAME=id-orders-pull
ACR_NAME=contosoplatformacr

az identity create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$IDENTITY_NAME"

IDENTITY_PRINCIPAL_ID=$(az identity show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$IDENTITY_NAME" \
  --query principalId --output tsv)

ACR_ID=$(az acr show \
  --name "$ACR_NAME" \
  --query id --output tsv)

az role assignment create \
  --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role 'Container Registry Repository Reader' \
  --scope "$ACR_ID"
```

That role is correct for an ABAC-enabled registry. On a legacy RBAC registry, use `AcrPull` instead. For ABAC least privilege, add a condition for the exact repository rather than leaving the assignment registry-wide.

On a VM with the identity attached, a diagnostic login can use the identity without a password if it also has the separate control-plane permission required by `az acr login`:

```bash
az login --identity --object-id "$IDENTITY_PRINCIPAL_ID"
az acr login --name "$ACR_NAME"
docker pull '<login-server>/orders/api:<immutable-tag>'
```

Production services such as AKS and Container Apps normally integrate with the managed identity directly; they should not run these interactive CLI commands inside the workload.

Use managed identity when:

- the source is an Azure service that supports the identity for ACR;
- the registry and identity design can satisfy the tenant requirements;
- no external system needs to copy or use the credential; and
- Azure resource lifecycle is the right identity boundary.

## Use a Service Principal for Portable Automation

A service principal is a Microsoft Entra application identity that is independent of one Azure compute resource. It works well for a self-hosted CI system, an on-premises host, or another platform that can authenticate to Entra but cannot use an Azure managed identity directly.

Prefer workload identity federation or a certificate when the automation platform supports it. A client secret is simple but creates a long-lived value that must be protected, rotated, and monitored for expiry.

Grant an existing service principal push access by its object ID, not its application/client ID:

```bash
SERVICE_PRINCIPAL_OBJECT_ID='<service-principal-object-id>'
ACR_ID=$(az acr show --name "$ACR_NAME" --query id --output tsv)

az role assignment create \
  --assignee-object-id "$SERVICE_PRINCIPAL_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role 'Container Registry Repository Writer' \
  --scope "$ACR_ID"
```

Again, use `AcrPush` instead when the registry uses legacy RBAC. Give separate principals to separate pipelines so one credential can be disabled without breaking every publisher. A deployment principal should receive read access, not the writer role used by the build.

If a legacy system must use a client secret directly with Docker, the service principal's application/client ID is the Docker username and its client secret is the password:

```bash
printf '%s' "$SP_CLIENT_SECRET" | docker login \
  '<login-server>' \
  --username "$SP_CLIENT_ID" \
  --password-stdin
```

Do not pass secrets with `--password` on a shared command line, print them, or place them in repository YAML. Store them in the platform's protected secret store, set an expiry, and rehearse rotation before the expiry date.

Use a service principal when:

- the workload runs outside a managed-identity-capable Azure service;
- a CI platform can exchange an OIDC token through workload identity federation;
- an identity must remain independent as hosts are replaced; or
- a supported cross-tenant design requires an Entra application identity.

## Keep the ACR Admin User Disabled

Every registry has an admin account, disabled by default. When enabled, it has registry-wide push and pull permission and two passwords. It does not provide per-user attribution: all callers authenticate as the same registry admin.

The two passwords make rotation possible without immediately dropping every caller, but they do not turn the account into a safe multi-tenant identity. Microsoft documents the admin account as primarily a single-user testing mechanism and notes that a few portal-driven deployment experiences still require it.

Only for an explicitly approved compatibility test, enable and inspect it with:

```bash
az acr update --name "$ACR_NAME" --admin-enabled true
az acr credential show --name "$ACR_NAME"
```

Avoid copying the output into tickets or terminal recordings. When the compatibility test ends, disable the account:

```bash
az acr update --name "$ACR_NAME" --admin-enabled false
```

Disabling or rotating the admin account affects every consumer that shares it. That shared blast radius is one reason it should not back production clusters or pipelines.

## Use Individual Identity for Human Access

A developer who has both the required repository role and deliberately assigned CLI-login permission can use their own Microsoft Entra sign-in:

```bash
az login
az acr login --name "$ACR_NAME"
```

Assign the person only the required data-plane role, ideally through a governed group and with an ABAC repository condition. If the broad built-in CLI-login role is inappropriate, use another approved authentication flow rather than granting registry-administrator capability just for convenience. This preserves individual audit attribution and makes offboarding independent of workload credentials.

Microsoft Entra registry tokens obtained for an individual, managed identity, or service principal expire. A cached Docker login can therefore fail later even though the original command succeeded; the documented Entra registry login token lifetime is three hours. Reauthenticate instead of treating the cached token as a permanent credential.

## Separate Pull, Build, and Administration

A clean production design usually has at least three identities:

1. Runtime identity: reader on only the repositories it deploys.
2. Build identity: writer on only the repositories it publishes, without delete.
3. Registry administrator: control-plane access for networking, policy, and role administration, without being used by applications.

On an ABAC-enabled registry, Azure control-plane roles such as `Owner`, `Contributor`, and `Reader` do not grant repository data access. Likewise, repository Reader or Writer does not make an identity a registry administrator or grant catalog listing. Add `Container Registry Repository Catalog Lister` only when listing every repository is a real requirement, because that role is registry-wide and does not support ABAC conditions.

## Diagnose the Right Layer

When authentication fails, check each boundary independently:

```bash
az acr check-health \
  --name "$ACR_NAME" \
  --ignore-errors \
  --yes

az role assignment list \
  --scope "$ACR_ID" \
  --all \
  --output table
```

- `401 Unauthorized` usually points to missing, wrong, expired, or stale credentials.
- An authenticated caller denied on push usually lacks the correct writer role or is outside its ABAC repository condition.
- `403` naming a client IP points to firewall or public-network rules, not a bad password.
- A timeout or DNS error points to endpoint reachability.

Choose the identity first, then grant the minimum role for the registry's actual permission mode, then verify the network path. Mixing those layers is how teams end up enabling the admin user to “fix” a firewall or granting Owner to solve a repository permission error.

## Official Documentation

- [Authenticate with an Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Use a managed identity to authenticate to ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity)
- [Azure Container Registry authentication with service principals](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal)
- [Microsoft Entra permissions and role assignments for ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Microsoft Entra ABAC repository permissions in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [What are managed identities for Azure resources?](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
