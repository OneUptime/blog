# Upgrade Calico on EKS Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, eks, aws, kubernetes, upgrade, networking, safety

Description: A guide to safely upgrading Calico on Amazon EKS, including pre-upgrade checks specific to the EKS environment, the rolling upgrade procedure, and post-upgrade network validation.

---

## Introduction

Amazon EKS clusters running Calico for network policy enforcement require careful upgrade management, particularly because EKS manages the control plane while you manage the worker nodes. The interaction between EKS Kubernetes version upgrades and Calico version compatibility creates a matrix of upgrade dependencies that must be planned carefully.

Calico on EKS is typically used in "policy-only mode" — where AWS VPC CNI (aws-node) handles pod IP allocation while Calico enforces network policies. This chained mode has specific upgrade considerations that differ from full Calico CNI deployments. Understanding which components to upgrade and in what order is critical for maintaining network policy enforcement continuity.

This guide covers the safe upgrade procedure for Calico on EKS, addressing both the standard Calico component upgrade and the coordination with EKS node group upgrades.

## Prerequisites

- EKS cluster with Calico installed (Tigera Operator or manifest mode)
- `aws` CLI with appropriate permissions
- `eksctl` installed
- `kubectl` with cluster-admin access
- `calicoctl` matching the current installed version

## Step 1: Validate Pre-Upgrade State

Verify the cluster and Calico are fully healthy before beginning.

```bash
# Check EKS cluster status
aws eks describe-cluster \
  --name <cluster-name> \
  --region <region> \
  --query "cluster.status" -o text

# Check current Calico version
kubectl get pods -n calico-system \
  -o jsonpath='{.items[0].spec.containers[0].image}' | grep calico

# Verify all Calico pods are running
kubectl get pods -n calico-system -o wide
kubectl get pods -n tigera-operator -o wide

# Verify node status is healthy
calicoctl node status
kubectl get nodes
```

## Step 2: Check EKS and Calico Version Compatibility

Verify the target Calico version supports your EKS Kubernetes version.

```bash
# Get current EKS Kubernetes version
aws eks describe-cluster \
  --name <cluster-name> \
  --query "cluster.version" -o text

# Check Calico compatibility matrix
# Visit: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements

# Note: When EKS upgrades Kubernetes version, also check if Calico upgrade is needed
aws eks list-updates \
  --name <cluster-name> \
  --region <region>
```

## Step 3: Backup Calico Configuration

Export all Calico resources to enable rollback if needed.

```bash
# Create timestamped backups of all Calico resources
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

# Backup all policy and configuration resources
for resource in felixconfiguration bgpconfiguration ippools \
    globalnetworkpolicies networkpolicies hostendpoints; do
  calicoctl get $resource -A -o yaml > calico-eks-backup-${resource}-$BACKUP_DATE.yaml
  echo "Backed up: $resource"
done

# Store backups in S3 for safety
aws s3 cp calico-eks-backup-*.yaml s3://<your-backup-bucket>/calico-upgrades/$BACKUP_DATE/
```

## Step 4: Perform Rolling Calico Upgrade

Upgrade Calico using the Tigera Operator rolling update.

```bash
# Step 1: Upgrade Tigera Operator first
kubectl apply --server-side \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml

# Monitor operator upgrade
kubectl rollout status deployment tigera-operator -n tigera-operator --timeout=5m

# Step 2: Check that the operator is ready before proceeding
kubectl get pods -n tigera-operator

# Step 3: Apply the new Calico custom resources
kubectl apply \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/custom-resources.yaml

# Step 4: Monitor the rolling upgrade across all nodes
kubectl get pods -n calico-system -w
```

## Step 5: Validate Post-Upgrade Functionality

Verify Calico is working correctly after the upgrade.

```bash
# Verify new Calico version is deployed
kubectl get clusterinformation default -o yaml | grep calicoVersion

# Check TigeraStatus shows Available
kubectl get tigerastatus

# Run a network policy test to confirm enforcement continues
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: upgrade-validation-test
  namespace: default
spec:
  podSelector:
    matchLabels:
      test: upgrade-validation
  policyTypes:
  - Ingress
EOF

# Verify policy is recognized by Calico
calicoctl get networkpolicies -n default

# Clean up test policy
kubectl delete networkpolicy upgrade-validation-test
```

## Best Practices

- Coordinate Calico upgrades with EKS Kubernetes version upgrades to minimize change windows
- Store Calico backup files in S3 before every upgrade
- Use `eksctl` for EKS node group upgrades to ensure cordon/drain is handled properly
- Run `calicoctl node status` on several nodes after upgrade to confirm BGP is stable
- Monitor VPC flow logs for unexpected traffic drops in the 30 minutes following upgrade

## Conclusion

Upgrading Calico on EKS safely requires coordinating Calico version compatibility with your EKS Kubernetes version, backing up all configuration, and carefully monitoring the rolling upgrade process. The Tigera Operator handles most of the complexity, but pre-upgrade validation and post-upgrade testing are your responsibility. Following this process ensures your EKS network policies remain enforced throughout the upgrade with no disruption to production workloads.
