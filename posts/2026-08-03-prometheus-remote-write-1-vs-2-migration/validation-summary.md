# Validation Summary: Prometheus Remote Write 1.0 vs. 2.0: Compatibility, Metadata, and Migration

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Prometheus 3.13.1
- Prometheus Remote Write 1.0 and 2.0-rc.4
- Protocol Buffers
- Snappy block compression
- HTTP content negotiation and response headers
- Prometheus YAML configuration and command-line flags
- PromQL remote-write monitoring queries
- Native histograms, exemplars, metric metadata, and start timestamps

## Sources Consulted

- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus remote-write sender configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus command-line reference](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus 3.13.1 release](https://github.com/prometheus/prometheus/releases/tag/v3.13.1)
- [Prometheus v3.13.1 receiver flag definitions](https://github.com/prometheus/prometheus/blob/v3.13.1/cmd/prometheus/main.go#L460-L467)
- [Prometheus v3.13.1 remote-write client headers and retry handling](https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/client.go)
- [Prometheus v3.13.1 queue manager](https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/queue_manager.go)
- [Prometheus v3.13.1 receiver implementation](https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/write_handler.go)
- [Prometheus v3.13.1 response-count parsing](https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/stats.go)
- [Prometheus 1.0 protobuf implementation](https://github.com/prometheus/prometheus/blob/v3.13.1/prompb/remote.proto)
- [Prometheus 2.0 protobuf definition](https://github.com/prometheus/prometheus/blob/v3.13.1/prompb/io/prometheus/write/v2/types.proto)
- [Prometheus remote-write characteristics and tuning](https://prometheus.io/docs/practices/remote_write/)

## Issues Found

- The post called the Remote Write 1.0 specification status `Stable`, while the official specification uses the status `Published`. Updated the introduction and comparison table to use the official status wording.
- The HTTP request examples omitted `User-Agent`, although both Remote Write specifications require that header. Added `User-Agent: Prometheus/3.13.1` to both examples.
- The post described metric metadata as part of Remote Write 1.0 without distinguishing the published specification from Prometheus's implementation. The 1.0 specification omits and reserves field 3, while Prometheus's `prometheus.WriteRequest` uses field 3 for separately delivered metadata. Qualified the table and explanation to identify this as a Prometheus extension.
- The Prometheus 2.0 sender example did not set `send_native_histograms: true`. Prometheus 3.13.1 documentation calls this setting a no-op for `io.prometheus.write.v2.Request`, but the tagged queue implementation still gates both integer and float native-histogram forwarding on the boolean. Added the setting so the example works safely with the version discussed.

## Review Notes

- As of 2026-08-04, the official 1.0 specification is published and the 2.0 specification remains experimental at `2.0-rc.4`.
- The Prometheus 3.13.1 release binary accepted both protobuf messages by default in a receiver smoke test, matching the source default. Its generated help and online command reference display only `prometheus.WriteRequest` as the default, so the post's recommendation to configure both values explicitly is appropriate.
- Both sender YAML examples passed `promtool` 3.13.1 syntax validation, and the repeated receiver flag syntax was accepted by the Prometheus 3.13.1 binary.
- A live Prometheus 3.13.1 receiver smoke test accepted a 2.0 request and returned all three required written-count headers with zero values.
- All external links in the post returned successful HTTP responses during validation.
