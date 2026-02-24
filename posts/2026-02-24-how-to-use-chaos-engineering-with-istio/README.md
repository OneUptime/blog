# How to Use Chaos Engineering with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Chaos Engineering, Fault Injection, Resilience, Kubernetes

Description: A practical guide to using Istio's fault injection capabilities for chaos engineering, including delay injection, abort injection, and combining with tools like Chaos Mesh.

---

Chaos engineering is about proactively breaking things in controlled ways to find weaknesses before they cause real outages. Istio is a great tool for this because it can inject faults at the network layer without modifying your application code. You can add latency, return error codes, and simulate network failures, all through configuration.

This guide covers how to use Istio's built-in fault injection features for chaos experiments and how to combine them with dedicated chaos engineering tools.

## Istio's Built-in Fault Injection

Istio supports two types of fault injection through VirtualService resources: delays and aborts. Delays add latency to requests, simulating slow services or network congestion. Aborts return error status codes, simulating service failures.

## Injecting Delays

A delay fault adds a fixed amount of latency to a percentage of requests. This is useful for testing how your services handle slow dependencies.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-delay
  namespace: bookinfo
spec:
  hosts:
  - ratings
  http:
  - fault:
      delay:
        percentage:
          value: 50
        fixedDelay: 5s
    route:
    - destination:
        host: ratings
```

This adds a 5-second delay to 50% of requests to the ratings service. Apply it and observe the impact:

```bash
kubectl apply -f ratings-delay.yaml

# Time a request to see the delay
kubectl exec -n bookinfo deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "Total time: %{time_total}s\n" \
  http://ratings:9080/ratings/1
```

Run it several times. Roughly half the requests should take around 5 seconds, and the other half should complete quickly.

## Injecting HTTP Errors

Abort faults return error status codes without the request actually reaching the destination:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-abort
  namespace: bookinfo
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 30
        httpStatus: 503
    route:
    - destination:
        host: ratings
```

This makes 30% of requests to the ratings service return a 503 Service Unavailable. Test it:

```bash
for i in $(seq 1 20); do
  kubectl exec -n bookinfo deploy/sleep -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}\n" http://ratings:9080/ratings/1
done
```

You should see a mix of 200 and 503 responses. Count them to verify the ratio is close to 70/30.

## Combining Delays and Aborts

You can apply both faults simultaneously to simulate more realistic failure scenarios:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-chaos
  namespace: bookinfo
spec:
  hosts:
  - ratings
  http:
  - fault:
      delay:
        percentage:
          value: 40
        fixedDelay: 3s
      abort:
        percentage:
          value: 20
        httpStatus: 500
    route:
    - destination:
        host: ratings
```

This configuration means: 20% of requests get a 500 error immediately, 40% of the remaining requests get a 3-second delay, and the rest go through normally. This simulates a degraded service that is both slow and partially failing.

## Targeting Specific Traffic

Fault injection gets more interesting when you target specific users or request patterns. Use match conditions to limit the blast radius:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-targeted-chaos
  namespace: bookinfo
spec:
  hosts:
  - ratings
  http:
  - match:
    - headers:
        x-chaos-test:
          exact: "true"
    fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 10s
    route:
    - destination:
        host: ratings
  - route:
    - destination:
        host: ratings
```

Only requests with the `x-chaos-test: true` header get the delay. Normal traffic flows unaffected. This is perfect for running chaos experiments in production without impacting real users:

```bash
# Normal request - no delay
kubectl exec -n bookinfo deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "Time: %{time_total}s\n" http://ratings:9080/ratings/1

# Chaos test - 10s delay
kubectl exec -n bookinfo deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "Time: %{time_total}s\n" \
  -H "x-chaos-test: true" http://ratings:9080/ratings/1
```

## Testing Circuit Breaker Behavior Under Chaos

Combine fault injection with circuit breaker configuration to verify your resilience patterns:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: ratings
  namespace: bookinfo
spec:
  host: ratings
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

Now inject errors and watch the circuit breaker trip:

```bash
# Send many requests quickly
for i in $(seq 1 50); do
  kubectl exec -n bookinfo deploy/sleep -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}\n" http://ratings:9080/ratings/1 &
done
wait
```

After enough 5xx errors, the outlier detection should eject the failing endpoints. Check the proxy stats:

```bash
kubectl exec -n bookinfo deploy/sleep -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection"
```

## Running a Structured Chaos Experiment

A proper chaos experiment follows the scientific method: define a hypothesis, run the experiment, observe results, and draw conclusions.

Here is a structured approach:

```bash
#!/bin/bash

echo "=== Chaos Experiment: Ratings Service Latency ==="
echo "Hypothesis: Product page handles 5s ratings latency gracefully"
echo "Expected: Product page responds in <6s, shows fallback for ratings"
echo ""

# Baseline measurement
echo "--- Baseline ---"
BASELINE=$(kubectl exec -n bookinfo deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{time_total}" http://productpage:9080/productpage)
echo "Product page response time: ${BASELINE}s"

# Inject fault
echo ""
echo "--- Injecting 5s delay on ratings ---"
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-delay
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
EOF

sleep 5

# Measure during fault
echo ""
echo "--- During Fault ---"
DURING=$(kubectl exec -n bookinfo deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{time_total}" http://productpage:9080/productpage)
echo "Product page response time: ${DURING}s"

# Check if response time is acceptable
THRESHOLD=8
if (( $(echo "$DURING < $THRESHOLD" | bc -l) )); then
  echo "PASS: Response time under ${THRESHOLD}s threshold"
else
  echo "FAIL: Response time exceeded ${THRESHOLD}s threshold"
fi

# Cleanup
echo ""
echo "--- Cleanup ---"
kubectl delete virtualservice ratings-delay -n bookinfo
```

## Combining Istio with Chaos Mesh

For more advanced chaos scenarios beyond what Istio's fault injection offers, use Chaos Mesh alongside Istio. Chaos Mesh can simulate pod failures, network partitions, disk I/O stress, and more.

Install Chaos Mesh:

```bash
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-mesh --create-namespace
```

Create a network partition experiment:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: partition-ratings
  namespace: bookinfo
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - bookinfo
    labelSelectors:
      app: ratings
  direction: both
  duration: "60s"
```

While Chaos Mesh handles the infrastructure-level chaos, Istio gives you visibility into how the mesh responds through its telemetry.

## Monitoring During Chaos Experiments

Use Istio's built-in metrics to observe the impact of your experiments. Query Prometheus for error rates:

```bash
# Check 5xx rate during experiment
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_requests_total{response_code=~"5.*",destination_service="ratings.bookinfo.svc.cluster.local"}[1m]))'
```

## Safety Measures

Always have safety guardrails for chaos experiments:

1. Start with low fault percentages and increase gradually
2. Set time limits on experiments
3. Have a quick rollback plan (deleting the VirtualService stops the fault immediately)
4. Monitor real user impact through your observability stack
5. Run experiments during low-traffic periods when starting out

```bash
# Quick rollback - delete all fault injection VirtualServices
kubectl delete virtualservice -n bookinfo -l chaos-experiment=true
```

## Wrapping Up

Istio's fault injection is one of the simplest ways to get started with chaos engineering. You do not need any extra tools or agents. Just write a VirtualService with fault configuration, apply it, and observe what happens. Start small with targeted delays, build up to error injection, and eventually combine with tools like Chaos Mesh for full-spectrum resilience testing. The goal is to find the weak spots in your system before your users do.
