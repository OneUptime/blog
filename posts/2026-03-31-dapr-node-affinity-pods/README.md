# How to Configure Node Affinity for Dapr Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Node Affinity, Scheduling, Topology

Description: Configure node affinity rules for Dapr control plane and application pods to control placement on specific node pools, regions, or hardware types.

---

## Why Configure Node Affinity for Dapr

Node affinity lets you pin Dapr control plane components to dedicated infrastructure nodes, isolating them from noisy application workloads. You can also place Dapr-enabled apps near their dependencies (e.g., Redis) to reduce latency.

## Required Node Affinity (Hard Rules)

Use `requiredDuringSchedulingIgnoredDuringExecution` to force pods onto specific nodes:

```yaml
# dapr-affinity-values.yaml
dapr_operator:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: node-role
            operator: In
            values:
            - infrastructure

dapr_sentry:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: node-role
            operator: In
            values:
            - infrastructure
```

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  -f dapr-affinity-values.yaml
```

## Preferred Node Affinity (Soft Rules)

Use `preferredDuringSchedulingIgnoredDuringExecution` for best-effort placement:

```yaml
dapr_operator:
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 80
        preference:
          matchExpressions:
          - key: node-pool
            operator: In
            values:
            - control-plane-pool
      - weight: 20
        preference:
          matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values:
            - us-east-1a
```

## Node Affinity for Application Pods

Place Dapr-enabled apps on specific node pools:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: workload-type
                operator: In
                values:
                - application
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - order-service
              topologyKey: kubernetes.io/hostname
      containers:
      - name: order-service
        image: myregistry/order-service:latest
```

## Labeling Nodes

```bash
# Label infrastructure nodes
kubectl label node node1 node-role=infrastructure
kubectl label node node2 node-role=infrastructure

# Label application nodes
kubectl label node node3 workload-type=application
kubectl label node node4 workload-type=application

# Verify labels
kubectl get nodes --show-labels
```

## Verifying Affinity Rules

```bash
# Check where Dapr control plane is scheduled
kubectl get pods -n dapr-system -o wide

# Check if affinity prevented scheduling
kubectl describe pod dapr-operator-xxxxxxxxx -n dapr-system | grep -A10 "Events:"
```

## Summary

Node affinity rules for Dapr control plane pods ensure they run on dedicated infrastructure nodes, reducing interference from application workloads. Use hard affinity rules for strict isolation and soft rules for preferred placement. Pod anti-affinity prevents multiple replicas from landing on the same node, improving fault tolerance.
