# Validation Summary: How to Instrument mTLS Certificate Validation and Handshake Failures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- crypto/tls
- crypto/x509
- OpenTelemetry Go metrics
- Prometheus alert rules
- mTLS certificate validation

## Sources Consulted
- Go crypto/tls package documentation: https://pkg.go.dev/crypto/tls
- Go net/http Server documentation: https://pkg.go.dev/net/http
- OpenTelemetry Go metric API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/

## Issues Found
- The first Go snippet imported `net/http` without using it and accepted `certFile` and `keyFile` without loading the server certificate. Removed the unused import and added `tls.LoadX509KeyPair` plus `Certificates` in the TLS config.
- The examples passed `nil` as the OpenTelemetry metric context. Replaced those calls with `context.Background()` and added the required `context` imports.
- The certificate expiry observable gauge was created once as an unused global instrument and then created again with the same name in `RegisterCertExpiryCallback`. Removed the unused global gauge and kept the callback-based observable gauge.
- The listener wrapper returned TLS handshake errors from `Accept`. In common server accept loops, including `net/http.Server.Serve`, a non-temporary accept error can stop the server. Updated the wrapper to record and close failed handshakes, then continue accepting new connections.
- The callback-based certificate expiry gauge omitted the description used elsewhere in the post. Added a description directly to the instrument registered with the callback.
- The TLS error classifier missed common Go error text for missing client certificates and unsupported cipher suites. Broadened those checks while keeping the original classifications.

## Review Notes
The TLS error classifier still uses string matching, which is practical for a short example but can be brittle across Go versions and peer implementations. The alert rules assume the default OpenTelemetry-to-Prometheus translation where dots become underscores and counters receive a `_total` suffix.
