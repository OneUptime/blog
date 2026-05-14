# Validation Summary: How to Optimize Flux CD Controller CPU Usage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Helm Controller
- Source Controller
- Go runtime
- Prometheus / Prometheus Operator

## Sources Consulted
- Flux advanced debugging / pprof documentation: https://fluxcd.io/flux/gitops-toolkit/debugging/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/3.9/querying/operators/
- Go runtime package documentation: https://pkg.go.dev/runtime
- automaxprocs documentation: https://github.com/uber-go/automaxprocs

## Issues Found
- The pprof section used unsupported `--enable-pprof` and `--pprof-addr` flags. Flux documents pprof as being served on the metrics HTTP server by default, so the section now uses `kubectl port-forward` to port 8080 and an optional Service targeting the existing `http-prom` port.
- The server-side apply section incorrectly described `force: true` as a diff optimization and said `IfNotPresent` skips managed-field diffing. Flux documents `force` as a recreate policy for immutable field changes and `IfNotPresent` as an apply-only-if-missing policy, so the example and explanation were corrected.
- The concurrency examples used Deployment-style `args` patches that could replace existing controller arguments when used as strategic merge patches. The section now uses Kustomize JSON 6902 patches that append concurrency arguments to the existing controller args.
- The source-controller concurrency example set `--concurrent=2`, which is the documented default. It now uses `--concurrent=1` when demonstrating a reduction.
- The Go runtime section described `GOMAXPROCS` as limiting OS threads and suggested setting it via a sidecar or init container. The wording now describes Go scheduler parallelism accurately and recommends either explicit `GOMAXPROCS` or a controller image built with an automaxprocs-style library.
- The high-CPU Prometheus expression treated CPU quota as if it directly represented cores. It now divides quota by period before comparing usage against 80% of the CPU limit.

## Review Notes
The resource request and limit values are examples, not universal recommendations. Operators should still size Flux controllers from observed metrics and reconciliation latency in their own clusters.
