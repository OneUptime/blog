# Karpenter Node Templates with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Karpenter, AWS, Kubernetes, Autoscaling, Node Provisioning, GitOps

Description: Manage Karpenter NodePool and EC2NodeClass resources through Flux CD for GitOps-native node provisioning and autoscaling configuration.

---

## Introduction

Karpenter is a Kubernetes node provisioner that automatically launches the right compute resources for your workloads. Managing Karpenter's `NodePool` and `EC2NodeClass` resources through Flux CD ensures your node provisioning configuration is version-controlled, auditable, and consistently applied.

This post covers deploying Karpenter via Flux and defining NodePool configurations for different workload types, leveraging Flux's GitOps model for node template management.

## Prerequisites

- EKS cluster with OIDC provider configured
- IAM roles for Karpenter (node role and Karpenter controller role)
- Flux CD installed on the cluster
- `kubectl` and `helm` access to the cluster

## Step 1: Install Karpenter via Flux

```yaml
# karpenter-namespace.yaml - Create namespace for Karpenter
apiVersion: v1
kind: Namespace
metadata:
  name: karpenter
---
# karpenter-helmrepository.yaml - Add Karpenter Helm repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: karpenter
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.karpenter.sh
```

```yaml
# karpenter-helmrelease.yaml - Deploy Karpenter via Flux HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: karpenter
  namespace: karpenter
spec:
  interval: 1h
  chart:
    spec:
      chart: karpenter
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: karpenter
        namespace: flux-system
  values:
    # Replace with your cluster name
    clusterName: my-eks-cluster
    # Replace with your cluster endpoint
    clusterEndpoint: https://XXXXXXXXXXXXXXX.gr7.us-east-1.eks.amazonaws.com
    # Replace with your Karpenter controller IAM role ARN
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/KarpenterControllerRole
    settings:
      aws:
        clusterName: my-eks-cluster
        defaultInstanceProfile: KarpenterNodeInstanceProfile
```

## Step 2: Define EC2NodeClass

The `EC2NodeClass` defines the AMI, subnet, and security group configuration for provisioned nodes:

```yaml
# ec2nodeclass-general.yaml - General purpose node class for EKS
apiVersion: karpenter.k8s.aws/v1beta1
kind: EC2NodeClass
metadata:
  name: general
spec:
  # Use the EKS optimized AMI
  amiFamily: AL2

  # Automatically discover node role from cluster tags
  role: KarpenterNodeRole-my-eks-cluster

  # Discover subnets by cluster tag
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: my-eks-cluster

  # Discover security groups by cluster tag
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: my-eks-cluster

  # EBS volume configuration for nodes
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 100Gi
        volumeType: gp3
        iops: 3000
        throughput: 125
        encrypted: true
  tags:
    ManagedBy: karpenter
    Environment: production
```

## Step 3: Define NodePools for Different Workload Types

Create NodePools for different workload characteristics:

```yaml
# nodepool-general.yaml - General purpose NodePool for most workloads
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: general
spec:
  template:
    spec:
      nodeClassRef:
        apiVersion: karpenter.k8s.aws/v1beta1
        kind: EC2NodeClass
        name: general
      requirements:
        # Prefer m5 and m6i instance families
        - key: "karpenter.k8s.aws/instance-family"
          operator: In
          values: ["m5", "m6i", "m5a", "m6a"]
        # Use both spot and on-demand (cost optimization)
        - key: "karpenter.sh/capacity-type"
          operator: In
          values: ["spot", "on-demand"]
        # Use amd64 architecture
        - key: "kubernetes.io/arch"
          operator: In
          values: ["amd64"]
        # Only use instances with 2-16 CPUs
        - key: "karpenter.k8s.aws/instance-cpu"
          operator: In
          values: ["2", "4", "8", "16"]
      # Expire nodes after 24 hours to keep them fresh (security patching)
      expireAfter: 24h
  limits:
    # Maximum CPU across all nodes in this NodePool
    cpu: 1000
    memory: 4000Gi
  disruption:
    consolidationPolicy: WhenUnderutilized
    # Wait 5 minutes before consolidating underutilized nodes
    consolidateAfter: 5m
---
# nodepool-gpu.yaml - GPU NodePool for ML workloads
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: gpu
spec:
  template:
    spec:
      nodeClassRef:
        apiVersion: karpenter.k8s.aws/v1beta1
        kind: EC2NodeClass
        name: general
      taints:
        # Taint GPU nodes so only GPU workloads schedule on them
        - key: nvidia.com/gpu
          value: "true"
          effect: NoSchedule
      requirements:
        - key: "karpenter.k8s.aws/instance-family"
          operator: In
          values: ["g4dn", "g5", "p3"]
        - key: "karpenter.sh/capacity-type"
          operator: In
          values: ["on-demand"]
  limits:
    cpu: 100
    memory: 400Gi
```

## Step 4: Flux Kustomization for Karpenter Resources

```yaml
# karpenter-config-kustomization.yaml - Flux manages all Karpenter node configs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: karpenter-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/karpenter
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  # Ensure Karpenter controller is running before applying node configs
  dependsOn:
    - name: karpenter
  healthChecks:
    - apiVersion: karpenter.sh/v1beta1
      kind: NodePool
      name: general
```

## Best Practices

- Use `expireAfter` on NodePools to ensure nodes are regularly replaced with fresh, patched AMIs
- Create separate NodePools for spot and on-demand workloads to control cost and reliability tradeoffs
- Use taints and tolerations to direct specific workload types to dedicated NodePools
- Set NodePool CPU and memory limits to cap infrastructure spend and prevent runaway scaling
- Monitor Karpenter provisioning decisions with its Prometheus metrics

## Conclusion

Managing Karpenter NodePools and EC2NodeClasses through Flux CD ensures your node provisioning strategy is version-controlled and consistently applied. Changes to node configurations - instance types, disk sizes, expiry policies - become Git commits with full audit trails. This approach is particularly valuable when managing multiple clusters with different node requirements, as Flux can apply environment-specific NodePool configurations from a shared base with environment-specific overlays.
