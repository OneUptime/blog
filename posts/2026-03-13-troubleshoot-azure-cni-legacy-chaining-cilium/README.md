# Troubleshoot Azure CNI Legacy Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: Troubleshooting guide for diagnosing issues specific to the legacy Azure CNI chaining mode with Cilium, covering common failure patterns and their resolutions.

---

## Introduction

The legacy Azure CNI chaining mode with Cilium is an older configuration pattern where Cilium operates as a chained CNI plugin after Azure CNI handles IP allocation. While superseded by newer integration modes, many clusters still run this configuration, and it presents unique troubleshooting challenges.

In legacy chaining mode, Cilium inserts eBPF programs after Azure CNI has attached the network interface to the pod. Issues in this mode often involve the ordering of CNI operations, eBPF program attachment failures, and conflicts between Azure CNI's IP routes and Cilium's policy enforcement.

This guide covers diagnostics specific to legacy chaining mode, helping you identify and resolve issues that arise from the interaction between Azure CNI and Cilium in this configuration.

## Prerequisites

- AKS cluster with legacy Azure CNI chaining mode configured
- `kubectl` with cluster admin access
- `cilium` CLI installed
- Node-level access via `kubectl debug`

## Step 1: Confirm Legacy Chaining Mode Configuration

Verify the cluster is using the legacy chaining mode.

```bash
# Check the CNI configuration on a node for the chained plugin setup
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /etc/cni/net.d/10-azure.conflist

# In legacy chaining mode, you should see Cilium as a chained plugin
# within the Azure CNI conflist

# Check Cilium's ConfigMap for chaining mode
kubectl get configmap cilium-config -n kube-system -o yaml | \
  grep -E "chaining-mode|azure"
```

## Step 2: Diagnose Pod Startup Failures

Investigate pods that fail during network setup in chained mode.

```bash
# Check pod events for CNI-related errors
kubectl describe pod <failing-pod> | grep -A10 Events

# Look for errors in the kubelet logs on the affected node
kubectl debug node/<node-name> -it --image=ubuntu -- \
  journalctl -u kubelet | grep -E "CNI|network" | tail -50

# Check Cilium logs for chaining-related errors
kubectl logs -n kube-system <cilium-pod-on-node> | grep -E "chain|azure|ERROR"
```

## Step 3: Validate eBPF Program Attachment

Confirm Cilium eBPF programs are attached after Azure CNI runs.

```bash
# Check that tc programs are attached to the pod's veth interface
NODE_CILIUM_POD=$(kubectl get pod -n kube-system -l k8s-app=cilium \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

# List attached tc programs on a pod's veth interface
kubectl debug node/<node-name> -it --image=ubuntu -- \
  tc filter show dev <veth-interface> ingress

# Verify the Cilium endpoint is registered for the pod
kubectl exec -n kube-system ${NODE_CILIUM_POD} -- cilium endpoint list
```

## Step 4: Check Azure CNI and Cilium Route Conflicts

Legacy chaining can produce routing conflicts between Azure CNI routes and Cilium routes.

```bash
# Check the routing table on the node for conflicts
kubectl debug node/<node-name> -it --image=ubuntu -- ip route show

# Look for duplicate or conflicting routes to pod CIDRs
kubectl debug node/<node-name> -it --image=ubuntu -- \
  ip route show | grep -E "169.254|10.244"

# Check Cilium's internal route view
kubectl exec -n kube-system ${NODE_CILIUM_POD} -- cilium bpf ipcache list
```

## Step 5: Test Network Policy in Legacy Chaining Mode

Validate that Cilium network policies are enforced correctly in the chained configuration.

```bash
# Apply a test network policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-deny-all
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: test-target
  policyTypes:
  - Ingress
EOF

# Monitor for policy drops using Cilium
kubectl exec -n kube-system ${NODE_CILIUM_POD} -- \
  cilium monitor --type drop -n default
```

## Best Practices

- Consider migrating from legacy chaining mode to Azure CNI Powered by Cilium for improved compatibility
- Keep detailed notes on the exact CNI configuration file format for your AKS version
- Always check CNI conflist syntax after AKS node pool upgrades, as the format can change
- Monitor kubelet logs proactively for CNI errors, as they are not always surfaced in pod events
- Test network policies with simple allow/deny scenarios after any configuration change

## Conclusion

Legacy Azure CNI chaining with Cilium has specific failure modes that require targeted diagnostic procedures. By systematically checking the chaining configuration, eBPF program attachment, routing consistency, and policy enforcement, you can identify and resolve issues in this configuration. When possible, plan a migration to newer Cilium integration modes for better long-term support.
