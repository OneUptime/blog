# How to Implement Traffic Shaping Pattern with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Shaping, Traffic Management, VirtualService, Canary Deployment

Description: How to implement traffic shaping in Istio using weighted routing, traffic mirroring, fault injection, and gradual rollout strategies.

---

Traffic shaping is the practice of controlling how traffic flows through your system. It goes beyond simple routing. With traffic shaping, you can gradually shift traffic between service versions, mirror production traffic for testing, inject faults to test resilience, and control the rate at which new versions receive real user traffic. Istio provides all of these capabilities through VirtualService and DestinationRule configurations.

## Weighted Traffic Splitting

The most fundamental traffic shaping technique is weighted splitting. You control exactly what percentage of traffic goes to each version of a service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: 80
    - destination:
        host: my-service
        subset: v2
      weight: 20
```

80% goes to v1, 20% goes to v2. The weights must add up to 100.

### Gradual Rollout Strategy

A typical canary deployment looks like this:

```bash
# Start at 1%
# Edit VirtualService: v1=99, v2=1
kubectl apply -f virtualservice-1pct.yaml
# Monitor for 10 minutes

# Bump to 10%
# Edit VirtualService: v1=90, v2=10
kubectl apply -f virtualservice-10pct.yaml
# Monitor for 30 minutes

# Bump to 50%
# Edit VirtualService: v1=50, v2=50
kubectl apply -f virtualservice-50pct.yaml
# Monitor for 1 hour

# Full rollout
# Edit VirtualService: v1=0, v2=100
kubectl apply -f virtualservice-100pct.yaml
```

You can automate this with a script:

```bash
#!/bin/bash
WEIGHTS=(1 5 10 25 50 75 100)
WAIT_TIMES=(300 300 600 900 1800 1800 0)

for i in "${!WEIGHTS[@]}"; do
  v2_weight=${WEIGHTS[$i]}
  v1_weight=$((100 - v2_weight))
  wait_time=${WAIT_TIMES[$i]}

  cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: $v1_weight
    - destination:
        host: my-service
        subset: v2
      weight: $v2_weight
EOF

  echo "Traffic split: v1=${v1_weight}%, v2=${v2_weight}%"

  if [ $wait_time -gt 0 ]; then
    echo "Waiting ${wait_time} seconds..."
    sleep $wait_time

    # Check error rate before proceeding
    ERROR_RATE=$(kubectl exec deploy/prometheus-server -n monitoring -- curl -s 'localhost:9090/api/v1/query?query=rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local",response_code=~"5.."}[5m])' | python3 -c "import json,sys; data=json.load(sys.stdin); print(sum(float(r['value'][1]) for r in data.get('data',{}).get('result',[])))")

    if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
      echo "Error rate too high ($ERROR_RATE), rolling back!"
      break
    fi
  fi
done
```

## Traffic Mirroring (Shadowing)

Traffic mirroring sends a copy of live traffic to another service for testing, without affecting the original traffic flow. The mirrored requests are fire-and-forget; responses from the mirror are discarded:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: 100
    mirror:
      host: my-service
      subset: v2
    mirrorPercentage:
      value: 100.0
```

All traffic goes to v1 (the production version). A copy of every request is also sent to v2 for testing. v2's responses are thrown away, so users are never affected by v2's behavior.

You can mirror a percentage of traffic to avoid overloading the test service:

```yaml
mirror:
  host: my-service
  subset: v2
mirrorPercentage:
  value: 10.0
```

This mirrors only 10% of requests.

### Use Cases for Mirroring

- **Testing a new version with production traffic** without risk to users
- **Load testing** by mirroring to a test environment
- **Data validation** by comparing the mirror's output against the production version
- **Shadow launches** where you want to build confidence before shifting any real traffic

## Fault Injection

Fault injection lets you test how your system handles failures by artificially introducing delays and errors:

### Delay Injection

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 3s
    route:
    - destination:
        host: my-service
```

10% of requests get a 3-second delay added before reaching the service. This is great for testing timeout and retry configurations.

### Abort Injection

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - fault:
      abort:
        percentage:
          value: 5
        httpStatus: 503
    route:
    - destination:
        host: my-service
```

5% of requests get an immediate 503 response without ever reaching the backend. Use this to test circuit breaker behavior and fallback logic.

### Combined Fault Injection

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - fault:
      delay:
        percentage:
          value: 10
        fixedDelay: 5s
      abort:
        percentage:
          value: 5
        httpStatus: 500
    route:
    - destination:
        host: my-service
```

10% of requests are delayed and 5% are aborted. These are applied independently, so a request could be both delayed and aborted.

### Targeted Fault Injection

Apply faults only to specific users or conditions:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        x-test-chaos:
          exact: "true"
    fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 5s
    route:
    - destination:
        host: my-service
  - route:
    - destination:
        host: my-service
```

Only requests with the `x-test-chaos: true` header get delayed. Normal traffic is unaffected.

## Traffic Shifting with Session Affinity

During a canary rollout, you might want users to consistently see the same version rather than bouncing between v1 and v2:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: canary-session
          ttl: 3600s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Combined with weighted routing, users will be assigned to either v1 or v2 based on the weight, and their assignment will be sticky for the cookie's TTL.

## Monitoring Traffic Shaping

Track how traffic is distributed across versions:

```promql
# Request rate by version
sum(rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local"}[5m])) by (destination_version)

# Error rate by version
sum(rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local", response_code=~"5.."}[5m])) by (destination_version)

# Latency by version
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="my-service.default.svc.cluster.local"}[5m])) by (le, destination_version))
```

Compare v1 and v2 side by side to make sure the new version is performing well before increasing its traffic share.

## Verifying Traffic Shaping

Confirm that the traffic split is working as expected:

```bash
# Send 100 requests and count the distribution
for i in $(seq 1 100); do
  kubectl exec deploy/test-client -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api/version
done | sort | uniq -c
```

This gives you a rough count of how many requests went to each version (assuming the version endpoint returns the version number).

Traffic shaping gives you precise control over how traffic flows through your mesh. Weighted routing enables safe canary deployments, mirroring lets you test with real traffic without risk, and fault injection helps you validate your resilience mechanisms. Use these tools together to build confidence in every deployment.
