# How to Label and Taint Nodes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Node Management

Description: A practical guide to using node labels and taints in Rancher to control workload scheduling and node specialization.

Node labels and taints are powerful Kubernetes mechanisms for controlling where pods run. Labels categorize nodes and enable node selectors and affinity rules. Taints repel pods unless they have matching tolerations. This guide shows you how to manage labels and taints through the Rancher UI, when node editing is available for your cluster type, and via kubectl.

## Understanding Labels and Taints

**Labels** are key-value pairs attached to nodes that describe node characteristics. Pods can use node selectors or affinity rules to target specific labeled nodes.

**Taints** are applied to nodes to repel pods. Only pods with matching tolerations can be scheduled on tainted nodes. Taints have three effects:

- `NoSchedule`: New pods without tolerations will not be scheduled
- `PreferNoSchedule`: The scheduler tries to avoid placing pods without tolerations
- `NoExecute`: Existing pods without tolerations are evicted, and new pods without tolerations are not scheduled

## Managing Labels

### Adding Labels via the Rancher UI

1. Log in to the Rancher UI
2. Navigate to your cluster
3. Go to **Nodes**
4. Open the node's **⋮** menu and click **Edit**
5. In the **Labels** section, add key-value pairs:
   - Key: `environment`
   - Value: `production`
6. Click **Save**

### Adding Labels via kubectl

```bash
# Add a single label

kubectl label node <NODE_NAME> environment=production

# Add multiple labels
kubectl label node <NODE_NAME> \
  environment=production \
  team=backend \
  disk-type=ssd \
  zone=us-east-1a
```

### Viewing Labels

```bash
# Show all labels on a node
kubectl get node <NODE_NAME> --show-labels

# Show specific labels in columns
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
ENV:.metadata.labels.environment,\
TEAM:.metadata.labels.team,\
ZONE:.metadata.labels.zone
```

### Updating Labels

```bash
# Overwrite an existing label
kubectl label node <NODE_NAME> environment=staging --overwrite
```

### Removing Labels

```bash
# Remove a label (note the minus sign at the end)
kubectl label node <NODE_NAME> environment-
```

### Common Label Patterns

```bash
# Hardware characteristics
kubectl label node <NODE_NAME> disk-type=ssd
kubectl label node <NODE_NAME> gpu=nvidia-a100
kubectl label node <NODE_NAME> memory=high

# Topology
kubectl label node <NODE_NAME> topology.kubernetes.io/zone=us-east-1a
kubectl label node <NODE_NAME> topology.kubernetes.io/region=us-east-1

# Workload type
kubectl label node <NODE_NAME> workload-type=batch
kubectl label node <NODE_NAME> workload-type=web

# Environment
kubectl label node <NODE_NAME> environment=production
kubectl label node <NODE_NAME> tier=frontend
```

## Using Labels for Pod Scheduling

### Node Selector

The simplest way to schedule pods on specific nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      nodeSelector:
        disk-type: ssd
        environment: production
      containers:
      - name: web
        image: nginx
```

### Node Affinity

For more complex scheduling rules:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics
  template:
    metadata:
      labels:
        app: analytics
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: gpu
                operator: In
                values:
                - nvidia-a100
                - nvidia-v100
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 1
            preference:
              matchExpressions:
              - key: zone
                operator: In
                values:
                - us-east-1a
      containers:
      - name: analytics
        image: analytics-app:latest
```

## Managing Taints

### Adding Taints via the Rancher UI

1. Navigate to your cluster
2. Go to **Nodes**
3. Open the node's **⋮** menu and click **Edit**
4. In the **Taints** section, add:
   - Key: `dedicated`
   - Value: `gpu`
   - Effect: `NoSchedule`
5. Click **Save**

### Adding Taints via kubectl

```bash
# Add a NoSchedule taint
kubectl taint nodes <NODE_NAME> dedicated=gpu:NoSchedule

# Add a NoExecute taint
kubectl taint nodes <NODE_NAME> maintenance=true:NoExecute

# Add a PreferNoSchedule taint
kubectl taint nodes <NODE_NAME> cost=expensive:PreferNoSchedule
```

### Viewing Taints

```bash
# Show taints on a specific node
kubectl describe node <NODE_NAME> | grep -A5 Taints

# Show taints on all nodes
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
TAINTS:.spec.taints
```

### Removing Taints

```bash
# Remove a specific taint (note the minus sign at the end)
kubectl taint nodes <NODE_NAME> dedicated=gpu:NoSchedule-

# Remove all taints with a key
kubectl taint nodes <NODE_NAME> dedicated-
```

## Using Tolerations for Tainted Nodes

Pods must have matching tolerations to be scheduled on tainted nodes. If you also use a node selector, the node must have the matching label:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-workload
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gpu-workload
  template:
    metadata:
      labels:
        app: gpu-workload
    spec:
      tolerations:
      - key: dedicated
        operator: Equal
        value: gpu
        effect: NoSchedule
      nodeSelector:
        dedicated: gpu
      containers:
      - name: gpu-app
        image: gpu-app:latest
        resources:
          limits:
            nvidia.com/gpu: 1
```

### Toleration Operators

```yaml
# Exact match
tolerations:
- key: dedicated
  operator: Equal
  value: gpu
  effect: NoSchedule

# Exists (matches any value for the key)
tolerations:
- key: dedicated
  operator: Exists
  effect: NoSchedule

# Tolerate all taints (use with caution)
tolerations:
- operator: Exists
```

## Common Taint and Label Patterns

### Dedicated GPU Nodes

```bash
# Taint and label GPU nodes
kubectl taint nodes gpu-node-1 dedicated=gpu:NoSchedule
kubectl label nodes gpu-node-1 dedicated=gpu gpu=nvidia-a100
```

### Dedicated Database Nodes

```bash
kubectl taint nodes db-node-1 dedicated=database:NoSchedule
kubectl label nodes db-node-1 workload=database disk-type=ssd
```

### Maintenance Mode

```bash
# Put node in maintenance mode
kubectl taint nodes <NODE_NAME> maintenance=true:NoExecute

# Remove maintenance taint when done
kubectl taint nodes <NODE_NAME> maintenance=true:NoExecute-
```

### Team-Dedicated Nodes

```bash
# Reserve nodes for specific teams
kubectl taint nodes team-a-node-1 team=team-a:NoSchedule
kubectl label nodes team-a-node-1 team=team-a
```

## Bulk Operations

### Label Multiple Nodes

```bash
# Label all nodes in a zone
kubectl get nodes -l topology.kubernetes.io/zone=us-east-1a --no-headers | \
  awk '{print $1}' | xargs -I{} kubectl label node {} tier=frontend
```

### Taint Multiple Nodes

```bash
# Taint all nodes with a specific label
kubectl get nodes -l gpu=nvidia-a100 --no-headers | \
  awk '{print $1}' | xargs -I{} kubectl taint node {} dedicated=gpu:NoSchedule
```

## Best Practices

- Use well-known label keys from the Kubernetes documentation when applicable (e.g., `topology.kubernetes.io/zone`)
- Keep label keys and values consistent across your clusters
- Document your label and taint conventions for your team
- Use taints sparingly; overuse makes scheduling complex and fragile
- Always pair taints with labels so pods can use both tolerations and node selectors
- Test scheduling rules in a staging environment before applying to production
- Use `PreferNoSchedule` when you want a soft preference rather than a hard requirement

## Conclusion

Node labels and taints in Rancher give you precise control over workload placement in your Kubernetes clusters. Labels categorize nodes for targeted scheduling, while taints ensure only appropriate workloads run on specialized nodes. Whether managed through the Rancher UI or kubectl, these mechanisms are essential for multi-tenant clusters, GPU workloads, compliance requirements, and operational isolation. Define a labeling and taint strategy for your organization and apply it consistently across all clusters.
