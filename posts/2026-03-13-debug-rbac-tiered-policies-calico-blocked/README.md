# How to Debug RBAC for Calico Tiered Policies When Access Is Blocked

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, RBAC, Policy Tiers, Security

Description: Diagnose and fix RBAC for Tiered Policies failures in Calico when traffic is unexpectedly blocked.

---

## Introduction

RBAC for Tiered Policies is an advanced Calico feature that provides fine-grained network security controls using the `projectcalico.org/v3` API. This guide covers how to debug RBAC Tiered Policies effectively in your Kubernetes cluster.

Calico's `projectcalico.org/v3` API provides rich support for RBAC Tiered Policies through its `GlobalNetworkPolicy`, `NetworkPolicy`, and related resources. Proper configuration of RBAC Tiered Policies is essential for maintaining a secure, well-controlled network fabric.

This guide provides production-tested patterns for debug RBAC Tiered Policies, including YAML examples, CLI commands, and troubleshooting techniques.

## Prerequisites

- Kubernetes cluster with Calico v3.26+
- `calicoctl` and `kubectl` installed  
- Basic understanding of Calico network policy concepts
- Calico v3.26+ for full RBAC Tiered Policies feature support

## Core Configuration

The following YAML demonstrates the key pattern for RBAC Tiered Policies:

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: debug-rbac-tiered-policies
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
# 1. Apply the policy
calicoctl apply -f debug-rbac-tiered-policies.yaml

# 2. Verify it's active
calicoctl get networkpolicies -n production -o wide

# 3. Test connectivity
kubectl exec -n production test-pod -- curl -s --max-time 5 http://target:8080
echo "Exit code: $?"

# 4. Check policy hit counters (if Felix metrics enabled)
curl -s http://localhost:9091/metrics | grep felix_denied
```

## Operational Commands

```bash
# List all relevant policies
calicoctl get networkpolicies --all-namespaces
calicoctl get globalnetworkpolicies

# View policy details
calicoctl get networkpolicy debug-policy -n production -o yaml

# Delete a policy if needed
calicoctl delete networkpolicy debug-policy -n production
```

## Architecture

```mermaid
flowchart TD
    A[Workload Pods] -->|Traffic| B{RBAC Tiered Policies Policy}
    B -->|Allow Rule| C[Target Service]
    B -->|Default Deny| D[Blocked]
    E[calicoctl] -->|Manages| B
    F[Felix] -->|Enforces| B
    G[Prometheus :9091] -->|Metrics from| F
```

## Common Issues

1. **Policy not applying**: Verify API version is `projectcalico.org/v3` and run `calicoctl apply --dry-run` first
2. **Selector not matching**: Use `kubectl get pods -l your-selector` to verify label matches
3. **Order conflicts**: Run `calicoctl get globalnetworkpolicies -o wide` and sort by order field
4. **DNS failures**: Always ensure egress to port 53 is allowed when restricting egress

## Conclusion

Debug RBAC Tiered Policies in Calico requires careful attention to policy ordering, selector syntax, and bidirectional traffic rules. Use the patterns in this guide as a starting point, adapt them to your specific requirements, and always validate changes in a staging environment before applying to production. Consistent logging and monitoring will help you detect and resolve issues quickly when they occur.
