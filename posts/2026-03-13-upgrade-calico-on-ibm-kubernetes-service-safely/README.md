# Upgrade Calico on IBM Kubernetes Service Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, IBM Kubernetes Service

Description: A guide to safely upgrading Calico on IBM Kubernetes Service (IKS), including IBM Cloud-specific prerequisites, the upgrade procedure, and validation steps to ensure network continuity.

---

## Introduction

IBM Kubernetes Service (IKS) integrates Calico as the default network plug-in and network policy engine, making it central to all cluster networking. IKS manages Calico through its own lifecycle, while operators manage Kubernetes and Calico network policy resources with `kubectl` and `calicoctl`.

Upgrading Calico on IKS requires understanding the relationship between IBM's managed Calico integration and any additional Calico resources you've deployed. IBM Cloud's network infrastructure - including its VLAN-based networking and LoadBalancer integration - must remain compatible with the Calico version being deployed.

This guide covers safe Calico upgrade procedures for IKS, including IBM Cloud-specific considerations for managed Calico components and how to coordinate with IKS cluster version upgrades.

## Prerequisites

- IBM Kubernetes Service cluster
- `ibmcloud` CLI with Kubernetes Service plugin installed
- `kubectl` with cluster-admin access
- `calicoctl` configured for the IKS cluster
- IBM Cloud account with appropriate IAM permissions

## Step 1: Check IBM Cloud and Calico Version Matrix

IKS ships with specific Calico versions tied to each Kubernetes version.

```bash
# Check current IKS cluster version and Kubernetes version

ibmcloud ks cluster get --cluster <cluster-name> | grep -E "Version|Status"

# Check the Calico version installed by IBM
kubectl get pods -n kube-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# View the Calico daemonset
kubectl get ds -n kube-system calico-node -o yaml | grep image:
```

## Step 2: Configure calicoctl for IKS

IKS uses the Kubernetes API datastore for Calico on current Kubernetes versions.

```bash
# Download the IKS cluster configuration and Calico network configuration
ibmcloud ks cluster config --cluster <cluster-name> --admin --network

# Use Kubernetes API mode for calicoctl
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=~/.kube/config

# Verify calicoctl can connect
calicoctl version
calicoctl get nodes
```

## Step 3: Backup Existing Configuration

Export all Calico resources before the upgrade.

```bash
# Create timestamped backups
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

# Export Calico resources
calicoctl get felixconfiguration -o yaml > iks-calico-backup-felix-$BACKUP_DATE.yaml
calicoctl get ippools -o yaml > iks-calico-backup-ippools-$BACKUP_DATE.yaml
calicoctl get globalnetworkpolicies -o yaml > iks-calico-backup-gnp-$BACKUP_DATE.yaml
calicoctl get networkpolicies -A -o yaml > iks-calico-backup-np-$BACKUP_DATE.yaml

# Store in IBM Cloud Object Storage
ibmcloud cos upload \
  --bucket <backup-bucket> \
  --key "calico-upgrades/$BACKUP_DATE/iks-calico-backup-felix.yaml" \
  --file iks-calico-backup-felix-$BACKUP_DATE.yaml
```

## Step 4: Upgrade Calico via IKS Cluster and Worker Updates

IKS Calico upgrades are tied to IKS cluster version upgrades.

```bash
# List currently supported target versions
ibmcloud ks versions --show-version kubernetes

# For IBM-managed Calico, upgrade by updating the IKS cluster master version
# This will update Calico to the version bundled with the target Kubernetes version
ibmcloud ks cluster master update \
  --cluster <cluster-name> \
  --version <target-major.minor.patch>

# Monitor the master update
ibmcloud ks cluster get --cluster <cluster-name> | grep -E "Version|State|Status"

# After the master update, update classic worker nodes one at a time
ibmcloud ks worker update \
  --cluster <cluster-name> \
  --worker <worker-id>

# For VPC worker nodes, use worker replace with --update instead
ibmcloud ks worker replace \
  --cluster <cluster-name> \
  --worker <worker-id> \
  --update

# Monitor worker node status
ibmcloud ks worker ls --cluster <cluster-name>
```

## Step 5: Validate Post-Upgrade Network Functionality

Verify Calico is running and network policy resources are accepted after the upgrade.

```bash
# Check all Calico pods are running the new version
kubectl get pods -n kube-system -l k8s-app=calico-node \
  -o custom-columns="NODE:.spec.nodeName,IMAGE:.spec.containers[0].image"

# Verify Calico node status
calicoctl node status

# Test network policy enforcement
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: upgrade-test-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      test: upgrade-validation
  policyTypes:
  - Ingress
EOF

kubectl get networkpolicy upgrade-test-policy -n default

# Cleanup test policy
kubectl delete networkpolicy upgrade-test-policy
```

## Best Practices

- Always align Calico upgrades with IKS cluster version upgrade windows
- Test the update or replacement of one worker node before rolling it to all nodes
- Ensure workloads have enough spare capacity and keep persistent data outside worker nodes before updating or replacing workers
- Monitor IBM Cloud Service Dashboard for any Calico-related incidents post-upgrade
- Contact IBM Cloud Support if Calico pods don't recover after worker updates or replacements

## Conclusion

Upgrading Calico on IBM Kubernetes Service is primarily driven by IKS cluster version upgrades, as IBM bundles specific Calico versions with each Kubernetes release. By coordinating Calico configuration backups with the worker update or replacement process and validating network policy resources afterward, you ensure a smooth upgrade with no disruption to workload connectivity. IBM's managed approach simplifies some aspects of the upgrade while requiring coordination with IBM's versioning lifecycle.
