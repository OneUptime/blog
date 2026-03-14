# How to Test Network Policies with Calico on Kind

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, Kind, Security

Description: Learn how to create and test Kubernetes network policies enforced by Calico on a Kind cluster.

---

## Introduction

One of Calico's primary strengths is its robust support for Kubernetes NetworkPolicy resources and its own extended GlobalNetworkPolicy. Testing network policies on Kind before deploying to production prevents security misconfigurations from reaching live environments. Kind with Calico provides a cost-effective local environment for this purpose.

Kubernetes NetworkPolicy resources let you define which pods can communicate with each other and with external endpoints. Without a CNI that enforces policies - such as Calico - these resources have no effect. Calico translates NetworkPolicy objects into iptables or eBPF rules applied at the kernel level on each node.

This guide walks through creating a realistic policy scenario: a frontend pod that can reach a backend pod, while all other traffic to the backend is denied. You will then verify that the policy is enforced correctly.

## Prerequisites

- Kind cluster with Calico installed and verified
- kubectl configured for the Kind cluster
- calicoctl installed (optional, for Calico-specific policies)

## Step 1: Deploy the Test Application

Create namespaces and pods representing frontend and backend tiers:

```bash
kubectl create namespace policy-test
kubectl run frontend --image=busybox -n policy-test --labels=app=frontend -- sleep 3600
kubectl run backend --image=nginx -n policy-test --labels=app=backend --port=80
kubectl expose pod backend --port=80 -n policy-test --name=backend-svc
```

## Step 2: Confirm Connectivity Without Policy

Before applying any policy, both pods should be able to reach the backend:

```bash
kubectl exec -n policy-test frontend -- wget -qO- http://backend-svc
```

Verify this returns the nginx welcome page.

## Step 3: Apply a Default Deny Policy

Block all ingress to the backend namespace:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: policy-test
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF
```

## Step 4: Verify the Deny Policy

Test that the frontend can no longer reach the backend:

```bash
kubectl exec -n policy-test frontend -- wget --timeout=5 -qO- http://backend-svc
```

The connection should time out, confirming the deny policy is enforced.

## Step 5: Apply an Allow Policy for Frontend

Allow only the frontend pod to reach the backend:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: policy-test
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 80
EOF
```

## Step 6: Verify the Allow Policy

```bash
kubectl exec -n policy-test frontend -- wget -qO- http://backend-svc
```

The frontend should succeed while any other pod attempting to reach backend remains blocked.

## Conclusion

You have tested Calico network policy enforcement on Kind by deploying a layered deny-then-allow policy scenario. Calico correctly enforced both the default deny and the selective allow rule, demonstrating that your Kind environment is a reliable testbed for production network security policies.
