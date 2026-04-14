# How to Use Dapr with Kubernetes NetworkPolicies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, NetworkPolicy, Security, Microservice

Description: Configure Kubernetes NetworkPolicies to secure Dapr sidecar traffic, restrict inter-service communication, and limit external access in your cluster.

---

## Overview

Kubernetes NetworkPolicies control which pods can communicate with each other. When using Dapr, traffic flows through the sidecar proxy (port 3500 for HTTP, 50001 for gRPC) and through Dapr system services. Properly scoped NetworkPolicies prevent unauthorized lateral movement.

## How Dapr Uses the Network

Each application pod includes a Dapr sidecar (`daprd`) that:
- Listens on port 3500 (HTTP) and 50001 (gRPC)
- Communicates with the Dapr operator, placement, and sentry services in `dapr-system`
- Talks to other app sidecars for service invocation and pub/sub

## Step 1: Allow Dapr Sidecar-to-Sidecar Communication

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-sidecar
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - ports:
        - port: 3500
        - port: 50001
        - port: 50002
  egress:
    - ports:
        - port: 3500
        - port: 50001
        - port: 50002
```

## Step 2: Allow Access to Dapr System Services

Applications need to reach `dapr-system` for placement, sentry, and operator:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-system-egress
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: dapr-system
      ports:
        - port: 50005
        - port: 50001
        - port: 6500
```

## Step 3: Restrict App-to-App Traffic

Only allow specific services to call each other:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-checkout-to-inventory
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: inventory
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: checkout
      ports:
        - port: 3500
```

## Step 4: Default Deny Policy

Apply a default deny before adding exceptions:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

## Step 5: Verify Connectivity

```bash
kubectl exec -it deploy/checkout -- \
  curl http://localhost:3500/v1.0/invoke/inventory/method/items
```

Check that unauthorized calls fail:

```bash
kubectl exec -it deploy/payment -- \
  curl --max-time 3 http://localhost:3500/v1.0/invoke/admin/method/config
# Should time out
```

## Summary

Combining Dapr with Kubernetes NetworkPolicies provides defense-in-depth for microservice traffic. By allowing only necessary ports and pod selectors, you limit the blast radius of any compromised service. A default-deny policy paired with explicit allow rules is the recommended baseline for production Dapr deployments.
