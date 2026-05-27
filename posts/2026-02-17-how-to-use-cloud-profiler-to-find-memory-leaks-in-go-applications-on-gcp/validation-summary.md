# Validation Summary: How to Use Cloud Profiler to Find Memory Leaks in Go Applications on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Profiler
- Google Cloud Monitoring
- Google Kubernetes Engine metrics
- Google Cloud CLI
- Go
- Docker

## Sources Consulted
- Google Cloud Profiler: Profiling Go applications: https://cloud.google.com/profiler/docs/profiling-go
- Google Cloud Profiler: Profiling concepts: https://cloud.google.com/profiler/docs/concepts-profiling
- Google Cloud Go Profiler package reference: https://cloud.google.com/go/docs/reference/cloud.google.com/go/profiler/latest
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring GKE system metrics: https://cloud.google.com/monitoring/api/metrics_kubernetes
- Go 1.24 release notes: https://go.dev/doc/go1.24
- Go issue tracker discussion for map memory behavior: https://github.com/golang/go/issues/20135
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `runtime` package documentation: https://pkg.go.dev/runtime
- Go `sync` package documentation: https://pkg.go.dev/sync

## Issues Found
- The Cloud Profiler setup comment said `MutexProfiling: true` enabled all profile types. Updated it to clarify that mutex contention profiling is enabled by that option, while the standard Go profile types are enabled by default.
- The profile list used "Heap allocation" instead of the documented "Allocated heap" name. Updated terminology in the list and explanatory section.
- The profile list described "Threads" as OS thread count. Updated it to state that, for Go, the Profiler UI shows goroutines as threads.
- The leak-detection guidance said both heap and heap allocation profiles were required. Updated this to make heap profiles the primary leak signal and allocated heap profiles a supporting signal for allocation-heavy paths.
- The first Go sample referenced an undefined `handleData` function. Added a small handler so the sample is complete.
- The heap comparison step referred to growing "heap allocation" while instructing the reader to use the live heap profile. Updated this to "heap usage."
- The Cloud Monitoring `gcloud monitoring policies create` command used non-current `--condition-threshold-*` flags and a raw byte threshold that did not match the "80% of container limit" comment. Replaced it with the documented flags `--aggregation`, `--duration`, and `--if`, and switched to the GKE `kubernetes.io/container/memory/limit_utilization` metric with a `> 0.8` threshold.

## Review Notes
The map memory section remains a practical caveat, but Go 1.24 introduced a new Swiss Table-based map implementation. Future revisions could add version-specific nuance if the post targets Go 1.24+ map internals in detail.
