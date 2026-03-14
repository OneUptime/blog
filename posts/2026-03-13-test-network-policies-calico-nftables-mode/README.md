# How to Test Network Policies with Calico in nftables Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Nftables, Network Policies

Description: A guide to testing network policy enforcement when Calico is running in nftables mode.

---

## Introduction

Testing network policies in Calico's nftables mode verifies that Felix correctly translates Kubernetes NetworkPolicy and Calico CRD policies into nftables rules. The policy semantics are identical to iptables mode - the same policies produce the same traffic filtering behavior - but the underlying rules are stored in nftables tables rather than iptables chains.

The advantage of nftables for policy testing is atomic rule updates: when a policy is added or modified, nftables applies all changes in a single transaction. This means you should not observe partial policy application where some rules take effect before others, which can happen with iptables during complex policy updates.

## Prerequisites

- Calico running in nftables mode
- `kubectl` and `calicoctl` installed
- SSH access to nodes for nftables rule inspection

## Step 1: Create Test Namespaces and Workloads

```bash
kubectl create namespace nft-policy-test

kubectl run server --image=nginx --labels="app=server,env=test" -n nft-policy-test
kubectl expose pod server --port=80 -n nft-policy-test

kubectl run allowed-client --image=busybox --labels="app=allowed-client" -n nft-policy-test -- sleep 3600
kubectl run blocked-client --image=busybox --labels="app=blocked-client" -n nft-policy-test -- sleep 3600
```

## Step 2: Verify Baseline (No Policy)

```bash
SERVER_IP=$(kubectl get pod server -n nft-policy-test -o jsonpath='{.status.podIP}')
kubectl exec -n nft-policy-test allowed-client -- wget -qO- --timeout=5 http://$SERVER_IP
kubectl exec -n nft-policy-test blocked-client -- wget -qO- --timeout=5 http://$SERVER_IP
```

Both should succeed.

## Step 3: Apply Default Deny and Selective Allow

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: nft-policy-test
spec:
  podSelector: {}
  policyTypes: [Ingress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific
  namespace: nft-policy-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: allowed-client
```

```bash
kubectl apply -f nft-policies.yaml
```

## Step 4: Test Policy Enforcement

```bash
kubectl exec -n nft-policy-test allowed-client -- wget -qO- --timeout=5 http://$SERVER_IP
kubectl exec -n nft-policy-test blocked-client -- wget -qO- --timeout=5 http://$SERVER_IP || echo "Blocked by nftables"
```

## Step 5: Inspect nftables Rules for the Policy

```bash
# On the node where the server pod is running
SERVER_NODE=$(kubectl get pod server -n nft-policy-test -o jsonpath='{.spec.nodeName}')
# SSH into $SERVER_NODE
nft list table ip calico-filter | grep -A5 "nft-policy-test"
```

## Step 6: Test Atomic Policy Update

Add a new ingress rule and verify it takes effect atomically.

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: also-allow-blocked
  namespace: nft-policy-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: blocked-client
EOF

kubectl exec -n nft-policy-test blocked-client -- wget -qO- --timeout=5 http://$SERVER_IP
kubectl delete namespace nft-policy-test
```

## Conclusion

Testing network policies in Calico's nftables mode uses the same testing workflow as iptables mode, with the addition of nftables rule inspection using the `nft` command instead of `iptables -L`. The atomic rule update behavior of nftables means that complex policy changes are applied as a single transaction, reducing the risk of transient policy inconsistency during updates compared to the iptables mode.
