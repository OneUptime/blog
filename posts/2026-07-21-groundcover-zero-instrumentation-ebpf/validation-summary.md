# Validation Summary: Groundcover Zero-Instrumentation: What eBPF Captures and Misses

## Status

validated

## Post Type

Technical reference and conceptual implementation guide

## Technologies Covered

- Groundcover observability platform and Application Performance Monitoring (APM)
- eBPF, Linux kernel requirements, BTF, and Compile Once – Run Everywhere (CO-RE)
- Kubernetes DaemonSets, node scheduling, and AWS Fargate
- Network protocol parsing and transaction reconstruction
- TLS/SSL tracing, native encryption libraries, and the Groundcover Java agent
- Trace sampling, force sampling, rate limiting, and retention
- OpenTelemetry manual and zero-code instrumentation, context propagation, and sampling
- Prometheus custom metrics
- Kubernetes log collection and log/trace correlation
- Telemetry payload capture, truncation, and sensitive-data obfuscation

## Sources Consulted

- [Groundcover Application Performance Monitoring](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm)
- [Groundcover application metrics](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/application-metrics)
- [Groundcover traces](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/traces)
- [Groundcover supported technologies](https://docs.groundcover.com/capabilities/application-performance-monitoring-apm/supported-technologies)
- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover requirements](https://docs.groundcover.com/getting-started/requirements)
- [Groundcover kernel requirements for the eBPF sensor](https://docs.groundcover.com/getting-started/requirements/kernel-requirements-for-ebpf-sensor)
- [Groundcover: Connect Kubernetes clusters](https://docs.groundcover.com/getting-started/installation-and-updating/connect-kubernetes-cluster)
- [Groundcover: Configure sensor deployment coverage](https://docs.groundcover.com/customization/customize-deployment/configuring-sensor-deployment-coverage)
- [Groundcover: Enable SSL tracing in Java applications](https://docs.groundcover.com/customization/customize-deployment/enabling-ssl-tracing-in-java-applications)
- [Groundcover: Control the eBPF sampling mechanism](https://docs.groundcover.com/customization/customize-usage/controlling-the-ebpf-sampling-mechanism)
- [Groundcover: Customize tracing payload size](https://docs.groundcover.com/customization/customize-usage/customize-tracing-payload-size)
- [Groundcover sensitive-data obfuscation](https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation)
- [Groundcover log management](https://docs.groundcover.com/capabilities/log-management)
- [Groundcover log and trace correlation](https://docs.groundcover.com/log-and-trace-correlation)
- [Groundcover Prometheus integration](https://docs.groundcover.com/integrations/data-sources/prometheus)
- [Kubernetes DaemonSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [OpenTelemetry zero-code instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/zero-code/)
- [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/)

## Issues Found

No technical issues found.

## Review Notes

The post contains no executable code, terminal commands, or configuration snippets, but it has enough implementation-specific detail to require technical validation rather than classification as a non-code blog. Groundcover's current documentation supports the post's distinctions between observing every supported request and retaining only sampled trace instances, and between automatic log collection and application-provided trace context for exact correlation. The current payload documentation specifies a 10 KB uncompressed default limit applied separately to the request and response; the post intentionally avoids hard-coding that time-sensitive default. Groundcover's supported-technologies page currently specifies Java 11+ for Java SSL tracing and warns that encrypted-traffic tracing is unsupported for stripped binaries. Protocol, runtime, kernel, sampling, payload, and retention support can change, so the post's dated verification statement and proof-of-concept guidance remain important.
