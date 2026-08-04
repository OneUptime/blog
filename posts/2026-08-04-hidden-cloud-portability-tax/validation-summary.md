# Validation Summary: The Hidden Portability Tax in DNS, TLS, Secrets, and Telemetry

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- DNS, authoritative DNS, resolver caching, and DNSSEC
- BIND `dig`
- TLS, X.509 certificates, ACME, and Let's Encrypt
- OpenSSL `s_client`
- Kubernetes Secrets and encryption at rest
- Cloud secret managers and envelope encryption
- Secrets Store CSI Driver
- OpenTelemetry APIs, SDKs, OTLP, and Collector
- Observability pipelines, alerts, dashboards, logs, metrics, and traces

## Sources Consulted

- [RFC 9499: DNS Terminology](https://www.rfc-editor.org/rfc/rfc9499.html)
- [RFC 6781: DNSSEC Operational Practices, Version 2](https://www.rfc-editor.org/rfc/rfc6781.html)
- [RFC 8767: Serving Stale Data to Improve DNS Resiliency](https://www.rfc-editor.org/rfc/rfc8767.html)
- [RFC 9803: Extensible Provisioning Protocol Mapping for DNS TTL Values](https://www.rfc-editor.org/rfc/rfc9803.html)
- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [Let's Encrypt challenge types](https://letsencrypt.org/docs/challenge-types/)
- [OpenSSL 3.6 `s_client` documentation](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes encryption at rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)
- [Secrets Store CSI Driver concepts](https://secrets-store-csi-driver.sigs.k8s.io/concepts.html)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry OTLP receiver](https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md)
- [OpenTelemetry OTLP gRPC exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md)
- [OpenTelemetry OTLP gRPC exporter metadata](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/metadata.yaml)
- [OpenTelemetry Collector 0.157.0 release](https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.157.0)
- [OpenTelemetry vendor support specification](https://opentelemetry.io/docs/specs/otel/vendors/)

## Issues Found

- The OpenSSL example sent SNI and enforced chain verification, but it did not verify that the certificate matched `api.example.com`. Added `-verify_hostname api.example.com` and updated the preceding sentence so the command validates the intended server identity as well as its chain.
- The Kubernetes Secrets explanation described all at-rest encryption as depending on API-server configuration, even though Kubernetes documents API-level resource encryption separately from storage-layer encryption. Scoped the statement explicitly to Kubernetes API-level encryption at rest.
- The OpenTelemetry Collector receiver relied on empty protocol configurations. Current Collector releases bind those defaults to `localhost`, which would not make an intermediate gateway reachable from remote workloads. Added explicit `0.0.0.0:4317` and `0.0.0.0:4318` receiver endpoints and clarified that bind addresses and network exposure must be chosen deliberately.
- The Collector example used `otlp` as the gRPC exporter component type. Current Collector metadata defines `otlp_grpc` as the component type and retains `otlp` only as a deprecated alias. Updated both named exporters and their pipeline references to `otlp_grpc`.

## Review Notes

The corrected Collector configuration was validated successfully with OpenTelemetry Collector 0.157.0. The documentation IP address and example hostnames are placeholders and must be replaced in a real deployment. Because the receiver binds to all interfaces for cross-environment reachability, deployments must restrict network access and configure TLS and authentication as the post states. Collector component stability and distribution availability should be rechecked whenever the deployed Collector version changes.
