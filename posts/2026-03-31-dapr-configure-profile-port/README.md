# How to Configure Dapr Profile Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Profiling, Performance, Port, Debugging

Description: Enable and configure the Dapr profile port to collect CPU and memory profiles from Dapr sidecars using Go's pprof for performance debugging.

---

## What Is the Dapr Profile Port?

Dapr sidecars are written in Go and expose a pprof-compatible profiling endpoint when profiling is enabled. The profile port (default: 7777) gives you access to CPU profiles, memory allocations, goroutine stacks, and execution traces - invaluable for diagnosing sidecar performance issues.

## Enabling the Profile Port

Profiling is disabled by default. Enable it via annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/enable-profiling: "true"
    spec:
      containers:
      - name: my-service
        image: my-service:latest
```

The profile port defaults to 7777. There is no Kubernetes annotation to change the profile port - use the `--profile-port` flag on `daprd` if you need a different port.

## Changing the Profile Port

The profile port is not configurable via annotation. To use a different port, pass the `--profile-port` flag directly to `daprd`:

```bash
daprd --profile-port 7778 --enable-profiling ...
```

Never expose the profile port externally - restrict access to within the cluster or via port-forward only.

## Collecting CPU Profiles

Use kubectl port-forward to access the profiling endpoint locally:

```bash
# Port-forward to the Dapr sidecar profile port
kubectl port-forward POD_NAME 7777:7777

# Collect a 30-second CPU profile
go tool pprof http://localhost:7777/debug/pprof/profile?seconds=30

# Save profile to file
curl -o cpu.prof http://localhost:7777/debug/pprof/profile?seconds=30
go tool pprof cpu.prof
```

## Collecting Memory Profiles

```bash
# Heap profile (current allocations)
curl -o heap.prof http://localhost:7777/debug/pprof/heap
go tool pprof heap.prof

# Allocation profile (all allocations since start)
curl -o allocs.prof http://localhost:7777/debug/pprof/allocs
go tool pprof allocs.prof
```

## Goroutine Analysis

Goroutine leaks are a common issue in long-running Go services:

```bash
# Get goroutine dump
curl http://localhost:7777/debug/pprof/goroutine?debug=2

# Count goroutines over time
watch -n 5 "curl -s http://localhost:7777/debug/pprof/goroutine | head -1"
```

## Execution Tracing

For detailed timing analysis:

```bash
# Collect 10-second execution trace
curl -o trace.out http://localhost:7777/debug/pprof/trace?seconds=10

# Analyze with Go trace tool
go tool trace trace.out
```

## Profiling in Local Development

```bash
# Enable profiling with dapr run
dapr run \
  --app-id my-service \
  --app-port 8080 \
  --profile-port 7777 \
  --enable-profiling \
  -- go run main.go
```

## Security Considerations

Profiling endpoints expose internal runtime details. In production:

```yaml
# Only enable profiling in specific pods for investigation
# Use a separate Deployment with profiling enabled
metadata:
  name: my-service-debug
  annotations:
    dapr.io/enable-profiling: "true"
```

Use network policies to restrict profile port access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-dapr-profiling
spec:
  podSelector:
    matchLabels:
      app: my-service
  ingress:
  - ports:
    - port: 7777
    from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
```

## Summary

The Dapr profile port provides direct access to Go's pprof profiling infrastructure within the sidecar, enabling CPU, memory, and goroutine analysis without restarting or redeploying the sidecar. This is particularly useful for investigating performance anomalies in production - enabling profiling temporarily on a single pod, collecting data via port-forward, then disabling it once the investigation is complete.
