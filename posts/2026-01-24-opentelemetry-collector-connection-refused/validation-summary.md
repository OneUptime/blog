# Validation Summary: How to Fix 'Collector Connection Refused' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP/gRPC and OTLP/HTTP
- OpenTelemetry JavaScript exporter
- OpenTelemetry Python exporter
- Docker and Docker Compose networking
- Kubernetes Services, Deployments, DNS, and NetworkPolicy
- Linux networking diagnostics with netstat, ss, lsof, nc, tcpdump, iptables, firewalld, and ufw
- grpcurl

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector default bind-address hardening note: https://opentelemetry.io/blog/2024/hardening-the-collector-one/
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker host-gateway documentation: https://docs.docker.com/reference/cli/dockerd/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- grpcurl documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The explanation and Mermaid diagram treated DNS failure and generic blocking as "connection refused." DNS resolution failures usually produce name-resolution errors, and firewalls may drop or reject traffic. Updated the text and diagram labels to distinguish rejected connections from broader connection errors.
- The Docker Compose example used the obsolete top-level `version: '3.8'` field. Removed it because current Docker Compose treats `version` as informational and warns that it is obsolete.
- The Kubernetes application Deployment example was invalid as shown because an `apps/v1` Deployment requires a selector, and the Pod template should carry matching labels. Added `spec.selector.matchLabels` and `template.metadata.labels`.
- The troubleshooting script checked `nc` output for the word "succeeded," which is implementation-specific. Changed it to rely on `nc` exit status.
- The troubleshooting script described `grpcurl list` as a gRPC health check. `grpcurl list` depends on descriptors, normally via server reflection, so it can fail against a healthy OTLP receiver. Renamed the check to a reflection check and changed failure output to a warning.

## Review Notes
The remaining examples are broadly correct for current OpenTelemetry Collector behavior: OTLP/gRPC defaults to port 4317, OTLP/HTTP defaults to port 4318, and recent Collector versions default receiver bind addresses to localhost unless configured otherwise. The shell commands are diagnostic examples and may vary by operating system or installed package variant.
