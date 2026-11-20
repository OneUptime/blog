# Validation Summary: Fix Gzip OTLP Decode Failures: Trace `Content-Encoding` Across Every Hop

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and Collector YAML configuration.

## Technologies Covered
- OpenTelemetry Collector and OTLP/HTTP
- OTLP JSON and binary Protobuf serialization
- HTTP content headers, proxies, and request framing
- gzip compression and integrity checking
- curl and Bash
- OTLP/gRPC compression and framing

## Sources Consulted
- [OTLP specification](https://opentelemetry.io/docs/specs/otlp/): request serialization, media types, gzip headers, empty requests, trace paths, and default ports.
- [curl manual](https://curl.se/docs/manpage.html): request body handling, response compression, header/output files, and error flags.
- [Collector OTLP HTTP exporter reference](https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlphttpexporter) and its [raw README](https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/main/exporter/otlphttpexporter/README.md): component naming, endpoint behavior, and compression settings.
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.4): content coding, media types, and representation metadata.
- [RFC 1952, GZIP File Format](https://www.rfc-editor.org/rfc/rfc1952.html): magic bytes, compressed members, and integrity information.
- [gRPC over HTTP/2 protocol](https://grpc.github.io/grpc/core/md_doc__p_r_o_t_o_c_o_l-_h_t_t_p2.html): message compression flag, length prefix, and grpc-encoding.
- Local Apple gzip 487.0.1 `gzip --help`: `-c` writes compressed output to stdout and preserves the input; `-t` checks integrity.
- Local `curl --version`: curl 8.7.1 supports the options used.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The commands and configuration agree with the official references.
- The plain and gzip requests correctly use POST through `--data-binary`, retain the JSON media type, and set Content-Encoding only for compressed bytes. `--compressed` handles response negotiation and decoding.
- The empty JSON request is suitable for the explicitly limited transport smoke test. Empty telemetry may be discarded, so the post correctly requires a subsequent nonempty-span delivery check.
- The proxy observations are diagnostic leads, not proof of a particular intermediary defect. Checking complete gzip integrity is necessary because the signature alone cannot establish validity.
- Current upstream documentation names the exporter `otlp_http` and retains `otlphttp` as a deprecated alias. The post correctly advises matching the installed distribution. The YAML is an exporter fragment; a complete deployment must also reference it in a service pipeline.
- `compression: none` disables compression, while gzip is the upstream HTTP exporter's default. The configured base endpoint receives the appropriate signal path automatically.
- `--fail-with-body` requires curl 7.76.0 or newer. It does not treat redirects as HTTP errors, so saved status headers and response bodies remain relevant when investigating authentication or routing.
- Shell syntax and local gzip payload generation were checked. No live Collector, ingress, authenticated backend, or downstream storage integration was exercised; deployment-specific delivery still requires the checks described in the post.
- The three technical reference links in the post resolved to the intended official resources. The example backend hostname is a placeholder to replace with a real deployment endpoint.
