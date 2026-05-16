# Validation Summary: How to Set Up Runtime Security Monitoring on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Helm
- Falco
- Falcosidekick
- Tetragon
- Prometheus Operator PrometheusRule

## Sources Consulted
- Falco documentation: Deploy on Kubernetes with Helm - https://falco.org/docs/setup/kubernetes/
- Falco Helm chart README and values - https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falco documentation: Deploy Falco on a Talos cluster - https://falco.org/blog/deploy-falco-talos-cluster/
- Falco documentation: Default and Local Rules Files - https://falco.org/docs/concepts/rules/default-custom/
- Falco documentation: Supported Fields for Conditions and Outputs - https://falco.org/docs/reference/rules/supported-fields/
- Falco documentation: Default Macros - https://falco.org/docs/reference/rules/default-macros/
- Falco documentation: Alerts Forwarding with Falcosidekick - https://falco.org/docs/concepts/outputs/forwarding/
- Falcosidekick Helm chart values - https://github.com/falcosecurity/charts/tree/master/charts/falcosidekick
- Talos Linux documentation: Pod Security - https://www.talos.dev/v1.10/kubernetes-guides/configuration/pod-security/
- Tetragon documentation: Deploy on Kubernetes - https://tetragon.io/docs/installation/kubernetes/
- Tetragon documentation: Helm chart reference - https://tetragon.io/docs/reference/helm-chart/
- Tetragon documentation: Tracing Policy example - https://tetragon.io/docs/concepts/tracing-policy/example/
- Tetragon documentation: File Access Monitoring - https://tetragon.io/docs/getting-started/file-events/
- Tetragon documentation: Network Monitoring - https://tetragon.io/docs/getting-started/network/

## Issues Found
- The Falco installation used `driver.kind=ebpf`, which is the legacy eBPF probe and is deprecated in current Falco chart documentation. Changed it to `driver.kind=modern_ebpf`.
- The Falco installation created the `falco` namespace through Helm but did not account for Talos' default Pod Security Admission baseline enforcement. Added explicit namespace creation and a privileged enforcement label so Falco's privileged DaemonSet can be admitted.
- The Falco explanation said the kernel module driver requires a writeable filesystem and build tools. Updated it to the more accurate Talos-specific reason: loading a kernel module does not fit Talos' locked-down host model.
- The Falco values snippet used camelCase keys such as `jsonOutput`, `jsonIncludeOutputProperty`, `logLevel`, `timeFormatISO8601`, and `grpcOutput`. Changed them to current chart/Falco config keys: `json_output`, `json_include_output_property`, `log_level`, and `time_format_iso_8601`.
- The Falco values snippet enabled gRPC output for Falcosidekick. Current Falco documentation marks gRPC output as deprecated, and the Helm chart configures Falcosidekick integration when `falcosidekick.enabled=true`. Removed the deprecated gRPC settings.
- The custom Falco rules were shown as a standalone ConfigMap that the Helm chart would not automatically mount or load. Changed the snippet to use the chart's `customRules` value and added the Helm upgrade command that loads it.
- The outbound connection custom rule matched and printed `fd.sport` for suspicious destination ports. Changed it to `fd.rport`, which is the remote port field in Falco's supported fields.
- The Tetragon install omitted the Talos-specific `extraHostPathMounts` value documented for Talos Linux v1.12.0 and newer. Added `tetragon-values.yaml` with `/sys/kernel/tracing` and used it during installation.
- The Tetragon file access policy used `fd_install`, which observes file descriptor installation and is not the recommended file-read monitoring hook. Changed it to `security_file_permission` with a read permission match, following Tetragon's file monitoring example.

## Review Notes
The PrometheusRule example assumes Prometheus Operator CRDs are installed and that Prometheus is scraping Falcosidekick metrics. That is technically plausible, but a production guide should also include the ServiceMonitor or scrape configuration used by the target monitoring stack.
