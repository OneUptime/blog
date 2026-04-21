# How to Configure Taints and Tolerations in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Taints, Toleration, Scheduling, Container Management

Description: Learn how to configure Kubernetes taints and tolerations through Portainer to control workload placement and dedicate nodes for specific workloads.

## Introduction

Kubernetes taints and tolerations work together to control which pods can be scheduled on which nodes. Taints repel pods from nodes, while tolerations allow specific pods to be scheduled on tainted nodes. Portainer provides a UI to manage node taints and can deploy manifests that define pod tolerations.

## Understanding Taints and Tolerations

- **Taint**: Applied to a node to repel pods that don't tolerate it
- **Toleration**: Applied to a pod to allow it to be scheduled on nodes with matching taints
- **Effects**: `NoSchedule`, `PreferNoSchedule`, `NoExecute`

## Adding a Taint to a Node via Portainer

1. In Portainer, navigate to **Cluster** > **Details**
2. Scroll to **Nodes** and click on the node you want to taint
3. Scroll to the **Taints** section
4. Click **Add taint**
5. Enter:
   - **Key**: `dedicated`
   - **Value**: `gpu-workloads`
   - **Effect**: `NoSchedule`

Alternatively, via kubectl:

```bash
kubectl taint nodes node1 dedicated=gpu-workloads:NoSchedule
```

## Adding Tolerations to a Deployment via Portainer

Portainer's form-based placement rules are based on node labels. To add a Kubernetes toleration, deploy the workload from a manifest in Portainer:

1. Go to **Applications** > **Create from code**
2. Choose **Manifest**
3. Add the toleration under `spec.template.spec.tolerations` in the Deployment manifest:
   - **Key**: `dedicated`
   - **Operator**: `Equal`
   - **Value**: `gpu-workloads`
   - **Effect**: `NoSchedule`

A toleration lets the pod run on a matching tainted node, but it does not force the pod onto that node. If the workload must run only on those nodes, also use a matching node label with `nodeSelector` or node affinity.

## Defining Tolerations in YAML

Deploy via Portainer using a YAML manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gpu-app
  template:
    metadata:
      labels:
        app: gpu-app
    spec:
      tolerations:
      - key: "dedicated"
        operator: "Equal"
        value: "gpu-workloads"
        effect: "NoSchedule"
      containers:
      - name: gpu-app
        image: tensorflow/tensorflow:latest-gpu
        resources:
          limits:
            nvidia.com/gpu: 1
```

## Common Use Cases

**Dedicated nodes for system workloads:**

```bash
kubectl taint nodes control-plane node-role.kubernetes.io/control-plane:NoSchedule
```

**Nodes with special hardware:**

```bash
kubectl taint nodes gpu-node hardware=gpu:NoSchedule
```

**Evicting existing pods with NoExecute:**

```bash
kubectl taint nodes node1 maintenance=true:NoExecute
```

## Removing a Taint

Append a `-` to remove a taint:

```bash
kubectl taint nodes node1 dedicated=gpu-workloads:NoSchedule-
```

## Verifying Taint Configuration

```bash
kubectl describe node node1 | grep -A5 Taints
kubectl get pods -o wide --field-selector spec.nodeName=node1
```

## Conclusion

Using Portainer with Kubernetes taints and tolerations gives you fine-grained control over workload placement in Kubernetes clusters. Use them to keep general workloads off dedicated nodes, combine them with labels or affinity for hardware-specific placement, and isolate workloads by team or environment.
