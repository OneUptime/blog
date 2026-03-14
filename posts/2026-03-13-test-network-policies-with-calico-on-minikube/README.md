# How to Test Network Policies with Calico on Minikube

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, Minikube, Security

Description: Learn how to create and validate Kubernetes network policies enforced by Calico on a Minikube cluster.

---

## Introduction

Testing network policies on Minikube with Calico lets developers validate security configurations locally before applying them to production. Network policies define the rules for which pods can communicate with each other, and Calico is one of the few CNI plugins that enforces these rules at the kernel level via iptables or eBPF.

Minikube with Calico provides a convenient environment for iterating on network policy definitions. Because Calico supports both standard Kubernetes NetworkPolicy and its own extended GlobalNetworkPolicy CRDs, you can test both types of policies on Minikube to ensure they behave as expected.

This guide walks through a practical network policy testing scenario with a multi-tier application deployed on Minikube. You will test default deny, allow-by-selector, and namespace-scoped policies.

## Prerequisites

- Minikube running with Calico installed
- kubectl configured for Minikube
- Basic understanding of Kubernetes labels and selectors

## Step 1: Create Test Namespaces and Pods

```bash
kubectl create namespace frontend
kubectl create namespace backend
kubectl run client --image=busybox -n frontend --labels=role=client -- sleep 3600
kubectl run server --image=nginx -n backend --labels=role=server --port=80
kubectl expose pod server --port=80 -n backend --name=server-svc
```

## Step 2: Verify Initial Connectivity

```bash
kubectl exec -n frontend client -- wget --timeout=5 -qO- http://server-svc.backend.svc.cluster.local
```

This should succeed before any policies are applied.

## Step 3: Apply Default Deny Policy to Backend Namespace

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF
```

## Step 4: Verify Deny is Enforced

```bash
kubectl exec -n frontend client -- wget --timeout=5 -qO- http://server-svc.backend.svc.cluster.local
```

The request should time out, confirming Calico is enforcing the deny policy.

## Step 5: Apply Namespace-Scoped Allow Policy

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-ns
  namespace: backend
spec:
  podSelector:
    matchLabels:
      role: server
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: frontend
    ports:
    - protocol: TCP
      port: 80
EOF
```

## Step 6: Test the Allow Policy

```bash
kubectl exec -n frontend client -- wget -qO- http://server-svc.backend.svc.cluster.local
```

The frontend client should now reach the backend server successfully.

## Step 7: Test a Calico GlobalNetworkPolicy

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-all-egress
spec:
  selector: role == 'restricted'
  types:
  - Egress
  egress: []
EOF
```

## Conclusion

You have tested Kubernetes NetworkPolicy enforcement by Calico on Minikube, confirming that default deny, namespace-scoped allow, and Calico GlobalNetworkPolicy rules all behave correctly. Minikube with Calico is an effective local environment for iterating on network security configurations.
