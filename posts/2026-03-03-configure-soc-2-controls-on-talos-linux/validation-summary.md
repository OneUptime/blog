# Validation Summary: How to Configure SOC 2 Controls on Talos Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux (machine and cluster configuration)
- Kubernetes (kube-apiserver, RBAC, NetworkPolicy, Pod Security Admission)
- Prometheus / Prometheus Operator (PrometheusRule CRD)
- kube-state-metrics
- Flux v2 (source.toolkit.fluxcd.io, kustomize.toolkit.fluxcd.io)
- Velero (backup/restore + velero-plugin-for-aws)
- SOC 2 Trust Services Criteria (CC, A, PI, C, P series)

## Sources Consulted
- Talos Linux config reference: https://www.talos.dev/v1.11/reference/configuration/
- Talos KubePrism docs (default port 7445): https://www.talos.dev/v1.11/kubernetes-guides/configuration/kubeprism/
- kube-apiserver CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kubernetes/apiserver audit metrics source: https://github.com/kubernetes/apiserver/blob/master/pkg/audit/metrics.go
- kube-state-metrics pod-metrics docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Flux v2 GA APIs: https://github.com/fluxcd/flux2/releases/tag/v2.0.0
- Velero AWS plugin on Docker Hub: https://hub.docker.com/r/velero/velero-plugin-for-aws
- AICPA SOC 2 Trust Services Criteria

## Issues Found
1. **Incorrect Prometheus metric `apiserver_audit_event_total` with labels `responseStatus`/`objectRef_resource`/`verb`** — the upstream metric is a plain counter with no labels (see kubernetes/apiserver `pkg/audit/metrics.go`), so the alert expressions would silently never fire. Replaced with `apiserver_request_total` (which exposes the real labels `code`, `verb`, `resource`):
   - `UnauthorizedAccessAttempt` now uses `apiserver_request_total{code=~"401|403"}`.
   - `SecretAccessAnomaly` now uses `apiserver_request_total{resource="secrets",verb="get"}`.
2. **Incorrect kube-state-metrics expression `kube_pod_container_info{container_privileged="true"}`** — `kube_pod_container_info` has no `container_privileged` label (its real labels are `container`, `pod`, `namespace`, `image`, `image_id`, `image_spec`, `container_id`, `uid`), so the `PrivilegedContainerCreated` alert would always evaluate to no data. Replaced with `pod_security_evaluations_total{decision="deny",mode="enforce"}` (a real kube-apiserver metric exposed by Pod Security Admission) which captures denials of privileged/non-restricted workloads — consistent with the post's later `pod-security.kubernetes.io/enforce: restricted` example. Annotation updated to match the new semantics.

## Review Notes
- Verified `--service-account-max-token-expiration` is the canonical kube-apiserver flag name (sometimes shortened in third-party docs to `--service-account-max-expiration`, which does not exist upstream). Left as-is.
- Verified the Talos config fields used (`cluster.adminKubeconfig.certLifetime`, `cluster.secretboxEncryptionSecret`, `machine.features.kubePrism.{enabled,port}`, `machine.logging.destinations[].format: json_lines`, `cluster.etcd.extraArgs`) all match the current Talos v1.x schema. KubePrism's default port of 7445 is correct.
- Verified Flux v2 APIs `source.toolkit.fluxcd.io/v1` (GitRepository) and `kustomize.toolkit.fluxcd.io/v1` (Kustomization) are the GA versions.
- Verified `velero/velero-plugin-for-aws:v1.8.0` exists on Docker Hub and the velero CLI subcommands are well-formed. Readers may prefer a newer plugin release when adopting this; v1.8.0 still works but newer minor versions are available.
- Pod Security Admission namespace labels (`pod-security.kubernetes.io/{enforce,audit,warn}: restricted`) are correct.
- The empty `verbs: []` rule on `secrets` in the developer ClusterRole is functionally a no-op (RBAC is allow-list only — omitting the rule has the same effect). It is not incorrect, just redundant; left as-is because the inline comment makes the author's intent clear.
- TLS settings (`--tls-min-version=VersionTLS12`, `--tls-cipher-suites=...`) and audit log flags are all valid kube-apiserver flags.
