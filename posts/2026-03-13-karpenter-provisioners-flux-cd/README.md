# Karpenter Provisioners with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Karpenter, AWS, Kubernetes, Node Provisioning, Autoscaling, GitOps

Description: Manage Karpenter provisioner configurations declaratively with Flux CD, enabling GitOps-driven node autoscaling for diverse workload types.

---

## Introduction

Karpenter's `NodePool` (formerly `Provisioner`) resources define what kinds of nodes Karpenter can launch. Managing these through Flux CD gives platform teams version-controlled, auditable node provisioning configurations that can be reviewed through pull requests and rolled back if provisioning behavior causes issues.

This post focuses on designing and managing NodePool configurations for common enterprise workload patterns — web applications, batch jobs, machine learning, and development environments.

## Prerequisites

- EKS cluster with Karpenter installed
- Flux CD installed and bootstrapped
- IAM roles for Karpenter configured
- `kubectl` access to the cluster

## Step 1: Organize Karpenter Configurations in GitOps Repository

Structure your Git repository for multiple NodePool configurations:

```
fleet-infra/
└── infrastructure/
    └── karpenter/
        ├── kustomization.yaml
        ├── ec2nodeclass-default.yaml
        ├── ec2nodeclass-spot.yaml
        ├── nodepool-web.yaml
        ├── nodepool-batch.yaml
        ├── nodepool-ml.yaml
        └── nodepool-dev.yaml
```

```yaml
# infrastructure/karpenter/kustomization.yaml - Karpenter resources Kustomize file
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ec2nodeclass-default.yaml
  - ec2nodeclass-spot.yaml
  - nodepool-web.yaml
  - nodepool-batch.yaml
  - nodepool-ml.yaml
```

## Step 2: Web Application NodePool

Optimized for latency-sensitive, stateless web workloads:

```yaml
# nodepool-web.yaml - NodePool for web application workloads
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: web
  labels:
    team: platform
    tier: web
spec:
  template:
    metadata:
      labels:
        node-type: web
    spec:
      nodeClassRef:
        apiVersion: karpenter.k8s.aws/v1beta1
        kind: EC2NodeClass
        name: default
      requirements:
        # Prefer compute-optimized instances for web workloads
        - key: "karpenter.k8s.aws/instance-family"
          operator: In
          values: ["c5", "c6i", "c5a", "c6a"]
        # Use a mix of spot and on-demand for web traffic handling
        - key: "karpenter.sh/capacity-type"
          operator: In
          values: ["spot", "on-demand"]
        # 2-8 CPU instances work well for web apps
        - key: "karpenter.k8s.aws/instance-cpu"
          operator: In
          values: ["2", "4", "8"]
      expireAfter: 24h
  limits:
    cpu: 500
    memory: 2000Gi
  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 10m
```

## Step 3: Batch Processing NodePool

Optimized for cost-sensitive, interruption-tolerant batch jobs:

```yaml
# nodepool-batch.yaml - NodePool for batch processing workloads
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: batch
spec:
  template:
    metadata:
      labels:
        node-type: batch
    spec:
      nodeClassRef:
        apiVersion: karpenter.k8s.aws/v1beta1
        kind: EC2NodeClass
        name: spot
      taints:
        # Only batch workloads with the correct toleration schedule here
        - key: batch
          value: "true"
          effect: NoSchedule
      requirements:
        # Use any instance family for batch (cost optimization)
        - key: "karpenter.k8s.aws/instance-family"
          operator: In
          values: ["m5", "m6i", "c5", "c6i", "r5", "r6i"]
        # Spot only for batch to maximize cost savings
        - key: "karpenter.sh/capacity-type"
          operator: In
          values: ["spot"]
        # Larger instances for batch efficiency
        - key: "karpenter.k8s.aws/instance-cpu"
          operator: In
          values: ["8", "16", "32"]
      expireAfter: 168h   # 7 days - batch nodes can live longer
  limits:
    cpu: 2000
    memory: 8000Gi
  disruption:
    # Don't consolidate batch nodes mid-job
    consolidationPolicy: WhenEmpty
    consolidateAfter: 30m
```

## Step 4: Machine Learning NodePool

Dedicated GPU instances for ML training and inference:

```yaml
# nodepool-ml.yaml - NodePool for machine learning GPU workloads
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: ml-gpu
spec:
  template:
    metadata:
      labels:
        node-type: ml-gpu
    spec:
      nodeClassRef:
        apiVersion: karpenter.k8s.aws/v1beta1
        kind: EC2NodeClass
        name: default
      taints:
        # Require explicit GPU toleration from ML workloads
        - key: nvidia.com/gpu
          value: "true"
          effect: NoSchedule
        - key: ml-workload
          value: "true"
          effect: NoSchedule
      requirements:
        - key: "karpenter.k8s.aws/instance-family"
          operator: In
          values: ["g4dn", "g5", "p3", "p4d"]
        # On-demand only for GPU — spot GPU is less available
        - key: "karpenter.sh/capacity-type"
          operator: In
          values: ["on-demand"]
  limits:
    cpu: 200
    memory: 1600Gi
  disruption:
    # Don't consolidate ML nodes — training jobs are expensive to restart
    consolidationPolicy: WhenEmpty
```

## Step 5: Flux Kustomization with Environment Overlays

```yaml
# staging-karpenter-kustomization.yaml - Staging uses smaller instance limits
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: karpenter-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/karpenter/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  dependsOn:
    - name: karpenter
```

Staging overlay with reduced limits:

```yaml
# overlays/staging/karpenter-limits-patch.yaml - Reduce limits for staging
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: web
spec:
  limits:
    # Smaller limits in staging for cost control
    cpu: 50
    memory: 200Gi
```

## Best Practices

- Use separate NodePools for spot and on-demand workloads to make cost visibility clear
- Set `expireAfter` on all NodePools to ensure regular AMI rotation for security patching
- Define CPU and memory limits on each NodePool to prevent runaway scaling and unexpected bills
- Use taints to enforce workload isolation — GPU nodes should require explicit tolerations
- Review NodePool configurations via pull requests before applying to production

## Conclusion

Flux-managed Karpenter NodePools provide a complete GitOps solution for node autoscaling configuration. Platform teams can define node provisioning strategies as code, review changes through pull requests, and roll back problematic configurations via Git reverts. The combination of Karpenter's intelligent provisioning with Flux's reconciliation creates an autoscaling system that is both flexible and reliable.
