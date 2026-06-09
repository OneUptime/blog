# Validation Summary: How to Install Falco on Kubernetes

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Falco (runtime security)
- Falcosidekick (alert routing)
- Kubernetes (DaemonSet, ConfigMap, RBAC, Pod Security Standards)
- Helm 3
- eBPF (modern_ebpf and legacy ebpf drivers)
- Kernel modules (kmod driver)
- Linux kernel syscalls
- Prometheus metrics
- Slack/PagerDuty/Elasticsearch alerting integrations

## Sources Consulted
- Falco official documentation: https://falco.org/docs/
- Falco Helm chart values: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falco driver documentation: https://falco.org/docs/setup/kernel/
- Falcosidekick documentation: https://github.com/falcosecurity/falcosidekick
- Falcosidekick-UI: https://github.com/falcosecurity/falcosidekick-ui
- Falco rules and fields reference: https://falco.org/docs/rules/supported-fields/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Docker Hub `falcosecurity/falco` and `falcosecurity/falco-no-driver` image documentation

## Issues Found
- **DaemonSet image was incorrect**: The manifest example used `falcosecurity/falco-no-driver:latest`. This image is intentionally built without a bundled driver loader and requires the eBPF probe or kernel module to be provided by an external mechanism (e.g., a separate driver-loader init container, or a pre-baked probe mounted from the host). Without that, the DaemonSet shown would not start Falco successfully because `FALCO_BPF_PROBE=""` instructs Falco to look for a probe at the default path (`~/.falco/falco-bpf.o`), which the manifest does not populate. Changed the image to `falcosecurity/falco:latest`, which is the standard image that includes the driver-loader entrypoint and will compile/load the eBPF probe automatically inside the pod. This matches the rest of the post's narrative (the same image is implicitly used by the Helm chart) and makes the manifest example actually work end to end.

## Review Notes
- The post specifies Falco version `0.37.0` in example log output. Falco 0.37 was released in early 2024; by mid-2026 newer releases will exist. The example output is just illustrative, so this isn't an error, but readers should expect a higher version number in practice.
- The init-container name `falco-driver-loader` (used in the troubleshooting `kubectl logs ... -c falco-driver-loader` example) is the historically common name. Recent Falco Helm chart versions sometimes name it `falco-driver-loader-legacy` (for the legacy eBPF / kmod path) since modern_ebpf does not require an init container. If `-c falco-driver-loader` returns an error, readers should run `kubectl describe pod` to discover the actual init container name.
- The ConfigMap sets `priority: debug`, which lets every priority level through. This is technically valid (`debug` is the lowest priority in Falco) but will produce a large volume of events in real clusters; production deployments usually use `priority: info` or `notice`. The post does not claim otherwise, so this is not an error — just worth being aware of.
- `falco.metrics.enabled` is the canonical Helm value for enabling Falco's built-in metrics in current chart versions. The post uses `metrics.enabled=true`, which is the top-level chart toggle used in older chart releases — both forms exist depending on chart version, so this remains directionally correct.
- Kubernetes prerequisite `1.19+` is conservative; this still works but most current Falco deployments run on 1.24+.
- The custom-rules YAML uses correct Falco rule fields (`spawned_process`, `container`, `k8s.ns.name`, `k8s.pod.name`, `proc.name`, `proc.cmdline`, `%user.name`, etc.) per the Falco supported-fields documentation.
- The `falcosidekick.config.slack.webhookurl` and `falcosidekick.config.slack.minimumpriority` keys (lowercase) match the Falcosidekick Helm chart value names.
