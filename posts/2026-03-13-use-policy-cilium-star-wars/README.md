# How to Write and Apply CiliumNetworkPolicy in the Star Wars Demo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EBPF, Network Policy, Star Wars Demo

Description: A hands-on guide to writing, applying, and iterating on CiliumNetworkPolicy resources using the Star Wars demo as a learning environment.

---

## Introduction

Writing `CiliumNetworkPolicy` is a skill that develops through practice. The Star Wars demo provides the ideal sandbox: a small, understandable application where policy changes have immediate, visible effects. This guide takes you through writing policies from scratch, applying them, observing their effects, and refining them - the same workflow you will use in production.

The key habit to develop is writing policies incrementally. Start with L3/L4 to establish connection-level boundaries, observe whether legitimate traffic still flows, then add L7 rules to restrict specific HTTP methods and paths. Each layer of policy adds security but also adds risk of breaking legitimate traffic - always verify after each change.

This guide also introduces the `cilium policy trace` command, which is your most important tool for verifying policies before applying them. It allows you to predict whether Cilium will allow or deny a specific traffic flow based on the current policy set.

## Prerequisites

- Star Wars demo deployed
- Cilium CLI installed
- `kubectl` configured

## Writing a Basic Ingress Policy

```yaml
# basic-deathstar-policy.yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: deathstar-ingress
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      org: empire
      class: deathstar
  ingress:
  - fromEndpoints:
    - matchLabels:
        org: empire
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
```

```bash
# Apply the policy
kubectl apply -f basic-deathstar-policy.yaml

# Verify it was applied
kubectl get CiliumNetworkPolicy
```

## Pre-Testing with Policy Trace

```bash
# Predict: will tiefighter be allowed?
kubectl exec -n kube-system ds/cilium -- cilium policy trace \
  --src-k8s-pod default:tiefighter \
  --dst-k8s-pod default:deathstar-xxxxx \
  --dport 80

# Predict: will xwing be blocked?
kubectl exec -n kube-system ds/cilium -- cilium policy trace \
  --src-k8s-pod default:xwing \
  --dst-k8s-pod default:deathstar-xxxxx \
  --dport 80
```

## Upgrading to L7 Policy

```yaml
# l7-deathstar-policy.yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: deathstar-ingress
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      org: empire
      class: deathstar
  ingress:
  - fromEndpoints:
    - matchLabels:
        org: empire
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
      rules:
        http:
        - method: "POST"
          path: "/v1/request-landing"
        - method: "GET"
          path: "/v1/health"
```

```bash
# Apply the L7 policy (replaces the L3/L4 policy with the same name)
kubectl apply -f l7-deathstar-policy.yaml

# Test: POST landing should succeed
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# Test: PUT exhaust-port should now be blocked at L7
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
# Expected: Access denied
```

## Monitoring Policy Effects

```bash
# Watch drops as you test
kubectl exec -n kube-system ds/cilium -- cilium monitor --type drop &

# Watch L7 decisions
kubectl exec -n kube-system ds/cilium -- cilium monitor --type l7 &

# Run tests
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
```

## Adding Egress Rules

```yaml
# Allow tiefighter to only reach deathstar
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: tiefighter-egress
spec:
  endpointSelector:
    matchLabels:
      org: empire
      class: tiefighter
  egress:
  - toEndpoints:
    - matchLabels:
        org: empire
        class: deathstar
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
```

## Conclusion

Writing `CiliumNetworkPolicy` follows a clear pattern: select the endpoint, define ingress/egress rules with identity selectors, optionally add L7 rules. The Star Wars demo gives you immediate feedback - every policy change is verifiable with a `curl` command. Use `cilium policy trace` before applying and `cilium monitor` after to build confidence in your policies before deploying to production.
