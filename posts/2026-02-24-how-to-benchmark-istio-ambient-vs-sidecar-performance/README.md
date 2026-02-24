# How to Benchmark Istio Ambient vs Sidecar Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Sidecar, Performance, Benchmarking, Kubernetes

Description: A hands-on guide to comparing Istio ambient mode and sidecar mode performance with reproducible load testing methodology.

---

Istio's ambient mesh mode was introduced as an alternative to the traditional sidecar proxy model. Instead of injecting an Envoy sidecar into every pod, ambient mode uses a shared ztunnel DaemonSet for L4 processing and optional waypoint proxies for L7 features. The big selling point is lower resource overhead, but how does it actually stack up in terms of latency and throughput?

The only way to answer that question for your specific workloads is to benchmark both modes side by side. Here is a complete methodology for doing that.

## Prerequisites

You need two separate Istio installations or a cluster large enough to run both modes simultaneously. The cleanest approach is to use separate namespaces with different configurations.

Make sure you have Istio 1.22 or newer installed with ambient mode support:

```bash
istioctl install --set profile=ambient -y
```

If you already have a sidecar-based installation, you can install ambient alongside it. The two modes can coexist in the same cluster using different namespaces.

## Deploy Test Applications

Create three namespaces: one for ambient mode, one for sidecar mode, and one without any mesh for a true baseline.

```bash
# Ambient namespace
kubectl create namespace bench-ambient
kubectl label namespace bench-ambient istio.io/dataplane-mode=ambient

# Sidecar namespace
kubectl create namespace bench-sidecar
kubectl label namespace bench-sidecar istio-injection=enabled

# No mesh namespace
kubectl create namespace bench-nomesh
```

Deploy httpbin in all three:

```bash
for ns in bench-ambient bench-sidecar bench-nomesh; do
  kubectl apply -n $ns -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/httpbin/httpbin.yaml
done
```

Deploy Fortio load generators in each namespace:

```bash
for ns in bench-ambient bench-sidecar bench-nomesh; do
  kubectl apply -n $ns -f - <<EOF
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
done
```

Wait for all pods to be ready:

```bash
for ns in bench-ambient bench-sidecar bench-nomesh; do
  kubectl wait --for=condition=ready pod -l app=httpbin -n $ns --timeout=120s
  kubectl wait --for=condition=ready pod -l app=fortio -n $ns --timeout=120s
done
```

## Set Up Waypoint Proxy for L7 Testing

Ambient mode handles L4 (mTLS, basic network policy) through ztunnel without a waypoint proxy. For L7 features like HTTP routing and authorization, you need a waypoint proxy:

```bash
istioctl waypoint apply -n bench-ambient --enroll-namespace
```

Verify the waypoint is running:

```bash
kubectl get pods -n bench-ambient -l gateway.networking.k8s.io/gateway-name
```

## Run the Benchmarks

Create a script that runs consistent tests across all three environments:

```bash
#!/bin/bash
DURATION="60s"
CONNECTIONS=32
QPS=0  # unlimited

for ns in bench-ambient bench-sidecar bench-nomesh; do
  FORTIO_POD=$(kubectl get pod -n $ns -l app=fortio -o jsonpath='{.items[0].metadata.name}')

  echo "=== Testing $ns ==="

  # Small payload
  kubectl exec -n $ns $FORTIO_POD -- fortio load \
    -c $CONNECTIONS -qps $QPS -t $DURATION \
    -json /tmp/small-payload.json \
    http://httpbin.$ns.svc.cluster.local:8000/get

  # Medium payload (10KB)
  kubectl exec -n $ns $FORTIO_POD -- fortio load \
    -c $CONNECTIONS -qps $QPS -t $DURATION \
    -json /tmp/medium-payload.json \
    http://httpbin.$ns.svc.cluster.local:8000/bytes/10240

  # Large payload (100KB)
  kubectl exec -n $ns $FORTIO_POD -- fortio load \
    -c $CONNECTIONS -qps $QPS -t $DURATION \
    -json /tmp/large-payload.json \
    http://httpbin.$ns.svc.cluster.local:8000/bytes/102400

  # New connections (no keepalive)
  kubectl exec -n $ns $FORTIO_POD -- fortio load \
    -c $CONNECTIONS -qps $QPS -t $DURATION \
    -keepalive=false \
    -json /tmp/no-keepalive.json \
    http://httpbin.$ns.svc.cluster.local:8000/get
done
```

## Measuring Resource Consumption

Performance is not just about latency. Resource consumption is the main reason teams consider ambient mode. Measure memory and CPU for both approaches:

```bash
# Sidecar resource usage per pod
kubectl top pod -n bench-sidecar --containers | grep istio-proxy

# Ambient ztunnel resource usage (shared per node)
kubectl top pod -n istio-system -l app=ztunnel --containers

# Waypoint proxy resource usage
kubectl top pod -n bench-ambient -l gateway.networking.k8s.io/gateway-name --containers
```

For a more thorough resource comparison, check the total mesh overhead:

```bash
# Total sidecar overhead in sidecar namespace
kubectl top pod -n bench-sidecar --containers --no-headers | \
  grep istio-proxy | awk '{cpu+=$3; mem+=$4} END {print "Total sidecar CPU:", cpu, "Total sidecar Memory:", mem}'

# ztunnel overhead (shared across all ambient namespaces)
kubectl top pod -n istio-system -l app=ztunnel --no-headers | \
  awk '{cpu+=$3; mem+=$4} END {print "Total ztunnel CPU:", cpu, "Total ztunnel Memory:", mem}'
```

## Understanding the Architecture Differences

The performance characteristics differ because of how traffic flows:

**Sidecar mode**: Client app -> Client sidecar (Envoy) -> Network -> Server sidecar (Envoy) -> Server app. That is two full Envoy proxy hops per request.

**Ambient mode (L4 only)**: Client app -> ztunnel -> Network -> ztunnel -> Server app. ztunnel is a purpose-built Rust-based proxy that only handles L4 (TCP + mTLS). It is much lighter than Envoy.

**Ambient mode (L7)**: Client app -> ztunnel -> Waypoint proxy (Envoy) -> ztunnel -> Server app. When you need L7 features, the waypoint adds an extra network hop.

This means:
- For L4-only traffic, ambient should be faster because ztunnel is lighter than Envoy
- For L7 traffic, ambient may actually be slower because of the extra hop through the waypoint proxy
- Resource usage should be lower with ambient because ztunnel is shared per node instead of per pod

## Expected Results

Here is a rough comparison based on typical test results:

| Scenario | No Mesh | Sidecar | Ambient (L4) | Ambient (L7) |
|----------|---------|---------|---------------|---------------|
| Avg Latency (small) | 2.1ms | 4.8ms | 3.2ms | 5.5ms |
| p99 Latency (small) | 5.2ms | 11.4ms | 7.8ms | 13.1ms |
| QPS (small) | 7600 | 3330 | 5000 | 2900 |
| Memory per pod | 0 | ~50MB | ~5MB* | ~5MB* |

*Ambient memory is shared via ztunnel DaemonSet, so per-pod overhead is just the ztunnel share.

These numbers are illustrative and will vary based on your hardware and configuration.

## Testing at Scale

The real advantage of ambient mode shows up at scale. With 100 services, sidecar mode means 100+ Envoy instances consuming memory. Ambient mode uses one ztunnel per node (say 10 nodes = 10 ztunnel instances) plus a handful of waypoint proxies.

To simulate scale, deploy multiple replicas:

```bash
kubectl scale deployment httpbin -n bench-sidecar --replicas=20
kubectl scale deployment httpbin -n bench-ambient --replicas=20
```

Then compare total resource consumption across the namespaces.

## Cleanup

```bash
kubectl delete namespace bench-ambient bench-sidecar bench-nomesh
istioctl waypoint delete -n bench-ambient --all
```

## Which Mode Should You Pick?

If your services primarily need mTLS and L4 network policy, ambient mode gives you better performance with significantly lower resource usage. If you heavily use L7 features like HTTP-based routing, retries, and authorization policies, the performance difference between ambient and sidecar is smaller, and sidecar mode is more mature.

The best approach is to run these benchmarks with your actual services and traffic patterns. The synthetic benchmarks give you a starting point, but real workloads behave differently.
