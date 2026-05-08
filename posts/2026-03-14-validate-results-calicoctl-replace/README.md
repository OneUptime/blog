# How to Validate Results After Running calicoctl replace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Validation, Calicoctl, Testing

Description: Learn how to validate that calicoctl replace operations produced the expected results by comparing resource definitions, testing policy enforcement, and monitoring Felix sync status.

---

## Introduction

After running `calicoctl replace`, you need to verify that the new resource definition is active in the datastore, that Felix has processed the update, and that network behavior matches your expectations. Because `replace` overwrites the entire resource, validation must confirm not only that the new fields are present but also that no unintended fields were removed.

This guide provides a structured validation approach for calicoctl replace operations covering resource state comparison, Felix enforcement verification, and network connectivity testing.

## Prerequisites

- A running Kubernetes cluster with Calico installed
- calicoctl v3.27 or later
- kubectl access to the cluster
- python3 with PyYAML installed for YAML/JSON comparison
- Felix Prometheus metrics enabled if you use the Felix sync validation script

## Validating Resource State

Compare the resource in the datastore against the intended definition:

```bash
#!/bin/bash
# validate-replace.sh

# Validates that a replace operation produced the expected state

set -euo pipefail

export DATASTORE_TYPE=kubernetes
INTENDED_FILE="${1:?Usage: $0 <intended-resource.yaml>}"

KIND=$(python3 -c "import sys, yaml; print(yaml.safe_load(open(sys.argv[1]))['kind'])" "$INTENDED_FILE")
NAME=$(python3 -c "import sys, yaml; print(yaml.safe_load(open(sys.argv[1]))['metadata']['name'])" "$INTENDED_FILE")

echo "Validating ${KIND}/${NAME} against intended state..."

# Get current state from cluster
calicoctl get "$KIND" "$NAME" -o json > /tmp/actual.json

# Compare spec sections (ignoring metadata like resourceVersion, uid).
# calicoctl JSON output is a list; select the matching resource by kind and name.
python3 - "$INTENDED_FILE" <<'PY'
import json
import sys
import yaml

intended_file = sys.argv[1]

with open(intended_file) as f:
    intended = yaml.safe_load(f)

with open('/tmp/actual.json') as f:
    actual = json.load(f)

if isinstance(actual, dict) and 'items' in actual:
    actual = actual['items']

if isinstance(actual, list):
    matches = [
        item for item in actual
        if item.get('kind', '').lower() == intended.get('kind', '').lower()
        and item.get('metadata', {}).get('name') == intended.get('metadata', {}).get('name')
    ]
    if not matches:
        print('VALIDATION FAILED: Resource not found in calicoctl output')
        sys.exit(1)
    actual = matches[0]

# Compare specs
intended_spec = intended.get('spec', {})
actual_spec = actual.get('spec', {})

def compare(intended, actual, path='spec'):
    diffs = []
    if isinstance(intended, dict):
        if not isinstance(actual, dict):
            return [f'TYPE MISMATCH: {path} (intended=dict, actual={type(actual).__name__})']
        for key in intended:
            if key not in actual:
                diffs.append(f'MISSING: {path}.{key}')
            else:
                diffs.extend(compare(intended[key], actual[key], f'{path}.{key}'))
        for key in actual:
            if key not in intended:
                diffs.append(f'EXTRA: {path}.{key}')
    elif isinstance(intended, list):
        if not isinstance(actual, list):
            return [f'TYPE MISMATCH: {path} (intended=list, actual={type(actual).__name__})']
        if len(intended) != len(actual):
            diffs.append(f'LENGTH MISMATCH: {path} (intended={len(intended)}, actual={len(actual)})')
        else:
            for i, (a, b) in enumerate(zip(intended, actual)):
                diffs.extend(compare(a, b, f'{path}[{i}]'))
    elif intended != actual:
        diffs.append(f'VALUE MISMATCH: {path} (intended={intended}, actual={actual})')
    return diffs

diffs = compare(intended_spec, actual_spec)
if diffs:
    print('VALIDATION FAILED:')
    for d in diffs:
        print(f'  {d}')
    sys.exit(1)
else:
    print('VALIDATION PASSED: Resource matches intended state')
PY
```

## Validating Felix Enforcement

```bash
#!/bin/bash
# validate-felix-sync.sh
# Verify Felix has processed the replaced resource

set -euo pipefail

CALICO_NAMESPACE="${CALICO_NAMESPACE:-calico-system}"

echo "=== Felix Sync Status ==="

# Check all calico-node pods for sync state
kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-node -o name | while read pod; do
  node=$(kubectl get "$pod" -n "$CALICO_NAMESPACE" -o jsonpath='{.spec.nodeName}')
  # Check Felix metrics for in-sync state
  sync_status=$(kubectl exec -n "$CALICO_NAMESPACE" "${pod##*/}" -c calico-node -- \
    wget -q -O- http://localhost:9091/metrics 2>/dev/null | \
    awk '/^felix_resync_state($|[ {])/ {print $NF; exit}' || true)
  case "$sync_status" in
    3) echo "Node: $node - in sync with datastore" ;;
    2) echo "Node: $node - resync in progress" ;;
    1) echo "Node: $node - waiting for datastore" ;;
    *) echo "Node: $node - unknown or metrics unavailable" ;;
  esac
done

# Check recent Felix logs for policy updates
echo ""
echo "=== Recent Policy Updates ==="
kubectl logs -n "$CALICO_NAMESPACE" -l k8s-app=calico-node -c calico-node --tail=20 2>/dev/null | \
  grep -i "policy\|replaced\|updated" | tail -10
```

## Network Connectivity Validation

```bash
#!/bin/bash
# validate-connectivity.sh
# Tests network connectivity to validate replaced policy

set -euo pipefail

TESTS_PASSED=0
TESTS_FAILED=0

test_connection() {
  local desc="$1"
  local src_deploy="$2"
  local target="$3"
  local expected="$4"  # "pass" or "fail"

  result=$(kubectl exec deploy/"$src_deploy" -- curl -s --max-time 5 -o /dev/null -w "%{http_code}" "$target" 2>/dev/null || echo "000")

  if [ "$expected" = "pass" ] && [ "$result" != "000" ]; then
    echo "PASS: $desc (status: $result)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  elif [ "$expected" = "fail" ] && [ "$result" = "000" ]; then
    echo "PASS: $desc (connection blocked as expected)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "FAIL: $desc (status: $result, expected: $expected)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Define test cases based on your policy
test_connection "Frontend to API" "frontend" "http://api:8080/health" "pass"
test_connection "Frontend to Admin (should fail)" "frontend" "http://admin:8080/health" "fail"

echo ""
echo "Results: $TESTS_PASSED passed, $TESTS_FAILED failed"
[ "$TESTS_FAILED" -eq 0 ] || exit 1
```

```mermaid
flowchart TD
    A[calicoctl replace completed] --> B[Resource State Validation]
    B --> C{Spec matches intended?}
    C -->|No| D[Replace failed or partial]
    C -->|Yes| E[Felix Enforcement Check]
    E --> F{Felix in sync?}
    F -->|No| G[Wait 30s and retry]
    F -->|Yes| H[Network Connectivity Test]
    H --> I{All tests pass?}
    I -->|No| J[Check selectors and rules]
    I -->|Yes| K[Validation Complete]
```

## Verification

```bash
export DATASTORE_TYPE=kubernetes
export CALICO_NAMESPACE=calico-system  # Use kube-system for manifest-based installations that deploy calico-node there.

# Run full validation
./validate-replace.sh intended-policy.yaml
./validate-felix-sync.sh
./validate-connectivity.sh

# Quick manual verification
calicoctl get globalnetworkpolicy my-policy -o yaml
```

## Troubleshooting

- **Spec comparison shows unexpected extra fields**: The cluster may add default values not present in your definition. Update your intended file to include defaults, or exclude known auto-populated fields from comparison.
- **Felix shows stale sync state**: Wait 30 seconds after replace for Felix to process. If still stale, check Felix logs for errors.
- **Connectivity test fails intermittently**: Existing TCP connections may persist after policy change. Test with new connections using short timeouts.
- **Validation passes but users report issues**: Check that validation tests cover all relevant traffic patterns. Add test cases for edge cases like UDP, ICMP, and cross-namespace traffic.

## Conclusion

Validating calicoctl replace results requires checking three layers: resource state in the datastore matches the intended definition, Felix has synchronized the change, and actual network behavior reflects the policy. Automate these validation steps and run them as part of every replace operation to catch issues before they affect production traffic.
