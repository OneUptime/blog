# Validation Summary: How to Debug OpenTelemetry with tcpdump and Wireshark

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- tcpdump
- Wireshark and tshark
- gRPC over HTTP/2
- OTLP/HTTP
- Protocol Buffers and protoc
- TLS debugging
- Docker and Kubernetes debugging workflows

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- gRPC over HTTP/2 protocol documentation: https://grpc.github.io/grpc/core/md_doc__p_r_o_t_o_c_o_l-_h_t_t_p2.html
- gRPC status codes documentation: https://grpc.io/docs/guides/status-codes/
- Wireshark gRPC wiki: https://wiki.wireshark.org/gRPC
- Wireshark gRPC display filter reference: https://www.wireshark.org/docs/dfref/g/grpc.html
- Wireshark HTTP/2 display filter reference: https://www.wireshark.org/docs/dfref/h/http2.html
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Docker inspect CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Local tcpdump help output from tcpdump 4.99.4

## Issues Found
- The Kubernetes debug example created an unnamed debug container and copied the capture without selecting that container. Added `--container=debugger`, kept the debug container running with `sleep infinity`, ran `tcpdump` through `kubectl exec`, and used `-c debugger` for `kubectl cp`, matching kubectl's documented container-selection options.
- The Wireshark HTTP/2 request filter used an unquoted string value: `http2.headers.method == POST`. Changed it to `http2.headers.method == "POST"` so the display filter is syntactically correct.
- The post described the gRPC response as containing a status code directly. Clarified that `grpc-status` is in the response trailers, consistent with the gRPC over HTTP/2 protocol.
- The tshark/protoc example extracted raw `http2.data.data`, which includes gRPC length-prefixed message framing and may not be directly decodable as protobuf. Changed the extraction to use Wireshark's `grpc.message_data` field for one uncompressed gRPC message body.
- The TLS debugging snippet put a shell `export` command inside a YAML code block and described `OTEL_EXPORTER_OTLP_INSECURE` as skipping TLS verification. Split the shell command into a bash block and clarified that this setting uses plaintext OTLP/gRPC when the endpoint has no scheme.
- A tcpdump recipe was labeled as watching TCP retransmissions, but the filter only matched SYN packets. Updated the label to describe repeated SYN packets and failed connection attempts.
- The final debugging walkthrough said gRPC code 14 means the collector accepted the connection but could not process the request. Updated it to describe `UNAVAILABLE` more accurately as service unavailability or connection failure while the RPC is in progress.

## Review Notes
The post is technically sound after the corrections. The command-line protobuf decoding example still assumes plaintext, uncompressed gRPC traffic and extracts a single message; encrypted traffic must be decrypted first or captured before TLS is applied.
