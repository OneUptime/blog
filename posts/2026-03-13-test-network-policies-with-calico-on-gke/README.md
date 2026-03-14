# How to Test Network Policies with Calico on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, GKE, Google Cloud, Security

Description: Test and validate Kubernetes network policies enforced by Calico on Google Kubernetes Engine clusters.

---

## Introduction

GKE with Calico provides Kubernetes NetworkPolicy enforcement at the node level through Calico's Felix agent. GKE's native network policy controller is disabled when Calico is enabled, making Calico the exclusive policy enforcement engine. Testing on GKE validates that network policies are correctly enforced across Google Cloud's VPC networking infrastructure.

GKE clusters are VPC-native, meaning pods receive IPs from VPC alias IP ranges. Network policies enforced by Calico work at the pod IP level using iptables on each GKE node. Cross-node traffic is routed through Google Cloud's VPC before being filtered by Calico on the destination node.

## Prerequisites

- GKE cluster with `--enable-network-policy` enabled
- kubectl configured for GKE
- calicoctl installed

## Step 1: Create Test Resources

```bash
kubectl create namespace gke-policy-test

kubectl run api-server --image=nginx -n gke-policy-test \
  --labels=role=api --port=8080
kubectl expose pod api-server --port=8080 -n gke-policy-test --name=api-svc

kubectl run allowed-client --image=busybox -n gke-policy-test \
  --labels=role=frontend -- sleep 3600
kubectl run denied-client --image=busybox -n gke-policy-test \
  --labels=role=other -- sleep 3600
```

## Step 2: Confirm Pre-Policy Access

```bash
kubectl exec -n gke-policy-test allowed-client -- \
  wget --timeout=5 -qO- http://api-svc:8080
kubectl exec -n gke-policy-test denied-client -- \
  wget --timeout=5 -qO- http://api-svc:8080
```

Both should succeed before policies are applied.

## Step 3: Apply Default Deny for the Namespace

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: gke-policy-test
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF
```

## Step 4: Allow DNS Egress

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: gke-policy-test
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 5: Verify Both Clients Are Blocked

```bash
kubectl exec -n gke-policy-test allowed-client -- \
  wget --timeout=5 -qO- http://api-svc:8080
```

Should time out.

## Step 6: Allow Frontend Role Access

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend
  namespace: gke-policy-test
spec:
  podSelector:
    matchLabels:
      role: api
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 8080
EOF
```

Also allow frontend egress:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-egress
  namespace: gke-policy-test
spec:
  podSelector:
    matchLabels:
      role: frontend
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          role: api
    ports:
    - protocol: TCP
      port: 8080
  - ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 7: Verify Selective Access

```bash
# allowed-client (role=frontend) should succeed
kubectl exec -n gke-policy-test allowed-client -- \
  wget -qO- http://api-svc:8080

# denied-client (role=other) should still be blocked
kubectl exec -n gke-policy-test denied-client -- \
  wget --timeout=5 -qO- http://api-svc:8080
```

## Step 8: Test Cross-Node Policy (Multi-Zone GKE)

For multi-zone GKE clusters, create pods in different zones and verify cross-zone policy enforcement:

```bash
kubectl run zone-client --image=busybox -n gke-policy-test \
  --labels=role=frontend \
  --overrides='{"spec":{"nodeSelector":{"topology.kubernetes.io/zone":"us-central1-b"}}}' \
  -- sleep 3600
```

## Conclusion

You have tested Calico network policy enforcement on GKE, validating default deny, DNS allow, selective ingress, and selective egress policies. GKE's VPC-native networking cooperates with Calico's Felix agent to enforce policies on all pod traffic, including cross-node and cross-zone traffic within the VPC.
