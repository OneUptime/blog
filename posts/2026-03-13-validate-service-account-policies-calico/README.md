# How to Validate Calico Service Account-Based Policies Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Service Account, Validation

Description: Build a validation framework for Calico service account-based network policies that verifies SA coverage and policy correctness before production deployment.

---

## Introduction

Validating service account-based Calico policies requires checking that every workload is running with the correct service account, that policy SA selectors match existing service accounts, and that the traffic behavior matches the intended security model.

A common validation gap is checking the policy but not the underlying SA assignments. A correctly written SA policy is useless if the target pods are running as the default service account.

## Prerequisites

- Kubernetes cluster with Calico v3.26+ (staging)
- `calicoctl`, `kubectl`, and Python 3

## Step 1: Validate SA Coverage

```python
#!/usr/bin/env python3
import subprocess, json, sys

try:
    result = subprocess.run(
        ["kubectl", "get", "pods", "--all-namespaces", "-o", "json"],
        capture_output=True, text=True, check=True
    )
except subprocess.CalledProcessError as exc:
    print(exc.stderr, file=sys.stderr)
    sys.exit(exc.returncode)

pods = json.loads(result.stdout)

errors = []
for pod in pods["items"]:
    ns = pod["metadata"]["namespace"]
    name = pod["metadata"]["name"]
    sa = pod["spec"].get("serviceAccountName", "default")
    
    if ns in ["kube-system", "calico-system", "kube-public"]:
        continue
    
    if sa == "default":
        errors.append(f"Pod {ns}/{name} uses default SA - may not match intended SA policies")

if errors:
    for e in errors:
        print(f"WARNING: {e}")
    sys.exit(1 if len(errors) > 3 else 0)  # Allow up to 3 default SA pods
print(f"SA validation passed. Default SA pods: {len(errors)}")
```

## Step 2: Validate Policy SA Selector Syntax

```bash
# Validate all SA-based policies without applying them

for f in policies/sa-*.yaml; do
  echo "Validating: $f"
  calicoctl validate -f "$f"
  
  # Extract exact-name SA selectors and verify the SA exists.
  # Calico matches service account names with the automatic projectcalico.org/name label.
  SA_NAME=$(sed -nE "s/.*serviceAccountSelector:.*projectcalico\.org\/name[[:space:]]*==[[:space:]]*['\"]([^'\"]+)['\"].*/\1/p" "$f" | head -1)
  if [ -n "$SA_NAME" ]; then
    NS=$(awk '/^metadata:/{in_meta=1; next} in_meta && /^[^[:space:]]/{in_meta=0} in_meta && /^[[:space:]]+namespace:/{print $2; exit}' "$f")
    NS=${NS:-default}
    kubectl get serviceaccount "$SA_NAME" -n "$NS" &>/dev/null || \
      echo "WARNING: SA '$SA_NAME' not found in namespace '$NS'"
  fi
done
```

## Step 3: Behavioral Tests in Staging

```bash
#!/bin/bash
# sa-policy-tests.sh
TESTS_PASSED=0
TESTS_FAILED=0

test_sa_access() {
  local desc="$1" src_pod="$2" src_ns="$3" dest_ip="$4" port="$5" expected="$6"
  # Verify SA first
  SA=$(kubectl get pod "$src_pod" -n "$src_ns" -o jsonpath='{.spec.serviceAccountName}')
  echo "  Source SA: $SA"
  
  kubectl exec -n "$src_ns" "$src_pod" -- nc -zv -w 3 "$dest_ip" "$port" 2>/dev/null
  local exit=$?
  
  if { [ $exit -eq 0 ] && [ "$expected" == "allow" ]; } || { [ $exit -ne 0 ] && [ "$expected" == "deny" ]; }; then
    echo "PASS: $desc"
    ((TESTS_PASSED++))
  else
    echo "FAIL: $desc (SA: $SA, expected: $expected)"
    ((TESTS_FAILED++))
  fi
}

echo "Running SA policy validation tests..."
# Add test cases here
echo "Results: $TESTS_PASSED passed, $TESTS_FAILED failed"
[ "$TESTS_FAILED" -eq 0 ]
```

## Validation Pipeline

```mermaid
flowchart LR
    A[Policy PR] --> B[Schema Validate]
    B --> C[SA Coverage Check]
    C --> D[SA Selector Verify]
    D --> E[Deploy to Staging]
    E --> F[Behavioral Tests]
    F --> G{All Pass?}
    G -->|Yes| H[Approve Prod]
    G -->|No| I[Block + Report]
```

## Conclusion

Service account policy validation must check both the policies and the underlying SA assignments. A policy that is syntactically correct but references a SA that no pods are using provides no security value. Automate SA coverage checks alongside policy schema validation in your CI/CD pipeline, and run behavioral tests in staging after every policy change. This comprehensive validation approach ensures your SA-based security controls actually work as intended.
