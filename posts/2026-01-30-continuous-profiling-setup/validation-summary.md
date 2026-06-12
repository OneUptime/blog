# Validation Summary: How to Build Continuous Profiling Setup

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Pyroscope
- Pyroscope Go, Python, Node.js, and Java SDKs
- Parca and Parca Agent
- Datadog Continuous Profiler for Go and Python
- Docker Compose
- Kubernetes Deployments and DaemonSets
- Prometheus alerting rules
- Flame graphs and profiling comparison workflows

## Sources Consulted
- Grafana Pyroscope server configuration parameters: https://grafana.com/docs/pyroscope/latest/configure-server/reference-configuration-parameters/
- Grafana Pyroscope Python SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/python/
- Grafana Pyroscope Node.js SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/nodejs/
- Grafana Pyroscope Java SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/java/
- Grafana Pyroscope Go SDK README: https://github.com/grafana/pyroscope-go
- Grafana Pyroscope server HTTP API documentation: https://grafana.com/docs/pyroscope/latest/reference-server-api/
- Parca quickstart and binary documentation: https://www.parca.dev/docs/quickstart/ and https://www.parca.dev/docs/binary/
- Parca Agent Kubernetes and design documentation: https://www.parca.dev/docs/kubernetes/ and https://www.parca.dev/docs/parca-agent-design
- Datadog Go profiler package documentation: https://pkg.go.dev/gopkg.in/DataDog/dd-trace-go.v1/profiler
- Datadog Continuous Profiler documentation: https://docs.datadoghq.com/profiler/enabling/
- Datadog Python ddtrace configuration reference: https://ddtrace.readthedocs.io/en/stable/configuration.html

## Issues Found
- Pyroscope server examples used unsupported environment variable names for storage, retention, and logging. Updated the Docker Compose and Kubernetes examples to use documented Pyroscope command-line flags such as `-storage.backend`, `-storage.filesystem.dir`, `-storage.s3.bucket-name`, `-storage.s3.region`, and `-compactor.blocks-retention-period`.
- Pyroscope Python example used non-existent current SDK options like `enable_cpu_profiling`, `enable_memory_profiling`, `enable_gil_profiling`, and `enable_thread_id`. Replaced them with supported `pyroscope-io` options: `oncpu`, `gil_only`, and `report_thread_id`.
- Pyroscope Node.js example used invalid boolean `wall`, boolean `heap`, and top-level `sampleRate` options. Replaced them with supported `wall` and `heap` configuration objects and `wall.samplingIntervalMicros`.
- Pyroscope Java example used `EventType.CPU`, boolean allocation/lock options, and an integer profiling interval. Updated it to use `EventType.ITIMER`, `setProfilingAlloc("512k")`, `setProfilingLock("10ms")`, and `Duration.ofMillis(10)`, and added missing imports.
- Parca server example used an outdated retention flag. Replaced it with current persistence-related flags, including `--enable-persistence` and `--storage-path`.
- Parca Agent DaemonSet omitted several host mounts used by current Parca Agent Kubernetes examples and included sampling flags not present in current documented quickstarts. Updated the mount list and removed the unsupported sampling-duration/frequency flags.
- Datadog Go example used `time.Second` without importing `time` and implied the API key option was required. Added the missing import and removed the misleading API key option from the basic agent-based example.
- Datadog Python example used unsupported public `Profiler` keyword arguments for memory, lock, exception, and GC profiling. Replaced them with notes pointing to supported environment variables.
- Pyroscope profile comparison script summed encoded flamebearer levels incorrectly. Updated it to compare the documented `flamebearer.numTicks` total sample count.
- Prometheus alert example referenced a non-standard Pyroscope metric name. Renamed it as a profile-derived metric example to avoid implying Pyroscope exports that exact metric by default.

## Review Notes
The examples are now aligned with the current official APIs and configuration options. Some operational recommendations, such as exact overhead percentages and retention/cost planning, remain workload-dependent and should be benchmarked in each production environment.
