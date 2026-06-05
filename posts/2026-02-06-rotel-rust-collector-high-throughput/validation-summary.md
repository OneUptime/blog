# Validation Summary: How to Use Rotel for 3.7M Spans/Sec Throughput in High-Volume Pipelines

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Rotel
- OpenTelemetry Collector
- OTLP
- Rust
- Docker
- Kubernetes
- telemetrygen
- ClickHouse benchmarking

## Sources Consulted
- Rotel documentation and upstream README: https://rotel.dev/docs/ and https://github.com/rotel-dev/rotel
- Rotel getting started guide: https://rotel.dev/docs/setup/getting-started/
- Rotel performance benchmark post: https://rotel.dev/blog/otel-to-rotel-petabyte-scaling-tracing-4x-greater-throughput/
- Docker Hub image listing for Rotel: https://hub.docker.com/r/streamfold/rotel/tags
- OpenTelemetry telemetrygen documentation and source: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen and https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen
- Kubernetes Deployment and Service API conventions: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ and https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post used the non-existent or outdated Docker image `rotel/rotel:latest`. Changed it to the documented `streamfold/rotel:latest`.
- The source repository was listed as `github.com/rotel-io/rotel`. Changed it to the current `github.com/rotel-dev/rotel`.
- The post showed a Collector-style YAML configuration with receivers, processors, routing, exporters, telemetry, and pipelines. Rotel is currently configured with CLI flags or `ROTEL_` environment variables, so the snippet was replaced with supported Rotel environment variables.
- The runtime command used `rotel --config`, which is not the documented Rotel entrypoint. Changed it to `rotel start` with supported flags.
- The Docker run example mounted a YAML config and used `--config`. Replaced it with `streamfold/rotel:latest start` and supported Rotel flags.
- The Kubernetes example mounted a ConfigMap as a Rotel YAML config and exposed a metrics port that was not configured by the documented Rotel examples. Replaced the configuration volume with supported environment variables and removed the unsupported metrics port.
- The benchmark command attempted to run `telemetrygen` from the OpenTelemetry Collector Contrib collector image and described it as the load generator used for 3.7M spans/sec. Updated the section to install and run the actual `telemetrygen` command, and clarified that Rotel's published 3.7M spans/sec benchmark used a custom load generator in a Kafka-to-ClickHouse setup.
- The tuning tips referenced unsupported exporter `num_connections` YAML settings. Replaced that with supported exporter protocol, compression, retry, and timeout tuning guidance.
- The explanation over-attributed the 3.7M spans/sec result to eliminating GC pauses. Reworded the claim to match the Rotel benchmark, where throughput improvements came from several factors including receiver parallelism, allocator behavior, and compression optimization.

## Review Notes
The article is now technically aligned with Rotel's current documented configuration model. Future updates could add a separate, fully reproducible Kafka-to-ClickHouse benchmark walkthrough using the upstream benchmark repository, but that would be a larger content expansion rather than a correctness fix.
