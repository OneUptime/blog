# Azure Container Registry Setup Guide: SKUs, Naming, Networking, and Your First Push

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, Containers, Docker, Security

Description: Create an Azure Container Registry with deliberate choices for its tier, DNS name, access model, and first authenticated image push.

---

An Azure Container Registry (ACR) is more than a Docker endpoint. Its SKU controls capacity and networking features, its registry name can influence a permanent DNS name, and its role-assignment mode determines which data-plane roles actually work. Making those choices explicitly at creation time prevents surprising migrations later.

This guide creates an ABAC-enabled Standard registry for a single-region workload, grants the signed-in developer push access, and publishes a test image without enabling the shared admin account.

## Decide the Shape Before Creating the Registry

Use these questions before opening the CLI:

| Decision | Sensible starting point | Change it when |
| --- | --- | --- |
| Region | same region as the main container runtime | workloads span regions or residency rules require another region |
| SKU | Standard | Basic is enough for light development, or Premium-only networking and replication are required |
| Permission mode | `rbac-abac` | an existing organization deliberately remains on legacy registry-wide RBAC |
| DNL scope | `TenantReuse` | security policy requires `NoReuse`, `SubscriptionReuse`, or `ResourceGroupReuse` |
| Public access | enabled for the first controlled test | a Premium registry has a verified private endpoint and private DNS path |

Basic, Standard, and Premium expose the same registry data-plane APIs. Standard has more included storage and throughput than Basic and is the usual production baseline. Premium is required for capabilities such as Private Link private endpoints and geo-replication. All three tiers use zone redundancy by default in supported regions; Premium is not required merely to obtain that regional zone protection.

Place the registry close to its primary build and deployment systems. New nodes may need to download every image layer, so cross-region placement adds latency and can add network transfer cost.

## Understand the Two Names

The Azure resource name must be globally unique, contain only alphanumeric characters, and be 5–50 characters long. Check availability before building automation around a candidate:

```bash
ACR_NAME=contosoplatformacr

az acr check-name --name "$ACR_NAME" --output table
```

The resource name and login server are related but are not necessarily identical. Domain Name Label (DNL) protection appends a hash to the DNS label, producing a login server such as:

```text
contosoplatformacr-e7ggejfuhzhgedc8.azurecr.io
```

That hash prevents a deleted registry's old hostname from silently being reused outside the selected reuse scope. With `TenantReuse`, for example, a registry recreated with the same name in the same tenant receives the same DNS label, while a registry in another tenant does not. The DNL scope is permanent. The current Azure CLI reference labels the `--dnl-scope` argument as Preview, so pin and test the CLI version used by provisioning automation. Always read `loginServer` from Azure after creation instead of constructing `${ACR_NAME}.azurecr.io` in scripts, Kubernetes manifests, or Helm values.

## Create an ABAC-Enabled Standard Registry

Sign in, select the intended subscription, and create a dedicated resource group:

```bash
RESOURCE_GROUP=rg-platform-registry
LOCATION=westeurope
ACR_NAME=contosoplatformacr

az login
az account set --subscription '<subscription-id-or-name>'
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"
```

Create the registry with the admin user disabled, ABAC repository permissions enabled, and a tenant-reuse DNL scope:

```bash
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --location "$LOCATION" \
  --sku Standard \
  --admin-enabled false \
  --role-assignment-mode rbac-abac \
  --dnl-scope TenantReuse
```

Capture Azure's actual resource ID and login server:

```bash
ACR_ID=$(az acr show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --query id --output tsv)

LOGIN_SERVER=$(az acr show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --query loginServer --output tsv)

printf 'Registry ID: %s\nLogin server: %s\n' "$ACR_ID" "$LOGIN_SERVER"
```

Confirm the choices rather than assuming the defaults:

```bash
az acr show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --query '{sku:sku.name,loginServer:loginServer,admin:adminUserEnabled,permissionMode:roleAssignmentMode,publicAccess:publicNetworkAccess}' \
  --output table
```

## Grant Data-Plane Access Explicitly

On an ABAC-enabled registry, `Owner`, `Contributor`, and `Reader` are control-plane roles; they do not grant image push or pull access. Legacy `AcrPull`, `AcrPush`, and `AcrDelete` assignments are not honored either.

Grant the signed-in user `Container Registry Repository Writer`, which can pull, push, and update content but cannot delete it:

```bash
USER_OBJECT_ID=$(az ad signed-in-user show --query id --output tsv)

az role assignment create \
  --assignee-object-id "$USER_OBJECT_ID" \
  --assignee-principal-type User \
  --role 'Container Registry Repository Writer' \
  --scope "$ACR_ID"
```

Creating role assignments requires `Microsoft.Authorization/roleAssignments/write` at the relevant scope. Built-in roles with that permission include `Owner`, `Role Based Access Control Administrator`, and `User Access Administrator`. Azure role assignments can take time to propagate, so obtain a new registry login after the assignment exists.

The assignment above is registry-wide because it has no ABAC condition. Production build identities should normally receive a condition limiting `Container Registry Repository Writer` to the repositories they publish. Deployment identities should receive `Container Registry Repository Reader`, also with a repository condition where practical.

For a registry whose role-assignment mode is the older `rbac` setting, the corresponding registry-wide roles are `AcrPush` and `AcrPull`. Do not mix the two role families without first checking the registry mode:

```bash
az acr show --name "$ACR_NAME" --query roleAssignmentMode --output tsv
```

`AbacRepositoryPermissions` is the returned value for an ABAC-enabled registry, while `LegacyRegistryPermissions` identifies the older registry-wide RBAC mode. The `rbac-abac` and `rbac` spellings are create/update inputs, not `az acr show` output.

## Authenticate Without the Admin Account

Make sure the Docker client and daemon are running. Then use the signed-in Microsoft Entra identity:

```bash
docker version
az acr login --name "$ACR_NAME"
```

`az acr login` takes the Azure resource name, not the full login server. It uses the Azure CLI identity to obtain registry credentials and writes them through the local Docker client. By contrast, subsequent `docker tag`, `docker push`, and `docker pull` commands use the full login server.

Repository Writer authorizes the data-plane push, but it does not itself grant the control-plane permission used by `az acr login`. The person who created the registry normally already has inherited `Owner` or equivalent control-plane access. If this is a separate developer identity, an administrator must deliberately grant a role that permits CLI login. Microsoft documents `Container Registry Contributor and Data Access Configuration Administrator` for that purpose, but it can also create, configure, and delete registries, so do not add it merely to make a production build identity work. For a data-plane-only workload, prefer a direct service-principal or repository-token Docker login instead.

Do not enable the registry admin account for normal developer or CI access. It is disabled by default, has registry-wide push and pull permissions, and makes every caller appear as the same identity.

## Push the First Image

Use the Microsoft-hosted hello-world image so the test does not depend on Docker Hub:

```bash
docker pull mcr.microsoft.com/hello-world

docker tag \
  mcr.microsoft.com/hello-world \
  "$LOGIN_SERVER/getting-started/hello-world:v1"

docker push "$LOGIN_SERVER/getting-started/hello-world:v1"
```

Test the complete pull path by removing both local tags so Docker deletes the image and its unshared layers, then pull it again:

```bash
docker image rm \
  "$LOGIN_SERVER/getting-started/hello-world:v1" \
  mcr.microsoft.com/hello-world:latest

docker pull "$LOGIN_SERVER/getting-started/hello-world:v1"
docker run --rm "$LOGIN_SERVER/getting-started/hello-world:v1"
```

Confirm that image removal reports the image as deleted and that the subsequent pull downloads its layer. If Docker reports that the layer already exists because another local image references it, repeat the pull test in a clean Docker environment before treating it as a data-endpoint test.

A successful push proves authentication, write authorization, manifest upload, and layer upload. A subsequent pull proves read authorization and the data endpoint path as well.

## Choose the Network Boundary Deliberately

The first test above uses public network access, which is enabled by default. Authentication and authorization still protect the registry, but any allowed public client can reach its endpoint.

Premium provides stricter network controls:

- Private Link maps the registry endpoint and its dedicated regional data endpoint to private IP addresses in a virtual network.
- Public IP network rules can limit public callers to approved addresses.
- Dedicated data endpoints provide registry-specific layer-download hostnames instead of broad Azure Storage hostnames.

A push or pull uses at least two endpoint classes: the registry REST/login endpoint and a data endpoint for layers. Firewall designs must permit both. With a private endpoint, create and link the `privatelink.azurecr.io` private DNS zone and verify both records before disabling public access. A login can succeed while a layer transfer still fails if only the login endpoint resolves correctly.

Do not disable public access until every builder and runtime has network line of sight to the private endpoint. Microsoft-hosted CI agents and other public services do not automatically join your virtual network; a private registry commonly requires a self-hosted runner or agent in a connected network.

## Validate the Registry Before Depending on It

Run the supported health check from the same machine that will push images:

```bash
az acr check-health \
  --name "$ACR_NAME" \
  --ignore-errors \
  --yes
```

Also record these operational facts in the platform repository:

- the registry resource ID and exact `loginServer`;
- SKU, region, DNL scope, and permission mode;
- public, firewall, or private endpoint access path;
- identities allowed to push and the repository boundaries of those assignments;
- immutable image-tag or digest conventions; and
- retention, monitoring, and disaster-recovery requirements.

Use unique version tags or digests in deployments instead of relying on `latest`. The registry is ready when a real builder can push and a real runtime can pull through the intended network path—not merely when the Azure resource reports `Succeeded`.

## Official Documentation

- [Quickstart: Create an Azure Container Registry with the Azure CLI](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-get-started-azure-cli)
- [Azure CLI reference: `az acr create`](https://learn.microsoft.com/en-us/cli/azure/acr#az-acr-create)
- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Azure Container Registry naming rules](https://learn.microsoft.com/en-us/rest/api/container-registry/registries/check-name-availability)
- [Azure Container Registry authentication options](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Microsoft Entra ABAC repository permissions in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Best practices for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-best-practices)
