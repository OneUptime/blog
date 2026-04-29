# How to Configure K3s Node Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Node Management, Scheduling, DevOps

Description: Learn how to configure and use node labels in K3s to control workload placement and organize your cluster infrastructure.

## Introduction

Node labels are key-value metadata attached to Kubernetes nodes that enable workload placement decisions through `nodeSelector` and `nodeAffinity` rules. In K3s clusters, labels are especially valuable for differentiating edge nodes, hardware types, geographic locations, or node capabilities. This guide covers setting node labels at installation time and dynamically via kubectl.

## Understanding Node Labels

Labels are arbitrary key-value pairs attached to nodes:

```text
key=value
topology.kubernetes.io/zone=us-east-1a
hardware=gpu
environment=production
```

Common use cases:
- **Hardware differentiation**: `hardware=gpu`, `hardware=high-memory`
- **Topology**: `topology.kubernetes.io/zone=zone-a`
- **Environment**: `environment=production`, `environment=staging`
- **Application roles**: `role=database`, `role=frontend`
- **Edge computing**: `edge-site=store-123`, `region=asia-pacific`

## Method 1: Set Labels During Agent Installation

Pass labels at installation time using `--node-label` flags:

```bash
# Install K3s agent with labels

curl -sfL https://get.k3s.io | \
  K3S_URL=https://<server-ip>:6443 \
  K3S_TOKEN=<node-token> \
  INSTALL_K3S_EXEC="agent \
    --node-label hardware=high-memory \
    --node-label topology.kubernetes.io/zone=us-east-1a \
    --node-label environment=production \
    --node-label node-role=worker" \
  sh -
```

### Using a Config File

```yaml
# /etc/rancher/k3s/config.yaml (on the agent node)
server: "https://<server-ip>:6443"
token: "<node-token>"
node-label:
  - "hardware=high-memory"
  - "topology.kubernetes.io/zone=us-east-1a"
  - "environment=production"
  - "app-role=backend"
```

Then install the agent (it will load `/etc/rancher/k3s/config.yaml` automatically):

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="agent" sh -s -
```

## Method 2: Set Labels on Existing Nodes with kubectl

```bash
# Add a single label
kubectl label node worker-01 hardware=gpu

# Add multiple labels at once
kubectl label node worker-01 \
  topology.kubernetes.io/zone=us-east-1a \
  environment=production \
  app-role=backend

# Overwrite an existing label (--overwrite required)
kubectl label node worker-01 environment=staging --overwrite

# Remove a label (append - to the key)
kubectl label node worker-01 app-role-

# Verify labels
kubectl get node worker-01 --show-labels
```

## Method 3: Set Labels for Server Node at Startup

For the K3s server node:

```yaml
# /etc/rancher/k3s/config.yaml (on the server)
node-label:
  - "node-role=control-plane"
  - "topology.kubernetes.io/zone=us-east-1a"
```

## Viewing Node Labels

```bash
# Show all labels for all nodes
kubectl get nodes --show-labels

# Format output for readability
kubectl get nodes -o custom-columns=\
'NAME:.metadata.name,LABELS:.metadata.labels'

# Filter nodes by label
kubectl get nodes -l hardware=gpu

kubectl get nodes -l 'environment in (production,staging)'

kubectl get nodes -l 'hardware notin (gpu)'

# Describe a node to see all details including labels
kubectl describe node worker-01
```

## Using Node Labels for Workload Placement

### nodeSelector (Simple)

```yaml
# deployment-gpu.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-training
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ml-training
  template:
    metadata:
      labels:
        app: ml-training
    spec:
      # Only schedule on GPU nodes
      nodeSelector:
        hardware: gpu
      containers:
        - name: trainer
          image: tensorflow/tensorflow:latest-gpu
```

### nodeAffinity (Advanced)

```yaml
# deployment-affinity.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      affinity:
        nodeAffinity:
          # Required: must be on production nodes
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: environment
                    operator: In
                    values:
                      - production
          # Preferred: prefer zone us-east-1a
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: topology.kubernetes.io/zone
                    operator: In
                    values:
                      - us-east-1a
      containers:
        - name: frontend
          image: nginx:latest
```

## Bulk Label Management with Ansible

For managing labels across many nodes:

```yaml
# label-nodes.yaml
---
- name: Label K3s nodes
  hosts: k3s_workers
  tasks:
    - name: Apply node labels
      delegate_to: k3s_server
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Node
          metadata:
            name: "{{ inventory_hostname }}"
            labels:
              hardware: "{{ node_hardware_type }}"
              "topology.kubernetes.io/zone": "{{ node_zone }}"
              environment: "{{ env }}"
```

## Well-Known Labels

Kubernetes nodes come pre-populated with a standard set of labels. Common preset labels include:

```bash
# Common preset labels
kubernetes.io/hostname=<node-name>
kubernetes.io/os=<node-os>
kubernetes.io/arch=<node-architecture>
node.kubernetes.io/instance-type=<instance-type>
topology.kubernetes.io/region=<region>
topology.kubernetes.io/zone=<zone>
```

## Conclusion

Node labels are a fundamental tool for organizing K3s clusters and controlling workload placement. Set them at installation time via config files for a declarative approach, or dynamically with kubectl for quick changes. Combined with `nodeSelector` and `nodeAffinity` rules in your workload specs, labels enable sophisticated placement policies that optimize resource utilization across heterogeneous node types.
