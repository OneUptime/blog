# How to Test Network Policies with Calico on Single-Node Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, Single-Node, Security

Description: Test and validate Kubernetes network policies with Calico on a single-node Kubernetes cluster.

---

## Introduction

Single-node Kubernetes clusters are excellent environments for testing network policy logic because the simplified topology makes it easy to isolate policy behavior. All pods run on the same node, so any connectivity failures are definitively caused by network policies rather than routing issues.

Testing network policies on a single-node cluster is a common practice before deploying policies to multi-node production clusters. The policies are identical - Calico enforces them using the same iptables rules regardless of cluster topology. This makes single-node clusters reliable testbeds for network security configurations.

This guide walks through testing a comprehensive set of network policies on a single-node Kubernetes cluster with Calico, covering ingress control, egress restrictions, and Calico-specific global policies.

## Prerequisites

- Single-node Kubernetes with Calico installed
- kubectl and calicoctl configured

## Step 1: Set Up Test Environment

```bash
kubectl create namespace policy-demo
kubectl run server --image=nginx -n policy-demo --labels=role=server --port=80
kubectl expose pod server --port=80 -n policy-demo --name=server-svc
kubectl run client-allowed --image=busybox -n policy-demo \
  --labels=role=client -- sleep 3600
kubectl run client-blocked --image=busybox -n policy-demo \
  --labels=role=other -- sleep 3600
```

## Step 2: Verify Pre-Policy Connectivity

```bash
kubectl exec -n policy-demo client-allowed -- wget --timeout=5 -qO- http://server-svc
kubectl exec -n policy-demo client-blocked -- wget --timeout=5 -qO- http://server-svc
```

Both should succeed before policies are applied.

## Step 3: Apply Default Deny Ingress

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: policy-demo
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF
```

## Step 4: Verify Both Clients Are Blocked

```bash
kubectl exec -n policy-demo client-allowed -- wget --timeout=3 -qO- http://server-svc
kubectl exec -n policy-demo client-blocked -- wget --timeout=3 -qO- http://server-svc
```

Both should time out.

## Step 5: Allow Only the Designated Client

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-client
  namespace: policy-demo
spec:
  podSelector:
    matchLabels:
      role: server
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: client
    ports:
    - protocol: TCP
      port: 80
EOF
```

## Step 6: Verify Selective Access

```bash
# Should succeed
kubectl exec -n policy-demo client-allowed -- wget --timeout=5 -qO- http://server-svc

# Should still be blocked
kubectl exec -n policy-demo client-blocked -- wget --timeout=3 -qO- http://server-svc
```

## Step 7: Test Egress Control

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-egress
  namespace: policy-demo
spec:
  podSelector:
    matchLabels:
      role: client
  policyTypes:
  - Egress
  egress:
  - ports:
    - protocol: UDP
      port: 53
EOF
```

```bash
kubectl exec -n policy-demo client-allowed -- wget --timeout=3 -qO- http://server-svc
```

Should now be blocked even though ingress was allowed.

## Conclusion

You have tested a full set of Calico network policies on a single-node Kubernetes cluster, verifying default deny, selective allow, and egress control. The single-node environment provided clear, unambiguous policy testing results that can be directly applied to production multi-node clusters.
