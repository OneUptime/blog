# Validation Summary: How to Diagnose Kubernetes Container Memory Leaks Using Memory Profiling Tools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Metrics Server
- Prometheus and PromQL
- Node.js V8 heap snapshots
- Python tracemalloc
- Go pprof
- Java HotSpot diagnostics and jcmd
- Kubernetes ephemeral debug containers
- Linux core dumps
- Pyroscope and Parca

## Sources Consulted
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes resource metrics pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes ephemeral containers: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes debug running Pods: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Node.js V8 API documentation: https://nodejs.org/api/v8.html
- Node.js heap snapshot diagnostics guide: https://nodejs.org/en/docs/guides/diagnostics/memory/using-heap-snapshot
- Python tracemalloc documentation: https://docs.python.org/3/library/tracemalloc.html
- Go net/http/pprof documentation: https://pkg.go.dev/net/http/pprof
- Go runtime documentation: https://pkg.go.dev/runtime
- Oracle jcmd documentation: https://docs.oracle.com/en/java/javase/22/docs/specs/man/jcmd.html
- Oracle HotSpotDiagnosticMXBean documentation: https://docs.oracle.com/en/java/javase/21/docs/api/jdk.management/com/sun/management/HotSpotDiagnosticMXBean.html

## Issues Found
- The OOMKill diagnostic section treated exit code 137 as definitive proof of an OOMKill. Updated the commands and explanation to check the container's terminated reason and clarify that exit code 137 means SIGKILL and only confirms OOMKill when paired with the `OOMKilled` reason.
- The Prometheus examples used `rate()` and `increase()` on `container_memory_working_set_bytes`, which is a gauge. Replaced them with `deriv()` and `delta()`, and changed the code fence from YAML to PromQL.
- The Node.js example imported `fs` but did not use it. Removed the unused import while preserving the heap snapshot logic.
- The Node.js description implied heap snapshots come only through the inspector protocol. Updated it to distinguish V8 heap snapshot APIs from inspector-based profiling.
- The Go pprof example used `log.Printf` without importing `log`. Added the missing import.
- The Java heap dump command comment said JMX, but the command used `jcmd`. Updated the comment to match the command.
- The ephemeral debug container instructions implied target process namespace access is unconditional. Added the Kubernetes runtime-support caveat for `--target`.
- The core dump Pod spec used an invalid `resources.limits.core` field. Replaced it with a container entrypoint pattern that sets `ulimit -c unlimited` and writes from a mounted directory, with a note that `kernel.core_pattern` still controls final core file naming and location.

## Review Notes
Python snippets were syntax-checked locally with Python 3.12. The local environment did not provide `kubectl`, `go`, or `ruby`; those examples were validated against official documentation and source review instead.
