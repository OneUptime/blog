# Verify Pod Networking with Calico on Self-Managed AWS Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, AWS, Self-Managed

Description: Learn how to verify that Calico pod networking is functioning correctly on a self-managed Kubernetes cluster running on AWS EC2, including VPC routing, security group configuration, and cross-node...

---

## Introduction

Running a self-managed Kubernetes cluster on AWS EC2 with Calico gives you full control over CNI configuration, but it also means managing the AWS-specific networking considerations yourself. Unlike EKS, self-managed clusters must handle VPC routing for pod CIDRs, security group rules for CNI traffic, and the interaction between Calico's overlay modes and AWS's own networking stack.

The most common issues in self-managed AWS Kubernetes clusters with Calico are security group rules that block IPIP (protocol 4) traffic, missing route propagation in VPC route tables for pod CIDRs, and source/destination check being enabled on EC2 instances which blocks pod traffic routing.

This guide covers verification of pod networking for self-managed Kubernetes on AWS with Calico.

## Prerequisites

- Self-managed Kubernetes cluster on AWS EC2
- Calico installed as the CNI plugin
- AWS CLI configured with access to the VPC and EC2 resources
- `calicoctl` CLI configured
- `kubectl` with cluster admin access

## Step 1: Verify EC2 Source/Destination Check Is Disabled

AWS requires source/destination check to be disabled on EC2 instances acting as Kubernetes nodes.

```bash
# Get instance IDs for all Kubernetes nodes
aws ec2 describe-instances \
  --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=owned" \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text

# Disable source/destination check for each instance (required for pod routing)
INSTANCE_ID=<ec2-instance-id>
aws ec2 modify-instance-attribute \
  --instance-id $INSTANCE_ID \
  --no-source-dest-check

# Verify source/destination check is disabled
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SourceDestCheck'
```

## Step 2: Check Security Group Rules for Calico Traffic

Verify that security groups allow the necessary Calico networking protocols.

```bash
# Get the security group ID for cluster nodes
SG_ID=$(aws ec2 describe-instances \
  --instance-ids <node-instance-id> \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

# Check existing inbound rules
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --query 'SecurityGroups[0].IpPermissions'

# Add rule for IPIP protocol (protocol 4) if using IPIP mode
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --ip-protocol 4 \
  --cidr <node-cidr>/16

# Add rule for VXLAN (UDP 4789) if using VXLAN mode
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol udp \
  --port 4789 \
  --cidr <node-cidr>/16
```

## Step 3: Verify Calico Is Running and Healthy

Confirm all Calico components are operational on the cluster.

```bash
# Check Calico node pod status
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide

# Verify all Calico pods are in Running state
kubectl get pods -n kube-system | grep calico

# Check overall Calico status
calicoctl node status

# Verify IP pools are correctly configured
calicoctl get ippool -o wide
```

## Step 4: Test Cross-Node Pod Connectivity

Validate that pods on different EC2 instances can communicate.

```bash
# Deploy test pods explicitly on different nodes
kubectl run pod-a --image=busybox:1.28 \
  --overrides='{"spec":{"nodeName":"<node-1>"}}' \
  --restart=Never -- sleep 3600

kubectl run pod-b --image=busybox:1.28 \
  --overrides='{"spec":{"nodeName":"<node-2>"}}' \
  --restart=Never -- sleep 3600

# Get Pod B's IP
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')

# Test connectivity from Pod A to Pod B (different EC2 instance)
kubectl exec pod-a -- ping -c 5 $POD_B_IP

# Test TCP connectivity
kubectl exec pod-a -- nc -zv $POD_B_IP 80
```

## Step 5: Verify AWS VPC Route Table (For BGP/Native Mode)

If using Calico without overlay (BGP mode), check VPC route tables.

```bash
# Get the VPC route table for the node subnet
SUBNET_ID=$(aws ec2 describe-instances \
  --instance-ids <node-instance-id> \
  --query 'Reservations[0].Instances[0].SubnetId' \
  --output text)

ROUTE_TABLE_ID=$(aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=$SUBNET_ID" \
  --query 'RouteTables[0].RouteTableId' \
  --output text)

# View routes in the table - pod CIDRs should be present with node as next hop
aws ec2 describe-route-tables \
  --route-table-ids $ROUTE_TABLE_ID \
  --query 'RouteTables[0].Routes'
```

## Best Practices

- Always disable source/destination check on all Kubernetes nodes in AWS
- Use VXLAN mode for simplicity in AWS, as IPIP may be blocked by some VPC configurations
- Create dedicated security groups for Kubernetes nodes with appropriate CNI protocol rules
- Use VPC CNI in overlay mode to avoid the need to manage VPC route table entries
- Test pod-to-pod connectivity across availability zones, not just within a single AZ

## Conclusion

Verifying pod networking with Calico on self-managed AWS Kubernetes requires attention to AWS-specific requirements: source/destination check, security group rules, and VPC routing. By systematically validating each layer from EC2 instance configuration through Calico component health to actual pod connectivity, you can ensure reliable networking in your self-managed cluster. The AWS networking layer is the most common source of failures in self-managed deployments.
