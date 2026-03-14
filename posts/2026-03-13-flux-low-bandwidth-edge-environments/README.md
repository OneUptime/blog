# How to Configure Flux CD for Low-Bandwidth Edge Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, Bandwidth Optimization, OCI Artifacts, Compression

Description: Optimize Flux CD for low-bandwidth network environments using OCI artifacts, shallow clones, and manifest compression to minimize data transfer.

---

## Introduction

Edge sites often operate on constrained network links — 4G cellular with data caps, satellite connections with limited throughput, or private MPLS links shared with operational technology. Every megabyte transferred costs money or time, and Flux CD's default behavior of cloning a full Git repository on every reconciliation cycle can be surprisingly bandwidth-intensive at scale.

Optimizing Flux for low-bandwidth environments involves replacing Git operations with more efficient OCI artifact pulls, configuring shallow clones, increasing reconciliation intervals, and compressing transferred data. With the right configuration, Flux's bandwidth consumption can be reduced by 70-90% compared to defaults.

This guide covers every available bandwidth optimization, from OCI artifacts to blob storage caching, with specific measurements to help you understand the impact.

## Prerequisites

- Flux CD deployed on edge Kubernetes clusters
- An OCI-compatible registry accessible from edge sites (Harbor, ECR, GCR, or similar)
- CI/CD pipeline that can publish OCI artifacts
- Ability to monitor network traffic at edge sites

## Step 1: Replace Git Cloning with OCI Artifacts

This is the single highest-impact change for bandwidth reduction. A full Git repository clone can be 50-500MB; an OCI artifact of the same manifests is typically 1-10MB.

On your CI/CD pipeline, publish manifests as OCI artifacts on every merge:

```yaml
# .github/workflows/publish-oci.yml
name: Publish OCI Artifact

on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Login to registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | \
            docker login my-registry.example.com -u "${{ secrets.REGISTRY_USERNAME }}" --password-stdin

      - name: Push OCI artifact for edge sites
        run: |
          flux push artifact \
            oci://my-registry.example.com/fleet/edge-apps:latest \
            --path=./apps/overlays/edge \
            --source=https://github.com/${{ github.repository }} \
            --revision="${{ github.ref_name }}@sha1:${{ github.sha }}" \
            --creds="${{ secrets.REGISTRY_USERNAME }}:${{ secrets.REGISTRY_PASSWORD }}"

          # Also tag with SHA for immutability
          flux tag artifact \
            oci://my-registry.example.com/fleet/edge-apps:latest \
            --tag="${{ github.sha }}"
```

On edge clusters, switch from GitRepository to OCIRepository:

```yaml
# Replace GitRepository with OCIRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: fleet-edge-apps
  namespace: flux-system
spec:
  interval: 30m        # Check for new artifact every 30 min
  url: oci://my-registry.example.com/fleet/edge-apps
  ref:
    tag: latest
  secretRef:
    name: registry-credentials
```

## Step 2: Configure Shallow Git Cloning (If Still Using Git)

If you must use a GitRepository source, enable shallow cloning to reduce transfer size.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  timeout: 120s
  ref:
    branch: main
  url: https://github.com/my-org/my-fleet
  # Shallow clone - only fetch recent history
  include:
    - fromPath: apps/overlays/edge
      toPath: overlays
  secretRef:
    name: flux-system
```

## Step 3: Increase Reconciliation Intervals

Longer intervals mean fewer network requests. For edge sites where changes are infrequent, there is no reason to reconcile every minute.

```yaml
# Tiered interval strategy for edge
# Source: check every 30 minutes
# Infrastructure Kustomization: reconcile every 30 minutes
# Apps Kustomization: reconcile every 60 minutes

apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 60m           # Once per hour is enough for most edge workloads
  retryInterval: 30m      # Long retry to avoid hammering limited bandwidth
  timeout: 15m
  prune: true
  sourceRef:
    kind: OCIRepository
    name: fleet-edge-apps
  path: ./
```

## Step 4: Implement OCI Artifact Versioning for Targeted Updates

Instead of pushing all manifests as one artifact, split by update frequency to avoid re-downloading stable components.

```yaml
# CI/CD: Push separate artifacts by component
# Infrastructure (changes rarely)
flux push artifact \
  oci://my-registry.example.com/fleet/infrastructure:v1.0.0 \
  --path=./infrastructure/overlays/edge

# Applications (changes frequently)
flux push artifact \
  oci://my-registry.example.com/fleet/apps:latest \
  --path=./apps/overlays/edge
```

```yaml
# Edge cluster: Use separate OCIRepositories with different intervals
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: fleet-infrastructure
  namespace: flux-system
spec:
  interval: 6h   # Check infrastructure changes every 6 hours
  url: oci://my-registry.example.com/fleet/infrastructure
  ref:
    tag: v1.0.0  # Pinned version - only update manually

---
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: fleet-apps
  namespace: flux-system
spec:
  interval: 30m  # Check app changes every 30 minutes
  url: oci://my-registry.example.com/fleet/apps
  ref:
    tag: latest
```

## Step 5: Measure Bandwidth Consumption

Before and after optimization, measure actual bandwidth usage.

```bash
# Monitor network usage on the edge node
# Install vnstat for per-interface stats
sudo apt-get install -y vnstat
sudo vnstat --add -i eth0

# After 24 hours, check daily bandwidth
vnstat -d -i eth0

# More detailed monitoring with tcpdump (temporary)
sudo tcpdump -i eth0 -s 0 -w /tmp/flux-traffic.pcap &
# Let Flux run one reconciliation cycle
flux reconcile source oci fleet-apps
kill %1
tcpdump -r /tmp/flux-traffic.pcap -q | wc -l
```

Expected results after optimization:
- Git clone (before): 15-50MB per reconciliation
- OCI artifact pull (after): 0.5-2MB per reconciliation (delta only on subsequent pulls)

## Step 6: Use a Local Edge Registry Cache

Cache OCI artifacts locally so only the first pull requires bandwidth.

```bash
# Use containerd's built-in image caching
# The OCI artifact is cached after first pull
# Subsequent pulls only transfer if the digest has changed

# Verify caching is working
ctr images ls | grep fleet/edge-apps
# If already present, Flux will not re-download until digest changes
```

## Best Practices

- Switch from GitRepository to OCIRepository as the primary bandwidth optimization.
- Split manifests into stability tiers (infrastructure vs. apps) with different update frequencies.
- Use image digest pinning in OCI artifact tags so Flux only downloads when there is an actual change.
- Monitor bandwidth per-site to identify outliers that may need additional optimization.
- Consider local OCI registry caching for sites with extremely limited bandwidth.
- Set `interval` based on your change frequency — if apps change once a day, a 4-hour interval is reasonable.

## Conclusion

Bandwidth optimization for Flux CD in edge environments is primarily about reducing the frequency and size of data transfers. The shift from Git repository cloning to OCI artifact pulls is transformative, reducing transfer sizes by 10x or more. Combined with longer reconciliation intervals and stability-tiered update schedules, Flux can operate effectively even on cellular connections with strict data caps.
