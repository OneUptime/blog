# Troubleshoot Node Pool Taints with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF

Description: A guide to diagnosing and resolving Cilium issues caused by node pool taints, covering DaemonSet tolerations, taint-based pod scheduling, and Cilium initialization on tainted nodes.

---

## Introduction

Node pool taints are used to dedicate nodes for specific workloads (GPU nodes, spot instances, database nodes) by preventing general-purpose pods from scheduling on them. However, Kubernetes DaemonSets like Cilium must run on all nodes to provide networking - and if the Cilium DaemonSet lacks the correct tolerations for a node's taints, Cilium won't start on tainted nodes, leaving pods on those nodes without networking.

This is a particularly insidious failure mode because the tainted nodes may appear healthy in the cluster until workloads are scheduled on them and fail to get network interfaces. The nodes may show as `Ready` in kubectl while Cilium is not running on them.

This guide covers how to identify missing Cilium tolerations for node taints and how to configure them correctly.

## Prerequisites

- `kubectl` access to the cluster
- Cilium installed via Helm or operator
- Node pools with custom taints configured

## Step 1: Identify Nodes Missing Cilium DaemonSet Pods

When Cilium doesn't have tolerations for a node's taints, no Cilium pod is scheduled on that node. This is visible by comparing the node count to the Cilium pod count.

Find nodes without Cilium pods:

```bash
# Count total nodes vs Cilium pods
echo "Total nodes: $(kubectl get nodes --no-headers | wc -l)"
echo "Cilium pods: $(kubectl -n kube-system get pods -l k8s-app=cilium --no-headers | wc -l)"

# List nodes and find which ones don't have a Cilium pod
kubectl get nodes -o wide
kubectl -n kube-system get pods -l k8s-app=cilium -o wide

# Check which nodes are tainted
kubectl get nodes -o json | jq -r '.items[] | select(.spec.taints != null) | .metadata.name + ": " + (.spec.taints | map(.key + "=" + .value + ":" + .effect) | join(", "))'
```

## Step 2: Add Tolerations to the Cilium DaemonSet

Cilium's DaemonSet must tolerate all taints that exist on nodes in your cluster. The most common taints that require explicit tolerations are spot instance taints, GPU taints, and custom node pool taints.

Update Cilium Helm values to add tolerations:

```yaml
# cilium-values-tolerations.yaml - Add tolerations for custom node pool taints
tolerations:
  # Default Cilium tolerations that should always be present
  - key: node.kubernetes.io/not-ready
    operator: Exists
    effect: NoExecute
  - key: node.kubernetes.io/unreachable
    operator: Exists
    effect: NoExecute
  - key: node-role.kubernetes.io/control-plane
    operator: Exists
    effect: NoSchedule
  # Add custom tolerations for your node pool taints
  - key: "dedicated"
    operator: "Equal"
    value: "gpu"
    effect: "NoSchedule"
  - key: "cloud.google.com/gke-spot"
    operator: "Equal"
    value: "true"
    effect: "NoSchedule"
  - key: "eks.amazonaws.com/compute-type"
    operator: "Equal"
    value: "spot"
    effect: "NoSchedule"
```

```bash
# Apply updated Cilium Helm values with new tolerations
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  -f cilium-values-tolerations.yaml

# Verify Cilium pods now schedule on previously excluded nodes
kubectl -n kube-system get pods -l k8s-app=cilium -o wide
```

## Step 3: Verify Cilium Initializes Correctly on Tainted Nodes

After adding tolerations, Cilium pods should start on tainted nodes. Verify they initialize completely and not just start without errors.

Check Cilium initialization on tainted nodes:

```bash
# Get the Cilium pod for a specific tainted node
TAINTED_NODE=<node-name>
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium -o wide | grep $TAINTED_NODE | awk '{print $1}')

# Check the pod status - it should be Running, not Init or CrashLoopBackOff
kubectl -n kube-system describe pod $CILIUM_POD | grep -E "Status:|Ready:"

# Verify the Cilium agent is healthy on this node
kubectl -n kube-system exec $CILIUM_POD -- cilium status
```

## Step 4: Ensure Application Pods Can Schedule After Cilium Is Ready

Once Cilium is running on tainted nodes, application pods that tolerate the taint should be able to get networking. Validate this end-to-end.

Test pod networking on a tainted node:

```bash
# Schedule a test pod on a specific tainted node
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: taint-test
spec:
  nodeName: <tainted-node-name>
  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "gpu"
      effect: "NoSchedule"
  containers:
    - name: test
      image: nicolaka/netshoot
      command: ["sleep", "300"]
EOF

# Check that the pod gets an IP address
kubectl get pod taint-test -o wide

# Test connectivity from the tainted-node pod
kubectl exec taint-test -- ping -c 3 <other-pod-ip>
kubectl delete pod taint-test
```

## Best Practices

- Always add tolerations for all node pool taints to the Cilium DaemonSet when adding new node types
- Use `operator: Exists` tolerations in Cilium to tolerate any taint key regardless of value (useful for dynamically named taints)
- Add `effect: NoExecute` tolerations with a `tolerationSeconds` value to handle temporary node conditions gracefully
- Automate toleration updates as part of your node pool creation workflow (Terraform, Pulumi, etc.)
- Run `kubectl -n kube-system get pods -l k8s-app=cilium -o wide` as a post-provisioning check when adding new node pools

## Conclusion

Missing Cilium tolerations for node pool taints leave nodes without the CNI plugin, causing all pod networking to fail on those nodes. The fix is straightforward: add the appropriate tolerations to the Cilium Helm values and upgrade the DaemonSet. The key is identifying which nodes are affected early, before workloads are scheduled on them and fail silently due to missing network interfaces.
