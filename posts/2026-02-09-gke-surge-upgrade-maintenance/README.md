# How to Upgrade GKE Clusters with Surge Upgrade and Maintenance Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Kubernetes, Google-Cloud

Description: Master Google Kubernetes Engine cluster upgrades using surge upgrade strategies and maintenance windows for controlled, automated updates with minimal disruption and optimal resource management.

---

Google Kubernetes Engine provides powerful upgrade features that balance automation with control. Surge upgrades allow you to provision extra nodes during upgrades to maintain capacity, while maintenance windows give you control over when upgrades occur. Together, these features enable safe, predictable cluster upgrades.

## Understanding GKE Surge Upgrades

Surge upgrades add temporary extra nodes to your cluster before draining and removing old nodes. This ensures your cluster maintains full capacity throughout the upgrade process, preventing resource shortages that could impact application performance.

Without surge upgrades, GKE must drain and upgrade nodes in place, which temporarily reduces available capacity. With surge upgrades enabled, new nodes are added first, workloads are migrated, and only then are old nodes removed. This approach eliminates capacity dips during upgrades.

## Configuring Surge Upgrade Settings

Configure surge upgrade parameters to control how many extra nodes are added during upgrades.

```bash
#!/bin/bash
# configure-surge-upgrade.sh

CLUSTER_NAME="production"
ZONE="us-central1-a"
NODE_POOL="default-pool"

# Check current surge upgrade settings
gcloud container node-pools describe $NODE_POOL \
  --cluster=$CLUSTER_NAME \
  --zone=$ZONE \
  --format="value(upgradeSettings.maxSurge,upgradeSettings.maxUnavailable)"

# Configure surge upgrade with 2 extra nodes and 0 unavailable
gcloud container node-pools update $NODE_POOL \
  --cluster=$CLUSTER_NAME \
  --zone=$ZONE \
  --max-surge-upgrade=2 \
  --max-unavailable-upgrade=0

echo "Surge upgrade configured: 2 extra nodes, 0 unavailable"
```

The maxSurge parameter determines how many extra nodes to add during upgrades. The maxUnavailable parameter controls how many nodes can be unavailable. Setting maxUnavailable to 0 ensures zero capacity reduction.

```yaml
# Configure via Terraform
resource "google_container_node_pool" "primary" {
  name       = "primary-pool"
  cluster    = google_container_cluster.primary.name
  node_count = 3

  upgrade_settings {
    max_surge       = 2
    max_unavailable = 0
    strategy        = "SURGE"
  }

  management {
    auto_upgrade = true
    auto_repair  = true
  }

  node_config {
    machine_type = "n1-standard-4"
    disk_size_gb = 100

    metadata = {
      disable-legacy-endpoints = "true"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}
```

## Setting Up Maintenance Windows

Maintenance windows restrict when GKE can perform automated upgrades, giving you control over upgrade timing.

```bash
#!/bin/bash
# configure-maintenance-window.sh

CLUSTER_NAME="production"
ZONE="us-central1-a"

# Set maintenance window for weekends only, 2 AM to 6 AM UTC
gcloud container clusters update $CLUSTER_NAME \
  --zone=$ZONE \
  --maintenance-window-start="2024-01-01T02:00:00Z" \
  --maintenance-window-duration="4h" \
  --maintenance-window-recurrence="FREQ=WEEKLY;BYDAY=SA,SU"

# View current maintenance window
gcloud container clusters describe $CLUSTER_NAME \
  --zone=$ZONE \
  --format="value(maintenancePolicy)"

# Set maintenance exclusion for critical periods
gcloud container clusters update $CLUSTER_NAME \
  --zone=$ZONE \
  --add-maintenance-exclusion-name="black-friday" \
  --add-maintenance-exclusion-start="2024-11-29T00:00:00Z" \
  --add-maintenance-exclusion-end="2024-12-02T00:00:00Z"

echo "Maintenance window configured"
```

Define maintenance windows in Terraform:

```hcl
resource "google_container_cluster" "primary" {
  name     = "production"
  location = "us-central1-a"

  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Alternative: recurring maintenance window
  maintenance_policy {
    recurring_window {
      start_time = "2024-01-01T02:00:00Z"
      end_time   = "2024-01-01T06:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SA,SU"
    }

    maintenance_exclusion {
      exclusion_name = "holiday-freeze"
      start_time     = "2024-12-20T00:00:00Z"
      end_time       = "2025-01-05T00:00:00Z"
    }
  }
}
```

## Planning Manual Cluster Upgrades

While GKE supports auto-upgrades, manually triggered upgrades give you more control over timing and process.

```bash
#!/bin/bash
# upgrade-gke-cluster.sh

CLUSTER_NAME="production"
ZONE="us-central1-a"
TARGET_VERSION="1.29.1-gke.1234"

echo "Starting GKE cluster upgrade..."

# Check available versions
echo "Available versions:"
gcloud container get-server-config \
  --zone=$ZONE \
  --format="yaml(validMasterVersions,validNodeVersions)"

# Get current versions
CURRENT_MASTER=$(gcloud container clusters describe $CLUSTER_NAME \
  --zone=$ZONE \
  --format="value(currentMasterVersion)")

CURRENT_NODE=$(gcloud container clusters describe $CLUSTER_NAME \
  --zone=$ZONE \
  --format="value(currentNodeVersion)")

echo "Current master version: $CURRENT_MASTER"
echo "Current node version: $CURRENT_NODE"
echo "Target version: $TARGET_VERSION"

# Upgrade control plane first
echo "Upgrading control plane..."
gcloud container clusters upgrade $CLUSTER_NAME \
  --zone=$ZONE \
  --master \
  --cluster-version=$TARGET_VERSION \
  --quiet

# Wait for control plane upgrade
while true; do
  status=$(gcloud container clusters describe $CLUSTER_NAME \
    --zone=$ZONE \
    --format="value(status)")

  version=$(gcloud container clusters describe $CLUSTER_NAME \
    --zone=$ZONE \
    --format="value(currentMasterVersion)")

  echo "$(date): Status=$status, Version=$version"

  if [ "$status" == "RUNNING" ] && [ "$version" == "$TARGET_VERSION" ]; then
    echo "Control plane upgrade complete"
    break
  fi

  sleep 30
done

# Upgrade node pools
echo "Upgrading node pools..."
gcloud container node-pools list \
  --cluster=$CLUSTER_NAME \
  --zone=$ZONE \
  --format="value(name)" | while read pool; do

  echo "Upgrading node pool: $pool"

  gcloud container clusters upgrade $CLUSTER_NAME \
    --zone=$ZONE \
    --node-pool=$pool \
    --cluster-version=$TARGET_VERSION \
    --quiet

  # Monitor node pool upgrade
  while true; do
    status=$(gcloud container node-pools describe $pool \
      --cluster=$CLUSTER_NAME \
      --zone=$ZONE \
      --format="value(status)")

    if [ "$status" == "RUNNING" ]; then
      echo "Node pool $pool upgrade complete"
      break
    fi

    echo "$(date): Pool $pool status: $status"
    sleep 30
  done
done

echo "Cluster upgrade complete!"
```

## Implementing Blue-Green Node Pool Upgrades

For maximum safety, create a new node pool with the target version and migrate workloads gradually.

```bash
#!/bin/bash
# blue-green-node-pool-upgrade.sh

CLUSTER_NAME="production"
ZONE="us-central1-a"
OLD_POOL="blue-pool"
NEW_POOL="green-pool"
TARGET_VERSION="1.29.1-gke.1234"

echo "Creating new node pool with version $TARGET_VERSION..."

# Create new node pool
gcloud container node-pools create $NEW_POOL \
  --cluster=$CLUSTER_NAME \
  --zone=$ZONE \
  --node-version=$TARGET_VERSION \
  --machine-type=n1-standard-4 \
  --num-nodes=3 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10 \
  --max-surge-upgrade=2 \
  --max-unavailable-upgrade=0

# Wait for new pool to be ready
echo "Waiting for new node pool..."
while true; do
  status=$(gcloud container node-pools describe $NEW_POOL \
    --cluster=$CLUSTER_NAME \
    --zone=$ZONE \
    --format="value(status)")

  if [ "$status" == "RUNNING" ]; then
    echo "New node pool ready"
    break
  fi

  sleep 10
done

# Cordon old nodes to prevent new pods
kubectl get nodes -l cloud.google.com/gke-nodepool=$OLD_POOL -o name | \
  xargs -I {} kubectl cordon {}

echo "Old nodes cordoned"

# Gradually drain old nodes
kubectl get nodes -l cloud.google.com/gke-nodepool=$OLD_POOL -o name | \
  while read node; do
  echo "Draining $node..."
  kubectl drain $node \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --grace-period=300 \
    --timeout=600s

  # Wait between drains
  sleep 60
done

# Verify all pods migrated
old_pool_pods=$(kubectl get pods -A -o json | \
  jq --arg pool "$OLD_POOL" '[.items[] |
  select(.spec.nodeName | contains($pool))] | length')

if [ "$old_pool_pods" -eq 0 ]; then
  echo "All pods migrated to new pool"

  # Delete old node pool
  read -p "Delete old node pool $OLD_POOL? (yes/no): " confirm
  if [ "$confirm" == "yes" ]; then
    gcloud container node-pools delete $OLD_POOL \
      --cluster=$CLUSTER_NAME \
      --zone=$ZONE \
      --quiet
    echo "Old node pool deleted"
  fi
else
  echo "WARNING: $old_pool_pods pods still on old pool"
fi
```

## Monitoring Surge Upgrades

Monitor surge upgrades to track progress and catch issues early.

```bash
#!/bin/bash
# monitor-surge-upgrade.sh

CLUSTER_NAME="production"
ZONE="us-central1-a"

echo "Monitoring GKE surge upgrade..."

# Watch node pool status
watch -n 10 "gcloud container node-pools list \
  --cluster=$CLUSTER_NAME \
  --zone=$ZONE \
  --format='table(name,status,version,instanceGroupUrls.len())'"

# Monitor node versions
watch -n 10 "kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
STATUS:.status.conditions[?(@.type==\"Ready\")].status,\
VERSION:.status.nodeInfo.kubeletVersion,\
POOL:.metadata.labels.cloud\.google\.com/gke-nodepool"

# Check pod distribution during upgrade
watch -n 10 "kubectl get pods -A -o json | \
  jq -r '.items[] |
  select(.spec.nodeName != null) |
  .spec.nodeName' | \
  sort | uniq -c"
```

Create a detailed monitoring script:

```bash
#!/bin/bash
# detailed-upgrade-monitor.sh

CLUSTER_NAME="production"
ZONE="us-central1-a"
LOG_FILE="upgrade-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

log "Starting upgrade monitoring for $CLUSTER_NAME"

while true; do
  # Get node pool status
  pool_status=$(gcloud container node-pools list \
    --cluster=$CLUSTER_NAME \
    --zone=$ZONE \
    --format="csv[no-heading](name,status,version)")

  log "Node pool status:"
  echo "$pool_status" >> $LOG_FILE

  # Count nodes by version
  log "Node versions:"
  kubectl get nodes -o json | \
    jq -r '.items[] | .status.nodeInfo.kubeletVersion' | \
    sort | uniq -c >> $LOG_FILE

  # Check for unschedulable pods
  unschedulable=$(kubectl get pods -A --field-selector status.phase=Pending -o json | \
    jq '.items | length')

  if [ $unschedulable -gt 0 ]; then
    log "WARNING: $unschedulable pods pending"
    kubectl get pods -A --field-selector status.phase=Pending >> $LOG_FILE
  fi

  # Check cluster resource usage
  log "Cluster resource usage:"
  kubectl top nodes >> $LOG_FILE 2>&1

  # Check if all upgrades complete
  all_running=$(echo "$pool_status" | grep -v "RUNNING" | wc -l)
  if [ $all_running -eq 0 ]; then
    log "All node pools upgraded successfully"
    break
  fi

  sleep 60
done

log "Monitoring complete"
```

## Handling Upgrade Failures

If a surge upgrade fails, troubleshoot and recover quickly.

```bash
#!/bin/bash
# troubleshoot-surge-upgrade.sh

CLUSTER_NAME="production"
ZONE="us-central1-a"
NODE_POOL="default-pool"

echo "Troubleshooting surge upgrade failure..."

# Get upgrade operation details
gcloud container operations list \
  --filter="targetLink:$CLUSTER_NAME AND operationType=UPGRADE_NODES" \
  --format="table(name,status,statusMessage,startTime,endTime)"

# Check node pool health
gcloud container node-pools describe $NODE_POOL \
  --cluster=$CLUSTER_NAME \
  --zone=$ZONE \
  --format="yaml(status,statusMessage,conditions)"

# Check for nodes stuck in upgrade
kubectl get nodes -o json | \
  jq -r '.items[] |
  select(.metadata.labels["cloud.google.com/gke-node-pool-upgrading"] == "true") |
  .metadata.name'

# Check for eviction failures
kubectl get events -A --field-selector reason=EvictionFailed

# Cancel ongoing upgrade if needed
read -p "Cancel ongoing upgrade? (yes/no): " confirm
if [ "$confirm" == "yes" ]; then
  gcloud container clusters upgrade $CLUSTER_NAME \
    --zone=$ZONE \
    --cancel
  echo "Upgrade cancellation requested"
fi
```

## Post-Upgrade Validation

After completing surge upgrades, validate cluster health and application functionality.

```bash
#!/bin/bash
# validate-gke-upgrade.sh

CLUSTER_NAME="production"
ZONE="us-central1-a"

echo "Validating GKE cluster upgrade..."

# Verify all nodes upgraded
echo "Node versions:"
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
VERSION:.status.nodeInfo.kubeletVersion,\
POOL:.metadata.labels.cloud\.google\.com/gke-nodepool

# Check all pods running
unhealthy=$(kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded -o json | \
  jq '.items | length')

if [ $unhealthy -gt 0 ]; then
  echo "WARNING: $unhealthy unhealthy pods"
  kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded
fi

# Run connectivity tests
kubectl run test-connectivity --image=busybox --rm -it --restart=Never -- \
  nslookup kubernetes.default.svc.cluster.local

# Check GKE addons
echo "GKE addon status:"
gcloud container clusters describe $CLUSTER_NAME \
  --zone=$ZONE \
  --format="yaml(addonsConfig)"

# Verify autoscaling works
echo "Testing cluster autoscaler..."
initial_nodes=$(kubectl get nodes -o json | jq '.items | length')
kubectl create deployment stress-test --image=polinux/stress --replicas=50
sleep 120
new_nodes=$(kubectl get nodes -o json | jq '.items | length')

if [ $new_nodes -gt $initial_nodes ]; then
  echo "Cluster autoscaler working: $initial_nodes -> $new_nodes nodes"
else
  echo "WARNING: Cluster autoscaler may not be working"
fi

kubectl delete deployment stress-test

echo "Validation complete"
```

GKE surge upgrades with maintenance windows provide a powerful combination of safety and control for Kubernetes cluster upgrades. By adding extra capacity during upgrades and scheduling them during appropriate maintenance windows, you can upgrade clusters with confidence and minimal risk to production workloads.
