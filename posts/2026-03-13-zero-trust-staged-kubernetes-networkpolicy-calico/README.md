# Zero Trust with Staged Kubernetes NetworkPolicy in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Staged Policies

Description: Implement zero trust security using Staged Kubernetes NetworkPolicy in Calico.

---

## Introduction

Staged Kubernetes NetworkPolicy is an advanced Calico feature that lets you preview fine-grained Kubernetes network security controls using the `projectcalico.org/v3` API before enforcing them. This guide covers how to use zero trust Staged K8s NetworkPolicy effectively in your Kubernetes cluster.

Calico's `projectcalico.org/v3` API provides rich support for staged policy through resources such as `StagedKubernetesNetworkPolicy`, `StagedNetworkPolicy`, and `StagedGlobalNetworkPolicy`. Proper configuration of Staged K8s NetworkPolicy is essential for maintaining a secure, well-controlled network fabric.

This guide provides production-tested patterns for zero trust Staged K8s NetworkPolicy, including YAML examples, CLI commands, and troubleshooting techniques.

## Prerequisites

- Kubernetes cluster with Calico staged policy CRDs installed
- `kubectl` installed
- Basic understanding of Calico network policy concepts

## Core Configuration

The following YAML demonstrates the key pattern for Staged K8s NetworkPolicy:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedKubernetesNetworkPolicy
metadata:
  name: zero-trust-staged-k8s-networkpolicy
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: authorized-source
      ports:
        - protocol: TCP
          port: 8080
        - protocol: TCP
          port: 443
  egress:
    - ports:
        - protocol: UDP
          port: 53
    - to:
        - podSelector:
            matchLabels:
              app: authorized-destination
```

## Implementation Steps

```bash
# 1. Apply the policy

kubectl apply -f zero-trust-staged-k8s-networkpolicy.yaml

# 2. Verify it's staged
kubectl get stagedkubernetesnetworkpolicies.projectcalico.org -n production

# 3. Generate traffic to preview against the staged policy
kubectl exec -n production test-pod -- curl -s --max-time 5 http://target:8080
echo "Exit code: $?"

# 4. Preview staged policy impact in flow logs, such as the policies.pending field
```

## Operational Commands

```bash
# List all relevant policies
kubectl get stagedkubernetesnetworkpolicies.projectcalico.org --all-namespaces
kubectl get stagednetworkpolicies.projectcalico.org --all-namespaces
kubectl get stagedglobalnetworkpolicies.projectcalico.org

# View policy details
kubectl get stagedkubernetesnetworkpolicy.projectcalico.org zero-trust-staged-k8s-networkpolicy -n production -o yaml

# Delete a policy if needed
kubectl delete stagedkubernetesnetworkpolicy.projectcalico.org zero-trust-staged-k8s-networkpolicy -n production
```

## Architecture

```mermaid
flowchart TD
    A[Workload Pods] -->|Traffic| B{Staged K8s NetworkPolicy Policy}
    B -->|Would Allow| C[Target Service]
    B -->|Would Deny| D[Blocked if Enforced]
    E[kubectl] -->|Manages| B
    F[Calico Flow Logs] -->|Preview Impact| B
    G[Enforced NetworkPolicy] -->|After Validation| A
```

## Common Issues

1. **Policy not applying**: Verify API version is `projectcalico.org/v3`, kind is `StagedKubernetesNetworkPolicy`, and run `kubectl apply --dry-run=server` first
2. **Selector not matching**: Use `kubectl get pods -l your-selector` to verify label matches
3. **No traffic changes after applying**: Staged policies preview behavior only; create an identical enforced `NetworkPolicy` when the preview is satisfactory
4. **DNS failures**: Always ensure egress to port 53 is allowed when restricting egress

## Conclusion

Zero Trust Staged K8s NetworkPolicy in Calico requires careful attention to selector syntax and bidirectional traffic rules. Use the patterns in this guide as a starting point, adapt them to your specific requirements, and always validate changes in a staging environment before applying an enforced policy to production. Consistent logging and monitoring will help you detect and resolve issues quickly when they occur.
