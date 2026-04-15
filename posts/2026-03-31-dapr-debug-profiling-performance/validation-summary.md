# Validation Summary: How to Use Dapr Debug Profiling for Performance Issues

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Dapr (sidecar profiling)
- Go pprof (CPU, heap, goroutine, mutex profiling)
- Kubernetes (pod annotations, port-forwarding)
- Grafana Pyroscope / Grafana Alloy (continuous profiling)
- Helm

## Sources Consulted
- Dapr source code: `pkg/injector/annotations/annotations.go` — definitive list of Kubernetes annotations
- Dapr source code: `pkg/runtime/config.go` — default profiling port (7777)
- Dapr source code: `pkg/injector/patcher/sidecar_container.go` — sidecar container builder (confirms no profile-port annotation)
- Dapr official docs: https://docs.dapr.io/operations/troubleshooting/profiling-debugging/ — profiling endpoint usage
- Dapr official docs: https://docs.dapr.io/reference/arguments-annotations-overview/ — annotation reference
- Grafana Pyroscope docs: https://grafana.com/docs/pyroscope/latest/deploy-kubernetes/helm/ — `profiles.grafana.com/` annotation namespace
- Grafana Alloy docs: https://grafana.com/docs/alloy/latest/reference/components/pyroscope/pyroscope.scrape/ — current scrape component configuration
- Go pprof documentation: https://pkg.go.dev/net/http/pprof — standard pprof HTTP endpoints

## Issues Found

### Issue 1: Non-existent `dapr.io/profile-port` annotation
- **What was wrong:** The post used `dapr.io/profile-port: "7778"` as a pod annotation. This annotation does not exist in Dapr. The profiling port is only configurable via the daprd `--profile-port` CLI flag, not via a Kubernetes annotation.
- **What was changed:** Removed the `dapr.io/profile-port` annotation from the YAML example. Updated the description to note that the default port (7777) is used.
- **Why:** Verified against Dapr source code (`pkg/injector/annotations/annotations.go`) — no such annotation is defined.

### Issue 2: Wrong default profiling port (7778 vs 7777)
- **What was wrong:** All port references used 7778. The actual default Dapr profiling port is 7777, defined in `pkg/runtime/config.go`.
- **What was changed:** Updated all port references from 7778 to 7777 throughout the post (port-forward commands, curl commands, Pyroscope config).
- **Why:** The default is 7777 per Dapr source code and official documentation.

### Issue 3: Helm command does not enable profiling
- **What was wrong:** The post claimed profiling could be enabled via Helm with `--set dapr_operator.logLevel=debug --set global.logLevel=debug`. This command only sets debug log levels — it has nothing to do with profiling. The Dapr Helm chart has no profiling-related values.
- **What was changed:** Replaced the Helm section with the Dapr CLI command (`dapr run --enable-profiling --profile-port 7777 -- myapp`) as an alternative for local development.
- **Why:** Verified the Dapr Helm chart `values.yaml` contains zero profiling configuration. Profiling is only available per-pod via annotations or per-process via CLI flags.

### Issue 4: Incorrect Pyroscope annotation namespace
- **What was wrong:** The post used `pyroscope.io/scrape`, `pyroscope.io/port`, and `pyroscope.io/profile-types` annotations. These annotations do not exist. The `pyroscope.io/` namespace was never used for scrape configuration.
- **What was changed:** Updated to the correct `profiles.grafana.com/` namespace with per-profile-type annotations (e.g., `profiles.grafana.com/cpu.scrape: "true"`, `profiles.grafana.com/cpu.port: "7777"`).
- **Why:** Verified against Grafana Pyroscope documentation for Kubernetes deployment.

### Issue 5: Incorrect Pyroscope scrape configuration format
- **What was wrong:** The scrape config used camelCase keys (`scrapeConfigs`, `job_name`), had `targets` at the wrong nesting level, used `enabled_profiles` with incorrect profile type names (`process_cpu`, `memory` instead of `cpu`, `mem`), and was missing required fields (`static-configs`, `spy-name`).
- **What was changed:** Replaced the entire scrape config section with a Grafana Alloy `pyroscope.scrape` component configuration, which is the current recommended approach for continuous profiling with Pyroscope.
- **Why:** The old Pyroscope server scrape config has been deprecated. Grafana Alloy is now the recommended scraping tool. Verified against Grafana Alloy documentation.

## Review Notes
- The pprof endpoint paths (`/debug/pprof/profile`, `/debug/pprof/heap`, `/debug/pprof/goroutine`, `/debug/pprof/mutex`) are all standard Go pprof endpoints and are correct.
- The `go tool pprof` commands (including the `-base` flag for differential profiling) are correct.
- The advice about checking `dapr/pkg/messaging` and `dapr/pkg/channel` for goroutine leaks is reasonable general guidance, though the exact package paths may vary across Dapr versions.
- The post could benefit from noting the Dapr version it targets, as annotation behavior may evolve across releases.
