# How to Test Authorization Policies Systematically in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Testing, Authorization, Security, Kubernetes

Description: A systematic approach to testing Istio authorization policies including test matrices, automated test suites, and continuous policy validation.

---

Authorization policies that aren't tested are policies you can't trust. A single misconfigured rule can either block legitimate traffic (causing outages) or allow unauthorized access (creating security holes). Testing authorization policies systematically means building a repeatable process that covers both positive cases (things that should work) and negative cases (things that should be blocked).

The tricky part about testing Istio authorization is that policies interact with each other. DENY policies override ALLOW policies. Namespace-level policies interact with workload-level policies. A change in one policy can affect the behavior of another. You need to test the full policy set, not just individual rules.

## Building a Test Matrix

Start by mapping out who should be able to access what. Create a matrix of source services, destination services, HTTP methods, and expected outcomes:

```yaml
# test-matrix.yaml
tests:
  # Order Service access control
  - name: "Frontend can read orders"
    source:
      namespace: frontend
      serviceAccount: web-app
    destination:
      service: order-service.backend.svc.cluster.local
      port: 8080
      method: GET
      path: /api/orders
    expected: 200

  - name: "Frontend cannot create orders directly"
    source:
      namespace: frontend
      serviceAccount: web-app
    destination:
      service: order-service.backend.svc.cluster.local
      port: 8080
      method: POST
      path: /api/orders
    expected: 403

  - name: "Checkout can create orders"
    source:
      namespace: frontend
      serviceAccount: checkout-service
    destination:
      service: order-service.backend.svc.cluster.local
      port: 8080
      method: POST
      path: /api/orders
    expected: 200

  - name: "Unknown service cannot access orders"
    source:
      namespace: default
      serviceAccount: default
    destination:
      service: order-service.backend.svc.cluster.local
      port: 8080
      method: GET
      path: /api/orders
    expected: 403

  - name: "Admin can delete orders"
    source:
      namespace: admin
      serviceAccount: admin-service
    destination:
      service: order-service.backend.svc.cluster.local
      port: 8080
      method: DELETE
      path: /api/orders/123
    expected: 200
```

## Automated Test Runner

Build a test runner that executes each test case from the correct source identity:

```bash
#!/bin/bash
# test-authz.sh - Automated authorization policy test runner

TESTS_FILE="${1:-test-matrix.yaml}"
PASS_COUNT=0
FAIL_COUNT=0
TOTAL=0

echo "=== Istio Authorization Policy Test Suite ==="
echo "Started: $(date)"
echo ""

# Parse and run each test
python3 -c "
import yaml, sys
with open('$TESTS_FILE') as f:
    data = yaml.safe_load(f)
for i, test in enumerate(data['tests']):
    print(f\"{i}|{test['name']}|{test['source']['namespace']}|{test['source']['serviceAccount']}|{test['destination']['service']}|{test['destination']['port']}|{test['destination']['method']}|{test['destination']['path']}|{test['expected']}\")
" | while IFS='|' read -r IDX NAME SRC_NS SRC_SA DEST_SVC DEST_PORT METHOD PATH EXPECTED; do
    TOTAL=$((TOTAL + 1))

    # Create a test pod with the right service account if it doesn't exist
    POD_NAME="authz-test-${SRC_NS}-${SRC_SA}"
    kubectl get pod $POD_NAME -n $SRC_NS >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        kubectl run $POD_NAME -n $SRC_NS \
            --image=curlimages/curl:latest \
            --overrides="{\"spec\":{\"serviceAccountName\":\"${SRC_SA}\"}}" \
            --command -- sleep 3600 >/dev/null 2>&1
        kubectl wait --for=condition=Ready pod/$POD_NAME -n $SRC_NS --timeout=60s >/dev/null 2>&1
    fi

    # Run the test
    ACTUAL=$(kubectl exec -n $SRC_NS $POD_NAME -- \
        curl -s -o /dev/null -w "%{http_code}" \
        -X $METHOD "http://${DEST_SVC}:${DEST_PORT}${PATH}" \
        --max-time 5 2>/dev/null)

    if [ "$ACTUAL" = "$EXPECTED" ]; then
        echo "PASS: $NAME (expected=$EXPECTED, got=$ACTUAL)"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "FAIL: $NAME (expected=$EXPECTED, got=$ACTUAL)"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

echo ""
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed out of $TOTAL tests"
```

## Test Pods Setup

Before running tests, you need test pods with the right service accounts in each relevant namespace:

```yaml
# test-pods.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: test-runner
  namespace: frontend
---
apiVersion: v1
kind: Pod
metadata:
  name: authz-test-frontend
  namespace: frontend
  labels:
    app: authz-test
spec:
  serviceAccountName: web-app  # Use the real service account
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ["sleep", "infinity"]
---
apiVersion: v1
kind: Pod
metadata:
  name: authz-test-checkout
  namespace: frontend
  labels:
    app: authz-test
spec:
  serviceAccountName: checkout-service
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ["sleep", "infinity"]
---
apiVersion: v1
kind: Pod
metadata:
  name: authz-test-admin
  namespace: admin
  labels:
    app: authz-test
spec:
  serviceAccountName: admin-service
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ["sleep", "infinity"]
---
apiVersion: v1
kind: Pod
metadata:
  name: authz-test-default
  namespace: default
  labels:
    app: authz-test
spec:
  serviceAccountName: default
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ["sleep", "infinity"]
```

## Using istioctl for Policy Analysis

Before deploying policies, use `istioctl analyze` to catch errors:

```bash
# Analyze all policies in a namespace
istioctl analyze -n backend

# Analyze specific files
istioctl analyze -f authorization-policies.yaml

# Analyze everything
istioctl analyze --all-namespaces
```

Common issues it catches:
- Policies targeting non-existent workloads
- Conflicting policies
- Syntax errors in rules

## Testing DENY Policies

DENY policies are evaluated before ALLOW policies. Test that DENY rules can't be overridden:

```yaml
# deny-policy.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
  - from:
    - source:
        namespaces: ["default"]
```

Test cases for this deny policy:

```bash
# Should be denied (403) even though there might be ALLOW policies
kubectl exec -n default authz-test-default -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://api-server.backend.svc.cluster.local:8080/api/health

# Should be allowed (200) if there's an ALLOW policy for frontend
kubectl exec -n frontend authz-test-frontend -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://api-server.backend.svc.cluster.local:8080/api/health
```

## Testing Policy Ordering

Istio evaluates policies in a specific order. Test that your policies work correctly together:

```bash
#!/bin/bash
# Test policy interaction

echo "Test 1: DENY takes precedence over ALLOW"
# Apply both an ALLOW and a DENY for the same source
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all
  namespace: test
spec:
  selector:
    matchLabels:
      app: test-app
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["default"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-default
  namespace: test
spec:
  selector:
    matchLabels:
      app: test-app
  action: DENY
  rules:
  - from:
    - source:
        namespaces: ["default"]
EOF

sleep 5  # Wait for policy propagation

RESULT=$(kubectl exec -n default authz-test-default -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://test-app.test.svc.cluster.local:8080/health)

if [ "$RESULT" = "403" ]; then
  echo "  PASS: DENY correctly overrides ALLOW (got 403)"
else
  echo "  FAIL: Expected 403, got $RESULT"
fi

# Cleanup
kubectl delete authorizationpolicy allow-all deny-default -n test
```

## Continuous Integration Testing

Run authorization tests as part of your CI pipeline:

```yaml
# .github/workflows/authz-tests.yaml
name: Authorization Policy Tests

on:
  pull_request:
    paths:
    - 'k8s/istio/authorization/**'

jobs:
  test-policies:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Set up Kind cluster
      uses: engineerd/setup-kind@v0.5.0

    - name: Install Istio
      run: |
        istioctl install --set profile=demo -y
        kubectl label namespace default istio-injection=enabled

    - name: Deploy test services
      run: |
        kubectl apply -f tests/fixtures/test-services.yaml
        kubectl wait --for=condition=Ready pods --all -n default --timeout=120s

    - name: Apply authorization policies
      run: kubectl apply -f k8s/istio/authorization/

    - name: Wait for policy propagation
      run: sleep 10

    - name: Run authorization tests
      run: ./tests/test-authz.sh tests/test-matrix.yaml

    - name: Cleanup
      if: always()
      run: kind delete cluster
```

## Mutation Testing for Policies

Test that your policies actually matter by temporarily modifying them and checking that tests fail:

```bash
#!/bin/bash
# Mutation test: remove a policy and verify that tests fail appropriately

POLICY_NAME="order-service-auth"
NAMESPACE="backend"

echo "Mutation test: removing $POLICY_NAME"

# Save the current policy
kubectl get authorizationpolicy $POLICY_NAME -n $NAMESPACE -o yaml > /tmp/saved-policy.yaml

# Delete the policy
kubectl delete authorizationpolicy $POLICY_NAME -n $NAMESPACE
sleep 5

# Run the tests - some should now fail
./test-authz.sh test-matrix.yaml > /tmp/mutation-results.txt 2>&1
FAILURES=$(grep -c "FAIL" /tmp/mutation-results.txt)

if [ "$FAILURES" -gt 0 ]; then
  echo "GOOD: Removing policy caused $FAILURES test failures (policy is effective)"
else
  echo "BAD: Removing policy caused no test failures (policy might be unnecessary)"
fi

# Restore the policy
kubectl apply -f /tmp/saved-policy.yaml
```

## Testing with Different Auth Contexts

Test JWT-based policies with different token payloads:

```bash
# Generate test tokens with different claims
# (In practice, use a test JWT issuer)

# Token with admin role
ADMIN_TOKEN=$(python3 -c "
import jwt, time
token = jwt.encode({
    'iss': 'https://auth.example.com/',
    'sub': 'admin-user',
    'role': 'admin',
    'exp': int(time.time()) + 3600
}, 'test-secret', algorithm='HS256')
print(token)
")

# Token with viewer role
VIEWER_TOKEN=$(python3 -c "
import jwt, time
token = jwt.encode({
    'iss': 'https://auth.example.com/',
    'sub': 'viewer-user',
    'role': 'viewer',
    'exp': int(time.time()) + 3600
}, 'test-secret', algorithm='HS256')
print(token)
")

# Test admin can write
kubectl exec -n frontend authz-test-frontend -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://api-server.backend.svc.cluster.local:8080/api/data

# Test viewer cannot write
kubectl exec -n frontend authz-test-frontend -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  http://api-server.backend.svc.cluster.local:8080/api/data
```

## Summary

A good authorization testing strategy has these components:

1. A test matrix that covers all source/destination/method/path combinations
2. Test pods with the right service accounts deployed in the right namespaces
3. An automated runner that executes tests and reports results
4. CI integration that runs tests on every policy change
5. Mutation testing to verify policies are effective
6. Continuous monitoring in production to detect policy violations

Testing isn't glamorous, but it's the difference between authorization that works on paper and authorization that actually protects your services. Run the tests before every policy change, and run them regularly even when nothing changes, because other changes in the cluster (new services, renamed service accounts) can break existing policies.
