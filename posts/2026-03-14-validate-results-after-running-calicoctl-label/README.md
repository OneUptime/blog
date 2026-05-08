# Validating Results After Running calicoctl label

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Labels, Validation, Kubernetes

Description: Learn how to verify that calicoctl label operations succeeded and that labels are correctly reflected in network policy evaluations and resource selectors.

---

## Introduction

Applying labels with `calicoctl label` is only half the job. You must verify that labels were correctly applied, that they appear on the right resources, and most importantly, that network policies using those labels as selectors are matching correctly.

Label validation is critical because a typo in a label value or an incorrectly applied label can silently break network policy targeting. Traffic that should be blocked may be allowed, or legitimate traffic may be denied, without any obvious error messages.

This guide provides systematic validation procedures to confirm that your `calicoctl label` operations achieved their intended effect.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` v3.25+ configured
- Existing labeled Calico resources
- Network policies that use label selectors

## Verifying Label Application

### Check Labels on a Specific Node

```bash
# View all labels on a node

calicoctl get node worker-1 -o yaml
```

Expected output includes your labels:

```yaml
apiVersion: projectcalico.org/v3
kind: Node
metadata:
  name: worker-1
  labels:
    env: production
    zone: us-east-1a
    tier: compute
```

### Verify Across All Nodes

```bash
# List all nodes with their labels in a readable format
calicoctl get nodes -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', [data])
for node in items:
    name = node['metadata']['name']
    labels = node['metadata'].get('labels', {})
    print(f'Node: {name}')
    for k, v in sorted(labels.items()):
        print(f'  {k}: {v}')
    print()
"
```

## Validating Label Selectors Match

The most important validation is confirming that your policies select the right resources:

```bash
# Check which nodes have a specific label value
calicoctl get nodes -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', [data])
for item in items:
    labels = item.get('metadata', {}).get('labels', {})
    if labels.get('env') == 'production':
        print(item['metadata']['name'])
"

# Check host endpoints with specific labels
calicoctl get hostendpoints -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', [data])
for item in items:
    labels = item.get('metadata', {}).get('labels', {})
    if labels.get('zone') == 'us-east-1a':
        print(item['metadata']['name'])
"

# Verify workload endpoints across all namespaces
calicoctl get workloadendpoints --all-namespaces -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', [data])
for item in items:
    labels = item.get('metadata', {}).get('labels', {})
    if labels.get('app') == 'frontend':
        namespace = item['metadata'].get('namespace', 'default')
        print(namespace + '/' + item['metadata']['name'])
"
```

## Cross-Referencing Labels with Policies

```bash
#!/bin/bash
# validate-policy-selectors.sh
# Checks whether simple policy selectors match at least one endpoint

echo "=== Policy Selector Validation ==="

# Get all global network policies
POLICIES=$(calicoctl get globalnetworkpolicies -o json)

echo "$POLICIES" | python3 -c "
import json, re, sys, subprocess

def items_from_output(text):
    data = json.loads(text)
    return data if isinstance(data, list) else data.get('items', [data])

def get_items(kind, *extra_args):
    result = subprocess.run(
        ['calicoctl', 'get', kind, *extra_args, '-o', 'json'],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f'  Error reading {kind}: {result.stderr.strip()}')
        return []
    return items_from_output(result.stdout)

def matches_simple_selector(selector, labels):
    selector = selector.strip()
    if selector == 'all()':
        return True
    has_match = re.fullmatch(r'has\(([A-Za-z0-9_.\-/]+)\)', selector)
    if has_match:
        return has_match.group(1) in labels
    eq_match = re.fullmatch(r'([A-Za-z0-9_.\-/]+)\s*==\s*(.+)', selector)
    if eq_match:
        value = eq_match.group(2).strip().strip(chr(34) + chr(39))
        return labels.get(eq_match.group(1)) == value
    neq_match = re.fullmatch(r'([A-Za-z0-9_.\-/]+)\s*!=\s*(.+)', selector)
    if neq_match:
        value = neq_match.group(2).strip().strip(chr(34) + chr(39))
        return labels.get(neq_match.group(1)) != value
    return None

policies = items_from_output(sys.stdin.read())
workloads = get_items('workloadendpoints', '--all-namespaces')
hosts = get_items('hostendpoints')
endpoints = workloads + hosts

for policy in policies:
    name = policy['metadata']['name']
    selector = policy.get('spec', {}).get('selector', '')
    
    if not selector:
        print(f'Policy: {name} - NO SELECTOR (applies to all)')
        continue
    
    print(f'Policy: {name}')
    print(f'  Selector: {selector}')
    
    count = 0
    unsupported = False
    for endpoint in endpoints:
        labels = endpoint.get('metadata', {}).get('labels', {})
        matched = matches_simple_selector(selector, labels)
        if matched is None:
            unsupported = True
            break
        if matched:
            count += 1

    if unsupported:
        print('  Selector is too complex for this script; validate it with a targeted traffic test.')
    else:
        print(f'  Matching endpoints: {count}')
        if count == 0:
            print(f'  WARNING: No endpoints match this selector!')
    print()
"
```

## Validating Label Format

Ensure labels follow Calico's format requirements:

```bash
#!/bin/bash
# validate-label-format.sh
# Checks that all labels on Calico nodes are valid

calicoctl get nodes -o json | python3 -c "
import json, sys, re

data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', [data])

dns_label = r'[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?'
prefix_pattern = re.compile(rf'^(?:{dns_label}\.)*{dns_label}$')
name_pattern = re.compile(r'^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,61}[A-Za-z0-9])?$')
value_pattern = re.compile(r'^(?:[A-Za-z0-9](?:[A-Za-z0-9._-]{0,61}[A-Za-z0-9])?)?$')

def valid_key(key):
    parts = key.split('/', 1)
    if len(parts) == 2:
        prefix, name = parts
        if len(prefix) > 253 or not prefix_pattern.match(prefix):
            return False
    else:
        name = parts[0]
    return len(name) <= 63 and bool(name_pattern.match(name))

errors = 0
for node in items:
    name = node['metadata']['name']
    labels = node['metadata'].get('labels', {})
    
    for k, v in labels.items():
        if not valid_key(k):
            print(f'INVALID KEY on {name}: \"{k}\"')
            errors += 1
        if v and not value_pattern.match(str(v)):
            print(f'INVALID VALUE on {name}: \"{k}={v}\"')
            errors += 1

if errors == 0:
    print('All labels are valid.')
else:
    print(f'{errors} label validation errors found.')
    sys.exit(1)
"
```

## Verifying Labels Affect Network Policy Enforcement

The ultimate validation is testing that labeled resources actually experience the correct network policy behavior:

```bash
# Deploy labeled test pods. These labels are copied to Calico workload endpoints.
kubectl run client-prod --image=busybox --restart=Never \
  --labels=env=production \
  -- sleep 3600

kubectl run server-staging --image=nginx --restart=Never \
  --labels=env=staging

kubectl wait --for=condition=Ready pod/client-prod pod/server-staging --timeout=60s

# Test connectivity between pods
STAGING_IP=$(kubectl get pod server-staging -o jsonpath='{.status.podIP}')
kubectl exec client-prod -- wget -qO- --timeout=5 "http://${STAGING_IP}" 2>&1

# Clean up test pods
kubectl delete pod client-prod server-staging
```

## Comprehensive Validation Script

```bash
#!/bin/bash
# full-label-validation.sh
ERRORS=0

echo "=== Label Validation Report ==="
echo ""

# 1. Count labeled resources
echo "--- Resource Counts ---"
NODE_COUNT=$(calicoctl get nodes -o json | python3 -c "import json,sys; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('items',[d]); print(len(items))")
echo "Total Calico nodes: $NODE_COUNT"

LABELED_COUNT=$(calicoctl get nodes -o json | python3 -c "import json,sys; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('items',[d]); print(sum(1 for n in items if 'env' in n.get('metadata',{}).get('labels',{})))" 2>/dev/null)
echo "Nodes with 'env' label: ${LABELED_COUNT:-0}"

if [ "${LABELED_COUNT:-0}" -lt "$NODE_COUNT" ]; then
  echo "WARN: Not all nodes have the 'env' label"
  ERRORS=$((ERRORS + 1))
fi

# 2. Check for common label issues
echo ""
echo "--- Label Consistency ---"
ENVS=$(calicoctl get nodes -o json | python3 -c "
import json, sys
d = json.load(sys.stdin)
items = d if isinstance(d, list) else d.get('items', [d])
envs = set()
for n in items:
    e = n.get('metadata',{}).get('labels',{}).get('env','')
    if e: envs.add(e)
print(' '.join(sorted(envs)))
")
echo "Unique env values: $ENVS"

echo ""
echo "Validation complete. Issues: $ERRORS"
exit $ERRORS
```

## Verification

Run the full validation:

```bash
chmod +x full-label-validation.sh
./full-label-validation.sh
```

## Troubleshooting

- **Label shows in YAML but selector does not match**: Check for trailing whitespace in label values. Use `calicoctl get node <name> -o json` to see exact values.
- **Policy applies to wrong resources**: Review the selector syntax carefully. Calico uses `==` for equality and `!=` for inequality.
- **Validation script fails with JSON errors**: Ensure `python3` is available and the `json` module is accessible (it is part of the standard library).

## Conclusion

Validating labels after applying them with `calicoctl label` ensures that your network policies work as intended. By checking label application, verifying selector matches, and testing actual network behavior, you can confirm that your labeling strategy is correctly implemented and your cluster security posture is sound.
