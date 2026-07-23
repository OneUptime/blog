# az acr login vs. docker login: Why One Works When the Other Returns 401

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, Docker, Authentication, Troubleshooting

Description: Understand the different credentials and hostnames used by Azure CLI and Docker so an ACR 401 can be traced without weakening access controls.

---

`az acr login` and `docker login` can end with credentials in Docker's configuration, but they do not start from the same identity or accept the same registry name. `az acr login` normally exchanges the current Azure CLI Microsoft Entra identity for ACR credentials and invokes the Docker client. `docker login` sends the username and password that you supply directly to a fully qualified registry server.

That difference explains most cases where one command succeeds and the other returns `401 Unauthorized`.

## Compare the Two Commands

| Detail | `az acr login` | `docker login` |
| --- | --- | --- |
| Registry argument | Azure resource name, such as `contosoplatformacr` | exact login server, such as `contosoplatformacr-abc123.azurecr.io` |
| Starting identity | current `az login` context, managed identity, or explicit ACR username/password options | username/password read from arguments, stdin, or credential helper |
| Typical human use | Microsoft Entra sign-in without copying a registry password | generic registry credentials |
| Docker daemon | required for normal mode | required for subsequent image operations |
| Daemon-free token mode | `--expose-token` returns a token instead of invoking Docker | can consume that token, but still needs an engine for `docker pull` or `push` |
| Common direct username | handled by Azure CLI | service principal client ID, scope-map token name, or admin username |

For an ordinary developer login, use:

```bash
az login
az acr login --name contosoplatformacr
```

For direct Docker authentication, use the full server:

```bash
docker login contosoplatformacr-abc123.azurecr.io
```

Do not pass `.azurecr.io` to `az acr login --name`, and do not pass the bare Azure resource name to `docker login`.

## Never Guess the Login Server

Domain Name Label protection can add a permanent hash to an ACR hostname. Even without a DNL hash, scripts should read the service value:

```bash
ACR_NAME=contosoplatformacr

LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --query loginServer \
  --output tsv)

printf '%s\n' "$LOGIN_SERVER"
```

Use the values consistently:

```bash
az acr login --name "$ACR_NAME"
docker pull "$LOGIN_SERVER/orders/api:v1"
```

Docker stores credentials per hostname. Credentials for `contosoplatformacr.azurecr.io` do not automatically apply to `contosoplatformacr-abc123.azurecr.io`, a regional hostname returned by `az acr show-endpoints`, or a misspelled/case-varied entry.

For a Premium registry with regional endpoints enabled, authenticate to the endpoint that the client will actually use:

```bash
az acr login --name "$ACR_NAME" --endpoint eastus
```

Regional endpoints are a Preview feature. Their native CLI commands, including `az acr login --endpoint`, require Azure CLI 2.86.0 or later. Switching between global and regional hostnames requires another client login because Docker and containerd index credentials by hostname.

## What `az acr login` Actually Uses

The normal flow is:

1. `az login` establishes a Microsoft Entra identity and Azure subscription context.
2. `az acr login --name ...` resolves the registry and exchanges the Entra token for ACR credentials.
3. Azure CLI invokes Docker's login behavior and stores credentials for the registry hostname.
4. Docker requests repository-scoped access when it pulls or pushes.

Check the active context before blaming ACR:

```bash
az account show \
  --query '{tenant:tenantId,subscription:id,user:user.name}' \
  --output table
```

The Azure CLI identity must be in the intended tenant and subscription and must have the necessary ACR permissions. On ABAC-enabled registries, image access comes from `Container Registry Repository Reader`, `Writer`, or `Contributor`; legacy `AcrPull`, `AcrPush`, and `AcrDelete` roles are not honored. On legacy RBAC registries, use the legacy roles.

Microsoft also separates control-plane access from repository data access in ABAC-enabled mode. A role that permits Azure CLI registry administration or login does not automatically permit a push, and a repository role does not make the caller a registry administrator. A `Login Succeeded` message therefore proves authentication, not every later operation.

In particular, Repository Reader, Writer, and Contributor do not by themselves authorize `az acr login`. Microsoft documents `Container Registry Contributor and Data Access Configuration Administrator` as the built-in role that permits that CLI operation, but the role also grants broad registry-management capability and still grants no pull or push. Do not add it automatically to a data-plane-only identity; a direct Docker login using a service-principal credential or a narrow scope-map token avoids that control-plane grant.

## What `docker login` Credentials Mean

Docker does not interpret a Microsoft Entra user's email address and password as an Azure CLI login. It expects a credential type ACR accepts.

### Service principal secret

Use the application/client ID as the username and client secret as the password:

```bash
printf '%s' "$SP_CLIENT_SECRET" | docker login "$LOGIN_SERVER" \
  --username "$SP_CLIENT_ID" \
  --password-stdin
```

The service principal still needs the correct ACR data role. A valid secret for an unassigned principal can authenticate to Entra but cannot push or pull the requested repository.

### Registry token and scope map

Use the ACR token name and one generated token password:

```bash
printf '%s' "$ACR_TOKEN_PASSWORD" | docker login "$LOGIN_SERVER" \
  --username "$ACR_TOKEN_NAME" \
  --password-stdin
```

The token must be enabled, its password must be unexpired, and its scope map must contain the required `content/read` and, for push, `content/write` actions on the repository.

### Admin account

The registry admin username and either admin password also work when the account is enabled, but the account is registry-wide and all users share one audit identity. It is not the right fix for an Entra role or hostname problem.

## Use `--expose-token` Without an Automatic Docker Login

If the environment has Azure CLI but no running Docker daemon, normal `az acr login` returns a Docker command error. Request the token explicitly:

```bash
ACR_REFRESH_TOKEN=$(az acr login \
  --name "$ACR_NAME" \
  --expose-token \
  --query accessToken \
  --output tsv)
```

An OCI client that accepts Docker credentials can use the documented all-zero username:

```bash
printf '%s' "$ACR_REFRESH_TOKEN" | docker login "$LOGIN_SERVER" \
  --username 00000000-0000-0000-0000-000000000000 \
  --password-stdin

unset ACR_REFRESH_TOKEN
```

This avoids having Azure CLI invoke Docker during the token exchange. It does not install or start a Docker daemon, so Cloud Shell still cannot perform a normal local Docker build or pull solely because the token was exposed. Use the token with an appropriate daemonless OCI tool, or run Docker on a host with an engine.

## Why `az acr login` Works but `docker login` Returns 401

Work through these causes in order:

1. **Wrong username/password type.** A person's Entra password is not the Docker password for this flow. Use a service principal secret, ACR token password, admin password, or an exposed Entra-derived ACR token as documented.
2. **Wrong hostname.** Query `loginServer`; do not assume the name, omit its DNL hash, or reuse global-endpoint credentials for a regional endpoint.
3. **Expired or rotated secret.** A service principal secret, scope-map token password, or admin password may have expired or been regenerated.
4. **Stale credential-helper entry.** Docker may keep an older credential for that host even after environment variables were corrected.
5. **Shell quoting or newline damage.** Use `--password-stdin` and verify that the secret store returns the intended secret value, not its identifier.

Clear only the target hostname and retry with a known authentication method:

```bash
docker logout "$LOGIN_SERVER"
az acr login --name "$ACR_NAME"
```

Avoid deleting the complete Docker configuration because it may contain unrelated registry logins or credential-helper settings.

## Why `docker login` Works but `az acr login` Fails

This direction usually means the direct registry credential is valid but the Azure CLI path is not:

- `az` is signed out, using the wrong tenant, or using the wrong subscription;
- the Azure CLI identity lacks permission to resolve or authenticate to the registry;
- the bare resource name points to a different registry than the Docker hostname;
- public-network, firewall, or private endpoint rules treat the current host differently; or
- the Docker client or daemon is not installed and running, so Azure CLI cannot complete its normal handoff.

Recheck context and health:

```bash
az account show --output table

az acr check-health \
  --name "$ACR_NAME" \
  --ignore-errors \
  --yes
```

If Docker is unavailable, repeat with `--expose-token` to separate Azure/ACR authentication from the Docker daemon dependency.

## Separate 401, 403, and Repository Denials

An unauthenticated reachability probe is useful:

```bash
curl --verbose "https://$LOGIN_SERVER/v2/"
```

An HTTP `401 Unauthorized` from that unauthenticated request is expected and proves that the registry login endpoint is reachable. It does not mean the registry is unhealthy.

Interpret later errors precisely:

- `401 Unauthorized` during login usually means missing, invalid, expired, or stale credentials.
- `denied` or `requested access to the resource is denied` after login often means the identity lacks the action on that repository or falls outside an ABAC condition.
- `403` naming a client IP means ACR's public network rule rejected the caller.
- DNS failures, connection timeouts, and TLS timeouts are network-path problems.

Microsoft Entra-derived ACR login tokens expire after three hours. If a previously working session begins returning 401, re-run the identity login rather than attempting to make the cached Docker credential permanent.

## A Repeatable Diagnostic Sequence

Use this compact sequence during an incident:

```bash
ACR_NAME=contosoplatformacr
LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)

az account show --output table
az acr show --name "$ACR_NAME" \
  --query '{loginServer:loginServer,mode:roleAssignmentMode,publicAccess:publicNetworkAccess}' \
  --output table
az acr check-health --name "$ACR_NAME" --ignore-errors --yes
docker logout "$LOGIN_SERVER"
az acr login --name "$ACR_NAME"
```

Then test the exact operation and repository that failed. Login success followed by push failure is an authorization clue; it is not evidence that Docker ignored the login.

## Official Documentation

- [Azure CLI reference: `az acr login`](https://learn.microsoft.com/en-us/cli/azure/acr#az-acr-login)
- [Troubleshoot ACR login, authentication, and authorization](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-troubleshoot-login-authn-authz)
- [Troubleshoot Azure Container Registry authentication issues](https://learn.microsoft.com/en-us/troubleshoot/azure/azure-container-registry/acr-authentication-errors)
- [Authenticate with an Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Azure Container Registry authentication with service principals](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal)
- [Microsoft Entra permissions and role assignments for ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
