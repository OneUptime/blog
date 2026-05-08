# How to Validate Staged Network Policies in Calico Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Staged Policies, Security

Description: Build a validation framework for Staged Network Policies in Calico before production deployment.

---

## Introduction

Staged Network Policies is an advanced Calico feature that lets you preview fine-grained network security controls using the `projectcalico.org/v3` API without enforcing them. This guide covers how to validate Staged Policies effectively in your Kubernetes cluster.

Calico's `projectcalico.org/v3` API provides rich support for Staged Policies through its `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, `StagedKubernetesNetworkPolicy`, and related resources. Proper configuration of Staged Policies is essential for maintaining a secure, well-controlled network fabric.

This guide provides production-tested patterns for validate Staged Policies, including YAML examples, CLI commands, and troubleshooting techniques.

## Prerequisites

- Kubernetes cluster with Calico v3.26+
- `kubectl` installed and configured for the cluster
- Basic understanding of Calico network policy concepts
- Calico v3.26+ for full Staged Policies feature support

## Core Configuration

The following YAML demonstrates the key pattern for Staged Policies:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: validate-staged-policies
  namespace: production
spec:
  order: 100
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
      destination:
        selector: app == 'authorized-destination'
  types:
    - Ingress
    - Egress
```

## Implementation Steps

```bash
# 1. Apply the staged policy

kubectl apply -f validate-staged-policies.yaml

# 2. Verify the staged policy exists
kubectl get stagednetworkpolicy.p -n production -o wide

# 3. Generate test traffic. Staged policies do not block or allow traffic.
kubectl exec -n production test-pod -- curl -s --max-time 5 http://target:8080
echo "Exit code: $?"

# 4. Review staged-policy impact in Calico flow logs
# In Whisker, check the policies.pending field for matching flows.
```

## Operational Commands

```bash
# List all relevant policies
kubectl get stagednetworkpolicy.p --all-namespaces
kubectl get stagedglobalnetworkpolicy.p

# View policy details
kubectl get stagednetworkpolicy.p validate-staged-policies -n production -o yaml

# Delete a policy if needed
kubectl delete stagednetworkpolicy.p validate-staged-policies -n production
```

## Architecture

```mermaid
flowchart TD
    A[Workload Pods] -->|Traffic| B{Staged Policies Policy}
    B -->|Would Allow| C[Target Service]
    B -->|Would Deny| D[Pending Impact]
    E[kubectl] -->|Manages| B
    F[Felix] -->|Evaluates| B
    G[Whisker Flow Logs] -->|policies.pending| F
```

## Common Issues

1. **Policy not applying**: Verify API version is `projectcalico.org/v3` and run `kubectl apply --dry-run=server -f validate-staged-policies.yaml` first
2. **Selector not matching**: Use `kubectl get pods -l app=authorized-source` to verify label matches
3. **Order conflicts**: Run `kubectl get stagedglobalnetworkpolicy.p -o wide` and `kubectl get stagednetworkpolicy.p --all-namespaces -o wide` and sort by order field
4. **DNS failures after enforcement**: Always ensure egress to port 53 is allowed when restricting egress

## Conclusion

Validating Staged Policies in Calico requires careful attention to policy ordering, selector syntax, and bidirectional traffic rules. Use the patterns in this guide as a starting point, adapt them to your specific requirements, and always validate changes in a staging environment before enforcing them in production. Consistent logging and monitoring will help you detect and resolve issues quickly when they occur.
