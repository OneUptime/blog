# How to Use the Calico StagedKubernetesNetworkPolicy Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, StagedKubernetesNetworkPolicy, Kubernetes, Production, Network Security, Best Practices

Description: Real-world patterns for using StagedKubernetesNetworkPolicy in production Kubernetes clusters with Calico Enterprise.

---

## Introduction

In production Kubernetes clusters, network policy changes carry significant risk. A misconfigured ingress rule can block legitimate traffic to critical services, while an overly permissive egress rule can create security vulnerabilities. The StagedKubernetesNetworkPolicy resource in Calico Enterprise addresses this by providing a staging layer for Kubernetes-native network policies.

Real cluster usage of StagedKubernetesNetworkPolicy involves more than just creating and committing policies. Teams use it for gradual migration from open networks to zero-trust, multi-team policy review workflows, and automated compliance checks. The Kubernetes-native syntax makes it approachable for platform teams already managing standard NetworkPolicy resources.

This guide covers practical patterns for deploying StagedKubernetesNetworkPolicy in production environments, including migration strategies, team workflows, and monitoring integration.

## Prerequisites

- Production Kubernetes cluster with Calico Enterprise
- `kubectl` with RBAC access to target namespaces
- Calico Enterprise Manager for traffic impact analysis
- Flow logs enabled in FelixConfiguration
- CI/CD pipeline for policy-as-code workflows

## Migrating Existing NetworkPolicies to Staged Versions

Before modifying production network policies, create staged equivalents to test changes:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: api-ingress-v2
  namespace: production
spec:
  stagedAction: Set
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              role: frontend
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 8443
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              role: data
      ports:
        - protocol: TCP
          port: 5432
    - to: []
      ports:
        - protocol: UDP
          port: 53
```

```bash
kubectl apply -f api-ingress-v2-staged.yaml
```

## Implementing Per-Namespace Isolation

Stage namespace isolation policies before enforcement to identify cross-namespace dependencies:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: payments
spec:
  stagedAction: Set
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}
      ports:
        - protocol: TCP
```

This stages a policy that only allows intra-namespace ingress. Review flow logs to discover which external namespaces currently communicate with the payments namespace before committing.

## Team-Based Review Workflow

Use labels to track policy ownership and review status:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: backend-egress-controls
  namespace: backend
  labels:
    team: platform
    review-status: pending
    change-request: CR-2026-0315
spec:
  stagedAction: Set
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 10.0.0.0/8
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 443
```

Query staged policies awaiting review:

```bash
kubectl get stagedkubernetesnetworkpolicies --all-namespaces -l review-status=pending
```

## Verification

Confirm staged policies exist across namespaces:

```bash
kubectl get stagedkubernetesnetworkpolicies --all-namespaces -o wide
```

Validate that production traffic is unaffected while policies are staged:

```bash
kubectl exec -n production deploy/api-server -- wget -qO- --timeout=5 http://database-svc.data:5432 2>&1 | head -1
```

Review the traffic impact analysis in Calico Enterprise Manager to see which flows would match the staged rules.

## Troubleshooting

If staged policies show no traffic matches in the Manager UI, verify flow logs are enabled:

```bash
kubectl get felixconfiguration default -o yaml | grep -A 3 flowLogs
```

If a staged policy conflicts with an existing Kubernetes NetworkPolicy of the same name, the staged version operates independently. Ensure naming conventions distinguish staged from active policies.

If RBAC errors occur when creating staged policies, verify your ClusterRole includes the CRD:

```bash
kubectl auth can-i create stagedkubernetesnetworkpolicies -n production
```

## Conclusion

StagedKubernetesNetworkPolicy is a practical tool for managing network policy changes in production Kubernetes clusters. By staging policies before enforcement, teams can migrate to zero-trust networking incrementally, review changes through structured workflows, and validate traffic impact before any rules take effect. The Kubernetes-native syntax lowers the barrier for adoption across platform and application teams.
