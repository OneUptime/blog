# Fixing “Unauthorized: Authentication Required” When Pushing to ACR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, Docker, Authentication, Troubleshooting

Description: Isolate an unauthorized ACR push across the image reference, cached credential, role-assignment mode, repository scope, and network boundary.

---

An ACR push needs five things to agree: the exact login server, a valid current credential, write permission in the registry's active permission mode, access to the target repository, and a working network path to both registry and layer endpoints. Fix those in that order; enabling the admin account or granting `Owner` can hide the real fault while widening access.

## Preserve the Exact Failure

Run the same image push once and keep the complete error:

```bash
docker push '<login-server>/<repository>:<tag>'
```

The wording narrows the layer that failed:

| Error fragment | Most likely area |
| --- | --- |
| `unauthorized: authentication required` | missing, invalid, expired, or stale login credential |
| `requested access to the resource is denied` | authenticated identity lacks repository write permission |
| `client with IP ... is not allowed access` | ACR public network/firewall rule |
| `operation is disallowed` | repository or image is write-locked, or another registry policy blocks it |
| `i/o timeout`, DNS error, TLS timeout | login or data endpoint connectivity |
| `429 Too Many Requests` | SKU request-rate throttling, not an authentication failure |

Do not reduce every response to “bad password.” A client can receive a registry error after authentication but before authorization for the requested repository action.

## Verify the Target Before the Identity

Read the login server from Azure, especially when Domain Name Label protection adds a hash:

```bash
ACR_NAME=contosoplatformacr
RESOURCE_GROUP=rg-platform-registry

LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query loginServer --output tsv)

printf '%s\n' "$LOGIN_SERVER"
docker image ls --digests
```

Retag the image explicitly so the local reference cannot point to Docker Hub or another registry:

```bash
IMAGE_TAG="${LOGIN_SERVER}/orders/api:2026.07.23.1"

docker tag orders-api:local "$IMAGE_TAG"
docker image inspect "$IMAGE_TAG" --format '{{json .RepoTags}}'
```

Use lowercase repository names and the exact host. Credentials are stored per hostname, so a login for an unprotected hostname does not apply to a DNL-protected hostname or a Premium regional endpoint (preview).

## Check Registry and Client Health

Run the supported ACR health check from the same builder that fails:

```bash
az acr check-health \
  --name "$ACR_NAME" \
  --ignore-errors \
  --yes
```

The health check can expose Docker configuration, DNS, token, and endpoint problems. Helm or Notary warnings do not necessarily affect an ordinary Docker push.

Also verify the registry state:

```bash
az acr show \
  --name "$ACR_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query '{state:provisioningState,server:loginServer,mode:roleAssignmentMode,publicAccess:publicNetworkAccess}' \
  --output table
```

## Refresh the Credential for the Correct Host

For an individual Microsoft Entra identity:

```bash
az account show \
  --query '{tenant:tenantId,subscription:id,user:user.name}' \
  --output table

docker logout "$LOGIN_SERVER"
az acr login --name "$ACR_NAME"
```

`az acr login` accepts the Azure resource name, while `docker push` uses the login server. If the push target is a regional endpoint, use Azure CLI 2.86.0 or later and add `--endpoint '<region>'` to `az acr login`; otherwise, the command logs in to the global endpoint. Microsoft Entra-derived ACR login tokens expire after three hours. Reauthenticate after role changes, tenant changes, and token expiry.

On an ABAC-enabled registry, Repository Writer authorizes the push but does not itself authorize `az acr login`. The documented CLI-login role is `Container Registry Contributor and Data Access Configuration Administrator`; it grants broad control-plane management but no repository data access. Check for that distinction before misdiagnosing a CLI-login denial as a missing Writer assignment, and do not grant the broad role to a data-plane-only workload when a direct Docker credential is the intended design.

For a service principal using a secret directly, use its application/client ID as the Docker username:

```bash
printf '%s' "$SP_CLIENT_SECRET" | docker login "$LOGIN_SERVER" \
  --username "$SP_CLIENT_ID" \
  --password-stdin
```

Confirm that the secret value-not the secret's identifier-was placed in the secret store, and check its expiry. If a secret is replaced, log out of the registry hostname before retrying so a credential helper cannot keep serving the older value.

For a registry-native token, use the token name and generated token password. The token must be enabled and unexpired:

```bash
printf '%s' "$ACR_TOKEN_PASSWORD" | docker login "$LOGIN_SERVER" \
  --username "$ACR_TOKEN_NAME" \
  --password-stdin
```

Do not try a person's Microsoft Entra password as a Docker password. Human Entra authentication is performed through Azure CLI, not by supplying the user's password to `docker login`.

## Match the Role to the Permission Mode

Query the mode before adding any assignment:

```bash
ROLE_MODE=$(az acr show \
  --name "$ACR_NAME" \
  --query roleAssignmentMode \
  --output tsv)

printf '%s\n' "$ROLE_MODE"
```

The command returns `AbacRepositoryPermissions` or `LegacyRegistryPermissions`; `rbac-abac` and `rbac` are the corresponding create/update inputs.

The role families are not interchangeable:

| Registry mode | Push role | Delete included? |
| --- | --- | --- |
| ABAC-enabled (`AbacRepositoryPermissions`) | `Container Registry Repository Writer` | no |
| ABAC-enabled (`AbacRepositoryPermissions`) | `Container Registry Repository Contributor` | yes |
| Legacy RBAC (`LegacyRegistryPermissions`) | `AcrPush` | no |
| Legacy RBAC (`LegacyRegistryPermissions`) | `AcrPush` plus `AcrDelete` | yes |

ABAC-enabled registries do not honor `AcrPush`. In that mode, even `Owner` or `Contributor` at the Azure resource scope supplies control-plane access only, not repository data access.

Resolve the principal object ID and inspect assignments at the registry scope:

```bash
ACR_ID=$(az acr show --name "$ACR_NAME" --query id --output tsv)
PRINCIPAL_OBJECT_ID='<user-service-principal-or-managed-identity-object-id>'

az role assignment list \
  --assignee-object-id "$PRINCIPAL_OBJECT_ID" \
  --scope "$ACR_ID" \
  --include-inherited \
  --all \
  --output table
```

When using `--assignee-object-id`, pass a service principal's **object ID**, not its application/client ID. For a managed identity, use `principalId`, not `clientId` or the identity resource ID.

If the ABAC-enabled registry needs registry-wide push-without-delete access:

```bash
az role assignment create \
  --assignee-object-id "$PRINCIPAL_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role 'Container Registry Repository Writer' \
  --scope "$ACR_ID"
```

Use `--assignee-principal-type User` for a user. In production, prefer an ABAC condition that restricts this writer assignment to the pipeline's repository or repository prefix.

After creating or changing a role assignment, allow it to propagate, then log in again. Retrying with a Docker credential issued before the permission change can preserve a misleading failure.

## Inspect the ABAC Repository Condition

A `Container Registry Repository Writer` assignment without a condition applies to every repository. With a condition, the full repository name must match the allowed value or prefix.

Check the condition in the assignment JSON:

```bash
az role assignment list \
  --assignee-object-id "$PRINCIPAL_OBJECT_ID" \
  --scope "$ACR_ID" \
  --all \
  --query '[].{role:roleDefinitionName,condition:condition,version:conditionVersion}' \
  --output json
```

Compare it to the repository portion of the push target. For:

```text
contosoplatformacr-abc123.azurecr.io/orders/api:2026.07.23.1
```

the repository name is `orders/api`, not the full hostname and not `orders`. Prefix conditions should include the trailing slash, such as `orders/`; omitting it can match unintended names such as `orders-backup`.

If the registry was recently switched from legacy RBAC to ABAC mode, old `AcrPush` assignments cease to work. Credentials issued while the registry was in the earlier mode are also rejected after the switch. Assign equivalent ABAC-compatible roles first, switch the mode, and then force clients to authenticate again.

## Check a Scope-Map Token's Actions

A registry-native token needs both `content/read` and `content/write` for normal image pushes. Restricting it to `metadata/write`, or granting write on a different repository, is insufficient.

Inspect the token and its scope map:

```bash
az acr token show \
  --registry "$ACR_NAME" \
  --name "$ACR_TOKEN_NAME" \
  --output json

az acr scope-map show \
  --registry "$ACR_NAME" \
  --name '<scope-map-name>' \
  --output json
```

A minimal build token for one repository can be created as:

```bash
az acr token create \
  --registry "$ACR_NAME" \
  --name orders-api-builder \
  --repository orders/api content/read content/write \
  --no-passwords

ACR_TOKEN_PASSWORD=$(az acr token credential generate \
  --registry "$ACR_NAME" \
  --name orders-api-builder \
  --password1 \
  --expiration-in-days 30 \
  --query 'passwords[0].value' \
  --output tsv)
```

Without `--no-passwords`, `az acr token create` generates two passwords by default and can print them in command output. The sequence above creates no implicit passwords, generates one expiring password explicitly, and should feed that value directly into an approved secret store. Avoid terminal logs and unset the shell variable after storage. Scope-map tokens are non-Entra credentials; they do not become service principals and do not receive Azure RBAC roles.

## Distinguish Firewall Denial from 401

If the error includes a client IP and `not allowed access`, authentication is not the first fix. Check public access and network rules:

```bash
az acr network-rule list \
  --name "$ACR_NAME" \
  --output json
```

The builder must be admitted by an allowed public-IP rule, an allowed virtual-network rule through the service-endpoint feature (preview), an eligible trusted-service bypass, or an approved private endpoint. Do not add a broad public range merely to make CI pass.

An ACR image transfer uses a registry REST/login endpoint and a separate data endpoint for layers. A firewall or private DNS configuration that permits only the login endpoint can authenticate successfully and then fail during upload. For a Premium registry with a private endpoint, validate private DNS resolution for `$LOGIN_SERVER` and every hostname returned by `az acr show --name "$ACR_NAME" --query dataEndpointHostNames --output tsv` from the builder.

An unauthenticated probe helps identify reachability:

```bash
curl --verbose "https://$LOGIN_SERVER/v2/"
```

An HTTP 401 is expected when the registry requires authentication; a registry with anonymous pull enabled can instead return HTTP 200. Either response proves that the login endpoint responded. A DNS or TCP failure points to networking instead.

## Check for a Write Lock Only After Authentication

If the error says the operation is disallowed rather than unauthenticated, a repository or image may have `writeEnabled: false`. An authorized registry operator can inspect it:

```bash
az acr repository show \
  --name "$ACR_NAME" \
  --repository orders/api \
  --output jsonc
```

For an image-level lock, repeat the inspection with `--image 'orders/api:2026.07.23.1'` or `--image 'orders/api@sha256:<digest>'`.

Do not automatically unlock production content. A write lock may be an intentional immutability control. If policy permits changing it:

```bash
az acr repository update \
  --name "$ACR_NAME" \
  --repository orders/api \
  --write-enabled true
```

Use `--image` instead of `--repository` when `writeEnabled: false` is on a tag or manifest.

This solves a write-policy denial, not a 401. Keep the distinction visible in incident notes.

## Prove the Fix Without Broadening Access

After correcting the narrow cause:

```bash
docker push "$IMAGE_TAG"
docker pull "$IMAGE_TAG"
```

Then verify negative boundaries:

- the build identity cannot delete if it only has Writer or `AcrPush`;
- it cannot push to an unrelated repository when an ABAC condition or scope map limits it;
- the runtime identity can pull but cannot push; and
- a host outside the approved network path remains blocked.

Those negative tests prove that the incident was resolved without turning a precise pipeline identity into a registry administrator.

## Official Documentation

- [Troubleshoot Azure Container Registry authentication issues](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-container-registry/acr-authentication-errors)
- [Troubleshoot ACR login, authentication, and authorization](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-troubleshoot-login-authn-authz)
- [Troubleshoot push errors in Azure Container Registry](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-container-registry/troubleshoot-push-error-operation-disallowed-timeout)
- [Microsoft Entra permissions and role assignments for ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Microsoft Entra ABAC repository permissions in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Non-Microsoft Entra token-based repository permissions](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions)
