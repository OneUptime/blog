# How to Perform Chaos Engineering with Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Chaos Engineering, Resilience, Testing, Kubernetes

Description: Apply chaos engineering principles to Dapr applications by injecting failures into sidecars, state stores, and pub/sub brokers to validate resiliency policies.

---

## Why Chaos Engineering Matters for Dapr Apps

Dapr's resiliency policies (retries, circuit breakers, timeouts) only provide value if they actually work under real failure conditions. Chaos engineering validates that your Dapr applications behave correctly when infrastructure components fail unexpectedly.

## Chaos Engineering Principles for Dapr

The core chaos engineering workflow:
1. Define steady-state behavior (baseline metrics)
2. Hypothesize that the system will remain stable under failure
3. Inject failures (network partitions, pod kills, latency)
4. Observe and compare against baseline
5. Fix resiliency gaps discovered

## Install a Chaos Engineering Tool

Use Chaos Toolkit, a lightweight Python-based framework:

```bash
pip install chaostoolkit chaostoolkit-kubernetes

# Verify installation
chaos --version
```

## Write a Chaos Experiment for Dapr Sidecar

Kill the Dapr sidecar of a target service and verify the calling service handles it gracefully:

```json
{
  "title": "Kill Dapr sidecar and verify caller resiliency",
  "description": "Terminate the dapr sidecar container and check the caller retries successfully",
  "steady-state-hypothesis": {
    "title": "Services respond normally",
    "probes": [
      {
        "type": "probe",
        "name": "service-responds",
        "tolerance": 200,
        "provider": {
          "type": "http",
          "url": "http://localhost:3500/v1.0/invoke/orderservice/method/health"
        }
      }
    ]
  },
  "method": [
    {
      "type": "action",
      "name": "kill-dapr-sidecar",
      "provider": {
        "type": "process",
        "path": "kubectl",
        "arguments": "exec -n default deployment/orderservice -c daprd -- kill 1"
      }
    }
  ],
  "rollbacks": []
}
```

Run the experiment:

```bash
chaos run dapr-sidecar-kill-experiment.json
```

## Inject CPU Stress on a Dapr App Pod

Use `kubectl exec` and `stress-ng` to simulate high CPU load:

```bash
# Deploy stress-ng as a sidecar or use existing pod
kubectl exec -it orderservice-pod -c app -- bash

# Inside the pod
stress-ng --cpu 2 --timeout 60s
```

Observe Dapr metrics during stress:

```bash
kubectl port-forward svc/prometheus 9090:9090 &
# Query: dapr_http_server_latency{app_id="orderservice"}
```

## Validate Resiliency Policy Fires During Chaos

Configure a resiliency policy first:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: chaos-resiliency
spec:
  policies:
    retries:
      chaosRetry:
        policy: exponential
        maxRetries: 5
        maxInterval: 10s
    circuitBreakers:
      chaosCircuitBreaker:
        maxRequests: 1
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures > 3
  targets:
    apps:
      orderservice:
        retry: chaosRetry
        circuitBreaker: chaosCircuitBreaker
```

Then inject failures and check Dapr logs:

```bash
kubectl logs -l app=callerservice -c daprd | grep -i "retry\|circuit"
```

## Summary

Chaos engineering for Dapr applications involves defining a steady state, injecting failures using tools like Chaos Toolkit or kubectl, and validating that Dapr resiliency policies (retries, circuit breakers) activate correctly. Running regular chaos experiments builds confidence that your Dapr microservices will survive real-world infrastructure failures.
