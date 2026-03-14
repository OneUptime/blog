# How to Verify Pod Networking with Calico in nftables Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Nftables, Verification

Description: A guide to verifying Calico pod networking when running with the nftables dataplane backend.

---

## Introduction

Verifying Calico in nftables mode adds nftables-specific verification steps to the standard pod networking checks. Instead of inspecting iptables chains and rules, you inspect nftables tables and rules using the `nft` command. The connectivity tests and IPAM checks are identical to iptables mode, but the dataplane inspection requires nftables tools.

One important verification is confirming that there are no conflicting iptables rules being applied alongside nftables, which can happen on systems where multiple tools (kube-proxy in iptables mode, other CNI remnants) are writing to both frameworks simultaneously.

## Prerequisites

- Calico running in nftables mode on a Kubernetes cluster
- `kubectl` and `calicoctl` installed
- `nft` command available on nodes

## Step 1: Verify Felix Is Using nftables

```bash
calicoctl get felixconfiguration default -o yaml | grep iptablesBackend
```

Should show `iptablesBackend: nft`.

## Step 2: Check nftables Tables on a Node

```bash
# SSH into a worker node
nft list tables
```

Expected output:

```plaintext
table ip calico-filter
table ip calico-nat
table ip calico-mangle
table ip calico-raw
```

If these tables are absent, Felix is not running in nftables mode on this node.

## Step 3: Check nftables Rules

```bash
nft list table ip calico-filter | head -30
nft list table ip calico-nat | head -20
```

Policy rules should be present in `calico-filter`. NAT rules for pod egress should be in `calico-nat`.

## Step 4: Verify No iptables Conflicts

```bash
# Check if legacy iptables has Calico chains (should be empty in nftables mode)
iptables-legacy -L | grep -c "cali-"
```

This should return 0 in a pure nftables mode deployment.

## Step 5: Test Pod-to-Pod Connectivity

```bash
kubectl run pod-a --image=busybox -- sleep 300
kubectl run pod-b --image=busybox -- sleep 300
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c5 $POD_B_IP
```

## Step 6: Test Network Policy Enforcement in nftables Mode

```bash
kubectl create namespace nft-verify
kubectl run server --image=nginx --labels="app=server" -n nft-verify
kubectl expose pod server --port=80 -n nft-verify
kubectl run client --image=busybox --labels="app=client" -n nft-verify -- sleep 300

# Apply default deny
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: nft-verify
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

kubectl exec -n nft-verify client -- wget -qO- --timeout=5 http://server || echo "Blocked by nftables"

# Verify the nftables rule for the policy on the node
nft list table ip calico-filter | grep drop | head -5
kubectl delete namespace nft-verify
```

## Conclusion

Verifying Calico in nftables mode requires inspecting nftables tables (`nft list table`) instead of iptables chains, confirming no legacy iptables conflicts, and testing standard pod connectivity and network policy enforcement. The `nft` command provides the same diagnostic insight as `iptables -L` but for the modern nftables framework.
