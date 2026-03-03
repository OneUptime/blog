# How to Use wrk for Istio Performance Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, wrk, Performance Testing, Load Testing, Kubernetes

Description: How to use the wrk HTTP benchmarking tool to measure and optimize Istio service mesh performance with practical examples.

---

While Fortio is the "official" load testing tool from the Istio ecosystem, wrk is another popular choice that has been around much longer. wrk is an HTTP benchmarking tool capable of generating significant load from a single thread using epoll/kqueue. It is extremely efficient, scriptable with Lua, and produces clean latency histograms.

Here is how to use wrk to performance test services running inside an Istio service mesh.

## Installing wrk

### On Your Local Machine

```bash
# macOS
brew install wrk

# Ubuntu/Debian
sudo apt-get install wrk

# From source
git clone https://github.com/wg/wrk.git
cd wrk
make
sudo cp wrk /usr/local/bin/
```

### Inside the Kubernetes Cluster

For testing service-to-service communication through the mesh, you want wrk running inside the cluster with a sidecar:

```bash
kubectl create namespace perf-test
kubectl label namespace perf-test istio-injection=enabled

kubectl apply -n perf-test -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: wrk-client
  labels:
    app: wrk-client
spec:
  containers:
  - name: wrk
    image: williamyeh/wrk:latest
    command: ["sleep", "infinity"]
EOF
```

Deploy a target service:

```bash
kubectl apply -n perf-test -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/httpbin/httpbin.yaml
kubectl wait --for=condition=ready pod -l app=httpbin -n perf-test --timeout=60s
```

## Basic wrk Usage

The simplest wrk command:

```bash
kubectl exec -n perf-test wrk-client -- \
  wrk -t2 -c10 -d30s http://httpbin.perf-test.svc.cluster.local:8000/get
```

The flags are:
- `-t2`: 2 threads
- `-c10`: 10 open connections
- `-d30s`: Run for 30 seconds

Output looks like:

```text
Running 30s test @ http://httpbin.perf-test.svc.cluster.local:8000/get
  2 threads and 10 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency     4.52ms    2.31ms  42.18ms   78.42%
    Req/Sec     1.12k   156.23     1.58k    72.33%
  67123 requests in 30.01s, 25.82MB read
Requests/sec:   2236.87
Transfer/sec:    881.05KB
```

## Scaling Up the Load

To really stress the mesh, increase threads and connections:

```bash
kubectl exec -n perf-test wrk-client -- \
  wrk -t4 -c100 -d60s http://httpbin.perf-test.svc.cluster.local:8000/get
```

For latency distribution details, add the `--latency` flag:

```bash
kubectl exec -n perf-test wrk-client -- \
  wrk -t4 -c100 -d60s --latency \
  http://httpbin.perf-test.svc.cluster.local:8000/get
```

This gives you percentile data:

```text
  Latency Distribution
     50%    3.82ms
     75%    5.41ms
     90%    8.23ms
     99%   18.74ms
```

## Using Lua Scripts for Custom Requests

One of wrk's strengths is Lua scripting. This lets you craft complex test scenarios that go beyond simple GET requests.

### POST Request with JSON Body

Create a Lua script file:

```lua
-- post.lua
wrk.method = "POST"
wrk.body   = '{"name": "test-item", "quantity": 5, "price": 19.99}'
wrk.headers["Content-Type"] = "application/json"
```

Since we are running inside a pod, we need to create the script there first:

```bash
kubectl exec -n perf-test wrk-client -- sh -c 'cat > /tmp/post.lua << LUAEOF
wrk.method = "POST"
wrk.body   = "{\"name\": \"test-item\", \"quantity\": 5}"
wrk.headers["Content-Type"] = "application/json"
LUAEOF'

kubectl exec -n perf-test wrk-client -- \
  wrk -t2 -c20 -d30s -s /tmp/post.lua \
  http://httpbin.perf-test.svc.cluster.local:8000/post
```

### Custom Headers

For testing with specific headers that Istio routing rules might match on:

```lua
-- headers.lua
wrk.headers["X-Request-ID"] = "perf-test-123"
wrk.headers["X-Forwarded-For"] = "10.0.0.1"
wrk.headers["Authorization"] = "Bearer test-token"
```

### Request Pipeline

Test with a rotating set of endpoints:

```lua
-- pipeline.lua
local paths = {"/get", "/headers", "/ip", "/user-agent"}
local counter = 0

request = function()
  counter = counter + 1
  local path = paths[(counter % #paths) + 1]
  return wrk.format("GET", path)
end
```

### Report with Custom Metrics

```lua
-- report.lua
done = function(summary, latency, requests)
  io.write("--- Custom Report ---\n")
  io.write(string.format("Total requests: %d\n", summary.requests))
  io.write(string.format("Total errors:   %d\n", summary.errors.status))
  io.write(string.format("Avg latency:    %.2fms\n", latency.mean / 1000))
  io.write(string.format("Max latency:    %.2fms\n", latency.max / 1000))
  io.write(string.format("p50 latency:    %.2fms\n", latency:percentile(50) / 1000))
  io.write(string.format("p99 latency:    %.2fms\n", latency:percentile(99) / 1000))
  io.write(string.format("Req/sec:        %.2f\n", summary.requests / (summary.duration / 1000000)))
end
```

## Comparing Mesh vs No-Mesh Performance

Set up a parallel test without the mesh:

```bash
kubectl create namespace perf-test-nomesh
kubectl apply -n perf-test-nomesh -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/httpbin/httpbin.yaml

kubectl apply -n perf-test-nomesh -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: wrk-client
  labels:
    app: wrk-client
spec:
  containers:
  - name: wrk
    image: williamyeh/wrk:latest
    command: ["sleep", "infinity"]
EOF
```

Run the same test in both namespaces and compare:

```bash
echo "=== With Istio mesh ==="
kubectl exec -n perf-test wrk-client -- \
  wrk -t4 -c50 -d60s --latency \
  http://httpbin.perf-test.svc.cluster.local:8000/get

echo "=== Without Istio mesh ==="
kubectl exec -n perf-test-nomesh wrk-client -- \
  wrk -t4 -c50 -d60s --latency \
  http://httpbin.perf-test-nomesh.svc.cluster.local:8000/get
```

## Testing Istio-Specific Features

### Retry Overhead

Apply a retry policy and measure the impact:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: httpbin-retry
  namespace: perf-test
spec:
  hosts:
  - httpbin
  http:
  - route:
    - destination:
        host: httpbin
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure
```

### Rate Limiting Behavior

Test how the service handles requests beyond the rate limit:

```bash
kubectl exec -n perf-test wrk-client -- \
  wrk -t4 -c200 -d60s --latency \
  http://httpbin.perf-test.svc.cluster.local:8000/get
```

Look at the error count in the output to see how many requests got rejected.

## wrk vs Fortio for Istio Testing

Both tools are good, but they have different strengths:

**wrk advantages:**
- Higher request generation capacity per thread
- Lua scripting for complex test scenarios
- Well-known in the performance testing community

**Fortio advantages:**
- Built for Istio, understands the ecosystem
- Native gRPC support
- Built-in web UI and result comparison
- Produces JSON output by default for automation

For most Istio benchmarking, I would recommend using Fortio as the primary tool and wrk when you need Lua scripting or want a second opinion on your numbers.

## Tips for Accurate Results with wrk

1. Match thread count to available CPU cores. More threads than cores causes context switching overhead that skews results.
2. Warm up before measuring. Run a short 10-second test first, then run the real test.
3. Watch for socket errors in the output. If you see "Socket errors: connect X, read Y, write Z, timeout W", your test may be unreliable.
4. Keep test duration at 60 seconds or more for stable results.
5. Check that Envoy sidecar has enough CPU. If the proxy is CPU-throttled, you are benchmarking resource limits, not the mesh.

## Cleanup

```bash
kubectl delete namespace perf-test
kubectl delete namespace perf-test-nomesh
```

wrk is a solid choice for Istio performance testing, especially when you need custom request patterns through Lua scripting. Use it alongside Fortio and your mesh telemetry to get a well-rounded picture of your service mesh performance.
