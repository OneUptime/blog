# Validation Summary: How to Profile Kubernetes Application CPU and Memory Usage

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Kubernetes
- kubectl and Metrics Server
- Linux cgroups v1 and v2
- Go pprof
- Java JMX and async-profiler
- Python py-spy and cProfile
- Node.js v8-profiler-next and Inspector
- Grafana Pyroscope
- Prometheus and PromQL
- Linux perf and FlameGraph

## Sources Consulted
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes cgroup v2 documentation: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Go net/http/pprof documentation: https://pkg.go.dev/net/http/pprof
- async-profiler official repository and release notes: https://github.com/async-profiler/async-profiler
- Node.js debugging and Inspector documentation: https://nodejs.org/learn/getting-started/debugging
- py-spy documentation: https://docs.rs/crate/py-spy/latest
- Grafana Pyroscope documentation: https://grafana.com/docs/pyroscope/latest/
- Grafana Pyroscope Go SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/go_push/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- OneUptime website and linked blog URLs: https://oneuptime.com/

## Issues Found
- The Kubernetes Deployment snippets used `apps/v1` without required selectors and matching pod template labels. Added `spec.selector.matchLabels` and matching `template.metadata.labels` to the Deployment examples.
- The Go pprof server bound to `localhost:6060`, which would not be reachable through the Kubernetes Service example. Changed it to listen on `:6060`.
- The cgroup examples only showed cgroup v1 paths. Added cgroup v2 `memory.current` and `cpu.stat` paths first, keeping the v1 paths as a fallback.
- The async-profiler Dockerfile used the old `jvm-profiling-tools` release path and v2.9 layout. Updated it to async-profiler 4.4, installed required download certificates/tools, and used the current `bin/asprof` executable.
- The async-profiler `kubectl exec` commands expanded `$(pgrep -f java)` on the local shell instead of inside the pod. Wrapped the profiler invocation in `sh -c` so PID lookup runs in the container.
- The Pyroscope deployment used the archived `pyroscope/pyroscope` image. Updated it to `grafana/pyroscope:latest`.
- The Pyroscope Go snippet used the old `github.com/pyroscope-io/client/pyroscope` import and omitted `os`. Updated it to `github.com/grafana/pyroscope-go` and added the missing `os` import.
- The PromQL memory growth example used `rate()` on a gauge. Replaced it with `deriv(container_memory_working_set_bytes[1h])`, which matches Prometheus guidance for gauges.
- The perf sidecar commands used a container name where `kubectl exec` requires a pod name, and wrote misleading `perf.data` output locally. Updated commands to use `<pod-name> -c profiler` and write `perf script` output to `out.perf`.
- The Python metrics example labeled `python_info` as thread count, but `python_info` is an info metric. Replaced it with `process_resident_memory_bytes` and changed the label to process memory.
- The OneUptime APM product URL returned 404. Updated the link to the live OneUptime platform URL.

## Review Notes
Some examples intentionally remain simplified for tutorial readability, such as unauthenticated JMX and debug endpoints. In production, these endpoints should be restricted with network policy, authentication, and short-lived access.
