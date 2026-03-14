# Configure Node Pool Taints with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: Learn how to configure Kubernetes node pool taints alongside Cilium CNI to control pod scheduling and ensure Cilium operates correctly on specialized node pools.

---

## Introduction

Node pool taints are a Kubernetes mechanism for restricting which pods can be scheduled on certain nodes. They are commonly used to reserve node pools for specific workloads such as GPU jobs, high-memory applications, or nodes with specialized hardware. When you introduce taints, you must ensure that Cilium's DaemonSet pods can tolerate those taints, otherwise Cilium will not run on tainted nodes and pods scheduled there will have no networking.

Cilium's DaemonSet automatically includes tolerations for common system taints, but custom taints introduced by your team or a managed Kubernetes provider may require explicit toleration configuration. This guide covers how to add custom taints to node pools and ensure Cilium is properly configured to tolerate them.

## Prerequisites

- Kubernetes cluster with Cilium installed (v1.12+)
- `cilium` CLI installed
- `helm` CLI for updating Cilium configuration
- Access to node pool taint configuration (cloud provider CLI or kubeadm)

## Step 1: Add Taints to Node Pools

Apply taints to the node pool that should be restricted to specific workloads.

```bash
# Add a custom taint to nodes in a GPU node pool
kubectl taint nodes gpu-node-1 gpu-node-2 gpu-node-3 \
  workload-type=gpu:NoSchedule

# Add a taint to an entire node pool using a label selector
kubectl get nodes -l node-pool=gpu -o name | \
  xargs -I{} kubectl taint {} workload-type=gpu:NoSchedule

# Verify taints were applied correctly
kubectl describe node gpu-node-1 | grep Taints
```

## Step 2: Configure Cilium Tolerations for Custom Taints

Update Cilium's Helm values to add tolerations for your custom node pool taints.

```yaml
# cilium-values-tolerations.yaml - Cilium Helm values with custom tolerations
# These tolerations ensure Cilium DaemonSet runs on ALL node pools including tainted ones
tolerations:
  # Default Cilium tolerations (keep these)
  - key: node.kubernetes.io/not-ready
    operator: Exists
  - key: node.kubernetes.io/unreachable
    operator: Exists
  - key: node.kubernetes.io/disk-pressure
    operator: Exists
  - key: node.kubernetes.io/memory-pressure
    operator: Exists
  - key: node.kubernetes.io/unschedulable
    operator: Exists

  # Custom toleration for GPU node pool taint
  # This ensures Cilium runs on GPU nodes to provide networking
  - key: workload-type
    operator: Equal
    value: gpu
    effect: NoSchedule

  # Custom toleration for spot/preemptible node pool
  - key: cloud.google.com/gke-preemptible
    operator: Exists
    effect: NoSchedule
```

```bash
# Upgrade Cilium with the new tolerations
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  -f cilium-values-tolerations.yaml

# Verify Cilium pods are running on tainted nodes
kubectl get pods -n kube-system -l k8s-app=cilium -o wide
```

## Step 3: Configure CiliumNetworkPolicy for Node Pool Traffic

Apply network policies that account for the node pool architecture.

```yaml
# cnp-gpu-workload.yaml - CiliumNetworkPolicy for GPU workload pods
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: gpu-workload-policy
  namespace: gpu-jobs
spec:
  # Apply to pods in the gpu-jobs namespace
  endpointSelector:
    matchLabels:
      workload: gpu
  ingress:
  # Allow ingress from the job scheduler namespace
  - fromEndpoints:
    - matchLabels:
        k8s:io.kubernetes.pod.namespace: job-scheduler
  egress:
  # Allow egress to shared storage and external model registries
  - toEndpoints:
    - matchLabels:
        k8s:io.kubernetes.pod.namespace: storage
  - toCIDR:
    - 0.0.0.0/0
    toPorts:
    - ports:
      - port: "443"
        protocol: TCP
```

```bash
# Apply the network policy
kubectl apply -f cnp-gpu-workload.yaml

# Verify Cilium is healthy on all nodes including tainted ones
cilium status --all-nodes
```

## Step 4: Test Pod Scheduling on Tainted Nodes

Deploy a pod with the correct toleration and verify it gets Cilium networking.

```yaml
# gpu-pod-test.yaml - Test pod with GPU node pool toleration
apiVersion: v1
kind: Pod
metadata:
  name: gpu-workload-test
  namespace: gpu-jobs
  labels:
    workload: gpu
spec:
  # Add the toleration matching the node pool taint
  tolerations:
  - key: workload-type
    operator: Equal
    value: gpu
    effect: NoSchedule
  nodeSelector:
    node-pool: gpu
  containers:
  - name: workload
    image: nvidia/cuda:12.0-base
    command: ["sleep", "3600"]
```

```bash
# Deploy the test pod
kubectl apply -f gpu-pod-test.yaml

# Verify it schedules on a GPU node and has a Cilium-assigned IP
kubectl get pod gpu-workload-test -n gpu-jobs -o wide

# Check Cilium endpoint for the pod
cilium endpoint list | grep gpu-workload-test
```

## Best Practices

- Always update Cilium tolerations before adding new node pool taints to prevent networking outages
- Use `cilium status --all-nodes` after any taint/toleration change to verify all nodes have Cilium running
- Test Cilium connectivity on new tainted nodes before scheduling production workloads
- Document all node pool taints and their corresponding Cilium tolerations in your infrastructure repository
- Monitor Cilium DaemonSet pod count; it should equal your total node count at all times

## Conclusion

Configuring node pool taints with Cilium requires ensuring that Cilium's DaemonSet can tolerate all custom taints applied to your node pools. By updating Cilium's Helm values with appropriate tolerations and applying node-pool-aware CiliumNetworkPolicies, you maintain consistent pod networking across all node types. Proactive toleration management prevents the silent networking failure that occurs when Cilium cannot start on newly tainted nodes.
