# Validation Summary: How to Configure max_recv_msg_size_mib to Prevent Dropped Data in OTLP Receivers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver
- OTLP over gRPC
- OTLP over HTTP
- Collector internal telemetry
- Prometheus metrics endpoint
- Go OpenTelemetry SDK
- gRPC for Go

## Sources Consulted
- OpenTelemetry Collector OTLP receiver package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/receiver/otlpreceiver
- OpenTelemetry Collector gRPC configuration package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configgrpc
- OpenTelemetry Collector HTTP configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Go OTLP trace gRPC exporter documentation/source: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc and https://github.com/open-telemetry/opentelemetry-go/blob/main/exporters/otlp/otlptrace/otlptracegrpc/options.go
- gRPC Go API documentation for call and server message-size options: https://pkg.go.dev/google.golang.org/grpc

## Issues Found
- The post stated that the OTLP HTTP receiver has no explicit limit. Current Collector HTTP server configuration documents `max_request_body_size` with a default of 20 MiB, so I corrected the default-limit description.
- The Collector internal telemetry examples used the deprecated `service.telemetry.metrics.address` setting. Current Collector documentation says this setting is ignored as of v0.123.0, so I replaced it with `service.telemetry.metrics.readers` using a Prometheus pull exporter.
- The monitoring example configured a `prometheus` exporter and a `metrics/internal` pipeline, which is not how Collector internal metrics are exposed. I replaced it with the current internal telemetry Prometheus reader configuration.
- The Go SDK example did not compile as written: it used `time.Second` without importing `time`, and passed `grpc.Dial(...)` directly to `WithGRPCConn` even though `grpc.Dial` returns `(*grpc.ClientConn, error)`. I updated the example to use `otlptracegrpc.WithMaxRequestSize` and `otlptracegrpc.WithDialOption(grpc.WithDefaultCallOptions(grpc.MaxCallSendMsgSize(...)))`.
- The memory sizing formula used `max_concurrent_streams`, but Collector gRPC documentation says that setting affects streaming RPCs, while OTLP export calls are unary. I reframed the estimate around active receive requests and collector instances.
- The troubleshooting section pointed to network MTU limits for continued dropped data. I replaced that with SDK-side request size settings and upstream proxy/backend message limits, which are more directly relevant to OTLP payload rejection.

## Review Notes
The receiver configuration fields `max_recv_msg_size_mib`, `max_concurrent_streams`, `read_buffer_size`, and `write_buffer_size` are valid gRPC receiver settings. Prometheus metric names can vary when manually configuring internal telemetry readers unless `without_type_suffix` and `without_units` are set; the examples include those options to keep the shorter names used in the post.
