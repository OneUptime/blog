# How to Manage a Fleet of Edge Clusters with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, Fleet Management, Multi-Cluster, Scale

Description: Scale Flux CD across a fleet of edge clusters using a hub-and-spoke model, progressive rollouts, and cluster group management.

---

## Introduction

Managing one edge cluster is straightforward. Managing fifty requires process. Managing five hundred requires automation and rigorous tooling. Flux CD scales to large edge cluster fleets through a hub-and-spoke architecture where a central management cluster runs Flux and each edge cluster has its own Flux installation reconciling from the same central Git repository.

The key to fleet management at scale is organizing clusters into groups based on their characteristics — hardware type, deployment environment, geographic region, or application profile. Changes roll out progressively through these groups, validated at each stage before proceeding.

This guide covers the hub-and-spoke fleet architecture, cluster grouping strategies, progressive rollouts, and the tooling needed to operate a fleet of hundreds of edge clusters.

## Prerequisites

- A central management cluster with Flux CD (the hub)
- Multiple edge clusters with Flux CD (the spokes)
- A Git repository structured for multi-cluster management
- `flux` and `kubectl` with kubeconfig access to all clusters (or managed via a secrets store)

## Step 1: Hub-and-Spoke Repository Structure

```
clusters/
  hub/                         # Central management cluster
    flux-system/
    fleet-management.yaml      # Manages all spoke cluster registrations
  edge/
    groups/
      tier-1/                  # Pilot sites (2-5 clusters)
        cluster-001/
          flux-system/
          apps.yaml
        cluster-002/
      tier-2/                  # Early majority (25% of fleet)
        cluster-010/
        cluster-011/
      tier-3/                  # Full rollout (remaining clusters)
apps/
  base/                        # Shared across all edge clusters
  overlays/
    tier-1/                    # Pilot configuration
    tier-2/                    # Broad rollout configuration
    tier-3/                    # Stable production configuration
scripts/
  add-cluster.sh               # Onboard a new edge cluster
  rollout-to-tier.sh           # Progress rollout to next tier
```

## Step 2: Cluster Group Management with Kustomize

```yaml
# clusters/edge/groups/tier-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cluster-001/
  - cluster-002/
  - cluster-003/
```

```yaml
# clusters/edge/groups/tier-1/cluster-001/apps.yaml
# Each cluster gets its own Kustomization targeting its tier overlay
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/overlays/tier-1
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_ID: "cluster-001"
      CLUSTER_TIER: "tier-1"
      CLUSTER_REGION: "us-east"
```

## Step 3: Progressive Rollout Across Tiers

```bash
#!/bin/bash
# rollout-to-tier.sh - Progressive fleet rollout
set -euo pipefail

TARGET_TIER="${1:?Usage: $0 <tier-2|tier-3>}"
APP_VERSION="${2:?Usage: $0 <tier> <app-version>}"

echo "==> Rolling out $APP_VERSION to $TARGET_TIER..."

# 1. Update the app version in the target tier overlay
sed -i "s|image:.*my-app:.*|image: my-registry.example.com/my-app:${APP_VERSION}|" \
  "apps/overlays/${TARGET_TIER}/deployment.yaml"

# 2. Commit and push
git add "apps/overlays/${TARGET_TIER}/deployment.yaml"
git commit -m "rollout: deploy ${APP_VERSION} to ${TARGET_TIER}"
git push origin main

echo "==> Waiting for ${TARGET_TIER} clusters to reconcile..."
sleep 60  # Allow first reconciliation to start

# 3. Check health of all clusters in the tier
FAILED_CLUSTERS=()
CLUSTER_DIR="clusters/edge/groups/${TARGET_TIER}"

for cluster_dir in "$CLUSTER_DIR"/*/; do
  CLUSTER_ID=$(basename "$cluster_dir")
  KUBECONFIG_SECRET="${CLUSTER_ID}-kubeconfig"

  # Fetch kubeconfig from secrets store and check health
  CONTEXT=$(kubectl get secret "$KUBECONFIG_SECRET" \
    -n fleet-management -o jsonpath='{.data.value}' | base64 -d > /tmp/${CLUSTER_ID}.kubeconfig && \
    echo "$CLUSTER_ID")

  HEALTHY=$(kubectl --kubeconfig=/tmp/${CLUSTER_ID}.kubeconfig \
    get kustomization apps -n flux-system \
    -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)

  if [ "$HEALTHY" != "True" ]; then
    FAILED_CLUSTERS+=("$CLUSTER_ID")
    echo "WARN: $CLUSTER_ID not healthy"
  else
    echo "OK: $CLUSTER_ID"
  fi
done

if [ ${#FAILED_CLUSTERS[@]} -gt 0 ]; then
  echo "ERROR: ${#FAILED_CLUSTERS[@]} clusters failed: ${FAILED_CLUSTERS[*]}"
  echo "Rollout paused. Investigate before proceeding to next tier."
  exit 1
fi

echo "==> All ${TARGET_TIER} clusters healthy. Rollout complete."
```

## Step 4: Automate Cluster Onboarding

```bash
#!/bin/bash
# add-cluster.sh - Onboard a new edge cluster to the fleet
set -euo pipefail

CLUSTER_ID="${1:?Usage: $0 <cluster-id> <tier> <region>}"
TIER="${2:-tier-3}"
REGION="${3:-us-east}"
KUBECONFIG_PATH="${4:?Usage: $0 <cluster-id> <tier> <region> <kubeconfig-path>}"

echo "==> Onboarding $CLUSTER_ID to fleet (tier: $TIER, region: $REGION)..."

# 1. Create cluster directory in Git
CLUSTER_PATH="clusters/edge/groups/${TIER}/${CLUSTER_ID}"
mkdir -p "$CLUSTER_PATH"

# 2. Create cluster-specific apps.yaml
cat > "${CLUSTER_PATH}/apps.yaml" << EOF
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/overlays/${TIER}
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_ID: "${CLUSTER_ID}"
      CLUSTER_TIER: "${TIER}"
      CLUSTER_REGION: "${REGION}"
EOF

# 3. Bootstrap Flux on the new cluster
export KUBECONFIG="$KUBECONFIG_PATH"
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch=main \
  --path="$CLUSTER_PATH" \
  --components=source-controller,kustomize-controller \
  --token-env=GITHUB_TOKEN

# 4. Commit the cluster definition
git add "$CLUSTER_PATH/"
git commit -m "fleet: onboard ${CLUSTER_ID} to ${TIER}"
git push origin main

echo "==> Cluster $CLUSTER_ID onboarded successfully"
```

## Step 5: Fleet Health Dashboard

```bash
#!/bin/bash
# fleet-health.sh - Check health of all edge clusters
echo "=== Fleet Health Report $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo ""

TOTAL=0
HEALTHY=0
DEGRADED=0

for tier in tier-1 tier-2 tier-3; do
  echo "--- Tier: $tier ---"
  for cluster_dir in clusters/edge/groups/${tier}/*/; do
    CLUSTER_ID=$(basename "$cluster_dir")
    TOTAL=$((TOTAL + 1))
    # In a real implementation, fetch kubeconfig and check
    # For this example, simulate health check
    echo "  $CLUSTER_ID: checking..."
  done
done

echo ""
echo "Summary: $HEALTHY/$TOTAL healthy, $DEGRADED degraded"
```

## Best Practices

- Use progressive tiers (pilot → early majority → full fleet) for all application changes.
- Automate the health gate between tiers — never promote manually if you can check automatically.
- Store cluster kubeconfigs in a centralized secrets manager, never in Git.
- Keep cluster-specific configuration minimal — share as much as possible through tier overlays.
- Label clusters consistently (region, hardware type, application tier) for targeted rollouts.
- Implement a cluster decommission script alongside the onboarding script.

## Conclusion

Managing a fleet of edge clusters with Flux CD requires deliberate organization but scales remarkably well. The hub-and-spoke model keeps each edge cluster independently managed while a central Git repository provides the single source of truth. Progressive rollouts through cluster tiers ensure that changes are validated at small scale before reaching the full fleet, dramatically reducing the blast radius of any individual bad deployment.
