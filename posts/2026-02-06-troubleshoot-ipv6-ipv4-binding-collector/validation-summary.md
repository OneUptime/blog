# Validation Summary: How to Troubleshoot IPv6 vs IPv4 Binding Issues When the Collector Fails to

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver configuration
- Kubernetes Services
- Kubernetes IPv4/IPv6 dual-stack networking
- Linux IPv6 socket behavior and sysctl settings
- kubectl, ss, getent, nc, and Python socket diagnostics

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- Go net package documentation: https://pkg.go.dev/net
- Go net source notes for IPv4-mapped IPv6 support: https://go.dev/src/net/ipsock.go
- Go net dual-stack listener tests and platform defaults: https://go.dev/src/net/listen_test.go
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local command help for ss and nc flags

## Issues Found
- The post implied in a few places that binding the Collector to `[::]` definitively listens on both IPv6 and IPv4. This depends on the platform and socket settings, including Linux `net.ipv6.bindv6only` / `IPV6_V6ONLY`. Updated the Collector YAML comment, dual-stack Service note, and summary to make the IPv4 behavior conditional and to require verification.

## Review Notes
The Kubernetes Service examples use valid `ipFamilies` and `ipFamilyPolicy` fields for current Kubernetes dual-stack Services. The OTLP receiver `endpoint` examples follow the Collector receiver configuration format. Some diagnostic commands assume the target container images include tools such as `ss`, `getent`, `sysctl`, `nc`, or `python3`; if those tools are missing, an ephemeral debug container or utility image would be needed.
