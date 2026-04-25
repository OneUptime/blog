# How to Set Placement Preferences and Constraints in Portainer for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Node Affinity, Scheduling, DevOps

Description: Learn how to configure node affinity, pod affinity, and tolerations for Kubernetes applications in Portainer.

## Overview

Kubernetes offers fine-grained control over pod placement through node selectors, node affinity rules, pod affinity/anti-affinity, and tolerations. In Portainer, the application form exposes node-label placement rules directly, while advanced scheduling settings are configured through a Kubernetes manifest.

## Node Selector (Simple Placement)

The simplest placement constraint - requires the pod to run on a node with specific labels:

```yaml
spec:
  # Only schedule on nodes labeled: disktype=ssd
  nodeSelector:
    disktype: ssd
    environment: production
```

## Node Affinity (Advanced Placement)

Node affinity supports required and preferred rules:

```yaml
spec:
  affinity:
    nodeAffinity:
      # REQUIRED: Pod will not be scheduled unless this is satisfied
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values: ["amd64"]   # Only run on AMD64 nodes
      # PREFERRED: Try to schedule here, but not required
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          preference:
            matchExpressions:
              - key: cloud.google.com/gke-nodepool
                operator: In
                values: ["high-memory"]   # Prefer high-memory node pool
```

## Pod Anti-Affinity (Spread Across Nodes)

Prefer to spread replicas across nodes:

```yaml
spec:
  affinity:
    podAntiAffinity:
      # Prefer to spread pods across different nodes
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: app
                  operator: In
                  values: ["my-app"]
            topologyKey: kubernetes.io/hostname  # Spread across different hostnames
```

## Tolerations (Scheduling on Tainted Nodes)

Tolerations allow pods to be scheduled on nodes that have taints:

```yaml
spec:
  tolerations:
    # Allow scheduling on GPU-dedicated nodes
    - key: "nvidia.com/gpu"
      operator: "Exists"
      effect: "NoSchedule"
    # Allow scheduling on spot/preemptible nodes
    - key: "cloud.google.com/gke-spot"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
```

## Configuring in Portainer

In Portainer's application deployment form:

1. Scroll to **Placement preferences and constraints**.
2. Click **add rule** to add placement rules based on node labels.
3. Choose **Mandatory** or **Preferred** for the placement policy.

For full control of node affinity, pod affinity/anti-affinity, and tolerations, use **Create from code** with a Kubernetes manifest.

## Labeling Nodes for Placement

```bash
# Label nodes before applying placement rules

kubectl label node worker-01 disktype=ssd environment=production
kubectl label node worker-02 disktype=ssd environment=production

# Verify labels
kubectl get nodes --show-labels
```

## Conclusion

Placement controls in Kubernetes ensure your workloads land on the right hardware and are spread for high availability. Portainer exposes node-label placement rules directly in the form, and for advanced scheduling fields such as affinity and tolerations, use **Create from code** with a Kubernetes manifest.
