# How to Upgrade Calico on GKE Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, GKE, Google Cloud

Description: Safely upgrade Calico on Google Kubernetes Engine clusters with minimal workload disruption.

---

## Introduction

Google Kubernetes Engine offers automatic cluster upgrades which can interact with your Calico version if not managed carefully. While GKE's managed control plane handles Kubernetes version upgrades, Calico running on worker nodes is your responsibility to upgrade. Understanding how GKE's node auto-upgrade feature interacts with your Calico installation is essential for maintaining a stable network.

GKE's Container-Optimized OS (COS) nodes receive automatic kernel updates as part of node pool upgrades. These kernel updates can sometimes change the behavior of iptables or BPF programs that Calico relies on. Coordinating Calico upgrades with GKE node pool upgrades ensures compatibility and reduces risk.

This guide provides a safe upgrade path for Calico on GKE, including pre-upgrade validation, version compatibility checks, the rolling upgrade procedure via Tigera Operator, and GKE-specific post-upgrade validation.

## Prerequisites

- GKE cluster running Calico (Standard mode, not Autopilot)
- `gcloud` CLI with Kubernetes Engine Admin role
- `kubectl` with cluster-admin access
- `calicoctl` matching the current Calico version
- Maintenance window scheduled during low-traffic period

## Step 1: Check GKE Cluster and Calico Version Compatibility

Verify compatibility between target Calico version and current GKE Kubernetes version.

```bash
# Check GKE cluster Kubernetes version
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(currentMasterVersion)"

# Check current Calico version running on nodes
kubectl get pods -n calico-system \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Check node pool Kubernetes version (may differ from control plane)
gcloud container node-pools list \
  --cluster <cluster-name> \
  --zone <zone> \
  --format="table(name,version,config.imageType)"
```

## Step 2: Disable GKE Auto-Upgrade Temporarily

Prevent GKE from auto-upgrading nodes during the Calico upgrade window.

```bash
# Disable auto-upgrade on node pools during maintenance window
gcloud container node-pools update default-pool \
  --cluster <cluster-name> \
  --zone <zone> \
  --no-enable-autoupgrade

# Verify auto-upgrade is disabled
gcloud container node-pools describe default-pool \
  --cluster <cluster-name> \
  --zone <zone> \
  --format="value(management.autoUpgrade)"
```

## Step 3: Backup Calico Configuration

Export all configuration resources before the upgrade.

```bash
# Create timestamped backup directory
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p calico-gke-backup-$BACKUP_DATE

# Back up all Calico custom resources
calicoctl get felixconfiguration -o yaml > calico-gke-backup-$BACKUP_DATE/felix.yaml
calicoctl get ippools -o yaml > calico-gke-backup-$BACKUP_DATE/ippools.yaml
calicoctl get bgpconfiguration -o yaml > calico-gke-backup-$BACKUP_DATE/bgp.yaml
calicoctl get globalnetworkpolicies -o yaml > calico-gke-backup-$BACKUP_DATE/gnp.yaml

# Upload to GCS for safe keeping
gsutil -m cp -r calico-gke-backup-$BACKUP_DATE/ gs://<backup-bucket>/calico-upgrades/
```

## Step 4: Perform the Calico Upgrade

Use the Tigera Operator to perform the rolling upgrade.

```bash
# Download and apply the new Tigera Operator
kubectl apply --server-side \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml

# Wait for operator to be ready
kubectl rollout status deployment/tigera-operator -n tigera-operator --timeout=5m

# Apply the updated Installation resource
kubectl patch installation default --type merge --patch \
  '{"spec":{"calicoNetwork":{"mtu":1440}}}'

# Monitor calico-system pods rolling update
kubectl get pods -n calico-system -w
```

## Step 5: Post-Upgrade Validation

Validate Calico functionality after the upgrade completes.

```bash
# Verify all Calico pods are using the new version
kubectl get pods -n calico-system \
  -o custom-columns="NAME:.metadata.name,IMAGE:.spec.containers[0].image"

# Check TigeraStatus
kubectl get tigerastatus calico

# Test pod connectivity across nodes
kubectl run conn-test --image=busybox --restart=Never -- \
  wget -qO- --timeout=5 http://kubernetes.default.svc.cluster.local

# Verify network policies are enforced
calicoctl get networkpolicies -A --output=wide

# Re-enable GKE node auto-upgrade after validation
gcloud container node-pools update default-pool \
  --cluster <cluster-name> \
  --zone <zone> \
  --enable-autoupgrade
```

## Best Practices

- Coordinate Calico upgrades with GKE node pool surge upgrades for efficiency
- Store Calico backups in GCS before every upgrade for quick recovery
- Test the upgrade procedure in a GKE dev cluster with the same node image type
- Monitor GKE Cloud Monitoring dashboards during the upgrade for network error spikes
- Re-enable GKE node auto-upgrade only after confirming Calico upgrade success

## Conclusion

Upgrading Calico on GKE safely requires coordinating with GKE's managed upgrade mechanisms and temporarily disabling auto-upgrade during the Calico maintenance window. By backing up configuration to GCS, using the Tigera Operator for rolling upgrades, and validating connectivity after each node pool upgrade, you maintain network policy enforcement continuity throughout the process. Re-enabling GKE auto-upgrade after successful validation returns the cluster to its managed state.
