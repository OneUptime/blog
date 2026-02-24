# How to Test Network Partition Scenarios with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Network Partition, Chaos Engineering, Resilience, Kubernetes

Description: Learn how to simulate and test network partition scenarios using Istio to verify that your services handle split-brain situations correctly.

---

Network partitions are one of the nastiest failure modes in distributed systems. When part of your network becomes unreachable, services can end up in a split-brain state where different parts of the system have different views of the world. Testing for this is critical, and Istio gives you several ways to simulate partition-like conditions at the application layer.

While Istio cannot create true Layer 3 network partitions (you would need something like iptables rules or Chaos Mesh for that), it can simulate the effects of partitions at the HTTP layer. This is actually useful because most of your application logic deals with HTTP responses, not raw network connectivity.

## Understanding Network Partitions

A network partition divides your services into groups that cannot communicate with each other. In a Kubernetes context, this might mean:

- Service A can talk to Service B but not Service C
- Multiple replicas of the same service cannot reach each other
- A service can reach its database but not other microservices

The key question is: what does your system do when this happens?

## Simulating a Partition with Istio Abort Injection

The simplest way to simulate a partition is to abort all traffic between two services:

```bash
kubectl create namespace partition-test
kubectl label namespace partition-test istio-injection=enabled

kubectl apply -n partition-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -n partition-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/destination-rule-all.yaml
kubectl wait --for=condition=ready pod --all -n partition-test --timeout=120s
```

Now cut off communication between productpage and reviews:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-partition
  namespace: partition-test
spec:
  hosts:
  - reviews
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 503
    route:
    - destination:
        host: reviews
```

```bash
kubectl apply -n partition-test -f reviews-partition.yaml
```

This is not a true network partition since the Envoy proxy is returning a 503 immediately rather than timing out. But from the application's perspective, the reviews service is unreachable.

## Simulating Partition with Timeouts

A more realistic partition simulation uses a long delay that exceeds the caller's timeout:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-partition-timeout
  namespace: partition-test
spec:
  hosts:
  - reviews
  http:
  - fault:
      delay:
        percentage:
          value: 100
        fixedDelay: 30s
    route:
    - destination:
        host: reviews
```

This makes requests to reviews hang for 30 seconds. If the caller has a timeout shorter than that, the request will fail with a timeout error, which is exactly what happens during a real network partition.

## Simulating Asymmetric Partitions

In real partitions, the split is often asymmetric. Service A cannot reach Service B, but Service B might still reach Service A (or it might not, depending on the failure mode).

Simulate an asymmetric partition where productpage cannot reach ratings but reviews can:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-asymmetric
  namespace: partition-test
spec:
  hosts:
  - ratings
  http:
  - match:
    - sourceLabels:
        app: productpage
    fault:
      abort:
        percentage:
          value: 100
        httpStatus: 503
    route:
    - destination:
        host: ratings
  - route:
    - destination:
        host: ratings
```

Wait, Istio VirtualService does not directly support `sourceLabels` matching in the `match` block for fault injection in this way. Instead, you can use source namespace or header-based matching. A better approach is to use AuthorizationPolicy to block specific traffic:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-productpage-to-ratings
  namespace: partition-test
spec:
  selector:
    matchLabels:
      app: ratings
  action: DENY
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/partition-test/sa/bookinfo-productpage"]
```

This blocks productpage from talking to ratings, but reviews can still reach ratings. This creates an asymmetric partition.

## Testing Multi-Service Partition

Simulate a larger partition where an entire group of services becomes unreachable:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-down
  namespace: partition-test
spec:
  hosts:
  - reviews
  http:
  - fault:
      abort:
        percentage:
          value: 100
        httpStatus: 503
    route:
    - destination:
        host: reviews
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings-down
  namespace: partition-test
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
```

```bash
kubectl apply -n partition-test -f multi-partition.yaml
```

Now both reviews and ratings are unreachable from productpage. Only the details service is still working. Test what the user experience looks like:

```bash
kubectl exec -n partition-test deploy/productpage-v1 -- \
  curl -s productpage:9080/productpage
```

The page should still load but with degraded functionality.

## Partial Partition (Flaky Network)

Real network issues are often not a clean partition. They are flaky, with some packets getting through and others not:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-flaky
  namespace: partition-test
spec:
  hosts:
  - reviews
  http:
  - fault:
      abort:
        percentage:
          value: 80
        httpStatus: 503
    route:
    - destination:
        host: reviews
```

With 80% of requests failing, the service is mostly partitioned but occasionally reachable. This is a tough scenario for retry logic because retries sometimes succeed, which can mask the underlying problem.

## Testing with Load During Partition

A partition during normal traffic is very different from a partition during peak load. Run a load test while the partition is active:

```bash
kubectl apply -n partition-test -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: fortio-load
  labels:
    app: fortio-load
spec:
  containers:
  - name: fortio
    image: fortio/fortio:latest
    ports:
    - containerPort: 8080
EOF

kubectl wait --for=condition=ready pod/fortio-load -n partition-test --timeout=60s

# Apply the partition
kubectl apply -n partition-test -f reviews-partition.yaml

# Run load test
kubectl exec -n partition-test fortio-load -- fortio load \
  -c 16 -qps 0 -t 60s \
  http://productpage.partition-test.svc.cluster.local:9080/productpage
```

Check the error distribution in the output. You should see a mix of 200s (partial page loads) and possibly some 500s if the productpage does not handle the reviews failure well.

## Verifying Recovery After Partition Heals

After removing the partition, verify the system recovers cleanly:

```bash
# Remove the partition
kubectl delete virtualservice reviews-partition -n partition-test

# Wait for config to propagate
sleep 10

# Run a health check
for i in $(seq 1 10); do
  kubectl exec -n partition-test deploy/productpage-v1 -- \
    curl -s -o /dev/null -w "%{http_code}\n" productpage:9080/productpage
  sleep 1
done
```

All 10 requests should return 200. If they do not, there might be stale circuit breaker state or cached error responses that have not cleared yet.

## Monitoring During Partition Tests

Watch the Istio metrics during partition experiments:

```bash
# Check for 503 errors on the reviews service
PRODUCTPAGE_POD=$(kubectl get pod -n partition-test -l app=productpage -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n partition-test $PRODUCTPAGE_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_5xx"

# Check circuit breaker status
kubectl exec -n partition-test $PRODUCTPAGE_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection"
```

## Cleanup

```bash
kubectl delete namespace partition-test
```

Network partition testing is essential for any distributed system running in a service mesh. While Istio cannot create true Layer 3 partitions, its ability to inject faults and control traffic at the application layer lets you test the most important aspect: how your application code responds when services become unreachable. Combine Istio's fault injection with infrastructure-level tools like Chaos Mesh or tc/iptables for comprehensive partition testing.
