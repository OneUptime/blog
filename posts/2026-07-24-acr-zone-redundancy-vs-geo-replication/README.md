# ACR Zone Redundancy vs. Geo-Replication: Availability, Latency, and Cost

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, High Availability, Geo-Replication, Disaster Recovery, Containers

Description: Choose the right ACR resilience model by comparing automatic zone redundancy with Premium multi-region geo-replication.

---

Azure Container Registry has two resilience mechanisms that solve different failures. Zone redundancy protects the registry data plane from an availability-zone failure inside one Azure region. Geo-replication places registry content in multiple Azure regions, improves locality for distributed clients, and keeps the data plane available when a whole region is unavailable.

The distinction matters because the current ACR behavior changed. As of July 2026, zone redundancy is automatic for Basic, Standard, and Premium registries in regions that support availability zones. Older guides that describe it as a Premium opt-in feature are no longer current.

## The Short Decision

| Requirement | Zone redundancy | Geo-replication |
|---|---|---|
| Survive one zone failure in a supported region | Yes | Each replica is also zone-redundant |
| Survive a region-wide data-plane outage | No | Yes, through another healthy replica |
| Put content close to clients in several regions | No | Yes |
| Available on Basic and Standard | Yes, in supported regions | No |
| Requires Premium | No | Yes |
| Extra ACR feature charge | No | Each replica is billed |
| Configuration required | No | Choose and create replicas |
| Replication consistency concern | Hidden within one region | Eventual consistency between replicas |

For a workload in one region, automatic zone redundancy may meet the availability target. For a business that must continue pulling images after a regional outage, or that deploys large images around the world, use Premium geo-replication and test the full failover path.

## What Zone Redundancy Protects

In an Azure region with availability-zone support, ACR distributes its data plane across multiple zones. Push and pull operations can continue through a single-zone outage without the customer selecting a zone or operating a failover process.

Important current behavior:

- It applies to Basic, Standard, and Premium.
- It is enabled automatically in supported regions.
- Existing registries in supported regions receive the protection.
- It has no additional zone-redundancy charge.
- It cannot be disabled in a supported region.

The legacy `zoneRedundancy` property and CLI flags may still appear. A portal or API response can even display `Disabled` while the registry is protected. Microsoft now describes that property as a legacy artifact that no longer controls behavior and is scheduled for deprecation.

Do not build an availability check around this field:

```bash
az acr show \
  --name "contosoprod" \
  --query '{location:location,sku:sku.name,legacyZoneProperty:zoneRedundancy}' \
  --output yaml
```

Use the registry region and Microsoft's current list of zone-supported regions to determine eligibility. If the region does not support availability zones, create a registry in a supported region and migrate or import the required content.

Zone redundancy applies to the registry data plane. Microsoft explicitly notes that ACR Tasks do not currently support availability zones. A design that requires builds to continue during a zone event should have an independent build path, such as CI runners that can push to ACR, rather than treating registry data-plane protection as task-worker protection.

## What Geo-Replication Adds

Geo-replication is a Premium feature. It creates writable replicas in Azure regions you select and keeps content and metadata synchronized under one registry resource and credential model.

Create a Premium registry and replicas:

```bash
az acr create \
  --resource-group "rg-container-platform" \
  --name "contosoprod" \
  --location "eastus" \
  --sku Premium

az acr replication create \
  --registry "contosoprod" \
  --location "westeurope"

az acr replication create \
  --registry "contosoprod" \
  --location "southeastasia"

az acr replication list \
  --registry "contosoprod" \
  --output table
```

All replicas are active and writable. Clients normally use the global endpoint:

```text
contosoprod.azurecr.io
```

ACR chooses a replica using the client's network performance profile and registry health. The selected replica is often the closest one, but proximity is not guaranteed. Health-aware failover can remove an unhealthy replica from global endpoint routing so operations continue through healthy replicas.

Each geo-replica in a region with availability-zone support is also automatically zone-redundant. The two features are therefore layered:

```text
Global registry
  Region A replica
    Zone 1
    Zone 2
    Zone 3
  Region B replica
    Zone 1
    Zone 2
    Zone 3
```

Zone redundancy addresses a fault within Region A. Geo-replication supplies Region B when Region A as a whole cannot serve the data plane.

## Eventual Consistency Changes Deployment Design

Geo-replication is active-active and eventually consistent. A push or delete accepted by one replica takes time to reach the others. The interval depends on content size and service conditions.

This creates several practical races:

- A deployment in another region pulls immediately after a push and receives `manifest unknown`.
- The same mutable tag temporarily resolves to different digests in different replicas.
- A delete remains visible from a replica until propagation completes.
- Different requests from one multi-layer push reach different nearby replicas and manifest validation fails.

Use immutable digests in deployment manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payments
  template:
    metadata:
      labels:
        app: payments
    spec:
      containers:
        - name: payments
          image: contosoprod.azurecr.io/payments@sha256:REPLACE_WITH_DIGEST
```

Wait until the image is available in every required region before beginning a coordinated rollout. ACR webhooks can report replication events for geo-replicas. Clients that pull shortly after publication should retry transient `manifest unknown` responses with exponential backoff.

Avoid overwriting production tags. Even if a tag is eventually consistent, two different digests behind the same name create ambiguity during the replication window.

## Global and Regional Endpoints

The global endpoint provides Azure-managed routing and health-aware failover. It should be the default for most workloads.

As of July 2026, regional endpoints are in preview. A regional endpoint has a form such as:

```text
contosoprod.eastus.geo.azurecr.io
contosoprod.westeurope.geo.azurecr.io
```

It sends the entire registry operation to one specific replica. This helps with deterministic routing, capacity planning, and push-then-pull consistency. It also bypasses global health-aware failover. The client must detect a regional failure and switch endpoints itself.

Microsoft changed the per-replica routing flag in Azure CLI 2.86.0: `--region-endpoint-enabled` became `--global-endpoint-routing`. The older flag was removed in Azure CLI 2.87.0 in June 2026. This is distinct from the registry-level `--regional-endpoints` flag that enables preview regional endpoint URLs. Pinning old CLI syntax in automation will now fail. Confirm the installed CLI version and the preview contract before using this capability.

Do not use a long-lived DNS cache to pin the global endpoint. It can keep clients routed to a replica that ACR has removed from global routing.

## Network Design Is Part of Availability

A healthy replica is useless if clients cannot resolve or reach it. For geo-replicated registries with private endpoints or dedicated data endpoints, account for each regional endpoint surface:

- The global registry endpoint.
- A dedicated data endpoint for each replica.
- A regional endpoint for each replica if the preview capability is enabled.

A private endpoint needs private IP capacity for these surfaces. Microsoft documents that adding replicas can fail when connected subnets do not have enough free addresses. If you manage private DNS records manually, add records for each new replica's data endpoint and, when enabled, its regional endpoint. Firewall rules must allow every endpoint that clients use.

Test from every deployment region:

```bash
az acr check-health \
  --name "contosoprod" \
  --ignore-errors \
  --yes
```

Also test an actual digest pull through the same DNS, private endpoint, proxy, and identity used by the workload. A control-plane view of `Succeeded` does not validate the data path from a Kubernetes node.

## Cost Model

Automatic zone redundancy has no extra ACR charge. Normal registry SKU, storage, networking, logging, and related service charges still apply.

Geo-replication adds:

- Premium registry pricing.
- A charge for each geo-replica.
- Storage consumption associated with replicated content.
- Network transfer charges where applicable.
- Additional private endpoint, monitoring, log-ingestion, key-management, and operational costs in a full design.

Use the current Azure pricing page and calculator for exact regional amounts. Prices change, and a static example becomes misleading quickly.

Cost is not only the number of replicas. A large registry full of stale images takes longer to initialize in a new region and consumes storage there. Apply retention and purge policies carefully, while preserving every digest referenced by a deployment or rollback plan.

## Choose Regions from Failure Requirements

Do not add replicas simply in every region where Azure is available. For each candidate, ask:

1. Which workloads pull or push there?
2. Does it reduce material network distance?
3. Is it outside the failure boundary of the primary region?
4. Does it support the dependent services and compliance requirements?
5. Can private DNS, firewall, identity, and key infrastructure fail over too?
6. Can the team test and operate the additional path?

Geo-replicating ACR does not automatically replicate an AKS cluster, Key Vault design, secrets, deployment controller, or application data. Regional resilience exists only when the whole release and runtime path can use the surviving region.

## Test the Design

A useful exercise validates:

- Every required digest exists before rollout.
- Nodes in each region pull through the expected endpoint.
- Clients retry propagation delays safely.
- Global endpoint traffic avoids a replica removed from routing.
- Regional endpoint clients perform their own failover.
- Private DNS contains every replica data endpoint.
- Rollback manifests use immutable digests.
- Builds have an alternative because ACR Tasks are outside zone-redundancy coverage.

Zone redundancy is now a strong default, not a multi-region disaster-recovery plan. Geo-replication adds regional copies and locality, but also eventual consistency, endpoint planning, and recurring cost. Choose it when the regional requirement justifies those operational responsibilities.

## Official Documentation

- [Zone redundancy in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/zone-redundancy)
- [Geo-replication in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [Reliability in Azure Container Registry](https://learn.microsoft.com/en-us/azure/reliability/reliability-container-registry)
- [Container image storage in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-storage)
- [ACR service tiers](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Azure Container Registry pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/)

