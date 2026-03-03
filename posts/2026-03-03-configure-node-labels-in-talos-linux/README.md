# How to Configure Node Labels in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Node Labels, Kubernetes, Scheduling, Node Management

Description: A complete guide to configuring node labels in Talos Linux for pod scheduling, topology awareness, and cluster organization.

---

Node labels in Kubernetes are key-value pairs attached to nodes that help organize, categorize, and select nodes for pod scheduling. They are essential for topology-aware scheduling, workload isolation, and cluster management. In Talos Linux, node labels can be configured through the machine configuration so they are applied automatically when nodes join the cluster.

This guide covers how to set node labels in Talos Linux and how to use them effectively for scheduling and management.

## Understanding Node Labels

Labels are metadata attached to Kubernetes objects. For nodes, they serve several purposes:

- Pod scheduling via nodeSelector and node affinity
- Topology awareness (zone, region, rack)
- Node categorization (GPU nodes, high-memory nodes)
- Policy enforcement (which workloads can run where)

Kubernetes adds several default labels to every node:

```
kubernetes.io/hostname=node-1
kubernetes.io/os=linux
kubernetes.io/arch=amd64
node.kubernetes.io/instance-type=...
topology.kubernetes.io/zone=...
topology.kubernetes.io/region=...
```

## Configuring Labels in Talos Machine Config

Talos Linux lets you define node labels through the `machine.nodeLabels` field:

```yaml
machine:
  nodeLabels:
    # Custom labels for the node
    environment: production
    team: platform
    hardware-type: gpu
    rack: rack-12
    topology.kubernetes.io/zone: us-east-1a
```

These labels are applied when the node registers with the Kubernetes API server. They persist across reboots and upgrades.

## Setting Labels Through Kubelet Extra Args

An alternative approach uses kubelet extra args:

```yaml
machine:
  kubelet:
    extraArgs:
      node-labels: "environment=production,team=platform,hardware-type=gpu"
```

However, `machine.nodeLabels` is the preferred approach in Talos because it is cleaner and integrates with the Talos configuration management.

## Generating Configuration with Labels

When generating a new Talos configuration, include labels through a config patch:

```bash
# Generate with a patch that includes node labels
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --config-patch-worker '[{"op": "add", "path": "/machine/nodeLabels", "value": {"environment": "production", "role": "worker"}}]'
```

Or use a patch file:

```yaml
# worker-labels.yaml
machine:
  nodeLabels:
    environment: production
    role: worker
    team: platform
```

```bash
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --config-patch-worker @worker-labels.yaml
```

## Per-Node Labels

Different nodes often need different labels. Create separate configuration files or use patches:

```yaml
# gpu-worker.yaml - configuration for GPU nodes
machine:
  nodeLabels:
    environment: production
    hardware-type: gpu
    gpu-model: nvidia-a100
    node-pool: gpu-workers
```

```yaml
# standard-worker.yaml - configuration for standard nodes
machine:
  nodeLabels:
    environment: production
    hardware-type: standard
    node-pool: general-workers
```

Apply the appropriate configuration to each node:

```bash
# GPU nodes
talosctl apply-config --nodes 10.0.0.10 --file gpu-worker.yaml
talosctl apply-config --nodes 10.0.0.11 --file gpu-worker.yaml

# Standard nodes
talosctl apply-config --nodes 10.0.0.20 --file standard-worker.yaml
talosctl apply-config --nodes 10.0.0.21 --file standard-worker.yaml
```

## Adding Labels to Running Nodes

To add labels to nodes that are already running, patch the machine configuration:

```bash
# Add a label to a specific node
talosctl patch machineconfig --nodes 10.0.0.5 \
  --patch '{"machine": {"nodeLabels": {"new-label": "new-value"}}}'
```

You can also add labels through kubectl, but these are not persisted in the Talos configuration and may be lost on reboot:

```bash
# Add a label via kubectl (not persisted through reboots)
kubectl label node worker-1 temporary-label=value

# Remove a label via kubectl
kubectl label node worker-1 temporary-label-
```

For persistent labels, always use the Talos machine configuration.

## Using Labels for Pod Scheduling

Once nodes have labels, use them to control where pods run.

### nodeSelector (Simple)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload
spec:
  nodeSelector:
    hardware-type: gpu
  containers:
    - name: training
      image: tensorflow/tensorflow:latest-gpu
```

### Node Affinity (Flexible)

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
      affinity:
        nodeAffinity:
          # Must run on production nodes
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: environment
                    operator: In
                    values:
                      - production
          # Prefer standard hardware
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 80
              preference:
                matchExpressions:
                  - key: hardware-type
                    operator: In
                    values:
                      - standard
      containers:
        - name: web
          image: nginx:latest
```

## Topology Labels

Topology labels help Kubernetes make scheduling decisions based on physical or logical infrastructure topology:

```yaml
machine:
  nodeLabels:
    # Standard topology labels
    topology.kubernetes.io/zone: us-east-1a
    topology.kubernetes.io/region: us-east-1
    # Custom topology labels
    topology.example.com/rack: rack-04
    topology.example.com/datacenter: dc-east
    topology.example.com/floor: floor-3
```

These labels enable topology-aware scheduling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ha-app
spec:
  replicas: 3
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: ha-app
      containers:
        - name: app
          image: myapp:latest
```

This ensures pods are spread evenly across availability zones.

## Label Naming Conventions

Follow consistent naming conventions for labels:

```yaml
machine:
  nodeLabels:
    # Use domain prefixes for custom labels
    example.com/environment: production
    example.com/team: platform
    example.com/cost-center: engineering
    # Standard Kubernetes labels use well-known prefixes
    kubernetes.io/os: linux
    node.kubernetes.io/instance-type: m5.xlarge
```

Using domain prefixes prevents conflicts with labels from other tools and makes ownership clear.

## Verifying Labels

Check that labels are applied correctly:

```bash
# List all labels on a node
kubectl get node worker-1 --show-labels

# Get nodes with a specific label
kubectl get nodes -l hardware-type=gpu

# Get nodes matching multiple labels
kubectl get nodes -l "environment=production,team=platform"

# Show labels in column format
kubectl get nodes -L environment,hardware-type,team
```

## Removing Labels

To remove a label from the Talos configuration, update the machine config without that label:

```bash
# Patch to remove a label (set to null)
talosctl patch machineconfig --nodes 10.0.0.5 \
  --patch '[{"op": "remove", "path": "/machine/nodeLabels/old-label"}]'
```

## Conclusion

Node labels in Talos Linux are configured through the machine configuration, ensuring they persist across reboots and upgrades. They are the foundation for pod scheduling, topology awareness, and cluster organization. Use consistent naming conventions with domain prefixes, set topology labels for high availability, and leverage node affinity rules to place workloads on the right nodes. Always configure labels through the Talos machine config rather than kubectl for persistence.
