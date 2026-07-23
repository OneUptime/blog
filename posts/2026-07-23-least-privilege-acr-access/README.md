# Least-Privilege ACR Access: Roles, Repository Permissions, and Scope Maps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, RBAC, ABAC, Security, Identity

Description: Choose the smallest ACR permission model for Microsoft Entra identities and repository-scoped tokens without accidentally granting registry-wide access.

---

Azure Container Registry has three repository authorization models that are easy to mix up: legacy registry-wide RBAC roles, ABAC-enabled Microsoft Entra repository roles, and non-Entra ACR tokens backed by scope maps. They solve related problems, but their role names and credentials are not interchangeable.

Least privilege starts by identifying the registry's **Role assignment permissions mode**. A perfectly valid `AcrPull` assignment does nothing for repository data in an ABAC-enabled registry, while an ABAC repository role without a condition quietly covers every repository.

## Identify the Registry Mode Before Assigning Anything

Query the registry rather than inferring its mode from its age:

```bash
ACR_NAME=contosoplatformacr
ACR_RESOURCE_GROUP=rg-platform-registry

ACR_RESOURCE_ID=$(az acr show \
  --name "$ACR_NAME" \
  --resource-group "$ACR_RESOURCE_GROUP" \
  --query id --output tsv)

az acr show \
  --name "$ACR_NAME" \
  --resource-group "$ACR_RESOURCE_GROUP" \
  --query '{mode:roleAssignmentMode,loginServer:loginServer}' \
  --output table
```

The two modes are:

| Mode | `az acr show` value | Create/update input | Repository data roles |
| --- | --- | --- | --- |
| RBAC Registry Permissions | `LegacyRegistryPermissions` | `rbac` | legacy `AcrPull`, `AcrPush`, and `AcrDelete` |
| RBAC Registry + ABAC Repository Permissions | `AbacRepositoryPermissions` | `rbac-abac` | `Container Registry Repository Reader`, `Writer`, and `Contributor`, optionally with repository conditions |

Microsoft recommends migrating to ABAC-enabled mode, which is planned to become the default. That does not make an unplanned mode switch safe: existing clients, role assignments, and ACR Tasks can be affected.

## Start from the Workload, Not the Role Name

Use separate identities for separate responsibilities:

| Persona | Needed operation | ABAC-enabled registry | Legacy RBAC registry |
| --- | --- | --- | --- |
| Runtime, AKS kubelet, or Container App | pull one application image | Repository Reader with an exact-repository condition | `AcrPull` on the registry |
| CI builder | pull base layers and push/update application tags | Repository Writer with a repository condition | `AcrPush` on the registry |
| Retention or cleanup job | delete manifests and tags | Repository Contributor with a repository condition | `AcrDelete`, plus read access if the job must inspect content |
| Inventory job | enumerate all repository names | Catalog Lister, plus a repository role only if it reads content | catalog behavior is included in common legacy read access |
| Registry administrator | configure networking, SKU, identities, or policies | an appropriate control-plane role, separate from repository data roles | an appropriate control-plane role |

The build identity should not also be the cleanup identity. Removing delete from the normal push path reduces the blast radius of a compromised pipeline.

## Legacy RBAC: Simple but Registry-Wide

In legacy `LegacyRegistryPermissions` mode, the familiar roles apply to the complete registry:

- `AcrPull` permits pulling artifacts and reading repository content.
- `AcrPush` permits both push and pull, but not delete.
- `AcrDelete` permits deletion and is commonly combined with another role when a job must discover or read what it deletes.

Assign the role at the registry resource, not the resource group or subscription, unless the identity genuinely needs the same access to every registry at the broader scope:

```bash
RUNTIME_PRINCIPAL_ID=11111111-1111-1111-1111-111111111111
BUILDER_PRINCIPAL_ID=22222222-2222-2222-2222-222222222222

az role assignment create \
  --assignee-object-id "$RUNTIME_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role AcrPull \
  --scope "$ACR_RESOURCE_ID"

az role assignment create \
  --assignee-object-id "$BUILDER_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role AcrPush \
  --scope "$ACR_RESOURCE_ID"
```

For a managed identity, use its **principal ID**. For a service principal, use the service principal's **object ID**, not the application/client ID, with `--assignee-object-id`. This also avoids an unnecessary Microsoft Graph lookup by the CLI.

Legacy roles cannot be narrowed to `orders/api` with a smaller Azure scope because an ACR repository is not an Azure Resource Manager child resource. To grant a Microsoft Entra identity access to only one repository, use ABAC-enabled mode.

## ABAC: Repository Roles Plus Conditions

In ABAC-enabled `AbacRepositoryPermissions` mode, the repository roles divide data-plane capabilities cleanly:

| Role | Repository capabilities | Delete | Catalog list |
| --- | --- | --- | --- |
| `Container Registry Repository Reader` | pull, view tags and metadata | no | no |
| `Container Registry Repository Writer` | read, push, update tags and metadata | no | no |
| `Container Registry Repository Contributor` | read, write, update, and delete | yes | no |
| `Container Registry Repository Catalog Lister` | list all repository names | no content access | all repositories |

`Owner`, `Contributor`, and `Reader` are not substitutes for these data roles in an ABAC-enabled registry. They affect the registry control plane and do not automatically grant pull, push, or delete permissions on repository content.

The most important ABAC rule is this:

> An ABAC-capable repository role without an ABAC condition applies to every repository in the registry.

The Azure role-assignment scope is still the registry resource ID. The condition restricts requests by the repository-name attribute.

### Grant Read Access to One Repository

The safest way to build a condition is the IAM visual editor:

1. Open the registry's **Access control (IAM)** page and add `Container Registry Repository Reader`.
2. Select the runtime identity.
3. On **Conditions**, add a condition and select all actions for the role.
4. Add an expression with attribute source **Request**, attribute **Repository name**, operator `StringEqualsIgnoreCase`, and value `orders/api`.
5. Save, inspect the generated code, and assign the role.

The current official Reader example maps to this expression, adapted for `orders/api`:

```bash
condition=$(cat <<'EOF' | tr -d '\n'
(
 (
  !(ActionMatches{'Microsoft.ContainerRegistry/registries/repositories/content/read'})
  AND
  !(ActionMatches{'Microsoft.ContainerRegistry/registries/repositories/metadata/read'})
 )
 OR
 (
  @Request[Microsoft.ContainerRegistry/registries/repositories:name] StringEqualsIgnoreCase 'orders/api'
 )
)
EOF
)

az role assignment create \
  --assignee-object-id "$RUNTIME_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Container Registry Repository Reader" \
  --scope "$ACR_RESOURCE_ID" \
  --description "Pull only orders/api" \
  --condition "$condition" \
  --condition-version 2.0
```

Why is the expression more complicated than “repository equals orders/api”? Azure role conditions must specify which role actions the condition governs. Copying a Reader expression into a Writer assignment can leave write or metadata actions outside the restriction. For Writer and Contributor, use the visual editor, select all actions belonging to that role, and copy the generated expression rather than hand-editing the Reader example.

### Grant Access to a Repository Prefix

For a team that owns repositories below `backend/`, use `StringStartsWithIgnoreCase` with the value `backend/`. Keep the trailing slash: `backend` would also match an unrelated name such as `backend-old`.

Prefix conditions are useful for ownership boundaries, but they also authorize repositories created later under that prefix. Treat the namespace itself as a security boundary and control who can choose repository names.

### Do Not Add Catalog Listing by Habit

Repository Reader, Writer, and Contributor do not permit listing the global repository catalog. That is intentional. Docker can pull a known reference such as `orders/api:2026.07.23` without first enumerating every repository.

Add `Container Registry Repository Catalog Lister` only when a tool truly calls `_catalog` or needs discovery. The role cannot be limited with an ABAC condition; it exposes the names of all repositories, though it does not grant content access.

## Scope Maps and Tokens: Repository Permissions Without Entra

ACR tokens are a separate authentication system. A token has a username, can have zero, one, or two generated passwords, and has exactly one scope map. The scope map grants repository actions:

| Scope-map action | Capability |
| --- | --- |
| `content/read` | pull an artifact |
| `content/write` | push artifact content; normally pair with `content/read` |
| `content/delete` | delete a manifest or repository |
| `metadata/read` | list tags or manifests and read metadata |
| `metadata/write` | modify repository metadata settings |

Repository-scoped tokens cannot list the global catalog. They are useful for an external device, disconnected client, or third-party system that cannot use Microsoft Entra federation. For Azure-hosted workloads and modern CI systems, prefer a managed identity or federated service principal with ABAC because there is no long-lived registry password to distribute.

### Create a Read-Only Runtime Token

If the client only pulls a known tag, `content/read` is enough. Add `metadata/read` only if it must enumerate tags or manifests:

```bash
TOKEN_NAME=orders-runtime

az acr scope-map create \
  --name orders-runtime-read \
  --registry "$ACR_NAME" \
  --repository orders/api content/read \
  --description "Pull known orders/api references"

az acr token create \
  --name "$TOKEN_NAME" \
  --registry "$ACR_NAME" \
  --scope-map orders-runtime-read \
  --no-passwords

TOKEN_PASSWORD=$(az acr token credential generate \
  --name "$TOKEN_NAME" \
  --registry "$ACR_NAME" \
  --expiration-in-days 30 \
  --password1 \
  --query 'passwords[0].value' \
  --output tsv)
```

`--no-passwords` matters: without it, token creation generates two non-expiring passwords by default and returns them in the command output. Store the explicitly generated password immediately in a secret manager. A generated password is returned at creation or regeneration time and cannot later be retrieved in plaintext.

Use the token name as the Docker username and the generated password as the password:

```bash
ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --query loginServer --output tsv)

printf '%s' "$TOKEN_PASSWORD" | docker login \
  "$ACR_LOGIN_SERVER" \
  --username "$TOKEN_NAME" \
  --password-stdin

docker pull "$ACR_LOGIN_SERVER/orders/api:2026.07.23"
```

Avoid printing `TOKEN_PASSWORD`, exporting it into verbose build logs, or passing it as a literal command-line argument.

### Create a Push Token Without Delete

A build client normally needs content read and write, but not delete:

```bash
az acr scope-map create \
  --name orders-ci-write \
  --registry "$ACR_NAME" \
  --repository orders/api content/read content/write \
  --description "Build and push orders/api without delete"

az acr token create \
  --name orders-ci \
  --registry "$ACR_NAME" \
  --scope-map orders-ci-write \
  --no-passwords
```

Generate only the expiring password that the approved secret store will retain, as in the runtime example. Add `content/delete` only to a dedicated cleanup token. Add `metadata/read` if the process needs to list tags; pushing a known image reference and discovering repository metadata are different permissions.

### Use Wildcards Carefully

Scope-map wildcards are prefix rules and their permissions are additive:

```bash
az acr scope-map create \
  --name backend-runtime-read \
  --registry "$ACR_NAME" \
  --repository 'backend/*' content/read \
  --description "Pull all repositories under backend/"
```

A non-root wildcard must be a single wildcard at the end with the `/*` suffix. `backend/*` is valid; `backend*`, `*/api`, and `backend/*/worker` are not valid namespace patterns. A rule for `*` is registry-wide. Because wildcard rules also match future repositories, review them like ABAC prefix conditions.

## Keep Control Plane and Data Plane Separate

Repository roles answer questions such as “may this identity pull `orders/api`?” They do not necessarily allow Azure Resource Manager operations such as changing the SKU, editing network rules, creating tokens, or running all `az acr` management commands.

The current built-in role that permits `az acr login` and broad registry configuration is `Container Registry Contributor and Data Access Configuration Administrator`. It does not grant repository push or pull by itself, and it is too broad to add reflexively to every runtime or build identity. If an identity needs only Docker data operations, use an authentication flow that does not turn that workload into a registry administrator.

Likewise, an administrator who can configure the registry should receive a repository Reader, Writer, or Contributor role only when their operational duties require content access. Splitting those roles makes audit logs and access reviews more meaningful.

## Migrate from Legacy RBAC Without an Outage Surprise

Changing an existing registry from `LegacyRegistryPermissions` to `AbacRepositoryPermissions` changes which repository roles are honored. The corresponding `az acr update --role-assignment-mode` input changes from `rbac` to `rbac-abac`. Use a staged migration:

1. Inventory every user, group, service principal, managed identity, deployment platform, and ACR Task that accesses the registry.
2. While still in `rbac` mode, create equivalent ABAC-enabled assignments. For a registry-wide transition, Microsoft's mapping is:
   - `AcrPull` → Repository Reader plus Catalog Lister to preserve catalog behavior.
   - `AcrPush` → Repository Writer; add Catalog Lister if the identity also depends on the catalog access included in legacy `AcrPush`.
   - `AcrDelete` → Repository Contributor, but this is not permission-equivalent: Contributor also adds read, write, and update. Use a dedicated identity and a narrow repository condition, and assess a custom role if that expansion is unacceptable.
3. Decide where registry-wide equivalence should instead become an exact repository or prefix condition.
4. Allow role assignments to propagate, then switch the registry:

```bash
az acr update \
  --name "$ACR_NAME" \
  --resource-group "$ACR_RESOURCE_GROUP" \
  --role-assignment-mode rbac-abac
```

5. Immediately refresh cached client credentials. Credentials issued while the registry was in RBAC-only mode are invalid after the switch and can return HTTP `401` even when the same identity has the right new role.
6. Test pulls, pushes, deletes, catalog calls, and negative access from representative clients.
7. Remove obsolete legacy role assignments after the new path is proven.

ACR Tasks, Quick Tasks, Quick Builds, and Quick Runs no longer receive default source-registry data access in ABAC-enabled mode. Include their identities and source repositories in the migration inventory.

## Prove Least Privilege with Negative Tests

A successful pull is only half a permissions test. Verify that forbidden operations fail:

```text
Runtime identity:
  PASS  pull orders/api:known-tag
  FAIL  pull payroll/api:known-tag
  FAIL  push orders/api:test
  FAIL  list the registry catalog

Builder identity:
  PASS  pull and push orders/api:commit-sha
  FAIL  delete orders/api:commit-sha
  FAIL  push payroll/api:test

Cleanup identity:
  PASS  delete only the intended repository content
  FAIL  change registry networking or credentials
```

Review effective assignments at the registry and at inherited resource-group and subscription scopes:

```bash
az role assignment list \
  --assignee-object-id "$RUNTIME_PRINCIPAL_ID" \
  --scope "$ACR_RESOURCE_ID" \
  --include-inherited \
  --all \
  --output table
```

An exact conditional assignment can be defeated by another unconditional Repository Writer or Repository Contributor assignment at the registry or an inherited parent scope. An inherited `Owner` assignment still does not grant repository data access in ABAC-enabled mode, although it does grant powerful control-plane and role-administration capabilities. Access reviews should include the condition text, principal type, parent scopes, token status, token password expiry, and whether the identity still exists.

## A Practical Selection Rule

Use the following order of preference:

1. For an Azure resource, use managed identity with an ABAC repository condition.
2. For CI/CD, use workload identity federation with an ABAC repository condition.
3. For people, use their individual Microsoft Entra identity through group-based assignments where practical.
4. For a client that cannot use Microsoft Entra, use an ACR token and a narrow scope map with an expiring password.
5. Use the registry admin user only for narrowly bounded compatibility or emergency scenarios, then disable it again.

The strongest design is not the one with the most role assignments. It is the one where every credential has one job, one repository boundary, no unnecessary catalog or delete capability, and a tested failure outside that boundary.

## Official Documentation

- [Azure Container Registry Microsoft Entra permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Azure ABAC repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Azure Container Registry built-in roles reference](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/containers#container-registry-repository-reader)
- [Non-Microsoft Entra token-based repository permissions](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions)
- [Authenticate with an Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Azure role assignments using Azure CLI](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli)
