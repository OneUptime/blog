# How to Implement Chaos Engineering with Istio Fault Injection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Chaos Engineering, Fault Injection, Resilience, Kubernetes

Description: A practical walkthrough of using Istio fault injection to implement chaos engineering experiments and improve service resilience.

---

Chaos engineering is about proactively breaking things to find weaknesses before they bite you in production. Istio makes this surprisingly easy because you can inject faults at the network layer without modifying any application code. The Envoy sidecar proxy intercepts all traffic, so you can add delays, abort requests, or corrupt responses just by applying a VirtualService configuration.

This is a huge advantage over other chaos engineering approaches that require agents installed in your pods or modifications to your application code.

## How Istio Fault Injection Works

Istio supports two types of fault injection through VirtualService resources:

1. **Delay faults**: Add artificial latency to requests, simulating slow network connections or overloaded upstream services.
2. **Abort faults**: Return HTTP error codes immediately without forwarding the request, simulating service failures.

Both can be applied to a percentage of traffic, making it possible to run experiments without taking down the entire service.

## Setting Up the Test Environment

Deploy the Bookinfo sample application, which gives us multiple services to experiment with:

```bash
kubectl create namespace chaos-test
kubectl label namespace chaos-test istio-injection=enabled

kubectl apply -n chaos-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -n chaos-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/bookinfo-gateway.yaml
kubectl apply -n chaos-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/destination-rule-all.yaml
```

Wait for everything to come up:

```bash
kubectl wait --for=condition=ready pod --all -n chaos-test --timeout=120s
```

Verify the app works:

```bash
kubectl exec -n chaos-test deploy/ratings-v1 -- \
  curl -s productpage:9080/productpage | grep -o "<title>.*</title>"
```

## Experiment 1: Inject Latency into Reviews Service

Suppose you want to test what happens when the reviews service gets slow. Maybe you want to verify that the productpage has proper timeouts configured.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-delay
  namespace: chaos-test
spec:
  hosts:
  - reviews
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 5s
    route:
    - destination:
        host: reviews
```

Apply it:

```bash
kubectl apply -n chaos-test -f reviews-delay.yaml
```

Now when you access the productpage, it will take 5 extra seconds because every call to the reviews service is delayed. This is useful for testing:
- Does the frontend show a loading indicator?
- Does the page eventually time out gracefully?
- Do users see a degraded but functional page?

## Experiment 2: Partial Failure

Real-world failures are usually partial. Not every request fails. Inject faults into only 50% of traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-partial-fault
  namespace: chaos-test
spec:
  hosts:
  - ratings
  http:
  - fault:
      abort:
        percentage:
          value: 50
        httpStatus: 500
    route:
    - destination:
        host: ratings
```

```bash
kubectl apply -n chaos-test -f ratings-partial-fault.yaml
```

Hit the productpage multiple times and you will see that sometimes the ratings show up fine and sometimes they are missing. This tests whether the frontend handles intermittent backend failures gracefully.

## Experiment 3: Combined Delay and Abort

You can combine both fault types in a single rule:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-combined-fault
  namespace: chaos-test
spec:
  hosts:
  - reviews
  http:
  - fault:
      delay:
        percentage:
          value: 30
        fixedDelay: 3s
      abort:
        percentage:
          value: 10
        httpStatus: 503
    route:
    - destination:
        host: reviews
```

This means 30% of requests will be slow and 10% will fail outright. The remaining 60% work normally. This is much closer to how real degraded services behave.

## Experiment 4: Fault Injection for Specific Users

Istio can match on headers, so you can inject faults only for specific test users:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-user-fault
  namespace: chaos-test
spec:
  hosts:
  - reviews
  http:
  - match:
    - headers:
        end-user:
          exact: chaos-tester
    fault:
      abort:
        percentage:
          value: 100
        httpStatus: 500
    route:
    - destination:
        host: reviews
  - route:
    - destination:
        host: reviews
```

This only injects faults when the `end-user` header is `chaos-tester`. Everyone else gets normal behavior. This is perfect for running chaos experiments in production without affecting real users.

## Experiment 5: Cascade Failure Testing

To test how a failure in a deep dependency cascades through your system, inject faults at multiple levels:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-down
  namespace: chaos-test
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
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: details-slow
  namespace: chaos-test
spec:
  hosts:
  - details
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 10s
    route:
    - destination:
        host: details
```

This simulates the ratings service being completely down while the details service is extremely slow. Watch how the productpage handles having two out of three backend services degraded.

## Monitoring During Experiments

While running chaos experiments, watch the Istio telemetry to understand the impact:

```bash
# Check request success rate
kubectl exec -n chaos-test deploy/productpage-v1 -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_"

# Check for circuit breaker trips
kubectl exec -n chaos-test deploy/productpage-v1 -c istio-proxy -- \
  pilot-agent request GET stats | grep "circuit_breaker"
```

If you have Prometheus and Grafana set up with Istio, monitor these queries:

```
# Request success rate
sum(rate(istio_requests_total{destination_service="reviews.chaos-test.svc.cluster.local",response_code="200"}[1m])) /
sum(rate(istio_requests_total{destination_service="reviews.chaos-test.svc.cluster.local"}[1m]))

# P99 latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="reviews.chaos-test.svc.cluster.local"}[1m])) by (le))
```

## Running a Structured Chaos Experiment

A proper chaos engineering experiment follows the scientific method:

1. **Hypothesis**: "If the ratings service returns 500 errors, the productpage will still load with reviews visible but without star ratings."

2. **Steady state**: Verify the application works normally. Record baseline metrics.

3. **Inject fault**: Apply the VirtualService fault injection.

4. **Observe**: Check if the hypothesis holds. Does the page degrade gracefully?

5. **Rollback**: Remove the fault injection.

```bash
# Rollback by deleting the VirtualService
kubectl delete virtualservice ratings-partial-fault -n chaos-test
```

6. **Document**: Record what happened and what needs to be fixed.

## Cleanup

```bash
kubectl delete namespace chaos-test
```

Istio fault injection gives you a powerful, non-invasive way to run chaos experiments. Because it operates at the proxy layer, you can test any service regardless of what language or framework it uses. Start with simple experiments on non-critical services and gradually work your way up to more complex, production-grade chaos tests.
