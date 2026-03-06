# How to Troubleshoot Flagger Canary Rollback in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, Flagger, Troubleshooting, Canary, Rollback, Kubernetes, GitOps, Debugging

Description: A comprehensive troubleshooting guide for diagnosing and resolving Flagger canary rollback issues in Flux-managed Kubernetes clusters.

---

## Introduction

Canary rollbacks are an expected and healthy part of progressive delivery. When Flagger detects that a canary deployment does not meet the defined thresholds, it automatically rolls back traffic to the primary version. However, unexpected or repeated rollbacks can indicate configuration issues, infrastructure problems, or application bugs that need investigation.

This guide provides a systematic approach to troubleshooting Flagger canary rollbacks in Flux-managed Kubernetes clusters. You will learn how to diagnose why rollbacks occur, understand common failure patterns, and resolve the underlying issues.

## Prerequisites

- A Kubernetes cluster with Flux and Flagger installed
- An application with a Flagger Canary resource that is experiencing rollbacks
- kubectl and flux CLI tools
- Access to Flagger logs and Prometheus (or your metrics provider)

## Step 1: Check the Canary Status

Start by examining the current state of the Canary resource.

```bash
# Get the canary status
kubectl get canary -n default

# Get detailed canary information
kubectl describe canary my-app -n default
```

Look for the following fields in the output:

- **Status**: Should show "Failed" if a rollback occurred
- **Failed Checks**: Number of consecutive failed metric checks
- **Conditions**: Detailed status messages about what happened
- **Last Transition Time**: When the rollback occurred

```bash
# Get canary status in JSON for detailed analysis
kubectl get canary my-app -n default -o jsonpath='{.status}' | jq .
```

## Step 2: Review Flagger Events

Kubernetes events provide a timeline of what happened during the canary deployment.

```bash
# Get events for the canary resource
kubectl get events -n default \
  --field-selector involvedObject.name=my-app \
  --sort-by='.lastTimestamp'

# Filter for warning events only
kubectl get events -n default \
  --field-selector involvedObject.name=my-app,type=Warning \
  --sort-by='.lastTimestamp'
```

Common event messages during rollbacks:

- "Halt advancement, threshold reached" - metric checks failed too many times
- "Rolling back, canary failed" - rollback is in progress
- "Canary failed! Scaling down" - rollback completed

## Step 3: Examine Flagger Logs

Flagger logs contain detailed information about metric queries and analysis results.

```bash
# View recent Flagger logs
kubectl logs -n flagger-system deployment/flagger --tail=200

# Filter for your specific canary
kubectl logs -n flagger-system deployment/flagger --tail=500 | grep "my-app"

# Filter for errors and warnings
kubectl logs -n flagger-system deployment/flagger --tail=500 | grep -iE "error|warn|fail|rollback"

# Stream logs in real time during a deployment
kubectl logs -n flagger-system deployment/flagger -f | grep "my-app"
```

Key log entries to look for:

- Metric query results and whether they passed or failed
- Webhook call results
- Traffic weight changes
- Rollback trigger messages

## Step 4: Diagnose Metric Check Failures

The most common cause of rollbacks is failed metric checks. Identify which metrics are failing.

```bash
# Check canary conditions for metric failures
kubectl get canary my-app -n default -o jsonpath='{.status.conditions[*].message}'
```

### Verify Prometheus Metrics Exist

If using Prometheus, check that the expected metrics are available.

```bash
# Port-forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &

# Check if request success rate metrics exist for the canary
curl -s "http://localhost:9090/api/v1/query" \
  --data-urlencode 'query=istio_requests_total{destination_workload="my-app-canary",reporter="destination"}' \
  | jq '.data.result | length'

# Check if the metric query returns a valid value
curl -s "http://localhost:9090/api/v1/query" \
  --data-urlencode 'query=sum(rate(istio_requests_total{destination_workload="my-app-canary",reporter="destination",response_code!~"5.*"}[1m])) / sum(rate(istio_requests_total{destination_workload="my-app-canary",reporter="destination"}[1m])) * 100' \
  | jq '.data.result'
```

### Common Metric Issues

```yaml
# Issue 1: Threshold too strict
# If your success rate threshold is 99% but normal traffic has occasional errors
analysis:
  metrics:
    - name: request-success-rate
      thresholdRange:
        # Consider lowering from 99 to 95 if seeing false positives
        min: 95
      interval: 1m

# Issue 2: Interval too short
# Metrics may not have enough data points in a short window
analysis:
  metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      # Increase from 30s to 2m for more reliable data
      interval: 2m

# Issue 3: No traffic to canary
# Without traffic, metrics return NaN which counts as a failure
# Ensure load testing is configured
analysis:
  webhooks:
    - name: load-test
      type: rollout
      url: http://flagger-loadtester.flagger-system.svc.cluster.local/
      timeout: 5s
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default.svc.cluster.local:80/"
```

## Step 5: Diagnose Webhook Failures

Webhook failures also cause rollbacks. Check webhook service health.

```bash
# Check if the webhook service is running
kubectl get pods -n flagger-system -l app=flagger-loadtester

# Check webhook service logs
kubectl logs -n flagger-system deployment/flagger-loadtester --tail=100

# Test webhook connectivity
kubectl run -n flagger-system test-webhook --rm -it --image=curlimages/curl -- \
  curl -sv http://flagger-loadtester.flagger-system.svc.cluster.local/healthz
```

Common webhook issues:

- Load tester pod is not running or is in CrashLoopBackOff
- Webhook URL is incorrect
- Webhook timeout is too short for the test being run
- Network policy blocking the webhook call

## Step 6: Check Canary Pod Health

The canary pods themselves might be failing.

```bash
# Check canary deployment pods
kubectl get pods -n default -l app=my-app

# Look for canary-specific pods
kubectl get pods -n default -l app.kubernetes.io/name=my-app

# Check pod events for crash loops or image pull errors
kubectl describe pods -n default -l app=my-app | grep -A 5 "Events:"

# Check container logs for application errors
kubectl logs -n default -l app=my-app --tail=50

# Check for OOMKilled or other container issues
kubectl get pods -n default -l app=my-app -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[*].lastState}{"\n"}{end}'
```

## Step 7: Verify Service Mesh Configuration

If using a service mesh like Istio, misconfiguration can cause rollbacks.

```bash
# Check Istio sidecar injection
kubectl get pods -n default -l app=my-app -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'

# Verify VirtualService exists and has correct routing
kubectl get virtualservice -n default

# Check DestinationRule
kubectl get destinationrule -n default

# Verify Istio proxy status
istioctl proxy-status | grep my-app
```

## Step 8: Investigate Traffic Routing Issues

Sometimes the canary receives no traffic, causing metric queries to return no data.

```bash
# Check if the canary service exists
kubectl get svc -n default | grep my-app

# Verify endpoints are populated
kubectl get endpoints -n default my-app-canary

# Check traffic split configuration
kubectl get virtualservice my-app -n default -o yaml | grep -A 20 "route:"
```

## Step 9: Common Rollback Scenarios and Solutions

### Scenario 1: Rollback Due to No Metrics Data

```yaml
# Problem: No traffic reaching canary, metrics return NaN
# Solution: Add load testing webhook
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 10
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
    webhooks:
      # Always include a load test to ensure metrics data exists
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default.svc.cluster.local:80/"
```

### Scenario 2: Rollback Due to Slow Startup

```yaml
# Problem: App takes too long to start, fails health checks
# Solution: Add skipAnalysis for initial iterations or increase threshold
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  # Skip analysis during the first iteration to allow warm-up
  skipAnalysis: false
  analysis:
    interval: 1m
    # Increase threshold to allow more failures during warm-up
    threshold: 10
    maxWeight: 50
    stepWeight: 5
    # Number of iterations to skip before starting analysis
    iterations: 0
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

### Scenario 3: Rollback Due to Resource Constraints

```bash
# Check if pods are being throttled or OOMKilled
kubectl top pods -n default -l app=my-app

# Check resource requests and limits
kubectl get deployment my-app -n default -o jsonpath='{.spec.template.spec.containers[0].resources}'
```

```yaml
# Solution: Increase resource limits for the canary
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: my-app
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
```

### Scenario 4: Rollback Due to Flagger Controller Issues

```bash
# Check Flagger controller health
kubectl get pods -n flagger-system

# Check for resource constraints on the Flagger pod
kubectl top pods -n flagger-system

# Restart Flagger if it is stuck
kubectl rollout restart deployment/flagger -n flagger-system
```

## Step 10: Monitoring Rollback Patterns

Set up monitoring to track rollback frequency and identify patterns.

```bash
# Count rollbacks in the last 24 hours from events
kubectl get events -n default \
  --field-selector involvedObject.name=my-app,reason=Synced \
  --sort-by='.lastTimestamp' | grep -c "Rolling back"

# Check Flagger Prometheus metrics for rollback counts
curl -s "http://localhost:9090/api/v1/query" \
  --data-urlencode 'query=flagger_canary_status{name="my-app",namespace="default"}' \
  | jq '.data.result'
```

## Step 11: Preventing Future Rollbacks

Apply these best practices to reduce unnecessary rollbacks.

```yaml
# Best practice canary configuration
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  # Allow pods time to become ready
  progressDeadlineSeconds: 120
  service:
    port: 80
    targetPort: 8080
  analysis:
    # Longer interval gives metrics time to stabilize
    interval: 2m
    # Higher threshold allows for transient failures
    threshold: 10
    # Start with lower traffic percentage
    maxWeight: 50
    # Smaller steps for gradual rollout
    stepWeight: 5
    metrics:
      # Use realistic thresholds based on baseline performance
      - name: request-success-rate
        thresholdRange:
          min: 95
        interval: 2m
      - name: request-duration
        thresholdRange:
          max: 1000
        interval: 2m
    webhooks:
      # Always include load testing
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          cmd: "hey -z 2m -q 10 -c 2 http://my-app-canary.default.svc.cluster.local:80/"
```

## Quick Troubleshooting Checklist

Use this checklist when debugging a rollback:

```bash
# 1. What is the canary status?
kubectl get canary my-app -n default

# 2. What do the events say?
kubectl get events -n default --field-selector involvedObject.name=my-app --sort-by='.lastTimestamp' | tail -20

# 3. What do Flagger logs say?
kubectl logs -n flagger-system deployment/flagger --tail=100 | grep "my-app"

# 4. Are canary pods healthy?
kubectl get pods -n default -l app=my-app

# 5. Is the load tester running?
kubectl get pods -n flagger-system -l app=flagger-loadtester

# 6. Do metrics exist in Prometheus?
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
curl -s "http://localhost:9090/api/v1/query" --data-urlencode 'query=up{app="my-app"}' | jq '.data.result | length'

# 7. Are services and endpoints correct?
kubectl get svc,endpoints -n default | grep my-app
```

## Conclusion

Troubleshooting Flagger canary rollbacks requires a systematic approach. Start by checking the canary status and events, then examine Flagger logs for metric check results, verify webhook health, and inspect the canary pods. Most rollbacks are caused by insufficient traffic (no load testing), overly strict thresholds, application startup delays, or resource constraints. By following the diagnostic steps and best practices in this guide, you can quickly identify and resolve rollback issues, ensuring smooth progressive delivery in your Flux-managed Kubernetes clusters.
