# Validation Summary: How to Set Up mTLS Between OpenTelemetry Collectors and Backends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP/gRPC
- Mutual TLS (mTLS)
- OpenSSL
- Jaeger
- Grafana Tempo
- Kubernetes Secrets and Deployments
- cert-manager Certificate resources

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector configtls package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- Jaeger v2 configuration documentation: https://www.jaegertracing.io/docs/latest/deployment/configuration/
- Jaeger security documentation: https://www.jaegertracing.io/docs/latest/deployment/security/
- Grafana Tempo TLS configuration documentation: https://grafana.com/docs/tempo/latest/configuration/network/tls/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- Local OpenSSL 3.0.13 command help for `openssl req` and `openssl x509`

## Issues Found
- The gateway collector example referenced `processors: [batch]` in the service pipeline without defining the `batch` processor. Added a `processors` section with `batch:` so the configuration is complete.
- The Jaeger example used the older Jaeger v1-style `collector.otlp.grpc.tls` configuration shape. Updated it to the current Jaeger v2 Collector-style `receivers.otlp.protocols.grpc.tls` format.
- The certificate rotation section claimed automatic certificate reloading without showing the required Collector TLS settings. Added `reload_interval` for certificate/key reloads and `client_ca_file_reload: true` for server-side client CA reloads, then updated the explanatory text.
- The Kubernetes Secret wording implied that the collector Secret was also appropriate for backend pods. Clarified that each pod should mount the relevant Secret, and that the shown Secret contains the collector client certificate materials.

## Review Notes
- The OpenSSL examples are syntactically valid for OpenSSL 3.x. In production, generated certificates should generally include appropriate Extended Key Usage values and be issued by the organization's PKI or a certificate automation system.
- The Kubernetes Secret example is technically valid, but production deployments should use least-privilege Secrets and avoid exposing private keys to pods that do not need them.
