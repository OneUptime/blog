# Validate Node Pool Taints with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: Learn how to validate that Cilium agent pods are correctly scheduled on tainted node pools and that networking is fully functional for workloads on specialized node groups.

---

## Introduction

Kubernetes node taints are commonly used to dedicate node pools to specific workloads - GPU nodes, high-memory nodes, or nodes with compliance requirements. When you add taints to node pools, you must ensure that the Cilium DaemonSet includes matching tolerations so that Cilium agents are scheduled on every tainted node.

A missing Cilium toleration means no CNI agent runs on the tainted node, causing pod networking to fail entirely for any workload scheduled there. This is a silent failure mode - pods may be stuck in `ContainerCreating` with cryptic CNI errors rather than an obvious scheduling failure.

This guide covers how to inspect Cilium DaemonSet tolerations, validate agent deployment on tainted nodes, and verify full networking functionality for workloads on specialized node pools.

## Prerequisites

- Kubernetes cluster with Cilium installed
- Node pools with taints applied
- `cilium` CLI installed
- `kubectl` with cluster admin access

## Step 1: Inspect Current Node Taints

Review which nodes have taints and what taint keys are in use.

```bash
# List all nodes with their taints
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Get detailed taint information for a specific node pool
kubectl get node <node-name> -o jsonpath='{.spec.taints}' | python3 -m json.tool

# Check all unique taint keys across the cluster
kubectl get nodes -o jsonpath='{range .items[*]}{.spec.taints[*].key}{"\n"}{end}' | sort | uniq
```

## Step 2: Check Cilium DaemonSet Tolerations

Verify that the Cilium DaemonSet has tolerations for all node pool taints.

```bash
# Inspect the current Cilium DaemonSet tolerations
kubectl get ds -n kube-system cilium -o jsonpath='{.spec.template.spec.tolerations}' | python3 -m json.tool

# Check if Cilium has a catch-all toleration for all taints
kubectl get ds -n kube-system cilium -o yaml | grep -A 10 tolerations
```

## Step 3: Verify Cilium Agent Is Running on All Nodes

Confirm that a Cilium pod is scheduled and running on every node including tainted ones.

```bash
# Compare the number of Cilium pods to total nodes
echo "Total nodes: $(kubectl get nodes --no-headers | wc -l)"
echo "Cilium pods: $(kubectl get pods -n kube-system -l k8s-app=cilium --no-headers | wc -l)"

# Identify any nodes missing a Cilium agent
kubectl get nodes -o name | while read node; do
  nodename=${node#node/}
  if ! kubectl get pods -n kube-system -l k8s-app=cilium --field-selector "spec.nodeName=$nodename" --no-headers | grep -q Running; then
    echo "MISSING Cilium agent on: $nodename"
  fi
done
```

## Step 4: Add Missing Tolerations to Cilium DaemonSet

If Cilium is missing from tainted nodes, patch the DaemonSet with the required tolerations.

```yaml
# cilium-tolerations-patch.yaml - add tolerations for custom node pool taints
spec:
  template:
    spec:
      tolerations:
      # Tolerate existing Cilium tolerations (keep them)
      - operator: Exists
        effect: NoSchedule
      - operator: Exists
        effect: NoExecute
      # Add toleration for GPU node pool taint
      - key: "nvidia.com/gpu"
        operator: "Exists"
        effect: "NoSchedule"
      # Add toleration for high-memory node pool taint
      - key: "workload-type"
        value: "high-memory"
        effect: "NoSchedule"
```

```bash
# Apply the toleration patch to the Cilium DaemonSet
kubectl patch ds -n kube-system cilium --patch-file cilium-tolerations-patch.yaml

# Watch rollout progress across all nodes including tainted ones
kubectl rollout status ds/cilium -n kube-system
```

## Step 5: Validate Networking on Tainted Node Workloads

Deploy a test pod with matching tolerations and verify network connectivity.

```bash
# Check cilium status on a specific tainted node
NODE=<tainted-node-name>
CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium --field-selector spec.nodeName=$NODE -o name)
kubectl exec -n kube-system $CILIUM_POD -- cilium status

# Run the Cilium connectivity test targeting the tainted node
cilium connectivity test --node-selector workload-type=high-memory
```

## Best Practices

- Use `operator: Exists` tolerations on Cilium DaemonSet to tolerate all taints automatically
- Always validate Cilium pod count matches node count after adding new node pools
- Test workload networking on new node pools before enabling autoscaling
- Include Cilium toleration validation in your node pool provisioning runbook
- Monitor DaemonSet desired vs ready counts in your observability stack

## Conclusion

Validating Cilium deployment on tainted node pools prevents silent networking failures for specialized workloads. By ensuring the Cilium DaemonSet has appropriate tolerations for every node pool taint and confirming agent health after provisioning, you guarantee that all nodes in your cluster have functioning CNI regardless of their specialization. Make toleration validation part of your node pool provisioning checklist.
