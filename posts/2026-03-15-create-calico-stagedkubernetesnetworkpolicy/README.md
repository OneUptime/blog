# How to Create the Calico StagedKubernetesNetworkPolicy Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, StagedKubernetesNetworkPolicy, Kubernetes, Network Policy, Security, Staging

Description: Step-by-step guide to creating Calico StagedKubernetesNetworkPolicy resources for previewing Kubernetes-native network policy changes.

---

## Introduction

The StagedKubernetesNetworkPolicy resource in Calico Enterprise lets you stage changes that mirror the standard Kubernetes NetworkPolicy format. This bridges the gap between Kubernetes-native policy authoring and Calico's staged policy workflow, making it accessible to teams already familiar with the Kubernetes NetworkPolicy API.

When you create a StagedKubernetesNetworkPolicy, Calico treats it as a preview of what the equivalent Kubernetes NetworkPolicy would do. The staged policy does not enforce any rules until committed, allowing you to review its impact on live traffic through the Calico Enterprise Manager.

This guide covers creating StagedKubernetesNetworkPolicy resources from scratch, including common patterns for ingress filtering, egress restrictions, and namespace isolation.

## Prerequisites

- Kubernetes cluster with Calico Enterprise installed
- `kubectl` configured with cluster admin access
- `calicoctl` CLI installed
- Calico Enterprise Manager UI access for traffic impact review
- Basic understanding of Kubernetes NetworkPolicy syntax

## Creating a Basic StagedKubernetesNetworkPolicy

Create a staged policy that mirrors a standard Kubernetes NetworkPolicy allowing HTTP ingress to a web application:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: allow-web-ingress
  namespace: production
spec:
  stagedAction: Set
  podSelector:
    matchLabels:
      app: web-frontend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              purpose: ingress
      ports:
        - protocol: TCP
          port: 8080
```

Apply the staged policy:

```bash
kubectl apply -f allow-web-ingress-staged.yaml
```

## Creating a Namespace Isolation Policy

Stage a policy that isolates a namespace by denying all ingress except from specific namespaces:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: namespace-isolation
  namespace: finance
spec:
  stagedAction: Set
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              team: finance
        - podSelector:
            matchLabels:
              role: api-gateway
      ports:
        - protocol: TCP
          port: 443
```

## Creating an Egress Restriction Policy

Stage an egress policy that limits outbound connections to approved external services:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: restrict-egress
  namespace: production
spec:
  stagedAction: Set
  podSelector:
    matchLabels:
      app: backend-api
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 10.0.0.0/8
      ports:
        - protocol: TCP
          port: 5432
    - to: []
      ports:
        - protocol: UDP
          port: 53
```

Apply it:

```bash
kubectl apply -f restrict-egress-staged.yaml
```

## Verification

List all staged Kubernetes network policies in a namespace:

```bash
kubectl get stagedkubernetesnetworkpolicies -n production
```

Inspect a specific staged policy:

```bash
kubectl get stagedkubernetesnetworkpolicy allow-web-ingress -n production -o yaml
```

Confirm the stagedAction is set to `Set` and the policy has not been committed:

```bash
kubectl describe stagedkubernetesnetworkpolicy allow-web-ingress -n production
```

## Troubleshooting

If the resource type is not recognized, verify that Calico Enterprise CRDs are installed:

```bash
kubectl get crd | grep stagedkubernetesnetworkpolicies
```

If the policy fails to create with validation errors, check that the namespace exists and the podSelector labels match existing workloads:

```bash
kubectl get pods -n production -l app=web-frontend
```

If the staged policy does not appear in the Calico Enterprise Manager, ensure the management cluster components are healthy:

```bash
kubectl get pods -n calico-system -l app=calico-manager
```

## Conclusion

Creating StagedKubernetesNetworkPolicy resources provides a safe way to preview Kubernetes-native network policy changes before they take effect. By using the familiar Kubernetes NetworkPolicy syntax within Calico's staging framework, teams can validate ingress and egress rules against live traffic without disrupting production workloads. Always review the traffic impact analysis in Calico Enterprise Manager before committing staged policies.
