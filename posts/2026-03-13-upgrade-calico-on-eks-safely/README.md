# Upgrade Calico on EKS Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, EKS, AWS

Description: A guide to safely upgrading Calico on Amazon EKS, including pre-upgrade checks specific to the EKS environment, the rolling upgrade procedure, and post-upgrade network validation.

---

## Introduction

Amazon EKS clusters running Calico for network policy enforcement require careful upgrade management, particularly because EKS manages the control plane while you manage the worker nodes. The interaction between EKS Kubernetes version upgrades and Calico version compatibility creates a matrix of upgrade dependencies that must be planned carefully.

Calico on EKS is typically used in "policy-only mode" - where AWS VPC CNI (aws-node) handles pod IP allocation while Calico enforces network policies. This chained mode has specific upgrade considerations that differ from full Calico CNI deployments. Understanding which components to upgrade and in what order is critical for maintaining network policy enforcement continuity.

This guide covers the safe upgrade procedure for Calico on EKS, addressing both the standard Calico component upgrade and the coordination with EKS node group upgrades.

## Prerequisites

- EKS cluster with Calico installed (Tigera Operator for the rolling upgrade procedure below; manifest installs should follow the manifest upgrade path in the Calico documentation)
- `aws` CLI with appropriate permissions
- `eksctl` installed
- `kubectl` with cluster-admin access
- `calicoctl` matching the current installed version before the upgrade, and the target version after the upgrade

## Step 1: Validate Pre-Upgrade State

Verify the cluster and Calico are fully healthy before beginning.

```bash
# Check EKS cluster status

aws eks describe-cluster \
  --name <cluster-name> \
  --region <region> \
  --query "cluster.status" -o text

# Check current Calico version
calicoctl version

# Verify all Calico pods are running
kubectl get pods -n calico-system -o wide
kubectl get pods -n tigera-operator -o wide

# Verify node status is healthy
kubectl get tigerastatus
kubectl get nodes
```

## Step 2: Check EKS and Calico Version Compatibility

Verify the target Calico version supports your EKS Kubernetes version.

```bash
# Get current EKS Kubernetes version
aws eks describe-cluster \
  --name <cluster-name> \
  --region <region> \
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
    globalnetworkpolicies hostendpoints; do
  calicoctl get $resource -o yaml > calico-eks-backup-${resource}-$BACKUP_DATE.yaml
  echo "Backed up: $resource"
done

for resource in networkpolicies; do
  calicoctl get $resource -A -o yaml > calico-eks-backup-${resource}-$BACKUP_DATE.yaml
  echo "Backed up: $resource"
done

# Store backups in S3 for safety
aws s3 cp . s3://<your-backup-bucket>/calico-upgrades/$BACKUP_DATE/ \
  --recursive \
  --exclude "*" \
  --include "calico-eks-backup-*-$BACKUP_DATE.yaml"
```

## Step 4: Perform Rolling Calico Upgrade

Upgrade Calico using the Tigera Operator rolling update.

```bash
# Step 1: Apply updated Calico CRDs and Tigera Operator manifest
kubectl apply --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml

kubectl apply --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml

# Monitor operator upgrade
kubectl rollout status deployment tigera-operator -n tigera-operator --timeout=5m

# Step 2: Check that the operator is ready before proceeding
kubectl get pods -n tigera-operator

# Step 3: Keep your existing Installation custom resource settings
kubectl get installation default -o yaml

# Step 4: Monitor the rolling upgrade across all nodes
kubectl get pods -n calico-system -w
```

## Step 5: Validate Post-Upgrade Functionality

Verify Calico is working correctly after the upgrade.

```bash
# Verify new Calico version is deployed
calicoctl version

# Check TigeraStatus shows Available
kubectl get tigerastatus

# Run a network policy smoke test to confirm enforcement continues
kubectl run upgrade-validation-server \
  --image=nginx:1.27-alpine \
  --labels=test=upgrade-validation \
  --port=80
kubectl wait pod upgrade-validation-server \
  --for=condition=Ready \
  --timeout=90s

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

# Verify the default-deny ingress policy is enforced; this should time out
SERVER_IP=$(kubectl get pod upgrade-validation-server -o jsonpath='{.status.podIP}')
if kubectl run upgrade-validation-client \
    --rm -i --restart=Never \
    --image=busybox:1.36 \
    -- wget -T 5 -qO- "http://$SERVER_IP"; then
  echo "NetworkPolicy test failed: ingress was not denied"
else
  echo "NetworkPolicy test passed: ingress was denied"
fi

# Clean up test policy
kubectl delete networkpolicy upgrade-validation-test
kubectl delete pod upgrade-validation-server
```

## Best Practices

- Coordinate Calico upgrades with EKS Kubernetes version upgrades to minimize change windows
- Store Calico backup files in S3 before every upgrade
- Use `eksctl` for EKS node group upgrades to ensure cordon/drain is handled properly
- If using Calico networking with BGP, run `calicoctl node status` on several nodes after upgrade to confirm BGP is stable
- Monitor VPC flow logs for unexpected traffic drops in the 30 minutes following upgrade

## Conclusion

Upgrading Calico on EKS safely requires coordinating Calico version compatibility with your EKS Kubernetes version, backing up all configuration, and carefully monitoring the rolling upgrade process. The Tigera Operator handles most of the complexity, but pre-upgrade validation and post-upgrade testing are your responsibility. Following this process ensures your EKS network policies remain enforced throughout the upgrade with no disruption to production workloads.
