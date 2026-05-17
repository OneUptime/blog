# Validation Summary: How to Configure Audit Policies for Kubernetes on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- Kubernetes API server (audit logging, audit policies)
- Kubernetes audit policy schema (`audit.k8s.io/v1`)
- Kubernetes RBAC and authentication resources
- Webhook audit backend (kubeconfig format)
- Fluentd (with `tail`, `record_transformer`, and Elasticsearch output plugins)
- Elasticsearch (query DSL)

## Sources Consulted
- Kubernetes auditing docs: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kube-apiserver reference (audit flags, `--audit-log-mode`): https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes audit Policy API: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes authentication API (TokenReview): https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-review-v1/
- Talos `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.6/reference/cli/
- Talos machine configuration v1alpha1 (VolumeMountConfig, MachineFile, ApiServerConfig): https://docs.siderolabs.com/talos/v1.6/reference/configuration/v1alpha1/config/

## Issues Found

1. **Wrong `talosctl` subcommand for applying a patch.** The post showed `talosctl apply-config --nodes ... --patch @talos-audit-config.yaml`, but `apply-config` does not accept a `--patch` flag — it takes a full config via `-f`, optionally with `--config-patch`. The correct subcommand for applying a patch to a running node's machine config is `talosctl patch machineconfig` (which accepts `-p/--patch` with the `@file` syntax). Updated the command to `talosctl patch machineconfig --nodes ... --patch @talos-audit-config.yaml`.

2. **`tokenreviews` placed under the wrong API group.** The first audit rule grouped `tokenreviews` together with `secrets` and `configmaps` under `group: ""` (core). `TokenReview` lives in `authentication.k8s.io`, so the rule as written would not match any actual requests. Removed `tokenreviews` from that rule — the later rule already correctly logs `authentication.k8s.io/tokenreviews` at `RequestResponse` level.

3. **Misleading comment on the kube-proxy rule.** The comment said "Do not log kube-proxy token requests" but the rule actually exempts kube-proxy `get` requests against `endpoints`, `services`, and `services/status`. Updated the comment to "Do not log kube-proxy reads of endpoints and services" to match the rule.

4. **YAML octal literal for file permissions.** The post used `permissions: 0644` in the Talos `machine.files` example. Talos' documented form is Go-style octal (`0o644`), and under YAML 1.2 a bare `0644` is parsed as decimal 644, not octal — which would set the wrong mode. Changed to `permissions: 0o644`.

## Review Notes

- The `extraVolumes` fields (`hostPath`, `mountPath`, `readonly`) match the Talos `VolumeMountConfig` schema (`readonly` is intentionally all-lowercase, not `readOnly`).
- The `--audit-log-mode` value `blocking-strict` is valid (modes are `batch`, `blocking`, `blocking-strict`).
- `requestReceivedTimestamp` is the correct field name on a Kubernetes audit `Event`, so the Fluentd `time_key` and the Elasticsearch query reference it correctly.
- The Fluentd `fluent-plugin-elasticsearch` `type_name: _doc` setting is still accepted but Elasticsearch removed mapping types in 8.x; readers on ES 8+ may need to remove that line. Left as-is since it's still the common pattern for the plugin and not strictly wrong.
- The audit-webhook kubeconfig example defines a `user` block with no credentials. This is valid kubeconfig but assumes the webhook collector authenticates the apiserver via mTLS at the transport layer or accepts unauthenticated traffic. Worth mentioning to readers but not technically incorrect.
- Note on rule ordering: in Kubernetes audit policies, the first matching rule wins. The current ordering is reasonable, but readers should be aware that adding more specific rules below broad ones (e.g., the trailing default `Metadata` rule) will have no effect.
