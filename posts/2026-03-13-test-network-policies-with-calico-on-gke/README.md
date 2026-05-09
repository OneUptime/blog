# How to Test Network Policies with Calico on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, GKE, Google Cloud, Security

Description: Test and validate Kubernetes network policies enforced by Calico on Google Kubernetes Engine clusters.

---

## Introduction

GKE Standard clusters that do not use GKE Dataplane V2 can use Calico for Kubernetes NetworkPolicy enforcement. Testing on GKE validates that network policies are correctly enforced across Google Cloud's VPC networking infrastructure.

In VPC-native GKE clusters, pods receive IPs from VPC alias IP ranges. Network policies enforced by Calico work at the pod IP level using iptables on GKE nodes. Cross-node traffic is routed through Google Cloud's VPC, with Calico applying egress policy on the source node and ingress policy on the destination node.

## Prerequisites

- GKE Standard cluster with `--enable-network-policy` enabled and not using GKE Dataplane V2
- kubectl configured for GKE

## Step 1: Create Test Resources

```bash
kubectl create namespace gke-policy-test

kubectl run api-server --image=nginx -n gke-policy-test \
  --labels=role=api --port=80
kubectl expose pod api-server --port=80 -n gke-policy-test --name=api-svc

kubectl run allowed-client --image=busybox -n gke-policy-test \
  --labels=role=frontend -- sleep 3600
kubectl run denied-client --image=busybox -n gke-policy-test \
  --labels=role=other -- sleep 3600
```

## Step 2: Confirm Pre-Policy Access

```bash
kubectl exec -n gke-policy-test allowed-client -- \
  wget -T 5 -qO- http://api-svc:80
kubectl exec -n gke-policy-test denied-client -- \
  wget -T 5 -qO- http://api-svc:80
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
    - protocol: TCP
      port: 53
EOF
```

## Step 5: Verify Both Clients Are Blocked

```bash
kubectl exec -n gke-policy-test allowed-client -- \
  wget -T 5 -qO- http://api-svc:80
kubectl exec -n gke-policy-test denied-client -- \
  wget -T 5 -qO- http://api-svc:80
```

Both should time out.

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
      port: 80
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
      port: 80
  - ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
EOF
```

## Step 7: Verify Selective Access

```bash
# allowed-client (role=frontend) should succeed

kubectl exec -n gke-policy-test allowed-client -- \
  wget -qO- http://api-svc:80

# denied-client (role=other) should still be blocked
kubectl exec -n gke-policy-test denied-client -- \
  wget -T 5 -qO- http://api-svc:80
```

## Step 8: Test Cross-Node Policy (Multi-Zone GKE)

For multi-zone GKE clusters, set `ZONE` to a zone where your cluster has nodes, create pods in different zones, and verify cross-zone policy enforcement:

```bash
ZONE=us-central1-b
kubectl run zone-client --image=busybox -n gke-policy-test \
  --labels=role=frontend \
  --overrides="{\"spec\":{\"nodeSelector\":{\"topology.kubernetes.io/zone\":\"${ZONE}\"}}}" \
  -- sleep 3600
```

## Conclusion

You have tested Calico network policy enforcement on GKE, validating default deny, DNS allow, selective ingress, and selective egress policies. In VPC-native clusters, GKE networking cooperates with Calico's Felix agent to enforce policies on pod traffic, including cross-node and cross-zone traffic within the VPC.
