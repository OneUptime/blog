# Validation Summary: How to Implement Falco for Container Security

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Falco
- Kubernetes
- Helm
- eBPF / modern eBPF driver
- Falco rules
- Falco Sidekick
- Kubernetes audit logs

## Sources Consulted
- Falco Helm chart README: https://github.com/falcosecurity/charts/blob/master/charts/falco/README.md
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Falco Kubernetes Helm deployment docs: https://falco.org/docs/setup/kubernetes/
- Falco rule basics: https://falco.org/docs/concepts/rules/basic-elements/
- Falco supported fields: https://falco.org/docs/reference/rules/supported-fields/
- Falco default macros: https://falco.org/docs/reference/rules/default-macros/
- Falco daemon configuration: https://falco.org/docs/reference/daemon/config-options/
- Falco k8saudit plugin rules: https://github.com/falcosecurity/plugins/blob/master/plugins/k8saudit/rules/k8s_audit_rules.yaml
- CNCF Falco project page: https://www.cncf.io/projects/falco/

## Issues Found
- Falco was described as a CNCF incubating project. Updated it to CNCF graduated project, matching Falco's February 29, 2024 graduation status.
- The Kubernetes audit log Helm values were incomplete for the k8saudit plugin. Added the official chart pattern: disable syscall driver and collectors for the audit-only deployment, deploy as a single Deployment, install k8saudit rules via falcoctl, expose the webhook service, and use the k8saudit/json plugins.
- The Kubernetes audit example rules did not restrict matching to completed audit events. Added the `kevt` macro to the conditions, matching the official k8saudit rules pattern.
- The ClusterRole wildcard rule only checked wildcard resources. Updated it to detect wildcard resources or wildcard verbs, matching the official k8saudit rule behavior.
- The architecture diagram routed the Kubernetes audit webhook to the Falco DaemonSet. Updated it to route audit events to a Falco audit Deployment while leaving syscall monitoring on the DaemonSet.
- The performance tuning example used `falco.syscall_buf_size_preset`, which is not the current Helm chart value. Replaced it with `driver.modernEbpf.bufSizePreset` and corrected the buffer-size comment.
- The `base_syscalls.custom_set` example omitted several state-relevant syscalls recommended by Falco docs for process and networking visibility. Expanded the set to include `openat2`, `socket`, `bind`, `listen`, `accept4`, `execveat`, `clone3`, and `vfork`.

## Review Notes
The post is technically relevant and suitable as an implementation guide after the corrections. The Kubernetes audit section now describes an audit-only Falco deployment; users who want both syscall monitoring and Kubernetes audit monitoring should plan those as separate Falco releases or adapt the chart carefully.
