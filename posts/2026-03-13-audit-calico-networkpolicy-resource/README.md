# Audit Calico NetworkPolicy Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, NetworkPolicy, Security, Audit, Compliance

Description: A guide to auditing Calico NetworkPolicy resources for security compliance, policy drift detection, and ensuring all workloads have appropriate network segmentation.

---

## Introduction

Auditing Calico NetworkPolicy resources answers the question: "Is our network security posture as intended?" Over time, policies may drift from their intended state due to manual changes, upgrades, or emergency modifications. Workloads may be deployed without network policies, or policies may have been weakened to troubleshoot an issue and never restored.

A systematic audit identifies unprotected workloads, overly permissive rules, policy inconsistencies across environments, and compliance gaps for frameworks like SOC2, PCI-DSS, or internal security standards.

## Prerequisites

- `calicoctl` and `kubectl` with cluster admin access
- A defined security policy baseline for your environment
- Version control access (if policies are managed as code)

## Audit Check 1: Identify Pods Without Network Policy

Every production pod should have at least one NetworkPolicy:

```bash
#!/bin/bash
# find-unprotected-pods.sh

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

for ns in $(kubectl get namespaces -o name | cut -d/ -f2); do
  # Skip system namespaces
  [[ "$ns" =~ ^(kube-system|calico-system|monitoring)$ ]] && continue

  echo "=== Namespace: $ns ==="
  kubectl get pods -n "$ns" -o json > "$tmpdir/pods.json"
  calicoctl get networkpolicies -n "$ns" -o json > "$tmpdir/policies.json" 2>/dev/null || echo '{"items":[]}' > "$tmpdir/policies.json"

  python3 - "$ns" "$tmpdir/pods.json" "$tmpdir/policies.json" <<'PY'
import json, re, sys

ns, pods_path, policies_path = sys.argv[1:]
pods = json.load(open(pods_path))
policies = json.load(open(policies_path)).get("items", [])

def selector_matches(selector, labels):
    selector = (selector or "all()").strip()
    if selector == "all()":
        return True
    if selector == "!all()":
        return False

    # Handles common Calico selector forms. Review complex selectors manually.
    for part in [p.strip() for p in selector.split("&&")]:
        m = re.fullmatch(r"([A-Za-z0-9_.\-/]+)\s*==\s*['\"]([^'\"]+)['\"]", part)
        if m:
            if labels.get(m.group(1)) != m.group(2):
                return False
            continue

        m = re.fullmatch(r"has\(([A-Za-z0-9_.\-/]+)\)", part)
        if m:
            if m.group(1) not in labels:
                return False
            continue

        m = re.fullmatch(r"([A-Za-z0-9_.\-/]+)\s+in\s+\{(.+)\}", part)
        if m:
            values = {v.strip().strip("'\"") for v in m.group(2).split(",")}
            if labels.get(m.group(1)) not in values:
                return False
            continue

        raise ValueError(selector)

    return True

for pod in pods.get("items", []):
    pod_name = pod["metadata"]["name"]
    labels = pod["metadata"].get("labels", {})
    matches = []
    manual_review = []

    for policy in policies:
        name = policy["metadata"]["name"]
        selector = policy.get("spec", {}).get("selector", "all()")
        try:
            if selector_matches(selector, labels):
                matches.append(name)
        except ValueError:
            manual_review.append(f"{name} ({selector})")

    if not matches:
        print(f"  UNPROTECTED: {pod_name} (no evaluated NetworkPolicy selects this pod)")
    if manual_review:
        print(f"  REVIEW: {pod_name} has policies with complex selectors: {', '.join(manual_review)}")
PY
done
```

## Audit Check 2: Identify Overly Permissive Rules

```bash
# Find policies that allow ingress from any source (overly broad)
calicoctl get networkpolicies -A -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for policy in data.get('items', []):
    for rule in policy['spec'].get('ingress', []):
        if rule.get('action') == 'Allow' and not rule.get('source'):
            name = policy['metadata']['name']
            ns = policy['metadata']['namespace']
            print(f'WIDE OPEN: {ns}/{name} - ingress allow with no source restriction')
"
```

## Audit Check 3: Policy Drift Detection

```mermaid
graph LR
    A[Git Policy Baseline] --> B{Diff}
    C[Live Cluster Policies] --> B
    B -->|Differences| D[Policy Drift Detected]
    B -->|No differences| E[Policies Match Baseline]
    D --> F[Review and update Git or cluster]
```

```bash
# Export current policies to compare with Git baseline
calicoctl get networkpolicies -A -o yaml > current-policies.yaml
diff policies-baseline.yaml current-policies.yaml
```

## Audit Check 4: Compliance Checks

For PCI-DSS compliance, verify cardholder data environment (CDE) pods are isolated:

```bash
# Check CDE namespace policies
calicoctl get networkpolicies -n cde -o wide

# Verify no wildcard egress to non-approved destinations
calicoctl get networkpolicies -n cde -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for p in data['items']:
    for rule in p['spec'].get('egress', []):
        if rule.get('action') != 'Allow':
            continue
        destination = rule.get('destination')
        nets = destination.get('nets', []) if destination else []
        if not destination or '0.0.0.0/0' in nets or '::/0' in nets:
            print(f'WARNING: {p[\"metadata\"][\"name\"]} has broad egress allow')
"
```

## Audit Check 5: Verify Default Deny Policies Exist

```bash
# Every production namespace should have a default-deny policy
for ns in $(kubectl get namespaces -l env=production -o name | cut -d/ -f2); do
  count=$(calicoctl get networkpolicies -n "$ns" -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(sum(1 for p in data.get('items', []) if p.get('metadata', {}).get('name') == 'default-deny'))
")
  if [ "$count" = "0" ]; then
    echo "MISSING default-deny in namespace: $ns"
  fi
done
```

## Audit Report Template

```markdown
## Calico NetworkPolicy Audit Report - $(date)

### Summary
| Check | Result | Count |
|-------|--------|-------|
| Namespaces without policies | WARN | 3 |
| Overly permissive allow rules | WARN | 2 |
| Policy drift from baseline | WARN | 5 changes |
| Missing default-deny policies | FAIL | 1 |

### Findings
1. [HIGH] Namespace 'legacy-app' has no NetworkPolicy resources
2. [MEDIUM] Policy 'allow-all-ingress' in namespace 'staging' has no source restriction
3. [LOW] 5 policies differ from Git baseline (possible emergency changes)
```

## Conclusion

Regular Calico NetworkPolicy audits catch security gaps before they become incidents. The most critical checks are identifying unprotected workloads, finding overly permissive allow rules, and comparing live policies against a Git-managed baseline to detect drift. Automate these checks as part of a scheduled CI pipeline or security scanning workflow to maintain continuous visibility into your network security posture.
