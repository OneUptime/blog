# Validation Summary: How to Write Custom Falco Rules for Runtime Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco rules
- Falco syscall event source
- Falco Kubernetes audit plugin
- Falco Helm chart
- Falco event-generator
- Docker
- Kubernetes
- Falcosidekick

## Sources Consulted
- Falco rule basics: https://falco.org/docs/concepts/rules/basic-elements/
- Falco condition syntax: https://falco.org/docs/concepts/rules/conditions/
- Falco rule fields: https://falco.org/docs/reference/rules/rule-fields/
- Falco supported fields: https://falco.org/docs/reference/rules/supported-fields/
- Falco daemon CLI arguments: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco configuration file reference: https://github.com/falcosecurity/falco/blob/master/falco.yaml
- Falco container deployment docs: https://falco.org/docs/setup/container/
- Falco Kubernetes audit plugin docs: https://github.com/falcosecurity/plugins/blob/master/plugins/k8saudit/README.md
- Falco Kubernetes audit default rules: https://github.com/falcosecurity/plugins/blob/master/plugins/k8saudit/rules/k8s_audit_rules.yaml
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Falco event-generator README: https://github.com/falcosecurity/event-generator/blob/main/README.md
- Kubernetes service account token docs: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/

## Issues Found
- The network field list used destination fields `fd.dip` and `fd.dport`, which are not supported Falco fields. Replaced them with supported client/server/local/remote fields, including `fd.cip`, `fd.cport`, `fd.rip`, and `fd.rport`.
- The Kubernetes audit examples depended on `kevt` and `kevt_started` without defining them. Added minimal macros based on the audit event stage field.
- The service-account token audit rule used unsupported field `ka.req.pod.spec.automountServiceAccountToken`. Replaced it with the JSON plugin field `jevt.value[/requestObject/spec/automountServiceAccountToken]`.
- The service-account token audit rule used `INFO`; updated the example priority to `INFORMATIONAL` and corrected the priority reference list.
- The capture-file example used `falco -w` to record captures and `-e` to replay them. Updated recording to use `sysdig -w` and replay to use Falco's current `engine.kind=replay` and `engine.replay.capture_file` configuration.
- The rule validation example used `falco -r my_rules.yaml --validate`, but current Falco expects the rules file as the `--validate` argument. Changed it to `falco --validate my_rules.yaml`.
- The Docker-based Falco example omitted mounts required by the official modern eBPF container example. Added `/sys/kernel/tracing` and `/etc` host mounts.
- The event-generator example referenced outdated/nonexistent action names. Updated them to current action names: `syscall.ReadSensitiveFileUntrusted`, `syscall.WriteBelowEtc`, and `syscall.RunShellUntrusted`.
- The output-channel example included gRPC output for Sidekick, but current Falco configuration no longer lists gRPC output keys. Replaced it with a current `program_output` example.
- The Helm values example used deprecated `falco.rules_file`. Updated it to `falco.rules_files`.
- The ConfigMap allow-list macro used `in` with repository prefixes, which would not match full image repositories. Replaced it with explicit `startswith` checks.

## Review Notes
- The post is technically relevant and includes substantial implementation detail.
- Several snippets assume Falco's default rules or common default macros are loaded, which is normal for Falco tutorials but should be called out more explicitly in a future revision.
