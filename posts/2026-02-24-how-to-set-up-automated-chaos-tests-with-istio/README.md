# How to Set Up Automated Chaos Tests with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Chaos Engineering, Automation, CI/CD, Kubernetes, Testing

Description: How to automate chaos engineering experiments with Istio fault injection as part of your CI/CD pipeline for continuous resilience validation.

---

Running chaos experiments manually is a good start, but the real value comes when you automate them. Automated chaos tests catch resilience regressions the same way automated unit tests catch code bugs. Every time you deploy a new version, the chaos tests verify that your error handling, timeouts, and circuit breakers still work correctly.

Here is how to set up automated chaos testing using Istio fault injection, scripted validation, and CI/CD integration.

## The Basic Approach

An automated chaos test follows this pattern:

1. Deploy the application
2. Verify steady state (everything works normally)
3. Inject a fault using Istio VirtualService
4. Verify the system degrades gracefully
5. Remove the fault
6. Verify the system recovers

Each of these steps can be scripted and run as part of a CI/CD pipeline.

## Setting Up the Test Framework

Create a dedicated namespace for chaos tests:

```bash
kubectl create namespace chaos-auto
kubectl label namespace chaos-auto istio-injection=enabled
```

Deploy the application:

```bash
kubectl apply -n chaos-auto -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -n chaos-auto -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/destination-rule-all.yaml
kubectl wait --for=condition=ready pod --all -n chaos-auto --timeout=120s
```

## Writing Chaos Test Scripts

Here is a bash script that runs a complete chaos experiment:

```bash
#!/bin/bash
set -e

NAMESPACE="chaos-auto"
PRODUCTPAGE_URL="http://productpage.${NAMESPACE}.svc.cluster.local:9080/productpage"

# Function to check if productpage returns 200
check_health() {
  local description=$1
  local expected_code=$2
  local actual_code

  actual_code=$(kubectl exec -n $NAMESPACE deploy/ratings-v1 -- \
    curl -s -o /dev/null -w "%{http_code}" $PRODUCTPAGE_URL)

  if [ "$actual_code" == "$expected_code" ]; then
    echo "PASS: $description (got $actual_code)"
    return 0
  else
    echo "FAIL: $description (expected $expected_code, got $actual_code)"
    return 1
  fi
}

# Function to check response time
check_latency() {
  local description=$1
  local max_seconds=$2
  local actual_time

  actual_time=$(kubectl exec -n $NAMESPACE deploy/ratings-v1 -- \
    curl -s -o /dev/null -w "%{time_total}" $PRODUCTPAGE_URL)

  if (( $(echo "$actual_time < $max_seconds" | bc -l) )); then
    echo "PASS: $description (${actual_time}s < ${max_seconds}s)"
    return 0
  else
    echo "FAIL: $description (${actual_time}s >= ${max_seconds}s)"
    return 1
  fi
}

echo "=== Step 1: Verify Steady State ==="
check_health "Productpage is healthy" "200"
check_latency "Productpage responds within 5s" "5"

echo "=== Step 2: Inject Fault ==="
kubectl apply -n $NAMESPACE -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-fault
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 503
    route:
    - destination:
        host: ratings
EOF

sleep 5  # Wait for Envoy to pick up the config

echo "=== Step 3: Verify Graceful Degradation ==="
check_health "Productpage still returns 200 with ratings down" "200"
check_latency "Productpage still responds within 5s" "5"

echo "=== Step 4: Remove Fault ==="
kubectl delete virtualservice ratings-fault -n $NAMESPACE

sleep 5

echo "=== Step 5: Verify Recovery ==="
check_health "Productpage recovered to healthy state" "200"
check_latency "Productpage latency back to normal" "5"

echo "=== All tests passed ==="
```

Save this as `chaos-test-ratings-abort.sh`.

## Creating a Test Suite

Build multiple test scripts for different scenarios:

```bash
#!/bin/bash
# chaos-test-suite.sh
set -e

NAMESPACE="chaos-auto"
PASS=0
FAIL=0

run_test() {
  local test_name=$1
  local test_script=$2

  echo ""
  echo "=========================================="
  echo "Running: $test_name"
  echo "=========================================="

  if bash "$test_script"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
}

run_test "Ratings Abort Test" "./tests/chaos-test-ratings-abort.sh"
run_test "Reviews Delay Test" "./tests/chaos-test-reviews-delay.sh"
run_test "Details Timeout Test" "./tests/chaos-test-details-timeout.sh"
run_test "Cascade Failure Test" "./tests/chaos-test-cascade.sh"

echo ""
echo "=========================================="
echo "Results: $PASS passed, $FAIL failed"
echo "=========================================="

if [ $FAIL -gt 0 ]; then
  exit 1
fi
```

## Kubernetes Job-Based Test Runner

Run chaos tests as Kubernetes Jobs for better isolation:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: chaos-test-run
  namespace: chaos-auto
spec:
  backoffLimit: 0
  template:
    spec:
      serviceAccountName: chaos-test-runner
      containers:
      - name: test-runner
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "Checking steady state..."
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            http://productpage.chaos-auto.svc.cluster.local:9080/productpage)
          [ "$STATUS" = "200" ] || exit 1
          echo "Steady state OK"

          echo "Injecting fault..."
          cat <<FAULT | kubectl apply -n chaos-auto -f -
          apiVersion: networking.istio.io/v1
          kind: VirtualService
          metadata:
            name: ratings-fault
          spec:
            hosts:
            - ratings
            http:
            - fault:
                abort:
                  percentage:
                    value: 100
                  httpStatus: 503
              route:
              - destination:
                  host: ratings
          FAULT

          sleep 5

          echo "Checking degradation..."
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            http://productpage.chaos-auto.svc.cluster.local:9080/productpage)
          [ "$STATUS" = "200" ] || exit 1
          echo "Graceful degradation OK"

          echo "Removing fault..."
          kubectl delete virtualservice ratings-fault -n chaos-auto

          echo "ALL TESTS PASSED"
      restartPolicy: Never
```

Create the service account with necessary permissions:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: chaos-test-runner
  namespace: chaos-auto
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: chaos-test-runner
  namespace: chaos-auto
rules:
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices"]
  verbs: ["create", "delete", "get", "list", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: chaos-test-runner
  namespace: chaos-auto
subjects:
- kind: ServiceAccount
  name: chaos-test-runner
roleRef:
  kind: Role
  name: chaos-test-runner
  apiGroup: rbac.authorization.k8s.io
```

## CI/CD Integration with GitHub Actions

Here is a GitHub Actions workflow that runs chaos tests after deployment:

```yaml
name: Chaos Tests
on:
  workflow_run:
    workflows: ["Deploy"]
    types: [completed]

jobs:
  chaos-tests:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
    - uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.KUBECONFIG }}

    - name: Run chaos test suite
      run: |
        chmod +x ./tests/chaos-test-suite.sh
        ./tests/chaos-test-suite.sh
      timeout-minutes: 15

    - name: Cleanup on failure
      if: failure()
      run: |
        kubectl delete virtualservice --all -n chaos-auto
```

## Scheduling Recurring Chaos Tests

Use a CronJob to run chaos tests periodically:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-chaos-test
  namespace: chaos-auto
spec:
  schedule: "0 2 * * *"  # Run at 2 AM daily
  jobTemplate:
    spec:
      backoffLimit: 0
      template:
        spec:
          serviceAccountName: chaos-test-runner
          containers:
          - name: test-runner
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "-c"]
            args:
            - |
              # Run your chaos test suite here
              echo "Running scheduled chaos tests..."
              # ... test logic ...
          restartPolicy: Never
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
```

## Monitoring and Alerting

Set up alerts for failed chaos tests. If you use Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: chaos-test-alerts
  namespace: chaos-auto
spec:
  groups:
  - name: chaos-tests
    rules:
    - alert: ChaosTestFailed
      expr: kube_job_status_failed{namespace="chaos-auto",job_name=~"chaos-test.*"} > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Chaos test failed"
        description: "A scheduled chaos test has failed, indicating a potential resilience regression."
```

## Best Practices for Automated Chaos Tests

1. **Always clean up**. Make sure fault injection is removed even if the test fails. Use trap handlers in bash scripts.

2. **Add timeouts**. A chaos test that hangs is worse than one that fails. Set reasonable timeouts on every step.

3. **Run in isolated namespaces**. Never run automated chaos tests against production namespaces without explicit approval.

4. **Start simple**. Begin with single-service fault injection and work up to multi-service cascade tests.

5. **Version your tests**. Keep chaos test scripts in the same repository as your application code so they stay in sync.

## Cleanup

```bash
kubectl delete namespace chaos-auto
```

Automated chaos testing with Istio turns resilience from a hope into a guarantee. By running these tests regularly, you catch problems early and build confidence that your system handles failures correctly. It is one of those practices that feels like extra work at first but pays for itself many times over.
