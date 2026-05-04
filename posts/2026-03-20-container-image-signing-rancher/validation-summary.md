# Validation Summary: How to Set Up Container Image Signing in Rancher

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher (v2.7+)
- Kubernetes (1.26+) — Pod Security Standards / Pod Security Admission
- kubectl, jq, custom-columns
- Helm 3.x
- Prometheus / PrometheusRule (monitoring.coreos.com/v1)
- Bash shell scripting

## Sources Consulted
- Kubernetes API reference (PodSecurityContext / SecurityContext): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/
- Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Linux capabilities (`NET_BIND_SERVICE`, `ALL`): https://man7.org/linux/man-pages/man7/capabilities.7.html
- seccomp `RuntimeDefault` profile: https://kubernetes.io/docs/tutorials/security/seccomp/
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/
- Falco / falcosidekick Prometheus metrics: https://github.com/falcosecurity/falcosidekick and https://falco.org/docs/metrics/
- Falco default rules (`Launch Privileged Container`, `Run shell untrusted`): https://github.com/falcosecurity/rules

## Issues Found

1. **Step 1 — invalid `runAsRoot` field in jq selector — fixed.** The jq filter selected pods using `.spec.containers[].securityContext.runAsRoot == true`. There is no `runAsRoot` field in the Kubernetes `SecurityContext` or `PodSecurityContext` schema; the valid fields are `runAsNonRoot` (boolean), `runAsUser` (integer UID), and `runAsGroup` (integer GID). Replaced with `.spec.containers[].securityContext.runAsUser == 0`, which is the correct way to detect a container explicitly running as UID 0 (root).

2. **Step 6 — non-existent kube-state-metrics referenced in Prometheus alerts — fixed.** The `PrivilegedContainerDetected` and `ContainerRunningAsRoot` rules referenced `kube_pod_spec_container_security_context_privileged{privileged="true"}` and `kube_pod_spec_container_security_context_run_as_user{run_as_user="0"}`. These metrics do not exist in kube-state-metrics — the official `pod-metrics.md` enumerates all `kube_pod_*` metrics and none expose `securityContext` fields. Replaced both alert expressions with Falco / falcosidekick metrics (`falcosecurity_falcosidekick_falco_events_total` filtered by the standard Falco rule names `Launch Privileged Container` and `Run shell untrusted`), which are real metrics produced by a runtime-security tool that fits the "Install Security Tooling" step of the post.

## Review Notes

- **Title vs. content mismatch (significant editorial issue, not a technical inaccuracy):** The post is titled "How to Set Up Container Image Signing in Rancher" and the Description / Tags promise a Sigstore Cosign tutorial, but the body never mentions Cosign, Sigstore, image signatures, signature verification, admission controllers (Kyverno / Connaisseur / policy-controller), `cosign sign`, `cosign verify`, or signature transparency (Rekor). The actual content is a generic Pod Security Standards / securityContext / runtime-security guide. The Conclusion also literally repeats the title rather than summarizing the content. A future revision should either retitle to match (e.g. "Hardening Workloads in Rancher with Pod Security Standards") or replace the body with real Cosign + Rancher content. Per review guidelines, I did not restructure the post.
- **Pod Security Standards labels (Step 3) are correct.** `pod-security.kubernetes.io/enforce|audit|warn: restricted` and `enforce-version: latest` all match the documented PSA label format. Note: pinning to a specific minor version (e.g. `v1.29`) instead of `latest` is the documented recommendation for production stability.
- **SecurityContext fields in Step 4 are all valid:** `runAsNonRoot`, `runAsUser`, `runAsGroup`, `fsGroup`, `seccompProfile.type: RuntimeDefault`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities.drop: [ALL]`, `capabilities.add: [NET_BIND_SERVICE]`. `NET_BIND_SERVICE` is the correct capability name (no `CAP_` prefix in YAML) for binding to ports below 1024.
- **Step 2 ConfigMap is generic placeholder content.** The `enabled`/`level`/`audit`/`alerts` schema isn't tied to any specific real product — it's illustrative. Not technically wrong, but a reader cannot apply it directly.
- **Step 5 Helm install uses placeholder URLs** (`https://charts.example.com/security`, `security-charts/security-tool`). The Helm syntax itself (`helm repo add`, `helm install ... --namespace ... --create-namespace --set k=v`) is correct; readers must substitute a real chart (e.g. `falcosecurity/falco`, `kyverno/kyverno`).
- **Verification script (Step 7)** uses valid jq syntax. The custom-columns expression `'NAME:.metadata.name,PSS:.metadata.labels[pod-security\.kubernetes\.io/enforce]'` correctly escapes the dots in the label key for kubectl JSONPath / custom-columns parsing.
- The PrometheusRule namespace `cattle-monitoring-system` is the correct namespace for Rancher's built-in Monitoring v2 (rancher-monitoring) chart.
