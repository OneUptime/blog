# How to Configure VPC CNI Custom Networking for EKS Pod IP Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, EKS, Networking, VPC

Description: Learn how to implement VPC CNI custom networking in Amazon EKS to assign pod IPs from different subnets, conserve IP space, and improve network segmentation.

---

The Amazon VPC CNI plugin assigns IP addresses from your VPC subnets to Kubernetes pods. By default, pods receive IPs from the same subnets as your worker nodes. This can lead to IP exhaustion in environments with many pods. Custom networking allows you to assign pod IPs from different subnets, separating node and pod networking for better IP management.

## Why Use Custom Networking

Default VPC CNI behavior assigns both node and pod IPs from the same subnet. In a /24 subnet with 256 addresses, you might run out of IPs before reaching your desired pod density. Custom networking solves this by using separate subnets for pods.

Consider a cluster where each node runs 50 pods. With default networking, each node consumes 51 IPs (1 for the node, 50 for pods). A /24 subnet supports only 4-5 nodes. With custom networking, node IPs come from one subnet while pod IPs come from larger, dedicated subnets.

Additional benefits include network segmentation for security policies, simplified network troubleshooting, and the ability to use secondary CIDR blocks for pod networks without affecting node networking.

## Prerequisites and Planning

Before implementing custom networking, plan your subnet architecture. You need separate subnets for nodes and pods in each availability zone.

Create secondary subnets for pods with larger CIDR ranges:

```bash
# Add secondary CIDR block to VPC
aws ec2 associate-vpc-cidr-block \
  --vpc-id vpc-12345678 \
  --cidr-block 100.64.0.0/16 \
  --region us-east-1

# Create pod subnets in each AZ
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 100.64.0.0/19 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=pod-subnet-us-east-1a}]' \
  --region us-east-1

aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 100.64.32.0/19 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=pod-subnet-us-east-1b}]' \
  --region us-east-1
```

The 100.64.0.0/16 range (RFC 6598) works well for pod networks as it's designated for carrier-grade NAT and won't conflict with typical enterprise networks.

## Enabling Custom Networking

Custom networking requires setting an environment variable on the VPC CNI daemonset:

```bash
# Enable custom networking
kubectl set env daemonset aws-node \
  -n kube-system \
  AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG=true

# Verify the setting
kubectl describe daemonset aws-node -n kube-system | grep CUSTOM_NETWORK
```

This tells the CNI plugin to look for ENIConfig custom resources to determine pod subnet configuration instead of using the node's subnet.

Next, configure the CNI to use the availability zone as the ENIConfig selector:

```bash
# Set ENI config label
kubectl set env daemonset aws-node \
  -n kube-system \
  ENI_CONFIG_LABEL_DEF=topology.kubernetes.io/zone
```

This setting makes the CNI select ENIConfig resources based on the node's availability zone label, ensuring pods get IPs from subnets in the correct AZ.

## Creating ENIConfig Resources

ENIConfig custom resources define which subnets and security groups to use for pod networking in each availability zone:

```yaml
# eniconfig-us-east-1a.yaml
apiVersion: crd.k8s.amazonaws.com/v1alpha1
kind: ENIConfig
metadata:
  name: us-east-1a
spec:
  subnet: subnet-abcd1234  # Pod subnet in us-east-1a
  securityGroups:
    - sg-pod-security-group
```

```yaml
# eniconfig-us-east-1b.yaml
apiVersion: crd.k8s.amazonaws.com/v1alpha1
kind: ENIConfig
metadata:
  name: us-east-1b
spec:
  subnet: subnet-efgh5678  # Pod subnet in us-east-1b
  securityGroups:
    - sg-pod-security-group
```

Apply these configurations:

```bash
kubectl apply -f eniconfig-us-east-1a.yaml
kubectl apply -f eniconfig-us-east-1b.yaml

# Verify ENIConfigs
kubectl get eniconfigs
```

The ENIConfig name must match the value of the label you specified in ENI_CONFIG_LABEL_DEF. Since we used topology.kubernetes.io/zone, the names match availability zones.

## Configuring Security Groups for Pods

Pod subnets need security group rules that allow pod-to-pod communication and access to cluster services:

```bash
# Create security group for pods
aws ec2 create-security-group \
  --group-name eks-pod-sg \
  --description "Security group for EKS pods" \
  --vpc-id vpc-12345678 \
  --region us-east-1

# Allow pod-to-pod communication
aws ec2 authorize-security-group-ingress \
  --group-id sg-pod-security-group \
  --protocol all \
  --source-group sg-pod-security-group \
  --region us-east-1

# Allow communication with nodes
aws ec2 authorize-security-group-ingress \
  --group-id sg-pod-security-group \
  --protocol all \
  --source-group sg-node-security-group \
  --region us-east-1

# Allow nodes to communicate with pods
aws ec2 authorize-security-group-ingress \
  --group-id sg-node-security-group \
  --protocol all \
  --source-group sg-pod-security-group \
  --region us-east-1
```

These rules establish bidirectional communication between pods and between pods and nodes, which is essential for Kubernetes networking.

## Updating Node Groups

Custom networking only applies to newly launched nodes. Existing nodes continue using their original networking configuration. Recycle your node groups to apply custom networking:

```bash
# Cordon existing nodes
kubectl cordon -l node-group=original-nodes

# Drain nodes one by one
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# After new nodes join, delete old nodes
kubectl delete node node-1
```

Alternatively, create new node groups and migrate workloads:

```bash
# Create new node group with updated launch template
aws eks create-nodegroup \
  --cluster-name production-cluster \
  --nodegroup-name custom-network-nodes \
  --subnets subnet-node-1a subnet-node-1b \
  --node-role arn:aws:iam::123456789012:role/eks-node-role \
  --scaling-config minSize=2,maxSize=10,desiredSize=3 \
  --region us-east-1
```

New nodes will have the topology.kubernetes.io/zone label, which triggers the CNI to use the appropriate ENIConfig.

## Verifying Custom Networking

After nodes are recycled, verify that pods receive IPs from the custom subnets:

```bash
# Deploy a test pod
kubectl run test-pod --image=nginx

# Check pod IP
kubectl get pod test-pod -o wide

# Verify IP is from pod subnet range
kubectl get pod test-pod -o jsonpath='{.status.podIP}'
```

Compare the pod IP against your pod subnet CIDR ranges. The IP should fall within 100.64.0.0/16 if you followed the earlier example.

Check the VPC CNI logs for confirmation:

```bash
# Get CNI pod on the node running your test pod
kubectl get pods -n kube-system -o wide | grep aws-node

# Check logs
kubectl logs -n kube-system aws-node-xxxxx
```

Look for messages indicating ENIConfig selection and IP assignment from the custom subnet.

## Handling IP Warm Pool Configuration

The VPC CNI maintains a warm pool of IP addresses for faster pod startup. With custom networking, adjust warm pool settings to account for your pod subnet capacity:

```bash
# Set minimum IPs per node
kubectl set env daemonset aws-node \
  -n kube-system \
  MINIMUM_IP_TARGET=30

# Set warm IP target
kubectl set env daemonset aws-node \
  -n kube-system \
  WARM_IP_TARGET=5
```

MINIMUM_IP_TARGET ensures each node pre-allocates at least 30 IPs, reducing pod startup latency. WARM_IP_TARGET maintains 5 extra IPs beyond current pod usage.

For high-density nodes, increase these values. For cost optimization in development clusters, decrease them to reduce unused IP allocation.

## Network Policy Considerations

Custom networking affects network policy implementation. Make sure your chosen network policy controller (Calico, Cilium, etc.) works correctly with custom subnets:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-pods
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}  # Allow from all pods in namespace
    ports:
    - protocol: TCP
      port: 8080
```

Test network policies thoroughly after implementing custom networking to ensure traffic filtering works as expected with the new subnet architecture.

## Monitoring and Troubleshooting

Monitor IP allocation and ENI attachment metrics:

```bash
# Check available IPs per node
kubectl get nodes -o json | jq -r '.items[] | {name: .metadata.name, allocatable: .status.allocatable["vpc.amazonaws.com/pod-eni"]}'

# View ENI metrics in CNI logs
kubectl logs -n kube-system -l k8s-app=aws-node --tail=100
```

Common issues include subnet exhaustion, security group misconfigurations, and routing table problems. If pods fail to start, check:

```bash
# Verify subnet has available IPs
aws ec2 describe-subnets \
  --subnet-ids subnet-abcd1234 \
  --query 'Subnets[0].AvailableIpAddressCount' \
  --region us-east-1

# Check route table associations
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-abcd1234" \
  --region us-east-1
```

Ensure pod subnets have routes to NAT gateways or internet gateways if pods need external connectivity.

## Terraform Configuration

Automate custom networking setup with Terraform:

```hcl
# Create pod subnets
resource "aws_subnet" "pod_subnets" {
  for_each = {
    "us-east-1a" = "100.64.0.0/19"
    "us-east-1b" = "100.64.32.0/19"
  }

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = each.key

  tags = {
    Name = "pod-subnet-${each.key}"
  }
}

# Configure VPC CNI
resource "kubernetes_daemonset_v1" "aws_node" {
  metadata {
    name      = "aws-node"
    namespace = "kube-system"
  }

  spec {
    template {
      spec {
        container {
          env {
            name  = "AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG"
            value = "true"
          }
          env {
            name  = "ENI_CONFIG_LABEL_DEF"
            value = "topology.kubernetes.io/zone"
          }
        }
      }
    }
  }
}

# Create ENIConfigs
resource "kubectl_manifest" "eniconfig" {
  for_each = aws_subnet.pod_subnets

  yaml_body = <<-YAML
    apiVersion: crd.k8s.amazonaws.com/v1alpha1
    kind: ENIConfig
    metadata:
      name: ${each.key}
    spec:
      subnet: ${each.value.id}
      securityGroups:
        - ${aws_security_group.pod_sg.id}
  YAML
}
```

This infrastructure-as-code approach ensures consistent custom networking configuration across clusters and environments.

Custom networking in EKS provides flexibility for IP management and network architecture. It requires careful planning but pays off with improved IP utilization and clearer network segmentation.
