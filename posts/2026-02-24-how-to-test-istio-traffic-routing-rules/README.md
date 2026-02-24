# How to Test Istio Traffic Routing Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, Testing, Kubernetes, VirtualService

Description: A hands-on guide to systematically testing Istio traffic routing rules including VirtualServices, header-based routing, and weighted traffic splits.

---

Traffic routing is one of the most powerful features Istio provides, and also one of the easiest to misconfigure. A VirtualService with a wrong match condition or a DestinationRule pointing to a nonexistent subset can silently drop traffic or route it to the wrong backend. Testing your routing rules before they hit production is not optional if you want reliable services.

This guide covers practical techniques for verifying that your Istio routing rules actually do what you think they do.

## Setting Up the Test Environment

You need a namespace with sidecar injection and some test services. For routing tests, you typically need multiple versions of a service to route between.

```bash
kubectl create namespace routing-test
kubectl label namespace routing-test istio-injection=enabled
```

Deploy two versions of a simple service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v1
  namespace: routing-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-service
      version: v1
  template:
    metadata:
      labels:
        app: my-service
        version: v1
    spec:
      containers:
      - name: my-service
        image: hashicorp/http-echo
        args: ["-text=v1"]
        ports:
        - containerPort: 5678
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v2
  namespace: routing-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-service
      version: v2
  template:
    metadata:
      labels:
        app: my-service
        version: v2
    spec:
      containers:
      - name: my-service
        image: hashicorp/http-echo
        args: ["-text=v2"]
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: routing-test
spec:
  selector:
    app: my-service
  ports:
  - port: 5678
    targetPort: 5678
```

Also deploy a client pod:

```bash
kubectl apply -n routing-test -f samples/sleep/sleep.yaml
kubectl wait --for=condition=ready pod -l app=sleep -n routing-test --timeout=120s
```

## Testing Basic Subset Routing

First, create a DestinationRule that defines your subsets:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: routing-test
spec:
  host: my-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Then a VirtualService that sends all traffic to v1:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: routing-test
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: v1
```

Test it:

```bash
for i in $(seq 1 10); do
  kubectl exec -n routing-test deploy/sleep -c sleep -- \
    curl -s http://my-service:5678
done
```

Every response should say "v1". If you see any "v2" responses, something is wrong with your subset labels or the VirtualService.

## Testing Header-Based Routing

Header matching is a common pattern for canary deployments and A/B testing. Here is a VirtualService that routes to v2 when a specific header is present:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: routing-test
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        x-version:
          exact: canary
    route:
    - destination:
        host: my-service
        subset: v2
  - route:
    - destination:
        host: my-service
        subset: v1
```

Test both paths:

```bash
echo "Without header (should get v1):"
kubectl exec -n routing-test deploy/sleep -c sleep -- \
  curl -s http://my-service:5678

echo "With header (should get v2):"
kubectl exec -n routing-test deploy/sleep -c sleep -- \
  curl -s -H "x-version: canary" http://my-service:5678
```

## Testing Weighted Traffic Splits

Weighted routing splits traffic between destinations by percentage. Testing it requires sending enough requests to see the statistical distribution:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: routing-test
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

Run a batch of requests and count the responses:

```bash
#!/bin/bash
V1=0
V2=0
TOTAL=200

for i in $(seq 1 $TOTAL); do
  RESP=$(kubectl exec -n routing-test deploy/sleep -c sleep -- \
    curl -s http://my-service:5678)
  case "$RESP" in
    *v1*) V1=$((V1+1)) ;;
    *v2*) V2=$((V2+1)) ;;
  esac
done

V1_PCT=$((V1 * 100 / TOTAL))
V2_PCT=$((V2 * 100 / TOTAL))

echo "v1: $V1 ($V1_PCT%), v2: $V2 ($V2_PCT%)"

# Allow 10% tolerance
if [ $V1_PCT -ge 70 ] && [ $V1_PCT -le 90 ]; then
  echo "PASS: Weight distribution within tolerance"
else
  echo "FAIL: Expected ~80% v1, got ${V1_PCT}%"
  exit 1
fi
```

With 200 requests and a 80/20 split, you should see roughly 160 v1 and 40 v2 responses. Allow some tolerance since this is random.

## Testing URI-Based Routing

You can route different URL paths to different services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: routing-test
spec:
  hosts:
  - my-service
  http:
  - match:
    - uri:
        prefix: /api/v2
    route:
    - destination:
        host: my-service
        subset: v2
  - match:
    - uri:
        prefix: /api/v1
    route:
    - destination:
        host: my-service
        subset: v1
  - route:
    - destination:
        host: my-service
        subset: v1
```

Test each path:

```bash
kubectl exec -n routing-test deploy/sleep -c sleep -- \
  curl -s http://my-service:5678/api/v1/data

kubectl exec -n routing-test deploy/sleep -c sleep -- \
  curl -s http://my-service:5678/api/v2/data

kubectl exec -n routing-test deploy/sleep -c sleep -- \
  curl -s http://my-service:5678/other
```

## Verifying with istioctl proxy-config

Sometimes curl tests pass but the underlying config is not what you expected. Use `istioctl proxy-config` to inspect routes at the Envoy level:

```bash
istioctl proxy-config routes deploy/sleep -n routing-test -o json | \
  python3 -m json.tool | grep -A 20 "my-service"
```

This shows the actual route configuration that Envoy received from Istiod. You can verify match conditions, weighted clusters, and timeouts directly.

## Testing Fault Injection Routes

Istio can inject faults for testing resilience. Verify that fault injection works:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: routing-test
spec:
  hosts:
  - my-service
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 3s
    route:
    - destination:
        host: my-service
        subset: v1
```

Measure the response time:

```bash
kubectl exec -n routing-test deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "Time: %{time_total}s\nCode: %{http_code}\n" \
  http://my-service:5678
```

The response time should be at least 3 seconds. If it comes back immediately, the fault injection is not working.

## Testing Request Timeouts

Apply a timeout and verify it:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: routing-test
spec:
  hosts:
  - my-service
  http:
  - timeout: 1s
    route:
    - destination:
        host: my-service
        subset: v1
```

If the backend takes longer than 1 second to respond, you should get a 504 Gateway Timeout. Combine this with a delay fault to simulate a slow backend.

## Automating Route Tests

Put all your route tests into a script that can run in CI:

```bash
#!/bin/bash
set -e

PASS=0
FAIL=0

run_test() {
  local name=$1
  local expected=$2
  local actual=$3

  if [ "$expected" = "$actual" ]; then
    echo "PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name (expected: $expected, actual: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

# Run your tests here
RESP=$(kubectl exec -n routing-test deploy/sleep -c sleep -- \
  curl -s http://my-service:5678)
run_test "Default route goes to v1" "v1" "$RESP"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] || exit 1
```

## Wrapping Up

Testing traffic routing rules is about building confidence that your Istio configuration actually matches your intent. Start with simple subset tests, then work up to weighted splits and header-based routing. Use `istioctl proxy-config` when curl tests are not enough. And automate everything so you catch regressions before they cause incidents.
