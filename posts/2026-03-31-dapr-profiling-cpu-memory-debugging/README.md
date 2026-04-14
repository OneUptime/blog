# How to Use Dapr Profiling for CPU and Memory Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Profiling, Performance, Debugging, Go

Description: Enable and use Dapr's built-in pprof profiling endpoint to capture CPU and memory profiles for diagnosing performance issues in the sidecar.

---

Dapr's sidecar (`daprd`) is written in Go and exposes a pprof profiling endpoint that you can use to diagnose CPU hotspots, memory leaks, and goroutine build-ups without any code changes to your application.

## Enabling the Profiling Endpoint

Enable profiling via annotation in Kubernetes:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/enable-profiling: "true"
```

The profiling endpoint defaults to port 7777. This port is not configurable via annotation — use the `--profile-port` flag on `daprd` if you need a different port.

For local development with `dapr run`:

```bash
dapr run --app-id myapp --enable-profiling --profile-port 7777 -- python app.py
```

## Capturing a CPU Profile

Port-forward to the sidecar profiling endpoint:

```bash
kubectl port-forward <pod-name> 7777:7777 -n <namespace>
```

Capture a 30-second CPU profile:

```bash
curl -o cpu.prof "http://localhost:7777/debug/pprof/profile?seconds=30"
```

Analyze it:

```bash
go tool pprof cpu.prof
# Inside pprof:
(pprof) top10
(pprof) web
```

## Capturing a Memory Heap Profile

```bash
curl -o heap.prof http://localhost:7777/debug/pprof/heap
go tool pprof heap.prof
(pprof) top10 -cum
(pprof) list <function-name>
```

## Goroutine Analysis

A high goroutine count indicates goroutine leaks or excessive concurrency:

```bash
curl http://localhost:7777/debug/pprof/goroutine?debug=2 > goroutines.txt
# Look for goroutines stuck in the same function
grep -c "goroutine" goroutines.txt
```

## Using pprof Web UI

For a visual analysis, use the pprof web server:

```bash
go tool pprof -http=:8888 cpu.prof
```

Open `http://localhost:8888` in a browser to see flame graphs, call graphs, and source-level annotations.

## Continuous Profiling with Pyroscope

For always-on profiling in production, integrate Pyroscope with Dapr:

```bash
# Run Pyroscope
docker run -p 4040:4040 grafana/pyroscope

# Push profiles from the Dapr sidecar
curl -X POST "http://pyroscope:4040/ingest?name=dapr-sidecar&format=pprof" \
  --data-binary @cpu.prof
```

## Interpreting Results

Common findings and fixes:

| Finding | Likely Cause | Fix |
|---------|-------------|-----|
| High CPU in `pubsub.Process` | Message volume too high | Add consumers, tune batch size |
| Heap growth in `state.Set` | Large state objects | Reduce state payload size |
| Goroutine leak in `grpc.Recv` | Connection not closed | Check component lifecycle |

## Summary

Dapr's built-in pprof endpoint provides direct access to CPU, memory, and goroutine profiles of the sidecar without application changes. Enable it with the `dapr.io/enable-profiling: "true"` annotation, capture profiles with curl, and analyze with `go tool pprof`. For production, integrate continuous profiling with Pyroscope to catch regressions before they become incidents.
