# Troubleshooting Unmanaged Pods After Cilium Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A guide to diagnosing and fixing issues with pods that were running before Cilium was installed or that were not properly picked up by Cilium after installation.

---

## Introduction

After installing Cilium on an existing Kubernetes cluster, some pods may become "unmanaged" - they are running but Cilium has not assigned them a security identity or taken over their network interface. This situation arises when pods were created before Cilium was installed, when pods use host networking, or when pods start before the Cilium agent is ready on a node.

Unmanaged pods are a significant security concern because they are not subject to Cilium's network policies. From a policy perspective, they are invisible to Cilium - ingress and egress rules selecting those pods are not applied. Identifying and resolving unmanaged pods is a critical post-installation step.

## Prerequisites

- Cilium installed on Kubernetes
- `kubectl` access
- Cilium CLI installed
- `jq` installed

## Step 1: Identify Unmanaged Pods

```bash
# List all endpoints managed by Cilium

kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list

# Compare with running pods
kubectl get pods --all-namespaces --field-selector=status.phase=Running

# Find pods NOT in Cilium's endpoint list
# Method: compare pod IPs, excluding host-network pods
CILIUM_IPS=$(kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list -o json | \
  jq -r '.[].status.networking.addressing[]?.ipv4 // empty' | sort)

ALL_POD_IPS=$(kubectl get pods --all-namespaces --field-selector=status.phase=Running -o json | \
  jq -r '.items[] | select(.spec.hostNetwork != true and .status.podIP != null) | .status.podIP' | sort)

# Show pods not managed by Cilium
comm -23 <(echo "$ALL_POD_IPS") <(echo "$CILIUM_IPS")
```

## Step 2: Understand Why Pods Are Unmanaged

```bash
# Check Cilium agent logs for relevant errors
kubectl logs -n kube-system ds/cilium | grep -i "unmanaged\|restore\|endpoint"

# Check if pod's network namespace is visible to Cilium
kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list | grep "restoring"

# Check CNI configuration
kubectl exec -n kube-system ds/cilium -- cat /etc/cni/net.d/05-cilium.conflist
```

## Step 3: Fix Unmanaged Pods by Restarting Them

The safest fix for most unmanaged pods is to restart them so they are created with Cilium's CNI plugin.

```bash
# Restart all pods in a namespace (rolling restart)
kubectl rollout restart deployment -n my-namespace

# Restart specific deployment
kubectl rollout restart deployment/my-app -n my-namespace

# For DaemonSets
kubectl rollout restart daemonset/my-ds -n my-namespace

# Verify pods are now managed by Cilium
kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list | grep "my-namespace"
```

## Step 4: Handle Critical System Pods

```bash
# For kube-system pods (be careful with critical components)
# Check which non-host-network system pods are unmanaged
kubectl get pods -n kube-system -o json | \
  jq -r '.items[] | select(.status.phase=="Running" and .spec.hostNetwork != true and .status.podIP != null) | "\(.metadata.name) \(.status.podIP)"' | \
  while read POD IP; do
    if ! kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list | grep -Fq "$IP"; then
      echo "Unmanaged: $POD ($IP)"
    fi
done
```

## Step 5: Verify Policy Enforcement After Fix

```bash
# After pods are restarted, verify Cilium is managing them
kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list

# Run connectivity test to verify networking works
cilium connectivity test

# Check no drops for legitimate traffic
kubectl exec -n kube-system ds/cilium -- cilium-dbg monitor --type drop
```

## Step 6: Prevent Future Unmanaged Pods

```bash
# Use the node.cilium.io/agent-not-ready taint during install or node pool bootstrap
# to prevent pods from starting before Cilium is ready

# Check all nodes have Cilium running
kubectl get pods -n kube-system -l k8s-app=cilium -o wide
# Every node should have a Cilium pod

# Check whether the Cilium agent-not-ready taint is present or being removed as expected
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Check DaemonSet tolerations
kubectl get ds -n kube-system cilium -o yaml | grep -A 20 "tolerations:"
```

## Conclusion

Unmanaged pods represent a security gap in your Cilium deployment because they are invisible to network policy enforcement. Identifying them via IP address comparison, understanding why they occurred (pre-existing pods, host networking, CNI installation order), and resolving non-host-network pods by restarting the affected pods is the standard remediation path. Preventing future occurrences requires ensuring all nodes run a Cilium agent before pods are scheduled on them.
