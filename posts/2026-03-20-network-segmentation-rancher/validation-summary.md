# Validation Summary: How to Configure Network Segmentation in Rancher

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher (v2.7+)
- Kubernetes (1.26+)
- Helm 3
- Pod Security Standards (PSS / PSA)
- Kubernetes SecurityContext
- kubectl
- jq
- Prometheus Operator (PrometheusRule CRD)
- kube-state-metrics

## Sources Consulted
- Kubernetes SecurityContext API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.26/#securitycontext-v1-core
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Configure a Security Context for a Pod or Container: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Rancher v2.7 documentation: https://ranchermanager.docs.rancher.com/v2.7
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.PrometheusRule
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Linux capabilities (NET_BIND_SERVICE): capabilities(7) man page

## Issues Found

1. **Step 1 — invalid `runAsRoot` field in jq selector.** The original code referenced `.spec.containers[].securityContext.runAsRoot`, which is not a real field in the Kubernetes SecurityContext API. The valid fields are `runAsUser` (integer; `0` indicates root) and `runAsNonRoot` (boolean). Replaced with `.spec.containers[].securityContext.runAsUser == 0` so the selector now matches pods that explicitly request root, which is what the comment claims.

## Review Notes

- **Title vs. content mismatch (not fixed).** The post is titled "How to Configure Network Segmentation in Rancher" and the description references NetworkPolicies / zero-trust networking, but the body contains no `NetworkPolicy` resources, no CNI configuration, no Rancher Project network isolation, and no actual segmentation content. The body is a generic Pod Security Standards / SecurityContext / Prometheus alerting walkthrough. The phrasing "How to Configure Network Segmentation in Rancher is a critical security capability…" and "Implementing How to Configure Network Segmentation in Rancher on Rancher…" reads like an unsubstituted template variable. Fixing this is a structural rewrite, which is out of scope for this technical review (the validator is instructed not to restructure or add new sections). Flagging for editorial follow-up.
- **Step 6 Prometheus metrics — likely non-existent.** The alert expressions reference `kube_pod_spec_container_security_context_privileged` and `kube_pod_spec_container_security_context_run_as_user`. These are not part of the standard `kube-state-metrics` exposition (which exposes `kube_pod_info`, `kube_pod_container_info`, `kube_pod_status_*`, etc. but not securityContext fields). The rules will not fire as written unless a custom exporter is deployed that publishes these series. A reader who copy-pastes them onto a stock Rancher monitoring stack will get no data. Left in place because replacing them would require restructuring; recommend the author rewrite using a real source such as `kube-pod-security-context` exporter, Falco metrics, or a recording rule built from PSA audit annotations.
- **Step 2 ConfigMap is illustrative only.** The `security-config` ConfigMap with `enabled`, `level`, `audit`, `alerts` keys is not consumed by any real Rancher or Kubernetes component — it is a placeholder schema. This is acceptable as a template a reader might adapt, but it does nothing on its own.
- **Step 5 Helm chart `https://charts.example.com/security`** is intentionally a placeholder (`example.com`), so no URL verification was possible; readers must substitute their actual chart (e.g. Falco, Kyverno, NeuVector).
- **`pod-security.kubernetes.io/enforce-version: latest`** is valid syntax (Kubernetes accepts `latest` or a specific minor version like `v1.26`), but `latest` means "track whatever the cluster's PSA controller currently considers latest," which can change behavior across upgrades. Using a pinned version is generally recommended for production. Not a correctness issue.
- The `securityContext` block in Step 4 (runAsNonRoot, runAsUser, runAsGroup, fsGroup, seccompProfile.type=RuntimeDefault, allowPrivilegeEscalation=false, readOnlyRootFilesystem=true, capabilities drop ALL / add NET_BIND_SERVICE) is correct and matches the PSS `restricted` profile expectations.
- Pod Security Standards labels (`pod-security.kubernetes.io/enforce|audit|warn`) are correct and apply to Kubernetes 1.25+ (post is targeting 1.26+, which is fine).
