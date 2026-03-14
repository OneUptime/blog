# Upgrade Calico on Self-Managed AWS Kubernetes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, AWS, Self-Managed

Description: Learn how to safely upgrade Calico on self-managed Kubernetes clusters running on AWS EC2, with AWS-specific validation steps and procedures for a zero-disruption rolling upgrade.

---

## Introduction

Self-managed Kubernetes clusters on AWS EC2 give you full control over the Calico upgrade process, without the constraints of a managed service. This flexibility comes with the responsibility to manage all aspects of the upgrade, including AWS-specific concerns like VPC routing table consistency, security group configurations, and EC2 instance type compatibility.

Calico on self-managed AWS clusters often uses BGP peering with AWS VPC route tables or VXLAN encapsulation. Both modes have specific upgrade considerations: BGP mode requires that route table entries remain consistent during the upgrade, while VXLAN mode requires that VXLAN tunnel configurations are preserved.

This guide covers safe Calico upgrade procedures for self-managed AWS Kubernetes clusters, including AWS-specific pre-upgrade checks and validation.

## Prerequisites

- Self-managed Kubernetes cluster on EC2 (kubeadm, kops, or similar)
- `aws` CLI with EC2 and VPC permissions
- `kubectl` with cluster-admin access
- `calicoctl` matching the current Calico version
- SSH access to worker nodes

## Step 1: Pre-Upgrade Health Checks

Verify cluster and Calico health before the upgrade.

```bash
# Check Kubernetes node status
kubectl get nodes -o wide

# Verify all Calico components are healthy
kubectl get pods -n calico-system
kubectl get pods -n tigera-operator

# Check BGP peer status if using BGP mode
calicoctl node status

# Check VPC route tables for pod CIDR entries
aws ec2 describe-route-tables \
  --filters "Name=tag:cluster,Values=<cluster-name>" \
  --query "RouteTables[*].Routes[?DestinationCidrBlock!=null]" \
  --region <region>
```

## Step 2: Backup Configuration and AWS Route State

Document current state for rollback capability.

```bash
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)

# Back up all Calico resources
calicoctl get felixconfiguration -o yaml > aws-calico-backup-felix-$BACKUP_DATE.yaml
calicoctl get bgpconfiguration -o yaml > aws-calico-backup-bgp-$BACKUP_DATE.yaml
calicoctl get bgppeers -o yaml > aws-calico-backup-bgppeers-$BACKUP_DATE.yaml
calicoctl get ippools -o yaml > aws-calico-backup-ippools-$BACKUP_DATE.yaml
calicoctl get globalnetworkpolicies -o yaml > aws-calico-backup-gnp-$BACKUP_DATE.yaml

# Document current VPC route table state
aws ec2 describe-route-tables \
  --region <region> \
  --output json > aws-route-tables-backup-$BACKUP_DATE.json

echo "Backup complete: $BACKUP_DATE"
```

## Step 3: Upgrade Tigera Operator

Begin the rolling upgrade by updating the Tigera Operator.

```bash
# Apply the new Tigera Operator
kubectl apply --server-side \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml

# Wait for the operator to be running with the new version
kubectl rollout status deployment/tigera-operator -n tigera-operator --timeout=5m

# Verify the new operator version
kubectl get deployment tigera-operator -n tigera-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Step 4: Rolling Upgrade of Calico Components

The Tigera Operator handles the rolling upgrade of calico-node and other components.

```bash
# Apply the new custom resources to trigger the upgrade
kubectl apply \
  -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/custom-resources.yaml

# Monitor the calico-node DaemonSet rolling update
kubectl rollout status daemonset/calico-node -n calico-system --timeout=10m

# Watch individual pods upgrading (each node will upgrade one at a time)
kubectl get pods -n calico-system -w

# During the rolling upgrade, verify VPC routes remain consistent
aws ec2 describe-route-tables \
  --filters "Name=tag:cluster,Values=<cluster-name>" \
  --query "RouteTables[*].Routes[?DestinationCidrBlock!=null]" \
  --region <region>
```

## Step 5: Post-Upgrade AWS-Specific Validation

Verify all AWS networking integrations are intact after the upgrade.

```bash
# Verify new Calico version
kubectl get clusterinformation default -o yaml | grep calicoVersion

# Check BGP peers are re-established (if using BGP)
calicoctl node status

# Verify VPC route table entries are present for all nodes
aws ec2 describe-route-tables \
  --region <region> \
  --output json | jq '.RouteTables[].Routes[] | select(.InstanceId != null)'

# Test pod connectivity across nodes (cross-AZ is the most thorough test)
kubectl run cross-node-test --image=busybox --rm -it -- \
  ping -c 3 <pod-on-different-node-ip>

# Verify security group rules are intact
aws ec2 describe-security-groups \
  --filters "Name=tag:cluster,Values=<cluster-name>" \
  --query "SecurityGroups[*].IpPermissions" \
  --region <region>
```

## Best Practices

- Plan upgrades during AWS maintenance windows when VPC route table changes have minimal traffic impact
- Monitor AWS CloudWatch for EC2 network metrics during the rolling upgrade
- Keep EC2 instance security groups documented - Calico upgrades don't change them, but they affect node connectivity
- Use kops `rolling-update` command if managing the cluster with kops, as it handles node cordon/drain
- Verify BGP session counts before and after upgrade to confirm peer recovery

## Conclusion

Upgrading Calico on self-managed AWS Kubernetes clusters provides full control but requires attention to AWS-specific concerns like VPC route table consistency and BGP peer recovery. By backing up both Calico configuration and AWS route table state, using the Tigera Operator's rolling upgrade, and validating AWS networking integrations post-upgrade, you ensure a safe upgrade with no disruption to production workloads running on EC2.
