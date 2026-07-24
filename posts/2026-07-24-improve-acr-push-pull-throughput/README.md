# Why ACR Pushes and Pulls Are Slow—and How to Improve Throughput

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, Docker, Containers, Performance, DevOps

Description: Find the real bottleneck behind slow ACR transfers and improve image layout, network locality, registry capacity, and client behavior.

---

A slow `docker pull` is not one operation. The client authenticates, resolves a tag to a manifest, checks which layers are already cached, follows data-endpoint redirects, downloads missing blobs, decompresses them, and writes them to local storage. A push performs a similar sequence in reverse and uploads only layers the registry does not already have.

That means an ACR transfer can be limited by the client, the network path, image layout, registry request capacity, or geo-replication behavior. Upgrading the registry before measuring these stages often leaves the real bottleneck untouched.

## Establish a Repeatable Baseline

Test from the same type of runner, node, or workstation that experiences the problem. Record:

- Client region and network path.
- Registry SKU and home or serving region.
- Image digest, compressed size, and layer count.
- Whether the image layers are already cached.
- Total elapsed time and whether the delay occurs before or during layer transfer.

Run ACR's supported health check first:

```bash
ACR_NAME="contosoprod"

az acr check-health \
  --name "$ACR_NAME" \
  --ignore-errors \
  --yes
```

Then time a pull by immutable digest:

```bash
IMAGE="contosoprod.azurecr.io/payments@sha256:REPLACE_WITH_DIGEST"

time docker pull "$IMAGE"
```

A warm pull may complete almost immediately because the layers already exist locally. To measure network transfer, use a clean disposable runner or a node without those layers. Do not erase a production node's image cache just to benchmark.

Compare three controlled cases:

1. The affected client pulling the affected image.
2. An Azure VM in the registry's region pulling the same digest.
3. The affected client pulling a small known image from the same registry.

If only the first case is slow, investigate the client or wide-area network. If all images are slow from all clients, inspect registry capacity, throttling, service health, and endpoint configuration. If only one image is slow, focus on its layers and client-side extraction.

## Understand the Registry SKU Boundary

Basic, Standard, and Premium registries have different included storage and expected read/write throughput. ACR also enforces request-rate limits for authentication, manifest operations, metadata, and data-plane reads and writes. The current values can change, so use Microsoft's service-tier table rather than copying old limits into capacity plans.

Inspect the registry:

```bash
az acr show \
  --name "$ACR_NAME" \
  --query '{sku:sku.name,location:location,loginServer:loginServer}' \
  --output table

az acr show-usage \
  --name "$ACR_NAME" \
  --output table
```

Upgrade when measurements show sustained demand near the tier's documented limits or when you need Premium-only capabilities such as geo-replication and dedicated data endpoints:

```bash
az acr update \
  --name "$ACR_NAME" \
  --sku Premium
```

A tier change does not make a slow laptop connection faster. It helps when registry-side capacity or a required topology feature is the constraint.

High rates of tag listing, manifest inspection, and referrer queries share data-plane request capacity with deployment traffic. Inventory crawlers, security tooling, and cleanup scripts should paginate, cache, back off on throttling, and avoid repeatedly enumerating every repository during a release wave.

## Put Content Near the Clients

Network distance matters for large missing layers. For a single-region workload, place the registry and build or deployment compute in the same Azure region when possible. For globally distributed workloads, Premium geo-replication creates writable replicas in selected regions while retaining one registry namespace.

Create and list a replica:

```bash
az acr replication create \
  --registry "$ACR_NAME" \
  --location "westeurope"

az acr replication list \
  --registry "$ACR_NAME" \
  --output table
```

The global endpoint normally routes a client to the replica with the best network performance profile, which is often the nearest healthy replica. Replication is eventually consistent. A deployment that pulls immediately in another region can briefly see `manifest unknown`, especially for large images. Publish by digest, retry with backoff, and wait for replication completion before a coordinated multi-region rollout.

As of July 2026, ACR regional endpoints are a preview feature. They let a client target a particular geo-replica for predictable routing and push-pull consistency, but require client-side failover planning. Do not make a preview endpoint a production dependency without confirming support and lifecycle requirements.

## Do Not Confuse Endpoint Control with More Bandwidth

Premium dedicated data endpoints give layer transfers predictable registry-specific hostnames such as:

```text
contosoprod.eastus.data.azurecr.io
contosoprod.westeurope.data.azurecr.io
```

Enable them with:

```bash
az acr update \
  --name "$ACR_NAME" \
  --data-endpoint-enabled true

az acr show-endpoints \
  --name "$ACR_NAME" \
  --output table
```

Dedicated data endpoints are especially useful when a firewall must allow only registry-specific layer endpoints instead of broad Azure Storage domains. They also preserve an in-region data path for the serving geo-replica. They are not a magic bandwidth switch. A proxy, TLS inspection appliance, incorrect private DNS record, or undersized network virtual appliance can still serialize or throttle transfers.

For private endpoints, verify DNS from the actual worker or Kubernetes node:

```bash
nslookup contosoprod.azurecr.io
```

Also allow every required dedicated data endpoint. Authentication can succeed against the login server while layer downloads fail or stall against a blocked data endpoint.

## Design Images for Cache Reuse

Container clients transfer content-addressed layers. If two image versions reference an identical layer digest, the registry does not need another copy and a node with that layer cached does not download it again.

Use that model deliberately:

- Put stable operating-system and runtime installation steps before frequently changing application files.
- Copy dependency lock files and install dependencies before copying the full source tree.
- Keep build tools out of the final image with multi-stage builds.
- Exclude source-control data, test output, package caches, and local artifacts with `.dockerignore`.
- Avoid rebuilding a stable base layer merely to add a changing label or timestamp.
- Pin the production base image by digest when reproducibility matters.

For example:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=build /src/package.json /src/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /src/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

This layout does not guarantee a small image, but dependency layers remain reusable when only application source changes. Select an actual supported runtime tag and review its security posture before using this example in production.

One enormous changing layer prevents partial cache reuse. Hundreds of tiny layers create extra manifest and filesystem overhead. Aim for logical, stable layers rather than chasing a universal layer count.

## Account for Client CPU and Disk

A layer can finish downloading and still take time to decompress and apply. On a node with slow storage, high CPU contention, or an overloaded container runtime, the progress display can make a local extraction bottleneck look like registry latency.

Compare:

- Network receive throughput during the pull.
- CPU usage by the container runtime.
- Disk latency and free space.
- Pull time on a fresh, adequately sized VM in the same region.

Kubernetes rollout storms can make every new node pull the same large image simultaneously. Useful mitigations include:

- Pre-pulling release digests during controlled node preparation.
- Using stable base layers shared across services.
- Avoiding `imagePullPolicy: Always` when the deployment policy does not require repeated tag resolution. A digest still provides immutable identity.
- Limiting rollout concurrency so nodes, NAT, proxies, and the registry are not saturated at once.
- Retrying transient registry operations with exponential backoff and jitter.

Do not use node cache as the only availability plan. New or replaced nodes must still be able to pull every production digest.

## Avoid Geo-Replication Consistency Traps

In a geo-replicated registry, a push consists of multiple blob and manifest requests. Microsoft documents a failure mode in which DNS changes during a push can send requests to nearby replicas before replication has caught up, producing `blob unknown` or manifest validation errors.

Preferred mitigations are:

1. Use a regional endpoint to pin the operation when the preview feature is acceptable.
2. Otherwise use a short-lived DNS cache scoped to one push.
3. Make the publish step idempotent and safe to retry.

Do not run a long-lived DNS cache for the global endpoint. It can interfere with health-aware routing and keep clients attached to a replica removed from global routing.

## Monitor Before and After Each Change

ACR emits platform metrics such as total and successful push and pull counts, along with storage use. Configure alerts for failed or throttled activity where supported, and correlate registry metrics with:

- CI job duration.
- Node image-pull duration.
- Client egress and packet loss.
- Proxy or firewall latency.
- Deployment concurrency.

Change one dimension at a time. Moving a runner, resizing a registry, rewriting a Dockerfile, and changing a proxy in one test produces a faster build but no durable understanding.

## Throughput Checklist

Use this order:

1. Run `az acr check-health`.
2. Reproduce with one immutable digest.
3. Compare a clean same-region Azure client.
4. Check client CPU, disk, DNS, proxy, and network throughput.
5. Check the current SKU's request and bandwidth limits.
6. Reduce changing content and improve layer reuse.
7. Co-locate clients or add Premium geo-replicas for global workloads.
8. Validate private and dedicated data endpoint DNS and firewall rules.
9. Control deployment fan-out and use retry with backoff.
10. Re-measure the exact same digest and client class.

This process distinguishes registry capacity from distance, image design, and local extraction. That is what turns a one-time speedup into a repeatable performance improvement.

## Official Documentation

- [Troubleshoot ACR performance](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-troubleshoot-performance)
- [ACR service tiers, features, and limits](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus)
- [Best practices for Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-best-practices)
- [Geo-replication in Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [Dedicated data endpoints](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-dedicated-data-endpoints)
- [Check registry health](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-check-health)

