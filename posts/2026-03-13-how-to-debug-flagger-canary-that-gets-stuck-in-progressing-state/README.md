# How to Debug Flagger Canary That Gets Stuck in Progressing State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Debugging, Kubernetes, Canary Deployments, Troubleshooting

Description: Learn how to diagnose and fix a Flagger canary deployment that gets stuck in the Progressing state and never completes.

---

## Introduction

One of the most common issues when working with Flagger is a canary deployment that enters the Progressing state and stays there indefinitely. The canary never advances through the traffic shifting steps and never reaches promotion or rollback. This can block your deployment pipeline and leave your application in a partially deployed state.

Understanding why a canary gets stuck requires checking several components including Flagger logs, metric availability, mesh or ingress configuration, and the health of the canary pods themselves. This guide walks through the most common causes and provides step-by-step debugging procedures to get your canary deployments moving again.

## Prerequisites

Before debugging, ensure you have:

- `kubectl` access to the cluster where Flagger is running.
- Access to Flagger logs.
- Access to your metrics provider (typically Prometheus).

## Step 1: Check the Canary Status

Start by examining the current state of the canary resource.

```bash
# Get the canary status
kubectl get canary -n <namespace>

# Get detailed information about the canary
kubectl describe canary <name> -n <namespace>
```

Look at the Status section of the describe output. The conditions and events will provide the first clues about what is going wrong. Pay attention to the `lastTransitionTime`, `status`, and `message` fields.

## Step 2: Examine Flagger Logs

Flagger logs contain detailed information about each analysis step. Check the logs for errors or warnings related to your canary.

```bash
# View Flagger logs filtered for your canary
kubectl logs -l app.kubernetes.io/name=flagger \
  -n <flagger-namespace> --tail=100

# Search for specific canary events
kubectl logs -l app.kubernetes.io/name=flagger \
  -n <flagger-namespace> --tail=200 | grep "<canary-name>"
```

Common log messages that indicate problems include metric query failures, webhook errors, and mesh provider errors.

## Step 3: Verify Canary Pod Health

The canary Deployment must have healthy pods before Flagger will proceed with analysis.

```bash
# Check the canary deployment pods
kubectl get pods -n <namespace> -l app=<app-name>

# Check pod readiness
kubectl describe pod <canary-pod-name> -n <namespace>

# Check pod logs for application errors
kubectl logs <canary-pod-name> -n <namespace>
```

If the canary pods are not ready, Flagger will not advance the analysis. Common issues include failing readiness probes, crash loops, and resource limit constraints.

## Step 4: Verify Metrics Availability

Flagger requires metrics to evaluate the canary. If the metrics server is unreachable or the queries return no data, the analysis will stall.

```bash
# Test Prometheus connectivity from within the cluster
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -s "http://prometheus.monitoring:9090/api/v1/query?query=up"
```

Check that the metric queries used in your Canary resource return data. You can test PromQL queries directly against Prometheus.

```bash
# Test the request-success-rate metric query
kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -- \
  curl -s 'http://prometheus.monitoring:9090/api/v1/query?query=sum(rate(http_requests_total{namespace="test"}[1m]))'
```

If the queries return empty results, the canary has no data to analyze and will remain stuck. Common causes include missing Prometheus scrape annotations, incorrect metric names, or pods not receiving traffic.

## Step 5: Check the Progress Deadline

The `progressDeadlineSeconds` setting in the Canary resource determines how long Flagger will wait before marking the canary as failed. If this is set too low, the canary might not have enough time to receive traffic and produce metrics.

```yaml
# Check your progress deadline setting
spec:
  progressDeadlineSeconds: 60  # This might be too low
```

Consider increasing this value if your application takes time to start receiving traffic or if metrics collection has a delay.

```yaml
# A more generous progress deadline
spec:
  progressDeadlineSeconds: 300
```

## Step 6: Verify Traffic Is Reaching the Canary

If the canary pods are healthy but no traffic reaches them, metrics will be empty and the analysis will not proceed.

```bash
# Port-forward to the canary service and send test traffic
kubectl port-forward svc/<app-name>-canary -n <namespace> 8080:80

# In another terminal, send a test request
curl http://localhost:8080/
```

If the canary service is not reachable, check the service selector labels and verify that the mesh or ingress controller is routing traffic correctly.

## Step 7: Check Webhooks

If your Canary resource includes webhooks (such as load test webhooks or confirmation webhooks), a failing webhook will block progression.

```bash
# Check if the load tester is running
kubectl get pods -n <namespace> -l app=flagger-loadtester

# Check load tester logs
kubectl logs -l app=flagger-loadtester -n <namespace>
```

A common issue is the load tester URL being incorrect or the load tester pod not being deployed.

## Step 8: Verify Mesh or Ingress Provider

The mesh provider or ingress controller must be functioning correctly for Flagger to manage traffic routing.

```bash
# For Istio - check VirtualService
kubectl get virtualservice -n <namespace> -o yaml

# For NGINX - check Ingress annotations
kubectl get ingress -n <namespace> -o yaml

# For Linkerd - check TrafficSplit
kubectl get trafficsplit -n <namespace> -o yaml
```

Ensure the routing resources exist and have the expected configuration. If the mesh provider is not properly installed or configured, Flagger cannot shift traffic.

## Step 9: Restart the Analysis

If you have identified and fixed the underlying issue, you can restart the canary analysis by triggering a new revision.

```bash
# Add a timestamp annotation to the pod template to trigger a restart
kubectl patch deployment/<name> -n <namespace> \
  -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"timestamp\":\"$(date +%s)\"}}}}}"
```

Alternatively, you can delete the canary resource and recreate it to start fresh.

```bash
# Delete and recreate the canary
kubectl delete canary <name> -n <namespace>
kubectl apply -f canary.yaml
```

## Common Causes Summary

The most frequent reasons for a canary stuck in Progressing state are: Prometheus not reachable or queries returning no data, canary pods failing readiness probes, load test webhooks not running or misconfigured, the mesh or ingress controller not routing traffic to the canary, and the progress deadline being set too short for the environment.

## Conclusion

Debugging a stuck Flagger canary requires a systematic approach that checks each component in the delivery pipeline. Start with the canary status and Flagger logs, then verify pod health, metrics availability, traffic routing, and webhook configuration. By working through these steps methodically, you can identify the root cause and get your canary deployments progressing again. Keeping Flagger logs at debug level and setting up monitoring for the canary status can help catch these issues early.
