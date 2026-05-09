# How to Test Network Policies with Calico on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, AKS, Azure, Security

Description: Test and validate Kubernetes network policies enforced by Calico on Azure Kubernetes Service.

---

## Introduction

AKS with Calico network policies provides enterprise-grade network segmentation for Azure workloads. Testing network policies on AKS verifies that Calico's Felix agent correctly enforces NetworkPolicy resources within the Azure networking model. In AKS clusters that use Azure CNI with Calico, Azure CNI handles pod networking while Calico is used for network policy enforcement.

Testing on AKS should cover the same scenarios as other platforms: default deny, selective allow by pod selector, namespace-scoped policies, and ingress/egress control. AKS-specific testing should also verify that Azure Load Balancer traffic reaches only the pods and ports that policies allow.

This guide demonstrates comprehensive network policy testing on AKS with Calico.

## Prerequisites

- AKS cluster with Calico network policies enabled
- kubectl with AKS credentials
- At least 2 nodes for cross-node tests

## Step 1: Deploy Multi-Tier Test Application

```bash
kubectl create namespace aks-policy-test

kubectl run frontend --image=busybox -n aks-policy-test \
  --labels=tier=frontend -- sleep 3600
kubectl run backend --image=nginx -n aks-policy-test \
  --labels=tier=backend --port=80
kubectl expose pod backend --port=80 -n aks-policy-test --name=backend-svc
kubectl run db-sim --image=nginx -n aks-policy-test \
  --labels=tier=database --port=80
kubectl expose pod db-sim --port=80 -n aks-policy-test --name=db-sim
```

## Step 2: Confirm Pre-Policy Connectivity

```bash
kubectl exec -n aks-policy-test frontend -- \
  wget -T 5 -qO- http://backend-svc
```

Should succeed.

## Step 3: Apply Default Deny for the Namespace

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: aks-policy-test
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
  name: allow-dns-egress
  namespace: aks-policy-test
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

## Step 5: Allow Frontend to Backend

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-to-backend
  namespace: aks-policy-test
spec:
  podSelector:
    matchLabels:
      tier: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 80
EOF
```

Also add egress for frontend:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-egress
  namespace: aks-policy-test
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 80
  - ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 6: Verify Policies

```bash
# Should succeed

kubectl exec -n aks-policy-test frontend -- \
  wget -qO- http://backend-svc

# Should fail (no policy allows db-sim access)
kubectl exec -n aks-policy-test frontend -- \
  wget -T 3 -O- http://db-sim.aks-policy-test.svc.cluster.local
```

## Step 7: Test Azure Load Balancer Ingress

```bash
kubectl expose pod backend --port=80 --type=LoadBalancer \
  -n aks-policy-test --name=backend-lb
kubectl get svc backend-lb -n aks-policy-test -w
```

Once the external IP is assigned, test that the load balancer traffic reaches the backend only when the backend ingress policy allows it. Source IP handling for external Service traffic can vary depending on the service configuration and cloud networking path.

## Conclusion

You have tested Calico network policies on AKS, validating default deny, selective allow by tier, and DNS egress policies. In Azure CNI clusters, Calico enforces network policies while Azure CNI handles the underlying pod networking and Azure Load Balancer provides external access.
