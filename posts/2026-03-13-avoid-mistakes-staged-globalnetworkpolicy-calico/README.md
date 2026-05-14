# Common Mistakes to Avoid with Staged GlobalNetworkPolicy in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Staged Policies, Global Policy

Description: Avoid the most common pitfalls when implementing Staged GlobalNetworkPolicy in Calico.

---

## Introduction

Staged GlobalNetworkPolicy is an advanced Calico feature that lets you preview fine-grained network security controls using the `projectcalico.org/v3` API before enforcing them. This guide covers how to avoid mistakes with Staged GlobalNetworkPolicy effectively in your Kubernetes cluster.

Calico's `projectcalico.org/v3` API provides rich support for staged policy through its `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, `StagedKubernetesNetworkPolicy`, and related resources. Proper configuration of Staged GlobalNetworkPolicy is essential for maintaining a secure, well-controlled network fabric.

This guide provides production-tested patterns for avoid mistakes Staged GlobalNetworkPolicy, including YAML examples, CLI commands, and troubleshooting techniques.

## Prerequisites

- Kubernetes cluster with Calico v3.30+
- `kubectl` installed  
- Basic understanding of Calico network policy concepts
- Calico v3.30+ for Staged GlobalNetworkPolicy feature support

## Core Configuration

The following YAML demonstrates the key pattern for Staged GlobalNetworkPolicy:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: avoid-mistakes-staged-globalnetworkpolicy
spec:
  tier: default
  order: 100
  namespaceSelector: projectcalico.org/name == 'production'
  selector: all()
  ingress:
    - action: Allow
      source:
        selector: app == 'authorized-source'
      destination:
        ports: [8080, 443]
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports: [53]
    - action: Allow
      protocol: TCP
      destination:
        ports: [53]
    - action: Allow
      destination:
        selector: app == 'authorized-destination'
  types:
    - Ingress
    - Egress
```

## Implementation Steps

```bash
# 1. Apply the policy

kubectl apply --dry-run=server -f avoid-mistakes-staged-globalnetworkpolicy.yaml
kubectl apply -f avoid-mistakes-staged-globalnetworkpolicy.yaml

# 2. Verify it's staged
kubectl get stagedglobalnetworkpolicy avoid-mistakes-staged-globalnetworkpolicy -o wide

# 3. Test connectivity. Staged policies preview behavior and do not enforce traffic.
kubectl exec -n production test-pod -- curl -s --max-time 5 http://target:8080
echo "Exit code: $?"

# 4. Check staged policy impact in Calico Whisker flow logs
# Review the policies.pending field for simulated allow/deny decisions.
```

## Operational Commands

```bash
# List all relevant policies
kubectl get stagedglobalnetworkpolicies
kubectl get globalnetworkpolicies

# View policy details
kubectl get stagedglobalnetworkpolicy avoid-mistakes-staged-globalnetworkpolicy -o yaml

# Delete a policy if needed
kubectl delete stagedglobalnetworkpolicy avoid-mistakes-staged-globalnetworkpolicy
```

## Architecture

```mermaid
flowchart TD
    A[Workload Pods] -->|Traffic| B{Staged GlobalNetworkPolicy Policy}
    B -->|Would Allow| C[Target Service]
    B -->|Would Deny| D[Reported in Flow Logs]
    E[kubectl] -->|Manages| B
    F[Calico Policy Evaluation] -->|Previews| B
    G[Calico Whisker] -->|Shows policies.pending| F
```

## Common Issues

1. **Policy not applying**: Verify API version is `projectcalico.org/v3`, kind is `StagedGlobalNetworkPolicy`, and run `kubectl apply --dry-run=server` first
2. **Selector not matching**: Use `kubectl get pods -l your-selector` to verify label matches
3. **Order conflicts**: Run `kubectl get stagedglobalnetworkpolicies -o wide` and sort by tier and order fields
4. **DNS failures**: Always ensure egress to TCP and UDP port 53 is allowed when restricting egress

## Conclusion

Avoid Mistakes Staged GlobalNetworkPolicy in Calico requires careful attention to policy ordering, selector syntax, and bidirectional traffic rules. Use the patterns in this guide as a starting point, adapt them to your specific requirements, and always validate staged policy behavior before creating the equivalent enforcing `GlobalNetworkPolicy` in production. Consistent logging and monitoring will help you detect and resolve issues quickly when they occur.
