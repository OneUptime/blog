# How to Configure Percentage-Based Fault Injection in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Fault Injection, Traffic Management, VirtualService, Chaos Engineering

Description: How to use percentage-based fault injection in Istio to simulate partial failures and test your system under realistic degradation conditions.

---

Real-world service failures rarely happen all at once. More often, a database starts returning errors on 5% of queries, or a third-party API becomes slow for 20% of requests. These partial failures are the most dangerous because they're hard to detect and can lead to cascading problems that take down much more than the original failing component.

Istio's percentage-based fault injection lets you simulate exactly these scenarios. You pick a percentage, pick a fault type (delay or abort), and Istio handles the random distribution. This post covers how to configure it effectively and how to think about what percentages to use.

## How Percentage Selection Works

When you configure a fault with a percentage, the sidecar proxy makes a random decision for each incoming request. For a 30% abort rate, each request has an independent 30% chance of being aborted. Over a large number of requests, the actual rate will converge to the configured percentage, but for small samples, you'll see statistical variation.

The percentage field accepts a value from 0.0 to 100.0, with decimal precision:

```yaml
fault:
  abort:
    httpStatus: 503
    percentage:
      value: 33.3
```

This gives each request a 33.3% chance of being aborted.

## Configuring Percentage-Based Aborts

A basic percentage-based abort injection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: inventory-service
  namespace: production
spec:
  hosts:
    - inventory-service
  http:
    - fault:
        abort:
          httpStatus: 500
          percentage:
            value: 15.0
      route:
        - destination:
            host: inventory-service
```

15% of requests to inventory-service get a 500 error. The rest proceed normally.

## Configuring Percentage-Based Delays

Same concept, but with delays instead of errors:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: inventory-service
  namespace: production
spec:
  hosts:
    - inventory-service
  http:
    - fault:
        delay:
          fixedDelay: 3s
          percentage:
            value: 20.0
      route:
        - destination:
            host: inventory-service
```

20% of requests experience a 3-second delay. This simulates a partially degraded service.

## Combining Percentage-Based Delays and Aborts

You can apply both delay and abort percentages in the same rule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: inventory-service
  namespace: production
spec:
  hosts:
    - inventory-service
  http:
    - fault:
        delay:
          fixedDelay: 2s
          percentage:
            value: 30.0
        abort:
          httpStatus: 503
          percentage:
            value: 10.0
      route:
        - destination:
            host: inventory-service
```

The percentages are evaluated independently. Here's how it breaks down for each request:

1. First, the abort check runs: 10% chance of immediate 503
2. If the request survives the abort check, the delay check runs: 30% chance of 2-second delay
3. If neither fault triggers, the request proceeds normally

So the effective distribution is roughly:
- 10% of requests get aborted
- 27% of requests get delayed (30% of the 90% that aren't aborted)
- 63% of requests proceed normally

## Choosing the Right Percentages

The percentage you choose should reflect the failure mode you're trying to simulate:

### Light Degradation (1-5%)

Simulates the early stages of a problem. Hard for monitoring to detect, but can affect some users:

```yaml
fault:
  abort:
    httpStatus: 500
    percentage:
      value: 3.0
```

Good for testing:
- Whether your alerting thresholds are sensitive enough
- Whether error tracking catches low-rate failures
- Whether individual users notice the problem

### Moderate Degradation (10-25%)

Simulates a clear problem that should trigger alerts:

```yaml
fault:
  abort:
    httpStatus: 500
    percentage:
      value: 20.0
```

Good for testing:
- Retry effectiveness (retries should mask many of these failures)
- Circuit breaker behavior (should they trip at this rate?)
- User experience during degradation

### Severe Degradation (50-75%)

The service is mostly broken but still handling some traffic:

```yaml
fault:
  abort:
    httpStatus: 503
    percentage:
      value: 60.0
```

Good for testing:
- Fallback behavior
- Graceful degradation patterns
- Whether the system sheds load appropriately

### Near-Total Failure (90-100%)

The service is effectively down:

```yaml
fault:
  abort:
    httpStatus: 503
    percentage:
      value: 95.0
```

Good for testing:
- Complete fallback paths
- Error pages and user communication
- Recovery behavior when the fault is removed

## Progressive Fault Injection

A powerful testing pattern is to gradually increase the fault percentage over time and watch how the system responds:

```bash
#!/bin/bash
# progressive-fault.sh

for pct in 5 10 20 30 50 75; do
  echo "Setting fault percentage to ${pct}%..."

  cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: inventory-service
  namespace: production
spec:
  hosts:
    - inventory-service
  http:
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: ${pct}.0
      route:
        - destination:
            host: inventory-service
EOF

  echo "Running at ${pct}% for 2 minutes..."
  sleep 120
done

# Clean up
kubectl delete virtualservice inventory-service -n production
echo "Fault injection removed."
```

Watch your dashboards during this progression. You should see:

- Error rates climbing proportionally
- Retry rates increasing
- Circuit breakers potentially activating
- Latency increasing (if retries add delay)

## Verifying the Actual Fault Rate

To confirm that the configured percentage matches reality, send a batch of requests and count:

```bash
# Send 1000 requests and count status codes
total=1000
errors=0

for i in $(seq 1 $total); do
  code=$(kubectl exec deploy/test-client -n production -- curl -s -o /dev/null -w "%{http_code}" http://inventory-service:8080/stock)
  if [ "$code" != "200" ]; then
    errors=$((errors + 1))
  fi
done

echo "Errors: $errors / $total = $(echo "scale=1; $errors * 100 / $total" | bc)%"
```

For small sample sizes, the actual rate may differ from the configured percentage due to randomness. With 100 requests at a 10% fault rate, you might see anywhere from 5 to 15 failures. With 1000 requests, the rate should be much closer to 10%.

## Percentage-Based Fault Injection per Route

Apply different percentages to different routes based on their criticality:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: inventory-service
  namespace: production
spec:
  hosts:
    - inventory-service
  http:
    # Search endpoint - lower tolerance
    - match:
        - uri:
            prefix: /api/search
      fault:
        delay:
          fixedDelay: 2s
          percentage:
            value: 10.0
      route:
        - destination:
            host: inventory-service
    # Admin endpoint - higher fault rate for testing
    - match:
        - uri:
            prefix: /admin
      fault:
        abort:
          httpStatus: 500
          percentage:
            value: 50.0
      route:
        - destination:
            host: inventory-service
    # Default - small fault rate
    - fault:
        abort:
          httpStatus: 503
          percentage:
            value: 5.0
      route:
        - destination:
            host: inventory-service
```

## Monitoring During Percentage-Based Tests

Set up a simple monitoring script to track the impact:

```bash
# Watch error rate in real-time using Istio metrics
watch -n 5 'kubectl exec -n istio-system deploy/prometheus -- curl -s "localhost:9090/api/v1/query?query=sum(rate(istio_requests_total\{destination_service=\"inventory-service.production.svc.cluster.local\",response_code=~\"5.*\"\}[1m]))/sum(rate(istio_requests_total\{destination_service=\"inventory-service.production.svc.cluster.local\"\}[1m]))*100" 2>/dev/null | jq -r ".data.result[0].value[1]"'
```

Percentage-based fault injection is the most realistic way to simulate production failures. It lets you test not just whether your system handles failures, but how well it handles them at different failure rates. Start low, observe, increase, and you'll quickly learn where your resilience breaks down.
