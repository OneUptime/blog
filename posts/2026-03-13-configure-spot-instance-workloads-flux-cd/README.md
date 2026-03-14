# How to Configure Spot Instance Workloads with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Spot Instances, Preemptible, Cost Management, Node Affinity, Tolerations

Description: Configure Flux-managed Kubernetes workloads to run on spot and preemptible instances using node selectors, tolerations, and pod disruption budgets to reduce compute costs by up to 90%.

---

## Introduction

Spot instances on AWS, Preemptible VMs on GCP, and Spot VMs on Azure offer compute capacity at 60-90% discounts compared to on-demand pricing. For stateless, fault-tolerant workloads — web servers, batch processors, and background workers — spot instances are one of the highest-impact cost optimization strategies available. The catch is that cloud providers can reclaim spot capacity with short notice, requiring your workloads to handle interruptions gracefully.

Kubernetes and Flux CD make spot instance management tractable at scale. By defining node selectors, tolerations, and pod disruption budgets as code in your Git repository, you can systematically route cost-tolerant workloads to spot nodes while keeping latency-sensitive or stateful workloads on on-demand capacity.

This guide walks through configuring Flux CD to deploy workloads with spot instance affinity, handling node interruptions gracefully, and maintaining high availability while maximizing spot cost savings.

## Prerequisites

- A Kubernetes cluster with both on-demand and spot/preemptible node pools
- Flux CD bootstrapped and connected to your Git repository
- Node termination handler deployed (AWS Node Termination Handler or GCP equivalent)
- kubectl with cluster-admin access
- Cluster Autoscaler configured for your spot node pools

## Step 1: Label Your Spot Node Pools

Ensure your spot nodes carry the right labels. Most managed Kubernetes services do this automatically, but verify.

```bash
# AWS EKS - spot nodes typically have this label
kubectl get nodes -l "eks.amazonaws.com/capacityType=SPOT" --show-labels

# GKE - preemptible nodes
kubectl get nodes -l "cloud.google.com/gke-preemptible=true" --show-labels

# Add custom labels if your spot nodes don't have standard labels
kubectl label nodes <node-name> node-lifecycle=spot capacity-type=spot

# Verify taint on spot nodes (add if missing)
kubectl taint nodes -l "capacity-type=spot" spot=true:NoSchedule
```

## Step 2: Create a Kustomize Base for Spot Workloads

Define a reusable Kustomize base configuration that adds spot tolerations and affinity to any workload.

```yaml
# infrastructure/patches/spot-tolerations.yaml
# Apply this as a strategic merge patch to any deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: placeholder  # Override in each overlay
spec:
  template:
    spec:
      # Tolerate spot node taint
      tolerations:
        - key: "spot"
          operator: "Equal"
          value: "true"
          effect: "NoSchedule"
        # AWS-specific spot interruption taint
        - key: "aws.amazon.com/spot"
          operator: "Exists"
          effect: "NoSchedule"

      # Prefer spot nodes but fall back to on-demand
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: capacity-type
                    operator: In
                    values:
                      - spot
          # Require spot for this workload (optional - remove for soft preference)
          # requiredDuringSchedulingIgnoredDuringExecution:
          #   nodeSelectorTerms:
          #     - matchExpressions:
          #         - key: capacity-type
          #           operator: In
          #           values: [spot]
```

## Step 3: Apply Spot Configuration to Batch Workloads

Configure a batch processing deployment to run exclusively on spot nodes.

```yaml
# apps/batch-processor/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
  namespace: workers
  labels:
    app: batch-processor
    cost-profile: spot-only
    team: data
spec:
  replicas: 10
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      # Spot-only configuration
      tolerations:
        - key: "spot"
          operator: "Equal"
          value: "true"
          effect: "NoSchedule"

      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: capacity-type
                    operator: In
                    values: [spot]

        # Spread across multiple nodes for interruption resilience
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: batch-processor
                topologyKey: kubernetes.io/hostname

      # Handle SIGTERM gracefully during spot interruption
      terminationGracePeriodSeconds: 60

      containers:
        - name: batch-processor
          image: myregistry/batch-processor:v2.1.0
          # Checkpoint work every 30 seconds to minimize data loss on interruption
          env:
            - name: CHECKPOINT_INTERVAL_SECONDS
              value: "30"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
```

## Step 4: Configure Pod Disruption Budgets for Spot Resilience

Ensure Kubernetes drains spot nodes gracefully during interruption windows.

```yaml
# apps/web-api/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-api-pdb
  namespace: backend
spec:
  # Keep at least 50% of pods available during node disruptions
  # This allows spot nodes to be drained safely
  minAvailable: "50%"
  selector:
    matchLabels:
      app: web-api
```

## Step 5: Deploy with Flux Kustomization

Wire spot workload configurations together using Flux Kustomizations with proper ordering.

```yaml
# clusters/production/spot-workloads-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: spot-workloads
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/batch-processor
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Ensure the namespace exists before deploying workloads
  dependsOn:
    - name: namespaces
  # Apply spot configuration patches
  patches:
    - target:
        kind: Deployment
        labelSelector: "cost-profile=spot-only"
      patch: |
        - op: add
          path: /spec/template/spec/tolerations
          value:
            - key: "spot"
              operator: "Equal"
              value: "true"
              effect: "NoSchedule"
```

## Step 6: Monitor Spot Interruption Events

Track spot interruption frequency to understand the stability of your spot configuration.

```bash
# View spot interruption events
kubectl get events -A | grep -i "preempt\|spot\|terminating"

# Check AWS Node Termination Handler events
kubectl get events -n kube-system | grep "node-termination"

# Verify PDB status
kubectl get pdb -A

# Check how many pods are on spot vs on-demand nodes
kubectl get pods -n workers -o wide | grep batch-processor
```

## Best Practices

- Never run stateful workloads (databases, persistent queues) exclusively on spot nodes; use spot only for stateless, fault-tolerant services.
- Implement checkpoint-and-resume patterns in batch workloads so a spot interruption loses at most one checkpoint interval of work.
- Use Cluster Autoscaler with mixed instance type pools to give it flexibility in replacing interrupted spot capacity.
- Set `terminationGracePeriodSeconds` to at least 60 seconds to give your application time to finish in-flight requests during spot interruption.
- Monitor your spot interruption rate per instance type; switch to instance types with lower interruption rates if you see frequent disruptions.
- Use the AWS Spot Interruption Advisor or GCP preemption history to select instance types with historically low interruption rates.

## Conclusion

Spot instances are the single highest-impact compute cost optimization available in Kubernetes. By encoding spot affinity, tolerations, and disruption budgets in your Flux-managed manifests, you create a systematic approach to spot instance adoption that is safe, auditable, and easy to maintain. The GitOps workflow ensures every workload's spot eligibility is explicitly documented and reviewed — transforming spot instance management from an ad-hoc practice into a first-class engineering concern.
