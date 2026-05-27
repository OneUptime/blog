# Validation Summary: How to Use the Go Cloud Profiler Agent to Profile a Go Service Running

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Google Cloud Profiler
- Cloud Run
- Go runtime/pprof
- Google Cloud Storage client library

## Sources Consulted
- Google Cloud Profiler Go application documentation: https://docs.cloud.google.com/profiler/docs/profiling-go
- Google Cloud Profiler overview: https://docs.cloud.google.com/profiler/docs/about-profiler
- Google Cloud Profiler flame graph documentation: https://docs.cloud.google.com/profiler/docs/concepts-flame
- Google Cloud Profiler profile selection documentation: https://docs.cloud.google.com/profiler/docs/selecting-profiles
- Google Cloud Profiler comparison documentation: https://docs.cloud.google.com/profiler/docs/comparing-profiles
- Go package documentation for cloud.google.com/go/profiler: https://pkg.go.dev/cloud.google.com/go/profiler
- Go package documentation for runtime/pprof: https://pkg.go.dev/runtime/pprof
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract

## Issues Found
- Corrected the listed Go profile types. Cloud Profiler documents Go profile types as CPU time, Heap, Allocated heap, Contention, and Threads, with Go goroutine profiles shown as Threads in the UI.
- Corrected the profile collection cadence. Cloud Profiler usually collects for about 10 seconds and coordinates collection at an average rate of one profile per minute per service/version/zone, not simply every few minutes.
- Added the required Cloud Profiler API and IAM prerequisite. The Cloud Profiler Agent role is required for the service account to upload profile data.
- Removed an unused `context` import from the basic Go example and an unnecessary explicit `ProjectID` field from the Cloud Run configuration snippet.
- Corrected the pprof labels explanation. Go pprof labels are used by CPU and goroutine profiles; the post no longer claims that custom labels generally appear as Cloud Profiler UI filters.
- Replaced the inbound TLS flame graph example because Cloud Run terminates TLS before requests reach the container.
- Clarified that CPU profiles do not directly measure network I/O wait time, including the database and Cloud Storage examples.
- Added missing Go imports for `log` and `os` in code snippets that used those packages.
- Fixed incorrect comments in the configuration options snippet for `AllocForceGC` and `DebugLogging`.
- Updated the Cloud Run CPU and min instances notes to match current Cloud Run CPU allocation and billing behavior.

## Review Notes
Google Cloud Profiler's current support matrix lists Compute Engine, GKE, App Engine, and outside-Google-Cloud environments, but not Cloud Run as a first-class supported environment. The post is still useful as a Cloud Run-oriented integration guide, provided readers enable the Profiler API, grant `roles/cloudprofiler.agent`, and validate behavior in their own Cloud Run service.
