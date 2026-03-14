# How to Scale OpenStack Labels with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenStack, Calico, Labels, Scaling, Policy

Description: A guide to scaling label-based policy management in OpenStack with Calico, covering label taxonomy design, policy selector optimization, and management strategies for large multi-tenant environments.

---

## Introduction

Labels in Calico are the primary mechanism for applying network policies to workloads. In an OpenStack environment, labels are applied to VMs through Neutron port metadata and Calico workload endpoints. As the number of VMs, tenants, and policies grows, label management becomes a scaling challenge that affects policy evaluation performance and operational manageability.

This guide covers designing a label taxonomy that scales, optimizing policy selectors for large label sets, and implementing label management workflows that prevent label sprawl. We address both the technical scaling limits and the organizational challenges of label management in large OpenStack deployments.

The core scaling issue with labels is that Calico evaluates selectors against all endpoints, and complex selectors with many labels increase the time Felix spends computing which policies apply to each endpoint.

## Prerequisites

- An OpenStack deployment with Calico networking
- `calicoctl` configured with datastore access
- Understanding of Calico label selectors and network policies
- An existing or planned label taxonomy for your environment
- Monitoring for Felix policy computation metrics

## Designing a Scalable Label Taxonomy

Create a structured label scheme that supports efficient policy selectors.

```yaml
# label-taxonomy-example.yaml
# Example workload endpoint with structured labels
apiVersion: projectcalico.org/v3
kind: WorkloadEndpoint
metadata:
  name: vm-web-001
  namespace: openstack
  labels:
    # Environment tier (broad selector)
    environment: production
    # Application role (medium selector)
    role: web-server
    # Compliance zone (policy-critical)
    compliance-zone: pci
    # Team ownership (operational)
    team: platform
    # Avoid: Random or high-cardinality labels
    # BAD: instance-id: "abc123" (unique per VM, useless for policy)
```

Define label categories with clear purposes:

```markdown
# Label Taxonomy for OpenStack + Calico

## Policy Labels (Used in Network Policy Selectors)
| Label | Values | Purpose |
|-------|--------|---------|
| environment | production, staging, dev | Environment isolation |
| role | web, app, db, cache | Tier-based access control |
| compliance-zone | pci, hipaa, standard | Compliance boundary |

## Operational Labels (Used for Filtering, Not Policy)
| Label | Values | Purpose |
|-------|--------|---------|
| team | platform, app-team-a | Ownership tracking |
| cost-center | eng-001, ops-002 | Cost allocation |

## Rule: Policy labels should have <20 unique values
## Rule: Never use unique-per-instance values in policy selectors
```

## Optimizing Policy Selectors

Write policies with selectors that Calico can evaluate efficiently.

```yaml
# efficient-policy.yaml
# Policy using simple equality selectors (fast evaluation)
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: pci-isolation
spec:
  # Simple equality selector - very efficient
  selector: compliance-zone == 'pci'
  types:
    - Ingress
    - Egress
  ingress:
    # Allow traffic only from PCI-zone workloads
    - action: Allow
      source:
        selector: compliance-zone == 'pci'
  egress:
    # Allow traffic only to PCI-zone workloads
    - action: Allow
      destination:
        selector: compliance-zone == 'pci'
    # Allow DNS
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
```

```yaml
# avoid-complex-selectors.yaml
# Example of an INEFFICIENT policy selector (avoid this pattern)
# This forces Felix to evaluate many label combinations
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: complex-selector-example
spec:
  # Complex selector with OR logic - slower evaluation
  # Prefer restructuring labels instead
  selector: (role == 'web' && environment == 'production') || (role == 'app' && team == 'platform')
  types:
    - Ingress
  ingress:
    - action: Allow
```

```mermaid
graph TD
    A[Policy Evaluation] --> B{Selector Type}
    B -->|Simple Equality| C[Fast: O(1) per endpoint]
    B -->|Label Exists| D[Fast: O(1) per endpoint]
    B -->|OR with Multiple Labels| E[Slower: O(n) label checks]
    B -->|Regex/Contains| F[Slowest: String matching]
    C --> G[Preferred for Scale]
    D --> G
    E --> H[Acceptable in Small Numbers]
    F --> I[Avoid at Scale]
```

## Managing Labels at Scale

Implement label management automation to prevent inconsistencies.

```bash
#!/bin/bash
# label-audit.sh
# Audit label usage across all Calico endpoints

echo "=== Label Audit Report ==="
echo "Date: $(date)"
echo ""

# Get all unique labels in use
echo "--- Labels in Use ---"
calicoctl get workloadendpoints --all-namespaces -o json |   python3 -c "
import json, sys, collections
data = json.load(sys.stdin)
labels = collections.Counter()
for item in data.get('items', []):
    for k, v in item.get('metadata', {}).get('labels', {}).items():
        labels[k] += 1
for label, count in labels.most_common():
    print(f'  {label}: {count} endpoints')
"

echo ""
echo "--- Labels Used in Policies ---"
calicoctl get globalnetworkpolicies -o json |   python3 -c "
import json, sys, re
data = json.load(sys.stdin)
selectors = set()
for item in data.get('items', []):
    spec = item.get('spec', {})
    sel = spec.get('selector', '')
    if sel:
        labels = re.findall(r'([\w-]+)\s*==', sel)
        selectors.update(labels)
print('  Labels referenced in selectors:', ', '.join(sorted(selectors)))
"
```

## Verification

```bash
#!/bin/bash
# verify-label-scaling.sh
echo "=== Label Scaling Verification ==="

echo "Total endpoints:"
calicoctl get workloadendpoints --all-namespaces -o json | python3 -c "
import json,sys; print(len(json.load(sys.stdin).get('items',[])))
"

echo ""
echo "Total policies:"
calicoctl get globalnetworkpolicies -o json | python3 -c "
import json,sys; print(len(json.load(sys.stdin).get('items',[])))
"

echo ""
echo "Felix policy computation metrics:"
for node in $(openstack compute service list -f value -c Host | sort -u | head -3); do
  echo "${node}:"
  ssh ${node} 'curl -s localhost:9091/metrics 2>/dev/null | grep felix_calc_graph_update' | head -2
done
```

## Troubleshooting

- **Felix slow to compute policies**: Check `felix_calc_graph_update_duration_seconds` metric. Simplify policy selectors or reduce the number of unique label values.
- **Labels inconsistent across endpoints**: Implement label validation in your VM provisioning pipeline. Use admission controllers or post-provisioning scripts to enforce the label taxonomy.
- **Too many policies**: Consolidate policies that share the same selector. Use Calico tiers to organize policies hierarchically.
- **Label changes not reflected in policy**: Felix re-evaluates policies when endpoint labels change. Check Felix logs for label update events.

## Conclusion

Scaling labels in OpenStack with Calico requires a well-designed taxonomy, efficient policy selectors, and automated label management. By keeping policy labels low-cardinality, using simple equality selectors, and auditing label usage regularly, you maintain fast policy evaluation performance as your deployment grows. Treat your label taxonomy as a controlled vocabulary and manage changes through a review process.
