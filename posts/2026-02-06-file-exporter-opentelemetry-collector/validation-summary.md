# Validation Summary: How to Configure the File Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector File exporter
- OpenTelemetry Collector OTLP receiver and OTLP HTTP exporter
- OpenTelemetry Collector batch, memory limiter, resource, and tail sampling processors
- Kubernetes Deployments, DaemonSets, PersistentVolumeClaims, and hostPath volumes
- jq
- Linux shell utilities
- AWS CLI
- ClickHouse JSONEachRow

## Sources Consulted
- OpenTelemetry Collector File exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector File exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/config.go
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes DaemonSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- ClickHouse JSONEachRow docs: https://clickhouse.com/docs/interfaces/formats/JSONEachRow

## Issues Found
1. **Outdated Collector environment variable syntax**: The examples used `${VAR}`. Current Collector docs use `${env:VAR}` for environment variable expansion. Updated file paths, resource attributes, headers, and incident file paths to use `${env:...}`.

2. **Invalid OTLP trace/span IDs in JSON example**: The example IDs contained non-hex characters. Replaced them with valid hex-encoded trace and span IDs.

3. **Incomplete protobuf file explanation**: The post implied protobuf output could be read directly as plain protobuf messages. The File exporter length-prefixes each encoded object with 4 bytes for protobuf format. Added that decoding requirement.

4. **Incorrect compression configuration**: The post used `rotation.compress: true` and gzip naming, but the File exporter uses top-level `compression: zstd`. Updated all compression examples and related text.

5. **Incorrect flush behavior**: The post claimed `flush_interval: 0s` flushes every write. The exporter defaults zero/unset values to 1 second, and `flush_interval` is ignored when rotation is enabled. Corrected the explanation.

6. **Misleading age-based rotation example**: The post described daily rotation with 30 days of retention using `max_days: 1` and `max_backups: 30`. The same `max_days` value controls active-file age rotation and age-based cleanup. Changed the example to describe rotation and cleanup using the same age window.

7. **Sampling pipeline wording was wrong**: The sampling example sent tail-sampled traces to both exporters, despite saying the backend received everything. Updated the comments and explanatory text to say both backend and file output are sampled.

8. **Invalid Kubernetes workload snippets**: The `apps/v1` Deployment and DaemonSet examples omitted required selectors and matching template labels. The DaemonSet also omitted the container image. Added selectors, labels, and image.

9. **Linux file-size command used BSD stat syntax**: Replaced `stat -f%z` with GNU/Linux `stat -c%s` for the Linux-oriented examples.

10. **jq slow-trace filter subtracted strings**: OTLP JSON nanosecond timestamps are strings, so the filter needed `tonumber` before subtraction. Updated the jq expression and verified it against a representative OTLP JSON object.

11. **Incorrect gzip upload pattern after compression fix**: Updated the S3 upload pattern from `*.json.gz` to `*.json*` so it no longer assumes gzip output.

12. **Overstated stability claim**: The post called the File exporter production-ready without qualification. Official component metadata classifies traces, metrics, and logs support as alpha, so the conclusion now notes that stability caveat.

## Review Notes
- The corrected YAML snippets were parsed successfully.
- The corrected jq examples were tested against a representative OTLP JSON object.
- Some operational recommendations, such as retention sizes and storage savings, remain workload-dependent guidance rather than guaranteed outcomes.
