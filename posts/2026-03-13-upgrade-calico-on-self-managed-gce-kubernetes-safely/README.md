# Upgrade Calico on Self-Managed GCE Kubernetes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, GCE, Google Cloud, Self-Managed

Description: A guide to safely upgrading Calico on self-managed Kubernetes clusters running on Google Compute Engine, with GCE-specific network validation and rolling upgrade procedures.

---

## Introduction

Self-managed Kubernetes on Google Compute Engine provides a highly performant networking foundation for Calico. GCE's global VPC, custom route support, and jumbo frame capability combine to make GCE an excellent platform for Calico deployments. However, upgrading Calico on self-managed GCE clusters requires careful attention to GCE route table consistency and firewall rule compatibility.

When Calico uses native GCE routing (no overlay), pod CIDR routes are programmed in GCE route tables pointing to specific VM instances. During a Calico rolling upgrade, each node temporarily goes through a calico-node pod restart - during this brief window, route advertisement may pause. Understanding this behavior helps you plan the upgrade to minimize its impact.

This guide covers safe Calico upgrade procedures for self-managed GCE Kubernetes, including GCE route management and post-upgrade network validation.

## Prerequisites

- Self-managed Kubernetes on GCE (kubeadm or kops)
- `gcloud` CLI with Compute Engine and VPC admin permissions
- `kubectl` with cluster-admin access
- `calicoctl` matching the current Calico version
- GCE project with appropriate IAM roles

## Step 1: Pre-Upgrade GCE Network Health Check

Validate GCE networking and Calico health before upgrading.

```bash
# Check all Kubernetes nodes are Ready
kubectl get nodes -o wide

# Check current Calico version
kubectl get pods -n calico-system \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Verify GCE custom routes for pod CIDRs are present
gcloud compute routes list \
  --filter="name:calico-*" \
  --format="table(name,destRange,nextHopInstance)"

# Check Calico node status
calicoctl node status

# Verify GCE firewall rules for Calico
gcloud compute firewall-rules list \
  --filter="name:allow-calico*" \
  --format="table(name,allowed,sourceRanges)"
```

## Step 2: Backup Calico Configuration and GCE Routes

Document all state before the upgrade.

```bash
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

# Back up all Calico resources
calicoctl get felixconfiguration -o yaml > gce-calico-backup-felix-$BACKUP_DATE.yaml
calicoctl get bgpconfiguration -o yaml > gce-calico-backup-bgp-$BACKUP_DATE.yaml
calicoctl get ippools -o yaml > gce-calico-backup-ippools-$BACKUP_DATE.yaml
calicoctl get globalnetworkpolicies -o yaml > gce-calico-backup-gnp-$BACKUP_DATE.yaml

# Document all GCE routes (to restore if any go missing)
gcloud compute routes list --format=json > gce-routes-backup-$BACKUP_DATE.json

# Store in GCS
gsutil cp gce-calico-backup-*-$BACKUP_DATE.yaml gs://<backup-bucket>/calico-upgrades/$BACKUP_DATE/
gsutil cp gce-routes-backup-$BACKUP_DATE.json gs://<backup-bucket>/calico-upgrades/$BACKUP_DATE/
```

## Step 3: Upgrade Tigera Operator

Begin the upgrade by updating the operator.

```bash
# Apply the new Tigera Operator
kubectl apply --server-side \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml

# Wait for operator to be running
kubectl rollout status deployment/tigera-operator -n tigera-operator --timeout=5m

# Verify operator image
kubectl get deployment tigera-operator -n tigera-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Step 4: Rolling Upgrade of Calico Nodes

Execute the rolling upgrade with route table monitoring.

```bash
# Apply new custom resources to trigger rolling upgrade
kubectl apply \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/custom-resources.yaml

# Monitor the calico-node DaemonSet rolling update
kubectl rollout status daemonset/calico-node -n calico-system --timeout=15m

# Periodically check GCE routes remain present during the rolling upgrade
# Run this in a separate terminal
while true; do
  echo "=== $(date) ==="
  gcloud compute routes list --filter="name:calico-*" --format="value(name,destRange,nextHopInstance)"
  sleep 30
done
```

## Step 5: Post-Upgrade GCE Network Validation

Verify GCE-specific networking is intact after the upgrade.

```bash
# Verify new Calico version
kubectl get clusterinformation default -o yaml | grep calicoVersion

# Confirm GCE routes exist for all node pod CIDRs
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
ROUTE_COUNT=$(gcloud compute routes list --filter="name:calico-*" --format="value(name)" | wc -l)
echo "Nodes: $NODE_COUNT, Calico Routes: $ROUTE_COUNT"
# These should match

# Test cross-node pod connectivity
kubectl run ping-test --image=busybox --rm -it -- \
  ping -c 5 <pod-on-different-node-ip>

# Verify GCE firewall rules still allow pod traffic
gcloud compute firewall-rules list \
  --filter="name:allow-calico*" \
  --format="table(name,allowed)"
```

## Best Practices

- Monitor GCE route counts throughout the rolling upgrade - each node should restore its routes within 60 seconds of calico-node restart
- Use GCE's `gcloud compute ssh` for node-level debugging if route restoration stalls
- Prefer native GCE routing over VXLAN on GCE - it reduces the surface area affected during upgrades
- Store backup files in GCS before every upgrade
- Test cross-AZ pod connectivity after the upgrade - it's the most sensitive test for route consistency

## Conclusion

Upgrading Calico safely on self-managed GCE Kubernetes requires monitoring GCE route table consistency throughout the rolling upgrade process. By backing up Calico configuration and GCE routes to GCS, using the Tigera Operator for controlled rolling updates, and validating both route counts and cross-node connectivity post-upgrade, you ensure a clean upgrade with no lasting network disruption. GCE's fast route convergence makes it well-suited to rolling Calico upgrades.
