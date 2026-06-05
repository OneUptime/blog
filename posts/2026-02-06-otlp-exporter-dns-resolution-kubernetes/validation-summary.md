# Validation Summary: How to Troubleshoot OTLP Exporter DNS Resolution Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry OTLP exporters
- OpenTelemetry Collector configuration
- Kubernetes Services and DNS
- CoreDNS
- gRPC-Go name resolution and load balancing
- Kubernetes Pod DNS configuration

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Pod DNS Config documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#pod-dns-config
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP Exporter Configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC Service Config guide: https://grpc.io/docs/guides/service-config/

## Issues Found
- The gRPC section said gRPC resolves a hostname once at connection time and could continue using an old Collector pod IP after a normal Service-backed Collector pod is rescheduled. This was too broad because normal Kubernetes Services resolve to a stable Service IP; pod IP churn matters mainly for headless Services or DNS names that return backend IPs directly. I updated the explanation to distinguish normal Services from headless/direct backend DNS.
- The Go gRPC example used `grpc.Dial`, which grpc-go documentation now marks as deprecated in favor of `grpc.NewClient`. I updated the example to use `grpc.NewClient`.
- The Go gRPC comments implied the sample configured a DNS re-resolution interval, but the service config only configures `round_robin` load balancing. I corrected the wording to describe the `dns:///` resolver prefix and `round_robin` behavior accurately.
- The debugging checklist said to test DNS from the failing pod's namespace, but the `kubectl run` command did not specify a namespace and would run in the current context namespace. I added `-n <app-namespace>`.

## Review Notes
The remaining Kubernetes DNS, CoreDNS, `ndots`, headless Service, and OTLP endpoint examples align with current official documentation. The post uses `cluster.local` in examples, which is Kubernetes' common default cluster domain, but clusters can be configured with a different domain.
