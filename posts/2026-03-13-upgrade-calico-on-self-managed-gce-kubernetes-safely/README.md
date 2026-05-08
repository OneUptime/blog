# Upgrade Calico on Self-Managed GCE Kubernetes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, GCE, Google Cloud, Self-Managed

Description: A guide to safely upgrading Calico on self-managed Kubernetes clusters running on Google Compute Engine, with GCE-specific network validation and rolling upgrade procedures.

---

## Introduction

Self-managed Kubernetes on Google Compute Engine provides a highly performant networking foundation for Calico. GCE's global VPC and custom route support combine to make GCE an excellent platform for Calico deployments. However, upgrading Calico on self-managed GCE clusters requires careful attention to GCE route table consistency and firewall rule compatibility.

When Kubernetes uses the GCE cloud provider with GCE cloud routes, the Kubernetes route controller programs pod CIDR routes in GCE route tables pointing to specific VM instances. Calico's GCE documentation describes this model as using GCE cloud routes with Calico in policy-only mode. During a Calico rolling upgrade, each node temporarily goes through a calico-node pod restart - during this brief window, pod networking or policy enforcement may be interrupted. Understanding this behavior helps you plan the upgrade to minimize its impact.

This guide covers safe Calico upgrade procedures for self-managed GCE Kubernetes, including GCE route management and post-upgrade network validation.

## Prerequisites

- Self-managed Kubernetes on GCE (kubeadm or kops)
- A cluster using GCE cloud routes with Calico policy-only mode, or an equivalent route-based design where GCE routes are expected for pod CIDRs
- `gcloud` CLI with Compute Engine and VPC admin permissions
- `kubectl` with cluster-admin access
- `calicoctl` matching the current Calico version for pre-upgrade checks, and the target version after the upgrade
- GCE project with appropriate IAM roles

## Step 1: Pre-Upgrade GCE Network Health Check

Validate GCE networking and Calico health before upgrading.

```bash
# Check all Kubernetes nodes are Ready

kubectl get nodes -o wide

# Check current Calico node image
kubectl get daemonset calico-node -n calico-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

# Verify GCE custom routes for pod CIDRs are present
kubectl get nodes -o jsonpath='{range .items[*]}{.spec.podCIDR}{"\n"}{end}' |
  while read -r cidr; do
    gcloud compute routes list \
      --filter="destRange=$cidr" \
      --format="table(name,destRange,nextHopInstance)"
  done

# Check Calico node status from a node running calico-node
sudo calicoctl node status

# Verify GCE firewall rules for node and pod traffic
gcloud compute firewall-rules list \
  --format="table(name,network,allowed,sourceRanges,targetTags)"
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

# Document all GCE routes
gcloud compute routes list --format=json > gce-routes-backup-$BACKUP_DATE.json

# Store in GCS
gsutil cp gce-calico-backup-*-$BACKUP_DATE.yaml gs://<backup-bucket>/calico-upgrades/$BACKUP_DATE/
gsutil cp gce-routes-backup-$BACKUP_DATE.json gs://<backup-bucket>/calico-upgrades/$BACKUP_DATE/
```

## Step 3: Upgrade Tigera Operator

Begin the upgrade by updating the operator.

```bash
TARGET_CALICO_VERSION=v3.32.0

# Apply the target Calico CRDs and Tigera Operator
kubectl apply --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/projectcalico/calico/${TARGET_CALICO_VERSION}/manifests/v1_crd_projectcalico_org.yaml

kubectl apply --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/projectcalico/calico/${TARGET_CALICO_VERSION}/manifests/tigera-operator.yaml

# Wait for operator to be running
kubectl rollout status deployment/tigera-operator -n tigera-operator --timeout=5m

# Verify operator image
kubectl get deployment tigera-operator -n tigera-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

## Step 4: Rolling Upgrade of Calico Nodes

Execute the rolling upgrade with route table monitoring.

```bash
# Monitor the calico-node DaemonSet rolling update
kubectl rollout status daemonset/calico-node -n calico-system --timeout=15m

# Periodically check GCE routes remain present during the rolling upgrade
# Run this in a separate terminal
while true; do
  echo "=== $(date) ==="
  kubectl get nodes -o jsonpath='{range .items[*]}{.spec.podCIDR}{"\n"}{end}' |
    while read -r cidr; do
      gcloud compute routes list --filter="destRange=$cidr" --format="value(name,destRange,nextHopInstance)"
    done
  sleep 30
done
```

If you maintain a customized `Installation`, `IPPool`, or policy-only manifest, update and apply your reviewed manifest rather than applying the stock `custom-resources.yaml` from the release.

## Step 5: Post-Upgrade GCE Network Validation

Verify GCE-specific networking is intact after the upgrade.

```bash
# Verify new Calico version
calicoctl version

# Confirm GCE routes exist for all node pod CIDRs
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
ROUTE_COUNT=$(
  kubectl get nodes -o jsonpath='{range .items[*]}{.spec.podCIDR}{"\n"}{end}' |
    while read -r cidr; do
      gcloud compute routes list --filter="destRange=$cidr" --format="value(name)"
    done | wc -l
)
echo "Nodes: $NODE_COUNT, Calico Routes: $ROUTE_COUNT"
# These should match

# Test cross-node pod connectivity
kubectl run ping-test --image=busybox --rm -it -- \
  ping -c 5 <pod-on-different-node-ip>

# Verify GCE firewall rules still allow node and pod traffic
gcloud compute firewall-rules list \
  --format="table(name,network,allowed,sourceRanges,targetTags)"
```

## Best Practices

- Monitor GCE route counts throughout the rolling upgrade for route-based clusters
- Use GCE's `gcloud compute ssh` for node-level debugging if route restoration stalls
- Prefer GCE cloud routes only for clusters intentionally configured for Calico policy-only mode; otherwise follow the Calico overlay guidance for GCE
- Store backup files in GCS before every upgrade
- Test cross-zone pod connectivity after the upgrade - it's the most sensitive test for route consistency

## Conclusion

Upgrading Calico safely on self-managed GCE Kubernetes requires monitoring GCE route table consistency throughout the rolling upgrade process when the cluster is configured to use GCE cloud routes. By backing up Calico configuration and GCE routes to GCS, using the Tigera Operator for controlled rolling updates, and validating both route counts and cross-node connectivity post-upgrade, you ensure a clean upgrade with no lasting network disruption.
