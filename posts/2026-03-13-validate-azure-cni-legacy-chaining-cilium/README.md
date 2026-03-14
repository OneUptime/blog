# Validate Azure CNI Legacy Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, azure, cni, chaining, kubernetes, networking, legacy

Description: A guide to validating Azure CNI legacy chaining mode with Cilium, where Cilium acts as a chained CNI plugin for network policy enforcement while Azure CNI handles IP allocation.

---

## Introduction

Azure CNI legacy chaining is a deployment mode where Azure CNI remains responsible for pod IP assignment and network routing, while Cilium is chained as a secondary CNI plugin to provide eBPF-based network policy enforcement. This approach is used when teams want Cilium's policy capabilities without fully migrating to Cilium's IPAM.

In this chaining architecture, Cilium does not manage IP addresses—it intercepts traffic at the eBPF layer to enforce policies after Azure CNI has already set up the pod network interface. Validating this configuration requires checking both CNI plugins are correctly integrated and that policy enforcement works as expected.

This guide covers the validation steps specific to legacy chaining mode, including confirming the CNI configuration file, verifying Cilium's chained mode, and testing that policies are enforced while Azure CNI still owns IPAM.

## Prerequisites

- AKS or self-managed Kubernetes cluster with Azure CNI configured
- Cilium deployed in CNI chaining mode (not as the primary CNI)
- `kubectl` cluster-admin access
- `cilium` CLI installed

## Step 1: Verify CNI Chain Configuration

Confirm that the CNI configuration on nodes lists Azure CNI as the primary plugin with Cilium as a chained plugin.

```bash
# SSH to a node and inspect the CNI configuration directory
# The config file should show a "plugins" array with azure-vnet first, then cilium
cat /etc/cni/net.d/10-azure.conflist

# Alternatively, exec into a Cilium pod to check the installed config
kubectl -n kube-system exec -it $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) \
  -- cat /host/etc/cni/net.d/05-cilium.conf
```

## Step 2: Confirm Cilium Is Running in Chaining Mode

```bash
# Check the Cilium ConfigMap for chaining-mode setting
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.cni-chaining-mode}'

# Expected output: "azure-vnet"
# Also verify IPAM mode is set to delegate (azure CNI handles IPs)
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.ipam}'
```

## Step 3: Validate Cilium Agent Health

```bash
# Confirm all Cilium agents are running and healthy
cilium status --wait

# Check that endpoints are being registered by Cilium even though Azure CNI assigns IPs
kubectl get ciliumendpoints -A | head -20
```

## Step 4: Test Network Policy Enforcement

Deploy a CiliumNetworkPolicy and confirm it is enforced by Cilium's chained eBPF programs.

```yaml
# test-chain-policy.yaml - restrict ingress to labeled sources only
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: chain-ingress-test
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      role: server
  ingress:
    - fromEndpoints:
        - matchLabels:
            role: client
```

```bash
# Apply the policy and verify it is loaded
kubectl apply -f test-chain-policy.yaml

# Check that the policy appears in Cilium's store
cilium policy get

# Attempt connection from an unlabeled pod — should be denied
kubectl exec unlabeled-pod -- curl -m 3 http://<server-pod-ip>
```

## Step 5: Confirm Pod IP Assignment Is Still from Azure CNI

```bash
# Pod IPs should fall within the Azure VNet subnet range, not Cilium's PodCIDR
kubectl get pods -A -o wide | awk '{print $7}' | grep -v IP | sort -u

# Verify no Cilium-managed IP pools are active
kubectl get ippools 2>/dev/null || echo "No Cilium IP pools (expected in chaining mode)"
```

## Best Practices

- Ensure the Cilium version supports the Azure CNI chaining mode you are using
- In chaining mode, use `CiliumNetworkPolicy` rather than standard `NetworkPolicy` for full L7 support
- Monitor for CNI config conflicts — only one conflist file should be active in `/etc/cni/net.d/`
- Test after every node image upgrade since CNI configs can be overwritten
- Consider migrating to native Cilium IPAM for a simpler, fully-supported architecture long-term

## Conclusion

Validating Azure CNI legacy chaining with Cilium requires checking both layers: Azure CNI for IP allocation and Cilium for policy enforcement. By confirming the chain configuration, verifying IPAM delegation, and testing policy behavior, you can confidently run this hybrid setup while planning a potential future migration to native Cilium mode.
