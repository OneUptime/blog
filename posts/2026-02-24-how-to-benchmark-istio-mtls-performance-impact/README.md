# How to Benchmark Istio mTLS Performance Impact

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Performance, Benchmarking, Kubernetes, Service Mesh

Description: Learn how to accurately benchmark the performance impact of Istio mutual TLS on your services using real load testing tools and methodologies.

---

One of the first questions teams ask when adopting Istio is "how much overhead does mTLS add?" The honest answer is: it depends on your workload. But you can measure it yourself with some straightforward benchmarking, and the results might surprise you. The overhead is usually smaller than people expect, but you should still quantify it for your specific setup.

This guide walks through a practical approach to measuring mTLS overhead in Istio using real tools and repeatable methodology.

## Prerequisites

Before you start benchmarking, make sure you have:

- A Kubernetes cluster with Istio installed
- `kubectl` access to the cluster
- Fortio or another load testing tool installed
- A test application deployed (we will use httpbin)

## Deploy the Test Application

First, deploy a simple httpbin service that we can hit with load tests.

```bash
kubectl create namespace bench-test
kubectl label namespace bench-test istio-injection=enabled
kubectl apply -n bench-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/httpbin/httpbin.yaml
```

Wait for the pods to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=httpbin -n bench-test --timeout=60s
```

## Deploy the Load Generator

We will use Fortio as the load generator. Deploy it inside the mesh so it goes through the sidecar proxy.

```bash
kubectl apply -n bench-test -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: fortio-client
  labels:
    app: fortio-client
spec:
  containers:
  - name: fortio
    image: fortio/fortio:latest
    ports:
    - containerPort: 8080
EOF
```

## Establish a Baseline with mTLS Enabled

By default, Istio enables mTLS in PERMISSIVE mode. First, enforce STRICT mTLS so you know encryption is definitely happening.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: bench-test
spec:
  mtls:
    mode: STRICT
```

Apply it:

```bash
kubectl apply -n bench-test -f strict-mtls.yaml
```

Now run the benchmark with mTLS active:

```bash
kubectl exec -n bench-test fortio-client -- fortio load \
  -c 16 \
  -qps 0 \
  -t 60s \
  -json /tmp/mtls-on.json \
  http://httpbin.bench-test.svc.cluster.local:8000/get
```

The flags here are:
- `-c 16` runs 16 concurrent connections
- `-qps 0` means unlimited queries per second (max throughput)
- `-t 60s` runs the test for 60 seconds
- `-json` saves results to a file for later comparison

Save the output. You will see something like:

```
Ended after 60.001s : 145234 calls. qps=2420.5
Sockets used: 16 (for perfect keepalive, would be 16)
All done 145234 calls (plus 16 warmup) 6.608 ms avg, 2420.5 qps
```

Note down the average latency and QPS numbers.

## Run the Benchmark Without mTLS

Now you need to compare against the same setup without mTLS. There are two approaches here.

### Approach 1: Disable mTLS with a DestinationRule

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: disable-mtls
  namespace: bench-test
spec:
  host: httpbin.bench-test.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

Also change PeerAuthentication to PERMISSIVE:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: permissive-mtls
  namespace: bench-test
spec:
  mtls:
    mode: PERMISSIVE
```

```bash
kubectl apply -n bench-test -f disable-mtls.yaml
kubectl apply -n bench-test -f permissive-mtls.yaml
```

### Approach 2: Deploy Outside the Mesh

A cleaner comparison is to deploy the same app in a namespace without sidecar injection:

```bash
kubectl create namespace bench-test-nomesh
kubectl apply -n bench-test-nomesh -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/httpbin/httpbin.yaml
```

Deploy a Fortio client without sidecar too:

```bash
kubectl apply -n bench-test-nomesh -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: fortio-client
  labels:
    app: fortio-client
spec:
  containers:
  - name: fortio
    image: fortio/fortio:latest
    ports:
    - containerPort: 8080
EOF
```

Run the same benchmark:

```bash
kubectl exec -n bench-test-nomesh fortio-client -- fortio load \
  -c 16 \
  -qps 0 \
  -t 60s \
  -json /tmp/mtls-off.json \
  http://httpbin.bench-test-nomesh.svc.cluster.local:8000/get
```

## Comparing Results

After both runs, compare the key metrics:

| Metric | With mTLS | Without mTLS | Overhead |
|--------|-----------|--------------|----------|
| Avg Latency | 6.6ms | 5.1ms | ~29% |
| p99 Latency | 12.3ms | 9.8ms | ~25% |
| QPS | 2420 | 3130 | ~23% |

These numbers are illustrative. Your actual results will vary based on your cluster hardware, payload size, and connection patterns.

## Testing with Different Payload Sizes

mTLS overhead scales with payload size since encryption has to process more data. Test with varying payloads:

```bash
# Small payload (default /get response, ~500 bytes)
kubectl exec -n bench-test fortio-client -- fortio load \
  -c 16 -qps 0 -t 30s \
  http://httpbin.bench-test.svc.cluster.local:8000/get

# Medium payload (~10KB)
kubectl exec -n bench-test fortio-client -- fortio load \
  -c 16 -qps 0 -t 30s \
  http://httpbin.bench-test.svc.cluster.local:8000/bytes/10240

# Large payload (~100KB)
kubectl exec -n bench-test fortio-client -- fortio load \
  -c 16 -qps 0 -t 30s \
  http://httpbin.bench-test.svc.cluster.local:8000/bytes/102400
```

## Testing Connection Setup Overhead

The TLS handshake is the most expensive part. If your services use long-lived connections with keepalive, the overhead is amortized. Test without keepalive to see worst-case connection setup cost:

```bash
kubectl exec -n bench-test fortio-client -- fortio load \
  -c 16 \
  -qps 0 \
  -t 30s \
  -keepalive=false \
  http://httpbin.bench-test.svc.cluster.local:8000/get
```

Compare this against the keepalive version. You will likely see a much larger performance gap because every request pays the TLS handshake cost.

## Monitoring CPU Impact

mTLS adds CPU overhead for encryption/decryption. Monitor the sidecar CPU usage during the benchmark:

```bash
kubectl top pod -n bench-test --containers
```

You can also check Envoy's internal stats:

```bash
kubectl exec -n bench-test deploy/httpbin -c istio-proxy -- \
  pilot-agent request GET stats | grep ssl
```

This shows counters for TLS handshakes, session resumptions, and cipher usage.

## Tips for Accurate Benchmarking

A few things to keep in mind for reliable results:

1. **Run multiple iterations**. A single 60-second run can be noisy. Run each configuration at least 3 times and average the results.

2. **Warm up first**. The first few seconds of a test include connection establishment and JIT compilation effects. Either use a warmup period or discard the first run.

3. **Control for cluster noise**. Run benchmarks when the cluster is not under other heavy load. Better yet, use dedicated nodes for the test pods using node affinity.

4. **Test at realistic concurrency levels**. Testing with 1 connection or 1000 connections gives very different pictures. Use concurrency levels that match your production traffic patterns.

5. **Check resource limits**. Make sure your sidecar proxy containers have enough CPU allocated. The default Istio sidecar resource requests might throttle under heavy load.

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 200m
            memory: 128Mi
          limits:
            cpu: "1"
            memory: 512Mi
```

## What to Expect

In most real-world scenarios, mTLS adds somewhere between 1-3ms of latency per hop and uses 5-15% additional CPU on the proxy containers. For services that are not extremely latency sensitive, this is usually acceptable, especially considering the security benefits.

The overhead tends to matter most for services with very high request rates and small payloads where the TLS handshake cost is proportionally large. Connection pooling and keepalive connections significantly reduce this impact.

## Cleanup

```bash
kubectl delete namespace bench-test
kubectl delete namespace bench-test-nomesh
```

Benchmarking mTLS overhead is something you should do periodically, especially after Istio upgrades. Newer versions of Envoy and Istio regularly improve TLS performance, and the gap keeps getting smaller over time.
