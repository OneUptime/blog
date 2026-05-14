# Validation Summary: How to Profile Flux CD Controller Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD controllers
- Kubernetes
- Go pprof
- Prometheus and Prometheus Operator rules
- Kustomize patches
- kubectl JSONPath

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux pprof helper package documentation: https://pkg.go.dev/github.com/fluxcd/pkg/runtime/pprof
- Go net/http/pprof package documentation: https://pkg.go.dev/net/http/pprof
- Prometheus query function documentation for histogram_quantile: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post used nonexistent Flux controller flags `--enable-pprof=true` and `--pprof-addr=:6060`. Current Flux controllers register pprof handlers on the metrics server. I replaced the patch-based pprof enablement section with instructions to port-forward the default metrics endpoint on port `8080`.
- The pprof commands used port `6060`, which does not match the default Flux controller metrics server. I updated the CPU, heap, goroutine, block, and mutex profile URLs to use `localhost:8080`.
- The Prometheus recording rules described reconciliation duration as grouped by controller, but Flux reconciliation metrics are labeled by resource `kind`, `namespace`, and `name`. I updated the comments and rules to aggregate by those labels, including `le` for `histogram_quantile`.
- The slow reconciliation status commands were described as showing "slow" or "longest" reconciliation times, but they only inspect artifact update times and readiness messages. I corrected the comments to match what the commands actually display.
- The block profile description implied it identifies I/O bottlenecks. Go block profiles report blocking on synchronization primitives. I corrected the description and added a caveat that block profiles may be empty unless block profiling is enabled.
- The CPU alert described `rate(container_cpu_usage_seconds_total[5m]) > 0.8` as "above 80%". That expression is CPU cores, not normalized percentage of a configured limit. I changed the alert wording to "above 0.8 cores".
- The debug logging section was titled "Trace Logging" but configured `--log-level=debug`. I renamed it to "Debug Logging".

## Review Notes
The resource request and limit values are examples, not universal recommendations. They should still be tuned against real controller workload, cluster size, repository size, and observed profile data.
