# Basic, Standard, or Premium? Choosing the Right Azure Container Registry Tier

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, Cloud Architecture, Containers, Cost Optimization

Description: Select an ACR tier from required features, storage, concurrency, and measured image traffic instead of treating the SKUs as simple disk sizes.

---

Choose Standard for a typical single-region production registry, Basic for low-volume development or evaluation, and Premium when a Premium-only capability or materially higher concurrency is required. Storage alone is rarely the deciding factor because every tier can exceed its included allowance, up to its hard storage limit, with additional storage billed separately.

## Start with the Feature Gate

The current service tiers share the same registry APIs and core capabilities: Microsoft Entra authentication, image and artifact storage, deletion, webhooks, and repository-scoped permissions. The important differences are limits, performance, and feature gates.

| Requirement | Basic | Standard | Premium |
| --- | --- | --- | --- |
| Included storage | 10 GiB | 100 GiB | 500 GiB |
| Maximum registry storage | 40 TiB | 40 TiB | 100 TiB |
| Webhooks | 2 | 10 | 500 |
| Microsoft Entra repository permissions | yes | yes | yes |
| Non-Entra tokens and scope maps | yes | yes | yes |
| Zone redundancy in supported regions | yes | yes | yes |
| Anonymous pull | no | yes | yes |
| Artifact cache rules | no | yes | yes |
| Private Link private endpoints | no | no | yes |
| Public IP network rules | no | no | yes |
| Geo-replication | no | no | yes |
| Dedicated data endpoints | no | no | yes |
| Customer-managed keys | no | no | yes |
| Artifact streaming | no | no | yes |
| Connected registries | no | no | yes |

These are documented service limits, not a pricing table. Included storage is part of the tier's daily rate; usage above it is charged per GiB until the tier's storage limit. Consult Azure's live pricing page for monetary comparisons because rates vary by region and can change.

## Choose Basic for Bounded, Low-Volume Use

Basic is appropriate when all of the following are true:

- the registry is for development, training, a proof of concept, or a small build workload;
- image pushes and concurrent node pulls are infrequent;
- 10 GiB of included storage and two webhooks are acceptable;
- anonymous pull and artifact cache rules are unnecessary; and
- the registry does not need private endpoints, network allowlists, geo-replication, customer-managed keys, or other Premium-only controls.

Basic is not a functionally different registry protocol. A pipeline that uses standards-based Docker or OCI operations can work on it. The risk is operational headroom: a burst of deployments can create more authentication, manifest, and layer requests than a quiet development test suggests.

Do not describe Basic as lacking availability-zone protection. Azure now enables zone redundancy by default for Basic, Standard, and Premium in supported regions. That is regional zone resiliency, not multi-region disaster recovery.

## Choose Standard as the General Production Baseline

Standard is the strongest default when a registry serves production workloads in one region but does not need Premium networking or replication. It provides:

- 100 GiB of included storage;
- higher image throughput than Basic;
- up to ten webhooks;
- anonymous pull when deliberately enabled; and
- artifact cache rules.

Standard often fits a small or medium AKS, Container Apps, or App Service estate where builds push continuously but pulls are spread over ordinary deployments. It also supports both modern Microsoft Entra ABAC repository permissions and registry-native tokens with scope maps, so Premium is not required for repository-level least privilege.

Standard is the wrong choice when security policy requires public access to be disabled in favor of an ACR Private Link endpoint. Private endpoints and public IP network rules are Premium capabilities. A virtual network around the workload does not make a publicly addressed Standard registry private.

## Choose Premium for Networking, Distribution, or Scale

Premium is not merely “more storage.” Select it when at least one of these requirements is real:

### Private network access

Private Link gives the registry private IP addresses in a virtual network, and public network access can then be disabled. ACR private endpoints automatically use dedicated data endpoints so layer traffic can remain on the intended private path. This is the usual decisive requirement for regulated or tightly segmented environments.

### Multi-region image distribution

Geo-replication keeps one logical registry with replicas in selected Azure regions. Clients continue to use the registry endpoint while ACR places image data closer to deployments and synchronizes pushed content. Geo-replication is a Premium feature and is distinct from the zone redundancy available to all tiers.

### High fan-out deployments

Premium has the highest API request rates, authentication and authorization capacity, bandwidth, and concurrent operation limits. Large node pools starting simultaneously can generate many requests even when images share layers. Premium can reduce registry-side throttling, but it cannot fix oversized images, blocked data endpoints, slow client disks, or serialized deployment design.

### Premium-only governance and edge features

Customer-managed keys, connected registries, artifact streaming, retention policy for untagged manifests, export policy, artifact transfer, content trust, and dedicated ACR Tasks agent pools are Premium-only in the current feature table. Docker Content Trust can no longer be enabled on a registry that did not already have it enabled by May 31, 2026, and ACR is scheduled to remove it completely on March 31, 2028, so it is not a reason to select Premium for a new design. Confirm the lifecycle and regional support of every optional feature before making it an architectural dependency.

## Understand How Pulls Consume Capacity

One `docker pull` is not one registry request. A client authenticates, resolves a tag or digest, reads a manifest or index, and requests each missing layer. A multi-platform index or image with many layers increases request count. Hundreds of new nodes can repeat those operations concurrently.

ACR enforces separate per-minute request limits for categories including:

- data-plane reads such as manifests, layers, tags, and repository metadata;
- data-plane writes such as layers and manifests;
- deletes; and
- OAuth authentication and authorization exchanges.

When a category exceeds its limit, ACR returns HTTP `429 Too Many Requests` with a `Retry-After` header. Raising the tier can increase headroom, but first determine which category is throttled. Repeated catalog scans, vulnerability tools, tag enumerations, or unnecessary logins can consume capacity independently of image bytes.

Image design still matters. Remove unused files, use effective layer caching, avoid gratuitously high layer counts, and keep registries network-close to runtimes. During a rollout, existing layers on a node do not need to be downloaded again, so cold-node tests are more meaningful than warm-cache tests.

## Measure Before and After the Choice

Inspect the current tier and resource usage:

```bash
ACR_NAME=contosoplatformacr

az acr show \
  --name "$ACR_NAME" \
  --query '{sku:sku.name,location:location,provisioningState:provisioningState}' \
  --output table

az acr show-usage \
  --name "$ACR_NAME" \
  --output table
```

Then review Azure Monitor metrics around actual events:

- a full cluster scale-out with cold nodes;
- parallel CI builds and pushes;
- vulnerability and inventory scans;
- regional deployment peaks; and
- disaster-recovery exercises.

Record client-visible pull latency and any `429` responses, not just registry storage. A registry can be well below its storage allowance while authentication or read request rates are the bottleneck.

## Upgrade When the Requirement Appears

The SKU can be changed on an existing registry. For example:

```bash
az acr update \
  --name "$ACR_NAME" \
  --sku Premium
```

After the update, explicitly configure the Premium feature you need; changing the SKU alone does not create a private endpoint or geo-replica. Validate the resulting registry state:

```bash
az acr show \
  --name "$ACR_NAME" \
  --query '{sku:sku.name,publicAccess:publicNetworkAccess,dataEndpoint:dataEndpointEnabled}' \
  --output table
```

Treat downgrades separately. Remove or redesign dependencies on Premium-only features before attempting to move to Standard or Basic, and check the current CLI and service constraints rather than assuming every configuration can be downgraded.

## A Practical Decision Sequence

Use this order so a secondary consideration does not hide a hard requirement:

1. If private endpoints, IP network rules, geo-replication, customer-managed keys, connected registries, or another Premium-only feature is mandatory, choose Premium.
2. Otherwise, if the registry serves normal production workloads, choose Standard and measure it.
3. Choose Basic only for demonstrably light and bounded workloads.
4. Test a cold scale-out and concurrent builds with representative image sizes.
5. Upgrade if monitoring shows sustained capacity pressure or a new feature requirement.

The least expensive tier that meets a hard security requirement and a measured capacity requirement is the right tier. Choosing Premium reflexively wastes money; choosing Basic from storage size alone can leave a production deployment short of request-rate headroom.

## Official Documentation

- [Azure Container Registry SKU features and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Zone redundancy in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/zone-redundancy)
- [Container image storage in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-storage)
- [Connect privately to ACR with Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
- [Geo-replication in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [Best practices for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-best-practices)
