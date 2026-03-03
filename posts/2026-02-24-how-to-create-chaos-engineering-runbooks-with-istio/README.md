# How to Create Chaos Engineering Runbooks with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Chaos Engineering, Runbook, Incident Response, Kubernetes

Description: How to build structured chaos engineering runbooks using Istio fault injection to systematically validate service resilience and document expected behavior.

---

A chaos engineering runbook is a documented, repeatable procedure for testing specific failure scenarios. It is the difference between "we tried breaking some stuff and it seemed okay" and "we tested 15 specific failure modes and documented the expected behavior for each one." Runbooks make chaos engineering systematic, shareable, and auditable.

Istio is a great foundation for chaos runbooks because the fault injection is declarative (YAML files), repeatable (apply and delete), and observable (built-in telemetry).

## Anatomy of a Chaos Runbook

Every chaos runbook should have these sections:

1. **Experiment name and description**: What are we testing and why?
2. **Prerequisites**: What needs to be in place before running?
3. **Steady state definition**: What does "normal" look like?
4. **Hypothesis**: What do we expect to happen?
5. **Fault injection steps**: Exactly what to apply
6. **Observation steps**: What to check and how
7. **Rollback procedure**: How to undo the fault
8. **Results template**: Where to record findings
9. **Follow-up actions**: What to fix if the test fails

## Example Runbook 1: Upstream Service Failure

### Experiment: Reviews Service Complete Failure

**Description**: Test how the productpage handles a complete failure of the reviews service. We expect the page to load with degraded functionality, showing book details without reviews.

**Prerequisites**:
```bash
# Verify the namespace exists and has Istio injection
kubectl get namespace bookinfo --show-labels

# Verify all pods are running
kubectl get pods -n bookinfo -l app=productpage
kubectl get pods -n bookinfo -l app=reviews
kubectl get pods -n bookinfo -l app=ratings
kubectl get pods -n bookinfo -l app=details
```

**Steady State Verification**:
```bash
# The productpage should return 200
STATUS=$(kubectl exec -n bookinfo deploy/ratings-v1 -- \
  curl -s -o /dev/null -w "%{http_code}" productpage:9080/productpage)
echo "Status: $STATUS"  # Expected: 200

# The page should contain reviews content
REVIEWS=$(kubectl exec -n bookinfo deploy/ratings-v1 -- \
  curl -s productpage:9080/productpage | grep -c "reviews")
echo "Reviews present: $REVIEWS"  # Expected: > 0

# Baseline latency
TIME=$(kubectl exec -n bookinfo deploy/ratings-v1 -- \
  curl -s -o /dev/null -w "%{time_total}" productpage:9080/productpage)
echo "Latency: ${TIME}s"  # Expected: < 2s
```

**Hypothesis**: When the reviews service returns 503 errors, the productpage will still return HTTP 200 with book details and an error message where reviews would normally appear. Latency should not increase significantly.

**Fault Injection**:
```yaml
# File: runbook-reviews-failure.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-failure
  namespace: bookinfo
spec:
  hosts:
  - reviews
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 503
    route:
    - destination:
        host: reviews
```

```bash
kubectl apply -f runbook-reviews-failure.yaml
sleep 5  # Wait for Envoy config propagation
```

**Observation Steps**:
```bash
# Check 1: Page still returns 200
STATUS=$(kubectl exec -n bookinfo deploy/ratings-v1 -- \
  curl -s -o /dev/null -w "%{http_code}" productpage:9080/productpage)
echo "Check 1 - HTTP Status: $STATUS"
# PASS if 200, FAIL if anything else

# Check 2: Page loads within acceptable time
TIME=$(kubectl exec -n bookinfo deploy/ratings-v1 -- \
  curl -s -o /dev/null -w "%{time_total}" productpage:9080/productpage)
echo "Check 2 - Latency: ${TIME}s"
# PASS if < 3s, FAIL if >= 3s

# Check 3: Details section still present
DETAILS=$(kubectl exec -n bookinfo deploy/ratings-v1 -- \
  curl -s productpage:9080/productpage | grep -c "Book Details")
echo "Check 3 - Details present: $DETAILS"
# PASS if > 0, FAIL if 0

# Check 4: Error indicators in Envoy stats
kubectl exec -n bookinfo deploy/productpage-v1 -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_5xx"
```

**Rollback**:
```bash
kubectl delete -f runbook-reviews-failure.yaml
sleep 5

# Verify recovery
STATUS=$(kubectl exec -n bookinfo deploy/ratings-v1 -- \
  curl -s -o /dev/null -w "%{http_code}" productpage:9080/productpage)
echo "Recovery status: $STATUS"  # Should be 200
```

## Example Runbook 2: Latency Degradation

### Experiment: Ratings Service Latency Spike

**Description**: Test how the system handles a 5-second latency spike in the ratings service. We expect the reviews service to time out and show reviews without ratings, and the productpage to remain responsive.

**Fault Injection**:
```yaml
# File: runbook-ratings-latency.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-latency
  namespace: bookinfo
spec:
  hosts:
  - ratings
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 5s
    route:
    - destination:
        host: ratings
```

**Observation Steps**:
```bash
# Check 1: Page load time should not exceed the reviews timeout
TIME=$(kubectl exec -n bookinfo deploy/ratings-v1 -- \
  curl -s -o /dev/null -w "%{time_total}" productpage:9080/productpage)
echo "Check 1 - Total page load: ${TIME}s"
# PASS if productpage has a timeout < 5s for reviews
# FAIL if page takes full 5+ seconds

# Check 2: Multiple requests to check consistency
for i in $(seq 1 5); do
  kubectl exec -n bookinfo deploy/ratings-v1 -- \
    curl -s -o /dev/null -w "Request $i: %{http_code} in %{time_total}s\n" \
    productpage:9080/productpage
done
```

## Example Runbook 3: Partial Failure Under Load

### Experiment: Intermittent Failures During Traffic Spike

**Description**: Simulate a scenario where 25% of requests to ratings fail while the system is under 10x normal load. This tests both error handling and capacity management simultaneously.

**Fault Injection**:
```yaml
# File: runbook-partial-failure-load.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-partial
  namespace: bookinfo
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 25
        httpStatus: 500
    route:
    - destination:
        host: ratings
```

**Load Generation**:
```bash
kubectl exec -n bookinfo deploy/ratings-v1 -- \
  fortio load -c 32 -qps 100 -t 120s \
  http://productpage.bookinfo.svc.cluster.local:9080/productpage
```

**Observations**: Track error rate, p99 latency, and throughput during the test.

## Organizing Your Runbook Library

Store runbooks in a directory structure like this:

```text
chaos-runbooks/
  service-failure/
    reviews-failure.yaml
    reviews-failure-runbook.md
    ratings-failure.yaml
    ratings-failure-runbook.md
  latency/
    ratings-latency.yaml
    ratings-latency-runbook.md
    reviews-latency.yaml
    reviews-latency-runbook.md
  cascade/
    multi-service-degradation.yaml
    multi-service-degradation-runbook.md
  load/
    connection-pool-exhaustion.yaml
    connection-pool-exhaustion-runbook.md
```

Keep the YAML fault injection files alongside the runbook documentation. This makes it easy to run experiments directly from the runbook.

## Automating Runbook Execution

Turn each runbook into a script that can be run automatically:

```bash
#!/bin/bash
# runbook-runner.sh
set -e

RUNBOOK_DIR=$1
NAMESPACE=$2

if [ -z "$RUNBOOK_DIR" ] || [ -z "$NAMESPACE" ]; then
  echo "Usage: $0 <runbook-dir> <namespace>"
  exit 1
fi

echo "=== Running runbook: $RUNBOOK_DIR ==="

# Step 1: Apply fault
echo "Applying fault injection..."
kubectl apply -n $NAMESPACE -f ${RUNBOOK_DIR}/*.yaml
sleep 5

# Step 2: Run observation script
echo "Running observations..."
if [ -f "${RUNBOOK_DIR}/observe.sh" ]; then
  bash "${RUNBOOK_DIR}/observe.sh" $NAMESPACE
fi

# Step 3: Rollback
echo "Rolling back..."
kubectl delete -n $NAMESPACE -f ${RUNBOOK_DIR}/*.yaml
sleep 5

# Step 4: Verify recovery
echo "Verifying recovery..."
if [ -f "${RUNBOOK_DIR}/verify-recovery.sh" ]; then
  bash "${RUNBOOK_DIR}/verify-recovery.sh" $NAMESPACE
fi

echo "=== Runbook complete ==="
```

## Tracking Results Over Time

Create a simple results log:

```bash
#!/bin/bash
# log-result.sh
RUNBOOK=$1
RESULT=$2  # PASS or FAIL
NOTES=$3

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $RUNBOOK | $RESULT | $NOTES" >> chaos-results.log
```

Review the log periodically to spot trends:

```bash
# Show all failures in the last month
grep "FAIL" chaos-results.log | grep "2026-02"
```

## Tips for Effective Runbooks

1. **Be specific about expected behavior**. "The page should still work" is not a good criterion. "The page should return HTTP 200 within 3 seconds with the details section populated" is.

2. **Include rollback in every runbook**. Forgetting to clean up after a chaos test is embarrassing and potentially damaging.

3. **Version control your runbooks**. Store them in git alongside your application code. When the application changes, update the runbooks.

4. **Review runbooks after incidents**. Real incidents often reveal failure modes you did not think to test. Add new runbooks for each one.

5. **Schedule regular execution**. A runbook that only gets run once is not much better than no runbook at all. Run them weekly or after each deployment.

Well-structured chaos runbooks with Istio fault injection turn ad-hoc testing into a rigorous, repeatable process. They document your system's expected behavior under failure conditions, which is invaluable for both new team members and incident responders.
