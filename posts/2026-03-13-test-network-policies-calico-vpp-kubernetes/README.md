# How to Test Network Policies with Calico VPP on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, Network Policies

Description: A guide to testing that Calico network policies are correctly enforced when using the VPP high-performance data plane.

---

## Introduction

Network policy enforcement in Calico VPP works differently than in the standard iptables or eBPF dataplanes. VPP implements policy enforcement in user space through Calico's VPP policy plugin rather than Linux kernel iptables or BPF programs. Testing policies with the VPP data plane requires verifying both the expected connectivity behavior and that VPP's policy state contains the correct rules.

For ordinary pod network policies, the same Kubernetes NetworkPolicy and Calico NetworkPolicy/GlobalNetworkPolicy resources apply. The difference is in how Felix programs the rules and where to look when debugging policy enforcement issues.

## Prerequisites

- Calico VPP running on a Kubernetes cluster
- `kubectl` installed
- `calico-vpp-node` pods running

## Step 1: Deploy Test Workloads

```bash
kubectl create namespace vpp-policy-test
kubectl run server --image=nginx --labels="app=server" -n vpp-policy-test
kubectl expose pod server --port=80 -n vpp-policy-test
kubectl run allowed-client --image=busybox --labels="app=allowed" -n vpp-policy-test -- sleep 3600
kubectl run denied-client --image=busybox --labels="app=denied" -n vpp-policy-test -- sleep 3600
```

## Step 2: Baseline Connectivity (No Policy)

```bash
SERVER_IP=$(kubectl get pod server -n vpp-policy-test -o jsonpath='{.status.podIP}')
kubectl exec -n vpp-policy-test allowed-client -- wget -qO- -T 5 http://$SERVER_IP
kubectl exec -n vpp-policy-test denied-client -- wget -qO- -T 5 http://$SERVER_IP
```

## Step 3: Apply Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-only-allowed-client
  namespace: vpp-policy-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: allowed
  policyTypes:
    - Ingress
```

```bash
kubectl apply -f allow-only.yaml
```

## Step 4: Test Policy Enforcement

```bash
kubectl exec -n vpp-policy-test allowed-client -- wget -qO- -T 5 http://$SERVER_IP
kubectl exec -n vpp-policy-test denied-client -- wget -qO- -T 5 http://$SERVER_IP || echo "Blocked by VPP policy"
```

## Step 5: Verify VPP Policy State

```bash
kubectl exec -n calico-vpp-dataplane <calico-vpp-node-pod-on-server-node> -c vpp -- vppctl show acl-plugin custom-access-policies
```

Policy entries corresponding to your NetworkPolicy should be visible.

## Step 6: Measure Policy Enforcement Latency

VPP's user-space policy enforcement is designed for high throughput, but you should measure the impact in your own cluster.

```bash
kubectl exec -n vpp-policy-test allowed-client -- sh -c \
  "time wget -qO- -T 5 http://$SERVER_IP > /dev/null"
```

## Conclusion

Testing network policies with Calico VPP follows the standard Calico testing workflow, with the addition of VPP policy state inspection to verify that policy rules are correctly programmed in VPP's data plane. VPP's user-space policy enforcement is built for throughput-sensitive workloads, but benchmark your own traffic patterns before assuming its latency impact.
