# How to Configure Fault Injection for Testing on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Fault Injection, Chaos Engineering, Service Mesh, Kubernetes, Testing

Description: Learn how to use fault injection with a service mesh on Talos Linux to test how your applications handle failures before they happen in production.

---

Testing what happens when things go wrong is just as important as testing what happens when things go right. Fault injection lets you deliberately introduce failures into your system - adding latency, returning errors, or dropping connections - to verify that your applications handle these situations gracefully. On Talos Linux, service mesh fault injection is a clean way to run these tests because the faults are injected at the network layer without modifying your application code.

This guide covers configuring fault injection on a Talos Linux cluster using Istio and Linkerd, with practical testing scenarios you can use to build confidence in your system's resilience.

## Why Fault Injection?

In production, failures are inevitable. Services crash, networks partition, databases slow down, and dependencies become unavailable. The question is not whether these things will happen, but whether your system handles them well when they do. Fault injection lets you answer that question proactively:

- Does the frontend show a meaningful error message when the API is down?
- Do requests timeout gracefully or hang indefinitely?
- Does the circuit breaker trip when a service starts failing?
- Are retry policies working as configured?
- Does the system recover automatically when the fault clears?

By testing these scenarios intentionally, you find and fix problems before your users encounter them.

## Types of Faults

Service meshes typically support two types of fault injection:

**Delay faults** add artificial latency to requests. This simulates slow networks, overloaded services, or database query delays.

**Abort faults** return error responses immediately without forwarding the request to the actual service. This simulates service crashes, timeouts, and unavailable dependencies.

## Prerequisites

You need:

- A Talos Linux cluster with Istio installed and sidecar injection enabled
- A test application deployed with the Istio sidecar
- `kubectl` access to the cluster

Deploy a test setup:

```yaml
# test-setup.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: curlimages/curl
        command: ["sleep", "infinity"]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
      - name: api
        image: kennethreitz/httpbin
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: default
spec:
  selector:
    app: backend-api
  ports:
  - port: 80
    targetPort: 80
```

## Injecting Delay Faults with Istio

Add a 3-second delay to 50% of requests:

```yaml
# delay-fault.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-api-delay
  namespace: default
spec:
  hosts:
  - backend-api
  http:
  - fault:
      delay:
        percentage:
          value: 50.0
        fixedDelay: 3s
    route:
    - destination:
        host: backend-api
```

Apply and test:

```bash
kubectl apply -f delay-fault.yaml

# Test from the frontend pod
kubectl exec deployment/frontend -- sh -c '
for i in $(seq 1 10); do
  START=$(date +%s%N)
  curl -s -o /dev/null http://backend-api/get
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  echo "Request $i: ${DURATION}ms"
done
'
```

You should see roughly half the requests taking about 3000ms and the other half completing normally.

## Injecting Abort Faults with Istio

Return HTTP 503 errors for 30% of requests:

```yaml
# abort-fault.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-api-abort
  namespace: default
spec:
  hosts:
  - backend-api
  http:
  - fault:
      abort:
        percentage:
          value: 30.0
        httpStatus: 503
    route:
    - destination:
        host: backend-api
```

Test:

```bash
kubectl apply -f abort-fault.yaml

# Check response codes
kubectl exec deployment/frontend -- sh -c '
for i in $(seq 1 20); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://backend-api/get)
  echo "Request $i: HTTP $STATUS"
done
'
```

About 30% of responses should return 503.

## Combining Delay and Abort Faults

You can apply both types of faults simultaneously:

```yaml
# combined-faults.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-api-chaos
  namespace: default
spec:
  hosts:
  - backend-api
  http:
  - fault:
      delay:
        percentage:
          value: 25.0
        fixedDelay: 5s
      abort:
        percentage:
          value: 10.0
        httpStatus: 500
    route:
    - destination:
        host: backend-api
```

This configuration means:
- 25% of requests experience a 5-second delay
- 10% of requests get an immediate 500 error
- The remaining requests are unaffected

## Conditional Fault Injection

Apply faults only to specific requests based on headers. This is useful for testing specific scenarios without affecting all traffic:

```yaml
# conditional-fault.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-api-conditional
  namespace: default
spec:
  hosts:
  - backend-api
  http:
  # Only inject faults for requests with the test header
  - match:
    - headers:
        x-fault-inject:
          exact: "true"
    fault:
      abort:
        percentage:
          value: 100.0
        httpStatus: 503
    route:
    - destination:
        host: backend-api
  # Normal traffic passes through without faults
  - route:
    - destination:
        host: backend-api
```

Test:

```bash
# Normal request - no fault
kubectl exec deployment/frontend -- \
  curl -s -o /dev/null -w "%{http_code}" http://backend-api/get
# Returns 200

# Request with fault header - always fails
kubectl exec deployment/frontend -- \
  curl -s -o /dev/null -w "%{http_code}" -H "x-fault-inject: true" http://backend-api/get
# Returns 503
```

## Fault Injection with Linkerd

Linkerd does not have built-in fault injection like Istio, but you can achieve similar results using a fault injection service:

```yaml
# fault-injector.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fault-injector
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fault-injector
  template:
    metadata:
      labels:
        app: fault-injector
    spec:
      containers:
      - name: fault
        image: alpine/socat
        command: ["sh", "-c"]
        args:
        - |
          while true; do
            echo -e "HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\n\r\n" | socat - TCP-LISTEN:80,fork,reuseaddr
          done
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: fault-injector
  namespace: default
spec:
  selector:
    app: fault-injector
  ports:
  - port: 80
```

Then use Linkerd's TrafficSplit to send a percentage of traffic to the fault injector:

```yaml
# linkerd-fault-split.yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: backend-api-fault
  namespace: default
spec:
  service: backend-api
  backends:
  - service: backend-api-real
    weight: 700  # 70% normal
  - service: fault-injector
    weight: 300  # 30% failures
```

## Testing Scenarios

Here are practical testing scenarios to run with fault injection:

### Scenario 1: Timeout Handling

```yaml
# Inject a delay longer than the client's timeout
fault:
  delay:
    percentage:
      value: 100.0
    fixedDelay: 30s
```

Verify that the client times out properly and shows an appropriate error.

### Scenario 2: Circuit Breaker Validation

```yaml
# Inject enough errors to trigger the circuit breaker
fault:
  abort:
    percentage:
      value: 80.0
    httpStatus: 503
```

Verify that the circuit breaker opens and starts fast-failing requests.

### Scenario 3: Retry Policy Validation

```yaml
# Inject intermittent errors
fault:
  abort:
    percentage:
      value: 50.0
    httpStatus: 503
```

With retry policies, the effective error rate should be much lower than 50%.

## Cleaning Up Faults

Always remove fault injection after testing:

```bash
# Remove the fault injection VirtualService
kubectl delete virtualservice backend-api-chaos -n default

# Verify traffic is back to normal
kubectl exec deployment/frontend -- \
  curl -s -o /dev/null -w "%{http_code}" http://backend-api/get
```

## Safety Practices

Fault injection in production requires careful handling:

1. Always use conditional fault injection (header-based) in production
2. Start with low percentages and increase gradually
3. Have clear runbooks for removing faults quickly
4. Monitor error rates and latency during fault injection tests
5. Never inject faults into critical paths without a safety net

## Conclusion

Fault injection on Talos Linux through a service mesh is a powerful way to validate your system's resilience before real failures occur. Istio provides native support for delay and abort faults with fine-grained control over which requests are affected. Linkerd users can achieve similar results using traffic splitting. The key insight is that testing for failure is not about breaking things - it is about building confidence that your system handles the inevitable failures of distributed computing gracefully. Running these tests regularly on your Talos Linux cluster ensures that your resilience mechanisms actually work when you need them.
