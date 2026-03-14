# How to Test Network Policies with Calico on MicroK8s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Network Policy, MicroK8s, Security

Description: Learn how to test and validate Kubernetes network policies enforced by Calico on a MicroK8s cluster.

---

## Introduction

MicroK8s with Calico provides a convenient environment for testing network policies on a lightweight Kubernetes distribution. Calico enforces both standard Kubernetes NetworkPolicy and its own GlobalNetworkPolicy resources, giving MicroK8s users access to powerful network security primitives for development and testing.

Testing network policies on MicroK8s before production deployment catches policy errors that could expose services unintentionally or block legitimate traffic. MicroK8s's simplicity makes it easy to create test scenarios, validate policy behavior, and iterate quickly on policy definitions.

This guide walks through testing a layered network policy setup on MicroK8s, including default deny, pod-selector-based allow, and namespace-level isolation policies.

## Prerequisites

- MicroK8s with Calico enabled
- kubectl (via microk8s kubectl or alias)
- calicoctl installed

## Step 1: Create Test Resources

```bash
microk8s kubectl create namespace web-tier
microk8s kubectl create namespace db-tier
microk8s kubectl run web --image=busybox -n web-tier --labels=tier=web -- sleep 3600
microk8s kubectl run db --image=nginx -n db-tier --labels=tier=db --port=80
microk8s kubectl expose pod db --port=80 -n db-tier --name=db-svc
```

Label the namespaces:

```bash
microk8s kubectl label namespace web-tier name=web-tier
microk8s kubectl label namespace db-tier name=db-tier
```

## Step 2: Confirm Pre-Policy Connectivity

```bash
microk8s kubectl exec -n web-tier web -- wget --timeout=5 -qO- http://db-svc.db-tier.svc.cluster.local
```

Should succeed before any policies are applied.

## Step 3: Apply Default Deny to db-tier

```bash
microk8s kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: db-tier
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF
```

## Step 4: Verify the Deny is Enforced

```bash
microk8s kubectl exec -n web-tier web -- wget --timeout=5 -qO- http://db-svc.db-tier.svc.cluster.local
```

Should time out.

## Step 5: Allow Web Tier to DB Tier

```bash
microk8s kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-to-db
  namespace: db-tier
spec:
  podSelector:
    matchLabels:
      tier: db
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: web-tier
      podSelector:
        matchLabels:
          tier: web
    ports:
    - protocol: TCP
      port: 80
EOF
```

## Step 6: Verify Allow Policy

```bash
microk8s kubectl exec -n web-tier web -- wget -qO- http://db-svc.db-tier.svc.cluster.local
```

Should succeed now.

## Step 7: Test with Calico GlobalNetworkPolicy

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-ssh-everywhere
spec:
  selector: all()
  types:
  - Ingress
  ingress:
  - action: Deny
    protocol: TCP
    destination:
      ports: [22]
EOF
```

## Conclusion

You have tested Calico network policy enforcement on MicroK8s with default deny, namespace-scoped allow, and Calico GlobalNetworkPolicy scenarios. MicroK8s provides an efficient platform for iterating on network security configurations before production rollout.
