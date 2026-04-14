# How to Test Dapr Disaster Recovery Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Disaster Recovery, Testing, Chaos Engineering, Kubernetes

Description: Learn how to test Dapr disaster recovery procedures using chaos engineering tools and scheduled DR drills to validate recovery objectives before a real outage occurs.

---

## Why DR Testing Is Essential

A disaster recovery plan that has never been tested is not a plan - it is a hypothesis. Regular DR testing validates that your Dapr components fail over correctly, that data loss stays within RPO targets, and that services recover within RTO targets. It also trains your team to execute recovery procedures under pressure.

## Testing with Chaos Mesh

Install Chaos Mesh to inject controlled failures into Dapr components:

```bash
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-testing \
  --create-namespace \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock
```

## Simulating State Store Failure

Kill the Redis state store and verify Dapr handles it gracefully:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-redis-primary
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
    - production
    labelSelectors:
      app: redis-primary
```

Monitor how Dapr services respond:

```bash
# Watch service error rates during chaos
watch -n 2 'kubectl logs -n production -l app=payment-service \
  --tail=20 | grep -E "error|circuit|retry"'

# Check circuit breaker state
kubectl exec -n production deployment/payment-service -c daprd -- \
  curl -s http://localhost:3500/v1.0/healthz
```

## Network Partition Test

Test that Dapr services handle network partitions between regions:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: partition-us-east-to-eu-west
  namespace: chaos-testing
spec:
  action: partition
  mode: all
  selector:
    namespaces:
    - production
  direction: both
  target:
    mode: all
    selector:
      namespaces:
      - production
      labelSelectors:
        region: eu-west
  duration: "5m"
```

## DR Drill Script

Automate a complete DR drill with pass/fail assertions:

```bash
#!/bin/bash
# dr-drill.sh
NAMESPACE="production"
DR_CONTEXT="k8s-dr"
PRIMARY_CONTEXT="k8s-primary"
PASS=0
FAIL=0

check() {
    local description="$1"
    local command="$2"
    if eval "$command" > /dev/null 2>&1; then
        echo "PASS: $description"
        PASS=$((PASS + 1))
    else
        echo "FAIL: $description"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== Dapr DR Drill - $(date) ==="

# Test 1: DR cluster Dapr system health
check "DR cluster Dapr system pods running" \
  "kubectl --context=$DR_CONTEXT get pods -n dapr-system | grep -c Running | grep -qv '^0$'"

# Test 2: Components are present in DR
check "State store component exists in DR" \
  "kubectl --context=$DR_CONTEXT get component statestore -n $NAMESPACE"

# Test 3: Can write and read state in DR
STATE_KEY="dr-test-$(date +%s)"
curl -s -X POST "http://dr-svc/v1.0/state/statestore" \
  -H "Content-Type: application/json" \
  -d "[{\"key\": \"$STATE_KEY\", \"value\": \"dr-test\"}]"
check "State read/write in DR cluster works" \
  "curl -sf http://dr-svc/v1.0/state/statestore/$STATE_KEY | grep -q dr-test"

# Test 4: Pub/sub publish works in DR
check "Pub/sub publish works in DR" \
  "curl -sf -X POST http://dr-svc/v1.0/publish/pubsub/test-topic \
    -H 'Content-Type: application/json' -d '{\"test\": true}'"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && echo "DR DRILL PASSED" || echo "DR DRILL FAILED"
```

## Scheduling Regular DR Drills

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dr-drill
  namespace: chaos-testing
spec:
  schedule: "0 3 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: dr-drill
            image: myregistry/dr-tools:latest
            command: ["/bin/bash", "/scripts/dr-drill.sh"]
          restartPolicy: Never
```

## Summary

Testing Dapr disaster recovery requires both chaos engineering tools like Chaos Mesh for injecting infrastructure failures and scripted DR drills that validate specific recovery assertions. Run automated state store kill tests and network partition tests regularly to verify circuit breakers and retry policies behave as expected. Schedule weekly DR drills via Kubernetes CronJobs and track pass/fail trends over time to catch regressions before they become production incidents.
