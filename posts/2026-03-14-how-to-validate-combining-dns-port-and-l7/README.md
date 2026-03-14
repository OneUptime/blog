# Validating DNS, Port, and L7 Combined Rules in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security, DNS, Validation

Description: Learn how to validate combined DNS, port, and L7 rules in Cilium for Kubernetes. This guide covers practical testing procedures with real examples and commands.

---

## Introduction

Validating combined DNS, port, and L7 rules in Cilium ensures that your security policies are enforced correctly and that your cluster behaves as expected. Without proper validation, policy gaps may go undetected until they are exploited.

A robust validation strategy combines automated testing, flow observation, and policy state inspection. This guide provides a structured approach to validating your multi-layer security policies across different scenarios.

By integrating these validation steps into your deployment workflow, you can catch misconfigurations early and maintain confidence in your security posture.

## Prerequisites

- Kubernetes cluster with Cilium (v1.14+) installed
- `cilium` CLI and Hubble CLI available
- `kubectl` access to the cluster
- A staging or test namespace for validation
- Familiarity with CiliumNetworkPolicy syntax

## Setting Up Validation Tests

Create a dedicated test environment for policy validation:

```bash
# Create a validation namespace
kubectl create namespace cilium-validate

# Deploy test workloads
kubectl -n cilium-validate run server \
  --image=nginx:1.25 --labels="app=server" --port=80
kubectl -n cilium-validate expose pod server --port=80

kubectl -n cilium-validate run client \
  --image=busybox:1.36 --labels="app=client" \
  --command -- sleep 3600
```

```mermaid
graph TD
    A[Prepare Validation Environment] --> B[Deploy Test Workloads]
    B --> C[Apply Policies]
    C --> D[Run Connectivity Tests]
    D --> E{All Tests Pass?}
    E -->|Yes| F[Run Hubble Flow Analysis]
    E -->|No| G[Log Failures for Review]
    F --> H{Expected Flows Only?}
    H -->|Yes| I[Validation Passed]
    H -->|No| J[Investigate Unexpected Flows]
    G --> K[Adjust Policies]
    J --> K
    K --> C
```

## Validating Policy Enforcement

Apply the policy and verify it is enforced:

```yaml
# Test policy for validation
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: combined-l7-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-gateway
  egress:
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
          rules:
            dns:
              - matchPattern: "*.backend.local"
    - toFQDNs:
        - matchPattern: "*.backend.local"
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: "GET"
                path: "/api/v1/.*"
              - method: "POST"
                path: "/api/v1/data"
                headers:
                  - 'Content-Type: application/json'
```

```bash
# Validate all endpoints have policies applied
cilium endpoint list -o json | jq '.[] | {id: .id, policy: .status.policy}'
```

### Running Connectivity Tests

```bash
# Run Cilium connectivity test suite
cilium connectivity test
```

### Observing Flows with Hubble

```bash
# Monitor all flows in the validation namespace
hubble observe --namespace cilium-validate --output compact --last 50

# Verify allowed traffic succeeds
kubectl -n cilium-validate exec client -- \
  wget --timeout=5 -q -O - http://server

# Verify unauthorized traffic is blocked
kubectl -n cilium-validate run unauthorized \
  --image=busybox:1.36 --rm -it --restart=Never \
  --labels="app=unauthorized" -- \
  wget --timeout=3 -q -O - http://server

# Check Hubble for the expected drop
hubble observe --namespace cilium-validate --verdict DROPPED --last 10
```

## Automated Validation Script

```bash
#!/bin/bash
# validate-cilium.sh
# Automated validation script for Cilium policies

set -euo pipefail

NAMESPACE="cilium-validate"
PASS=0
FAIL=0

echo "=== Cilium Policy Validation ==="

# Test 1: Cilium agent health
echo -n "Test 1: Cilium agent health... "
if cilium status > /dev/null 2>&1; then
  echo "PASS"; ((PASS++))
else
  echo "FAIL"; ((FAIL++))
fi

# Test 2: All endpoints ready
echo -n "Test 2: All endpoints ready... "
NOT_READY=$(cilium endpoint list -o json | \
  jq '[.[] | select(.status.state != "ready")] | length')
if [ "$NOT_READY" -eq 0 ]; then
  echo "PASS"; ((PASS++))
else
  echo "FAIL ($NOT_READY not ready)"; ((FAIL++))
fi

# Test 3: Policies applied
echo -n "Test 3: Policies applied... "
POLICY_COUNT=$(cilium policy get -o json | jq '. | length')
if [ "$POLICY_COUNT" -gt 0 ]; then
  echo "PASS ($POLICY_COUNT policies)"; ((PASS++))
else
  echo "FAIL (no policies)"; ((FAIL++))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
exit $FAIL
```

## Verification

```bash
# Final validation check
cilium status
```

```bash
# Confirm all endpoints are healthy
cilium endpoint health
```

```bash
# Verify no policy violations
hubble observe --verdict DROPPED --last 20 --output compact
```

## Troubleshooting

- **Connectivity test failures**: Check if Hubble relay is running and if test pods have correct labels.
- **Validation namespace conflicts**: Ensure no pre-existing policies in the validation namespace interfere with tests.
- **Inconsistent test results**: Run tests multiple times to rule out timing issues with policy propagation.
- **Test pods stuck in Pending**: Verify cluster has sufficient resources and the test images are accessible.

## Conclusion

Validating combined DNS, port, and L7 rules in Cilium is an ongoing practice that should be embedded in your CI/CD pipeline. The combination of Cilium's connectivity tests, Hubble flow observation, and custom validation scripts provides comprehensive coverage. Regular validation catches configuration drift, policy regressions, and enforcement gaps before they impact production. Always maintain your validation test suite alongside your policy definitions.
