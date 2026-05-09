# Troubleshoot Node Pool Taints with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A guide to diagnosing and resolving Cilium issues caused by node pool taints, covering DaemonSet tolerations, taint-based pod scheduling, and Cilium initialization on tainted nodes.

---

## Introduction

Node pool taints are used to dedicate nodes for specific workloads (GPU nodes, spot instances, database nodes) by preventing general-purpose pods from scheduling on them. However, Kubernetes DaemonSets like Cilium must run on all nodes to provide networking - and if the Cilium DaemonSet's tolerations have been narrowed or overridden so they no longer match a node's taints, Cilium won't start on those tainted nodes, leaving pods on those nodes without networking.

This is a particularly insidious failure mode because the tainted nodes may appear healthy in the cluster until workloads are scheduled on them and fail to get network interfaces. The nodes may show as `Ready` in kubectl while Cilium is not running on them.

This guide covers how to identify missing Cilium tolerations for node taints and how to configure them correctly.

## Prerequisites

- `kubectl` access to the cluster
- Cilium installed via Helm or the Cilium CLI
- Node pools with custom taints configured

## Step 1: Identify Nodes Missing Cilium DaemonSet Pods

When Cilium doesn't have tolerations for a node's taints, no Cilium pod is scheduled on that node. This is visible by comparing the eligible node count to the Cilium pod count.

Find nodes without Cilium pods:

```bash
# Count total nodes vs Cilium pods

echo "Total nodes: $(kubectl get nodes --no-headers | wc -l)"
echo "Cilium pods: $(kubectl -n kube-system get pods -l k8s-app=cilium --no-headers | wc -l)"

# List nodes and find which ones don't have a Cilium pod
kubectl get nodes -o wide
kubectl -n kube-system get pods -l k8s-app=cilium -o wide

# Check which nodes are tainted
kubectl get nodes -o json | jq -r '.items[] | select(.spec.taints != null) | .metadata.name + ": " + (.spec.taints | map(.key + (if .value then "=" + .value else "" end) + ":" + .effect) | join(", "))'
```

## Step 2: Add Tolerations to the Cilium DaemonSet

Cilium's DaemonSet must tolerate the taints on every node where the agent should run. The official Helm chart's default agent toleration is `operator: Exists`, which matches all taint keys and effects; problems usually appear when that default has been replaced by a narrower toleration list.

Update Cilium Helm values to restore a broad toleration, or add the specific tolerations required by your node pools:

```yaml
# cilium-values-tolerations.yaml - Restore the default broad Cilium agent toleration
tolerations:
  # Default Cilium Helm behavior: tolerate all taints so the agent can run on every node
  - operator: "Exists"
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
CILIUM_POD=$(kubectl -n kube-system get pod -l k8s-app=cilium --field-selector spec.nodeName="$TAINTED_NODE" -o jsonpath='{.items[0].metadata.name}')

# Check the pod status - it should be Running, not Init or CrashLoopBackOff
kubectl -n kube-system describe pod $CILIUM_POD | grep -E "Status:|Ready:"

# Verify the Cilium agent is healthy on this node
kubectl -n kube-system exec $CILIUM_POD -- cilium-dbg status
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
  nodeSelector:
    kubernetes.io/hostname: <tainted-node-name>
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

- Keep the default Cilium Helm agent toleration (`operator: Exists`) unless you have a policy reason to restrict where the agent can run
- If you replace the broad default, add explicit tolerations for all node pool taints to the Cilium DaemonSet when adding new node types
- Use `operator: Exists` tolerations in Cilium to tolerate any taint key regardless of value (useful for dynamically named taints)
- Avoid adding `tolerationSeconds` to Cilium's required `NoExecute` tolerations unless you explicitly want the agent evicted from unhealthy or unreachable nodes
- Automate toleration updates as part of your node pool creation workflow (Terraform, Pulumi, etc.)
- Run `kubectl -n kube-system get pods -l k8s-app=cilium -o wide` as a post-provisioning check when adding new node pools

## Conclusion

Missing Cilium tolerations for node pool taints leave nodes without the CNI plugin, causing all pod networking to fail on those nodes. The fix is straightforward: add the appropriate tolerations to the Cilium Helm values and upgrade the DaemonSet. The key is identifying which nodes are affected early, before workloads are scheduled on them and fail silently due to missing network interfaces.
