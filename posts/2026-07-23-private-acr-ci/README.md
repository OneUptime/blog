# How to Build and Push to a Private ACR from GitHub Actions or Azure DevOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, GitHub Actions, Azure DevOps, CI/CD, Workload Identity

Description: Build a secretless container-image pipeline for ACR while keeping repository permissions, runner networking, and image tags under control.

---

“Private ACR” can describe two different controls. Every Azure Container Registry requires authentication by default, but only a registry configured with Private Link is private at the network layer. A successful pipeline needs both paths: an identity that can push the target repository and a runner or agent that can reach every registry endpoint.

This guide uses workload identity federation for GitHub Actions and Azure DevOps. Federation replaces a stored client secret with a short-lived Microsoft Entra token. It does not grant Azure permissions by itself, so role assignments still matter.

## Decide the Build Contract First

Give each pipeline a small, explicit contract:

```text
Registry resource:  /subscriptions/.../registries/contosoplatformacr
Login server:       contosoplatformacr-abc123.azurecr.io
Repository:         orders/api
Commit tag:         source commit SHA
Mutable tag:        optional, updated only after the commit-tagged push succeeds
Network path:       public endpoint + firewall, or Private Link
```

Do not construct the login server from the resource name. Registries that use domain-name-label protection can contain a hash. Read and store the actual value:

```bash
ACR_NAME=contosoplatformacr
ACR_RESOURCE_ID=$(az acr show --name "$ACR_NAME" --query id --output tsv)
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer --output tsv)

printf 'resource=%s\nserver=%s\n' "$ACR_RESOURCE_ID" "$ACR_LOGIN_SERVER"
```

Use the source commit as a traceability tag. Unlike `latest`, it identifies the source revision. ACR tags are mutable by default, however, and rerunning a commit can produce different content if inputs such as base images move. Deploy by digest—or explicitly lock the deployed tag—when you require immutability:

```text
contosoplatformacr-abc123.azurecr.io/orders/api:6db8c1e...
```

## Give the Pipeline Only the Required Data Access

First inspect the registry's role-assignment permissions mode:

```bash
az acr show \
  --name "$ACR_NAME" \
  --query roleAssignmentMode \
  --output tsv
```

That query returns a service enum. Use the corresponding create/update input only when changing the registry configuration:

The correct push role depends on that result:

| `az acr show` result | Create/update input | Push role | Scope behavior |
| --- | --- | --- | --- |
| `AbacRepositoryPermissions` | `rbac-abac` | `Container Registry Repository Writer` | Add an ABAC condition for `orders/api`; without one, the assignment covers every repository |
| `LegacyRegistryPermissions` | `rbac` | `AcrPush` | Covers the whole registry and also permits pull; it does not grant delete |

An ABAC-enabled registry does not honor `AcrPush`, `AcrPull`, or `AcrDelete`. Conversely, the newer repository roles are intended for ABAC-enabled mode. Do not assign both sets and hope one works.

For an ABAC registry, create the `Container Registry Repository Writer` assignment at the registry resource scope, then use the IAM condition editor to apply all of the role's data actions only when `Repository name` equals `orders/api`. The condition belongs on the role assignment; the scope remains the registry resource ID. A Writer can push, pull, and update tags and metadata, but cannot delete artifacts. That is normally the right CI permission.

For a legacy RBAC-only registry:

```bash
PIPELINE_PRINCIPAL_ID=00000000-0000-0000-0000-000000000000

az role assignment create \
  --assignee-object-id "$PIPELINE_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role AcrPush \
  --scope "$ACR_RESOURCE_ID"
```

Role assignments can take several minutes to propagate. Provision them before a release, not in the build that immediately depends on them.

### Account for `az acr login` separately

Current ACR roles separate repository data access from registry control-plane access. `Container Registry Repository Writer` authorizes the push, but it does not grant control-plane operations. Microsoft documents `Container Registry Contributor and Data Access Configuration Administrator` as the built-in role that permits `az acr login` and other registry-management commands; that role still grants no repository push by itself.

The federated examples below call `az acr login`, so provision and test both the CLI-login role and the correct data role. The control-plane assignment is registry-scoped and cannot be narrowed with a repository condition:

```bash
az role assignment create \
  --assignee-object-id "$PIPELINE_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role 'Container Registry Contributor and Data Access Configuration Administrator' \
  --scope "$ACR_RESOURCE_ID"
```

That role can create, configure, and delete registry resources, so this secretless pattern is not a minimal-control-plane design. Where that breadth is unacceptable, do not use the workflow unchanged: authenticate Docker with a repository-scoped ACR token, or with a service principal credential that has the appropriate data role, and rotate the credential through the CI secret store. Do not enable the registry admin user for a routine pipeline.

## GitHub Actions with OpenID Connect

Create a Microsoft Entra application or user-assigned managed identity, create a federated identity credential for the GitHub repository, and assign the ACR roles to its principal. Scope the federated subject as tightly as the workflow allows—for example, to a protected GitHub environment instead of every branch.

Store identifiers, not passwords:

- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` can be GitHub environment secrets or variables according to your policy.
- `ACR_NAME` and the exact `ACR_LOGIN_SERVER` are non-secret environment variables.
- Protect the deployment environment with branch, reviewer, and tag rules.

The workflow must explicitly request an OIDC token:

```yaml
name: build-and-push-acr

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  build:
    environment: production-build
    # Use ubuntu-latest only when the registry's public endpoint permits it.
    # For Private Link, use a runner with network line of sight to the VNet.
    runs-on: [self-hosted, linux, acr-private]

    steps:
      - name: Check out source
        uses: actions/checkout@v7

      - name: Sign in to Azure with OIDC
        uses: azure/login@v3
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Build and push commit-tagged image
        env:
          ACR_NAME: ${{ vars.ACR_NAME }}
          ACR_LOGIN_SERVER: ${{ vars.ACR_LOGIN_SERVER }}
          REPOSITORY: orders/api
        run: |
          set -euo pipefail

          az acr login --name "$ACR_NAME"
          image="$ACR_LOGIN_SERVER/$REPOSITORY:$GITHUB_SHA"

          docker build --pull --tag "$image" .
          docker push "$image"

          printf 'Published %s\n' "$image"
```

`id-token: write` allows the workflow to request an OIDC token; it does not let the workflow modify Azure resources automatically. The federated credential and Azure role assignments provide the trust and authorization.

For production, pin third-party actions to full commit SHAs and use dependency tooling to keep those pins current. GitHub's security guidance recommends full-length commit SHA pinning because a SHA is immutable.

If the registry is reachable publicly but protected by IP rules, a GitHub-hosted runner's changing outbound addresses are awkward to allow safely. A self-hosted runner behind a stable egress address—or inside the connected VNet—is usually easier to govern.

## Azure DevOps with Workload Identity Federation

Create an **Azure Resource Manager** service connection that uses workload identity federation. Grant the connection's Microsoft Entra identity the ACR roles, then authorize only the intended pipeline to use the connection. Do not select the option that grants every pipeline access.

Microsoft deprecated the Azure DevOps issuer for eligible workload identity connections on July 1, 2026 and plans to retire it on July 1, 2027. The change applies to public-cloud connections using single-tenant applications or managed identities; multitenant and non-public-cloud scenarios are currently excluded. If an existing connection is flagged, convert it to the Microsoft Entra issuer rather than creating a second credential.

An `AzureCLI@2` task can consume the federated Azure Resource Manager service connection and run the same Docker flow:

```yaml
trigger:
  branches:
    include:
      - main

# A private endpoint requires an agent placed in a connected network.
pool:
  name: SelfHostedAcrPool

variables:
  acrName: contosoplatformacr
  acrLoginServer: contosoplatformacr-abc123.azurecr.io
  imageRepository: orders/api

steps:
  - checkout: self

  - task: AzureCLI@2
    displayName: Build and push commit-tagged image
    inputs:
      azureSubscription: acr-wif
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: |
        set -euo pipefail

        az acr login --name "$(acrName)"
        image="$(acrLoginServer)/$(imageRepository):$(Build.SourceVersion)"

        docker build --pull --tag "$image" .
        docker push "$image"

        printf 'Published %s\n' "$image"
```

The `azureSubscription` value is the service-connection name, despite the input name. The agent needs a working Docker CLI and daemon.

`Docker@2` is another option, but its `containerRegistry` input expects a Docker registry service connection, not an Azure Resource Manager service connection. Do not pass the workload-identity ARM connection to `Docker@2` and expect it to authenticate. The Azure CLI pattern above keeps federation and the Docker operation in one auditable identity flow.

## Private Link Changes the Runner Choice

For a Premium registry with Private Link and public network access disabled, identity is not enough. The runner or agent needs:

1. Routing to the private endpoint's VNet, through VNet placement, peering, VPN, or ExpressRoute.
2. DNS resolution through the linked `privatelink.azurecr.io` private zone or a correctly configured conditional forwarder.
3. Resolution for the global registry endpoint and every dedicated regional data endpoint used for layer uploads.
4. HTTPS egress to those private IPs without a proxy rewriting registry traffic.

Standard Microsoft-hosted Azure Pipelines agents do not have line of sight to an ACR private endpoint. Use a self-hosted agent in the connected network, or a Managed DevOps Pool whose agents are injected into an existing VNet that can resolve and route to the endpoint. Apply the same network principle to GitHub: choose a self-hosted runner or a GitHub-hosted runner connected through a supported private-networking design.

Run these checks on the actual build worker, not from an administrator laptop:

```bash
nslookup "$ACR_LOGIN_SERVER"
curl --include --max-time 10 "https://$ACR_LOGIN_SERVER/v2/"
az acr check-health --name "$ACR_NAME" --yes
```

An unauthenticated `GET /v2/` commonly returns `401 Unauthorized`; that response proves DNS, TCP, TLS, and the registry endpoint are reachable. A timeout indicates networking. A `403` often means DNS selected the public endpoint while public access or the source IP is blocked. Login followed by a stalled layer upload points to a missing data-endpoint DNS record or firewall rule.

## Make the Pipeline Traceable and Repeatable

A reliable image pipeline does more than make `docker push` succeed:

- Build and push the commit-SHA tag first. Add a release or channel tag only after the commit-tagged push succeeds.
- Record the fully qualified image reference as an output for the deployment stage.
- Prefer deploying by digest when the target platform supports it.
- Avoid granting catalog-list access unless the build genuinely needs to enumerate every repository.
- Keep delete permission in a separate cleanup identity; a build normally needs Writer or `AcrPush`, not Contributor or `AcrDelete`.
- Serialize publication of shared mutable tags so two builds cannot race to update `latest`.
- Add build provenance, signing, and vulnerability scanning as separate, intentionally authorized stages.

Verify the published manifest by its exact tag:

```bash
COMMIT_SHA='<published-commit-sha>'

az acr manifest show-metadata \
  --registry "$ACR_NAME" \
  --name "orders/api:$COMMIT_SHA" \
  --query digest \
  --output tsv
```

The `az acr manifest` command group is currently Preview. Pin and test the CLI version used by the pipeline, or verify the digest with another approved OCI client if preview commands are not acceptable. This command is a data-plane read and needs suitable repository read access in addition to any control-plane permission used by Azure CLI.

## Troubleshooting by Failure Stage

| Symptom | Most likely layer | Check |
| --- | --- | --- |
| OIDC login fails | federation trust | issuer, subject, audience, tenant, protected environment |
| `az acr login` is denied | control plane or network | current ACR CLI-login role, actual registry name, endpoint reachability |
| Docker login succeeds but push is denied | repository authorization | permissions mode, Writer ABAC condition, or legacy `AcrPush` |
| `401` appears after an RBAC-to-ABAC migration | stale registry credential | log out and obtain a new credential after the mode switch |
| `403` names the runner IP | registry firewall | public IP allowlist or private runner path |
| Manifest begins but layer upload times out | data endpoint | dedicated data-endpoint DNS and routing |
| Azure DevOps private build cannot connect | unsupported agent placement | use a connected self-hosted agent or VNet-injected Managed DevOps Pool |

The quickest diagnosis is to separate the layers: prove the workload federation, prove registry endpoint reachability from the worker, prove CLI or Docker authentication, and finally prove authorization for the exact repository. Recreating credentials rarely fixes a DNS or role-condition problem.

## Official Documentation

- [Azure Container Registry Microsoft Entra permissions and role assignments overview](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Azure ABAC repository permissions in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Authenticate with an Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Connect privately to ACR by using Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Configure OpenID Connect in Azure for GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure)
- [Azure Login GitHub Action](https://github.com/Azure/login)
- [Set an Azure Resource Manager workload identity service connection](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops)
- [Convert Azure DevOps issuer service connections to the Microsoft Entra issuer](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/convert-service-connections?view=azure-devops)
- [Azure CLI v2 task reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines)
- [Docker v2 task reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2?view=azure-pipelines)
- [Configure networking for Managed DevOps Pools](https://learn.microsoft.com/en-us/azure/devops/managed-devops-pools/configure-networking?view=azure-devops)
- [Azure CLI reference: `az acr manifest`](https://learn.microsoft.com/en-us/cli/azure/acr/manifest)
