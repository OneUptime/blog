# How to Test Network Policies with Calico on Bare Metal with Binaries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Network Policies

Description: A guide to testing Calico network policy enforcement on bare metal Kubernetes clusters where Calico runs as native binaries.

---

## Introduction

Testing network policies in a binary-installed Calico environment follows the same logical workflow as container-based deployments, but with one additional verification layer: you can directly inspect the iptables rules that Felix programs on the host OS. This lets you confirm not just that policies have the intended effect on traffic, but that Felix is actually writing the rules you expect.

On bare metal servers with high-performance NICs, the eBPF dataplane can replace iptables entirely. In that case, you would inspect BPF program state instead of iptables. This guide covers both scenarios.

## Prerequisites

- Calico binary installation running on all bare metal nodes
- `kubectl` and `calicoctl` installed
- Root access to at least one worker node for iptables inspection

## Step 1: Deploy Test Workloads

```bash
kubectl create namespace bm-policy-test
kubectl run server --image=nginx --labels="app=server" -n bm-policy-test
kubectl expose pod server --port=80 -n bm-policy-test
kubectl run client-allowed --image=busybox --labels="app=client-allowed" -n bm-policy-test -- sleep 3600
kubectl run client-denied --image=busybox --labels="app=client-denied" -n bm-policy-test -- sleep 3600
```

## Step 2: Baseline Test (No Policy)

```bash
kubectl exec -n bm-policy-test client-allowed -- wget -qO- --timeout=5 http://server
kubectl exec -n bm-policy-test client-denied -- wget -qO- --timeout=5 http://server
```

Both should succeed.

## Step 3: Apply Default Deny

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: bm-policy-test
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

```bash
kubectl apply -f default-deny.yaml
```

## Step 4: Apply Selective Allow

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-client
  namespace: bm-policy-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: client-allowed
```

```bash
kubectl apply -f allow-client.yaml
kubectl exec -n bm-policy-test client-allowed -- wget -qO- --timeout=5 http://server
kubectl exec -n bm-policy-test client-denied -- wget -qO- --timeout=5 http://server || echo "Blocked"
```

## Step 5: Inspect iptables Rules on the Node

SSH into a worker node and inspect Felix's iptables rules.

```bash
iptables -L cali-pi-_bm-policy-test -n --line-numbers
iptables -L cali-po-_bm-policy-test -n --line-numbers
```

Look for rules corresponding to your policy's allow and deny logic.

## Step 6: Verify with calicoctl

```bash
calicoctl get networkpolicy -n bm-policy-test -o wide
calicoctl get workloadendpoint -n bm-policy-test
```

## Conclusion

Testing network policies in binary-installed Calico on bare metal combines the standard kubectl-level connectivity checks with OS-level iptables rule inspection. The ability to read Felix's iptables rules directly provides a level of policy verification not available in fully containerized environments and helps diagnose subtle policy misconfiguration at the dataplane level.
