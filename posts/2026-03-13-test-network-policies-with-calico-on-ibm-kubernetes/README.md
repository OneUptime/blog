# How to Test Network Policies with Calico on IBM Kubernetes Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, IBM Kubernetes Service, Security

Description: Test and validate Kubernetes and Calico network policies on IBM Kubernetes Service clusters.

---

## Introduction

IBM Kubernetes Service includes Calico networking, giving IKS clusters access to both standard Kubernetes NetworkPolicy and Calico's extended policy resources. Calico also supports tiered policies, which allow you to assign priorities to policy tiers for ordered evaluation - a feature particularly useful in enterprise multi-team environments.

Testing network policies on IKS should cover both standard Kubernetes NetworkPolicy resources and Calico GlobalNetworkPolicy resources. IBM's IKS documentation recommends Kubernetes NetworkPolicy for pod-to-pod application isolation, with Calico policies available for advanced scenarios.

## Prerequisites

- IKS cluster with Calico
- kubectl configured for IKS
- calicoctl configured for IKS cluster

## Step 1: Set Up Test Environment

```bash
kubectl create namespace iks-app
kubectl create namespace iks-data
kubectl label namespace iks-app purpose=application
kubectl label namespace iks-data purpose=datastore

kubectl run app --image=busybox -n iks-app --labels=tier=app -- sleep 3600
kubectl run db --image=nginx -n iks-data --labels=tier=db --port=80
kubectl expose pod db --port=80 -n iks-data --name=db-svc
```

## Step 2: Verify Pre-Policy Connectivity

```bash
kubectl exec -n iks-app app -- \
  wget --timeout=5 -qO- http://db-svc.iks-data.svc.cluster.local:80
```

## Step 3: Apply Calico GlobalNetworkPolicy Default Deny

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: iks-default-deny
spec:
  namespaceSelector: kubernetes.io/metadata.name not in {"calico-system", "kube-public", "kube-system", "tigera-operator"}
  types:
  - Ingress
  - Egress
  egress:
  - action: Allow
    protocol: UDP
    destination:
      ports: [53]
  - action: Allow
    protocol: TCP
    destination:
      ports: [53]
EOF
```

## Step 4: Verify GlobalNetworkPolicy Deny

```bash
kubectl exec -n iks-app app -- \
  wget --timeout=5 -qO- http://db-svc.iks-data.svc.cluster.local:80
```

Should time out.

## Step 5: Allow App to DB with NetworkPolicy

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-app-to-db
  namespace: iks-data
spec:
  podSelector:
    matchLabels:
      tier: db
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          purpose: application
    ports:
    - protocol: TCP
      port: 80
EOF
```

Also add egress for app tier:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-egress-to-db
  namespace: iks-app
spec:
  podSelector:
    matchLabels:
      tier: app
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          purpose: datastore
    ports:
    - protocol: TCP
      port: 80
  - ports:
    - protocol: UDP
      port: 53
EOF
```

## Step 6: Verify Selective Access

```bash
kubectl exec -n iks-app app -- \
  wget -qO- http://db-svc.iks-data.svc.cluster.local:80
```

Should now succeed.

## Step 7: Test IBM IKS Pre-installed Calico Policies

IKS pre-installs some Calico GlobalNetworkPolicies. View them:

```bash
calicoctl get globalnetworkpolicy
```

Understand which policies IBM manages versus which you manage.

## Conclusion

You have tested Calico network policies on IKS using both Calico GlobalNetworkPolicy for cluster-wide defaults and Kubernetes NetworkPolicy for application-level isolation. IKS's full Calico integration gives you access to the complete Calico policy model including tiered policies and host endpoint policies that are not available on managed providers using policy-only mode.
