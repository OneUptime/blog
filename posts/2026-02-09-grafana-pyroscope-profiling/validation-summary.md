# Validation Summary: How to use Grafana Pyroscope for continuous profiling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Grafana Pyroscope
- Grafana Alloy
- Grafana Pyroscope data source
- Go and pyroscope-go
- Python and pyroscope-io
- Java and the Pyroscope Java agent
- Docker Compose
- pprof
- PromQL and Grafana alerting

## Sources Consulted
- Grafana Pyroscope get started documentation: https://grafana.com/docs/pyroscope/latest/get-started/
- Grafana Pyroscope server configuration parameters: https://grafana.com/docs/pyroscope/latest/configure-server/reference-configuration-parameters/
- Grafana Pyroscope storage configuration: https://grafana.com/docs/pyroscope/latest/configure-server/storage/
- Grafana Pyroscope server HTTP API: https://grafana.com/docs/pyroscope/latest/reference-server-api/
- Grafana Pyroscope Go SDK documentation: https://github.com/grafana/pyroscope-go and https://pkg.go.dev/github.com/grafana/pyroscope-go
- Grafana Pyroscope Python SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/python/
- Grafana Pyroscope Java SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/java/
- Grafana Alloy pyroscope.scrape documentation: https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/components/pyroscope/pyroscope.scrape/
- Grafana Pyroscope data source documentation: https://grafana.com/docs/grafana/latest/datasources/pyroscope/
- Grafana Cloud Profiles recording rules documentation: https://grafana.com/docs/grafana-cloud/monitor-applications/profiles/recording-rules/
- Docker image runtime verification with `grafana/pyroscope:latest` version 2.0.3.

## Issues Found
- The Docker Compose example passed a `server` positional argument before `-config.file`, which current Pyroscope does not need and which prevents the config flag from being applied as intended. Updated the standalone example to pass current Pyroscope flags directly and persist the current local data paths.
- The production configuration used outdated or invalid keys: `max_nodes_per_profile`, `retention`, and an ambiguous analytics section. Updated the limits to `max_flamegraph_nodes_default` and `compactor_blocks_retention_period`, and kept `analytics.reporting_enabled: false`, which matches current configuration documentation.
- The Go example used `time.Second` without importing `time`. Added the missing import.
- The pull-mode configuration used an obsolete Pyroscope `scrape_configs` style. Replaced it with a current Grafana Alloy `pyroscope.scrape` and `pyroscope.write` configuration.
- The API comparison examples used the old `/render` path and old `my-app.cpu` query shorthand. Updated them to `/pyroscope/render` and the current `process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="my-app"}` profile selector format.
- The tag query examples used old profile query syntax. Updated them to current profile type and label selector syntax.
- The Grafana dashboard example used the shorthand `cpu` profile type and `app` label. Updated it to the current CPU profile type ID and `service_name` label.
- The traces section implied querying profiles directly by `trace_id`. Updated the explanation to use Grafana's traces-to-profiles integration for trace/profile correlation.
- The alerting examples used non-standard metric names that Pyroscope does not expose directly. Updated the section to describe using profile recording rules first, then alerting on the exported recorded metrics.

## Review Notes
The Java and Python SDK examples match current documented configuration options. The blog could be improved in the future by pinning Pyroscope and SDK versions instead of using `latest`, but the examples are technically valid for the current documented APIs.
