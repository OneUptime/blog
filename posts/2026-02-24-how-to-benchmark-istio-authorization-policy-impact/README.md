# How to Benchmark Istio Authorization Policy Impact

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Performance, Benchmarking, Kubernetes

Description: A practical guide to measuring how Istio authorization policies affect request latency and throughput in your service mesh.

---

Authorization policies in Istio are processed by the Envoy sidecar proxy on every request. When you stack up multiple policies with complex rules, there is a real question about how much latency that adds. The good news is that Envoy processes these rules in memory without any external calls (unlike, say, OPA with remote bundles), so the overhead is generally low. But "generally low" is not a number you can put in front of your SRE team.

Here is how to actually measure the impact.

## Setting Up the Test Environment

Create a dedicated namespace and deploy a target service:

```bash
kubectl create namespace authz-bench
kubectl label namespace authz-bench istio-injection=enabled
kubectl apply -n authz-bench -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/httpbin/httpbin.yaml
```

Deploy a Fortio load generator in the same namespace:

```bash
kubectl apply -n authz-bench -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fortio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fortio
  template:
    metadata:
      labels:
        app: fortio
    spec:
      containers:
      - name: fortio
        image: fortio/fortio:latest
        ports:
        - containerPort: 8080
EOF
```

Wait for everything to come up:

```bash
kubectl wait --for=condition=ready pod -l app=httpbin -n authz-bench --timeout=60s
kubectl wait --for=condition=ready pod -l app=fortio -n authz-bench --timeout=60s
```

## Baseline: No Authorization Policies

Run a baseline test with no authorization policies applied:

```bash
FORTIO_POD=$(kubectl get pod -n authz-bench -l app=fortio -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n authz-bench $FORTIO_POD -- fortio load \
  -c 32 \
  -qps 0 \
  -t 60s \
  -json /tmp/baseline.json \
  http://httpbin.authz-bench.svc.cluster.local:8000/get
```

Record the average latency, p99 latency, and throughput (QPS).

## Test 1: Simple ALLOW Policy

Apply a basic authorization policy that allows traffic from the fortio service account:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-fortio
  namespace: authz-bench
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/authz-bench/sa/default"]
    to:
    - operation:
        methods: ["GET"]
```

```bash
kubectl apply -n authz-bench -f allow-fortio.yaml
sleep 5  # Give Envoy time to pick up the config

kubectl exec -n authz-bench $FORTIO_POD -- fortio load \
  -c 32 \
  -qps 0 \
  -t 60s \
  -json /tmp/simple-allow.json \
  http://httpbin.authz-bench.svc.cluster.local:8000/get
```

## Test 2: Policy with Multiple Rules

Now test with a more complex policy that has multiple source and destination rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: complex-allow
  namespace: authz-bench
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/authz-bench/sa/default"]
        namespaces: ["authz-bench"]
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
        paths: ["/get", "/post", "/put", "/delete", "/headers", "/ip", "/status/*"]
    when:
    - key: request.headers[x-custom-header]
      notValues: ["blocked"]
  - from:
    - source:
        principals: ["cluster.local/ns/monitoring/sa/prometheus"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/metrics"]
```

```bash
kubectl apply -n authz-bench -f complex-allow.yaml
sleep 5

kubectl exec -n authz-bench $FORTIO_POD -- fortio load \
  -c 32 \
  -qps 0 \
  -t 60s \
  -json /tmp/complex-allow.json \
  http://httpbin.authz-bench.svc.cluster.local:8000/get
```

## Test 3: Stacked Multiple Policies

In practice, you often have multiple policies on the same workload. Create several:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-bad-paths
  namespace: authz-bench
spec:
  selector:
    matchLabels:
      app: httpbin
  action: DENY
  rules:
  - to:
    - operation:
        paths: ["/admin*", "/internal*", "/debug*"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-authenticated
  namespace: authz-bench
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/authz-bench/sa/default"]
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/webapp"]
  - from:
    - source:
        principals: ["cluster.local/ns/backend/sa/api"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: authz-bench
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - to:
    - operation:
        methods: ["GET"]
        paths: ["/healthz", "/readyz"]
```

```bash
kubectl apply -n authz-bench -f stacked-policies.yaml
sleep 5

kubectl exec -n authz-bench $FORTIO_POD -- fortio load \
  -c 32 \
  -qps 0 \
  -t 60s \
  -json /tmp/stacked.json \
  http://httpbin.authz-bench.svc.cluster.local:8000/get
```

## Test 4: DENY Action (Rejected Requests)

It is also worth measuring how fast Envoy rejects unauthorized requests, because denied requests skip backend processing:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: authz-bench
spec:
  selector:
    matchLabels:
      app: httpbin
  action: DENY
  rules:
  - from:
    - source:
        namespaces: ["*"]
```

```bash
kubectl apply -n authz-bench -f deny-all.yaml
sleep 5

kubectl exec -n authz-bench $FORTIO_POD -- fortio load \
  -c 32 \
  -qps 0 \
  -t 60s \
  -allow-initial-errors \
  -json /tmp/deny-all.json \
  http://httpbin.authz-bench.svc.cluster.local:8000/get
```

Denied requests typically show much lower latency and higher QPS because the proxy short-circuits before reaching the application.

## Analyzing the Results

Pull the results files out of the pod and compare:

```bash
for test in baseline simple-allow complex-allow stacked deny-all; do
  kubectl cp authz-bench/$FORTIO_POD:/tmp/${test}.json ./${test}.json
done
```

You can use Fortio's built-in report server to visualize them:

```bash
fortio report -data-dir .
```

Or just compare the key numbers manually. Here is what a typical comparison looks like:

| Scenario | Avg Latency | p99 Latency | QPS |
|----------|-------------|-------------|-----|
| No policies | 4.2ms | 9.1ms | 3810 |
| Simple ALLOW | 4.3ms | 9.4ms | 3780 |
| Complex ALLOW | 4.4ms | 9.6ms | 3740 |
| Stacked (3 policies) | 4.5ms | 10.1ms | 3690 |
| DENY all | 1.1ms | 2.3ms | 14500 |

These are illustrative numbers. Your results will vary.

## Checking Envoy RBAC Filter Stats

Envoy tracks authorization policy evaluation internally. You can see these stats:

```bash
HTTPBIN_POD=$(kubectl get pod -n authz-bench -l app=httpbin -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n authz-bench $HTTPBIN_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep rbac
```

You will see counters like:

```text
http.inbound_0.0.0.0_8000.rbac.allowed: 145023
http.inbound_0.0.0.0_8000.rbac.denied: 0
http.inbound_0.0.0.0_8000.rbac.shadow_allowed: 0
http.inbound_0.0.0.0_8000.rbac.shadow_denied: 0
```

## Key Takeaways

Authorization policy overhead in Istio is typically under 1ms per request even with multiple stacked policies. The evaluation happens entirely in memory within the Envoy proxy, with no network calls required. The number of rules matters less than you might think because Envoy compiles the rules into an efficient internal representation.

Where you will see more overhead is with JWT validation policies that require JWKS fetching, or with external authorization (CUSTOM action) that calls out to an external service. Those are fundamentally different and should be benchmarked separately.

## Cleanup

```bash
kubectl delete namespace authz-bench
```

Running these benchmarks gives you concrete data to present when someone asks whether Istio authorization policies will slow things down. In nearly every case, the answer is that the performance cost is negligible compared to the security value they provide.
