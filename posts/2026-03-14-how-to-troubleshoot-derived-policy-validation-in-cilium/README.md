# Troubleshooting Derived Policy Validation in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Derived Policy, Troubleshooting, Security

Description: How to diagnose and fix issues with Cilium derived policy computation including incorrect policy merging, identity conflicts, and enforcement gaps.

---

## Introduction

Derived policy issues occur when the effective policy on an endpoint does not match your intent. This happens when multiple policies interact in unexpected ways, when identities change causing policy reevaluation, or when policy updates are not propagated to the datapath.

## Prerequisites

- Kubernetes cluster with Cilium
- kubectl, Hubble CLI, and access to `cilium-dbg` in the Cilium agent pod

## Diagnosing Derived Policy Issues

```bash
# Check the derived policy on a specific endpoint

cilium-dbg endpoint get <endpoint-id> -o json | \
  jq '.status.policy.realized'

# List all policies affecting an endpoint
cilium-dbg endpoint get <endpoint-id> -o jsonpath='{range ..status.policy.realized.l4.ingress[*].derived-from-rules}{@}{"\n"}{end}' | \
  tr -d '][' | xargs -I{} cilium-dbg policy get {}

# Inspect selector-to-identity mappings for policy decisions
cilium-dbg policy selectors -o json
```

```mermaid
graph TD
    A[Derived Policy Issue] --> B{Expected Behavior?}
    B -->|Traffic Allowed When Should Be Denied| C[Check Policy Union]
    B -->|Traffic Denied When Should Be Allowed| D[Check Policy Selection]
    C --> E[Review All Matching Policies]
    D --> F[Check Identity and Labels]
```

## Fixing Policy Merge Issues

```bash
# List all policies that select a specific endpoint
ENDPOINT_LABELS=$(kubectl get ciliumendpoint <pod-name> -n default \
  -o jsonpath='{.status.identity.labels}')
echo "Endpoint labels: $ENDPOINT_LABELS"

# Check each policy selector
kubectl get ciliumnetworkpolicies -n default -o json | jq '.items[] | {
  name: .metadata.name,
  selector: .spec.endpointSelector
}'
```

## Forcing Policy Recalculation

```bash
# Wait for endpoints to apply a policy revision
cilium-dbg policy wait <policy-revision>

# Or restart the agent (last resort)
kubectl delete pod -n kube-system <cilium-pod-on-node>
```

## Verification

```bash
cilium-dbg endpoint get <endpoint-id> -o json | jq '.status.policy'
cilium-dbg bpf policy get --all
hubble observe --pod <pod-name> --last 10
```

## Troubleshooting

- **Policies not merging correctly**: Cilium uses union (OR) for matching policies. Multiple allow policies are additive.
- **Identity changed**: Label changes cause identity recalculation. Check current identity matches policy expectations.
- **Stale derived policy**: Wait for the target policy revision or restart the agent.

## Conclusion

Derived policy troubleshooting requires understanding how Cilium merges multiple policies for each endpoint. Use selector inspection, Hubble flow data, and endpoint inspection to see the effective rules.
