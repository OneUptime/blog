# Validation Summary: Fix Snappy Corrupt Input and Content-Type Errors in Prometheus Remote Write

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Prometheus Remote Write 1.0 and 2.0
- Google Protocol Buffers
- Snappy block and framed compression formats
- Prometheus remote-write sender configuration
- Prometheus built-in remote-write receiver
- HTTP content negotiation and status codes
- Reverse proxies and binary request-body integrity
- PromQL remote-storage failure metrics

## Sources Consulted
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus remote-write sender configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus command-line reference](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus storage documentation](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus Remote Read API documentation](https://prometheus.io/docs/prometheus/latest/querying/remote_read_api/)
- [Prometheus HTTP API documentation](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [Prometheus v3.13.1 receiver flag definitions](https://github.com/prometheus/prometheus/blob/v3.13.1/cmd/prometheus/main.go#L465-L467)
- [Prometheus v3.13.1 remote-write configuration source](https://github.com/prometheus/prometheus/blob/v3.13.1/config/config.go)
- [Prometheus v3.13.1 remote-write HTTP client source](https://github.com/prometheus/prometheus/blob/v3.13.1/storage/remote/client.go)
- [Prometheus Remote Write protobuf definitions](https://github.com/prometheus/prometheus/tree/main/prompb)
- [Prometheus Remote Write compliance tests](https://github.com/prometheus/compliance/tree/main/remotewrite)
- [Google Snappy framing format specification](https://github.com/google/snappy/blob/main/framing_format.txt)
- [Snzip documentation](https://github.com/kubo/snzip/blob/master/README.md)

## Issues Found
- The custom-sender checklist described unsupported-content responses as non-retriable without the Remote Write 2.0 exception for HTTP 415. The 2.0 specification permits a sender to retry a 415 response with a different content type or encoding. The checklist now says not to resend the same unsupported content unchanged, documents the conditional 415 retry, and keeps invalid-sample responses non-retriable.

## Review Notes
- The official Remote Write 2.0 specification is still marked experimental. Receiver support should therefore be confirmed before selecting `io.prometheus.write.v2.Request`, as the post recommends.
- The Prometheus v3.13.1 source initializes the built-in receiver with both protobuf message types. Its generated command reference shows only `prometheus.WriteRequest` in the default column, so checking the deployed binary's help output remains appropriate.
- All external links in the post returned HTTP 200 during validation.
