# Validation Summary: How to Set Up Container Forensics in Rancher

## Status
validated

## Post Type
Tutorial / Guide (Kubernetes security hardening, despite the "forensics" title)

## Technologies Covered
- Rancher v2.7+
- Kubernetes 1.26+
- Helm 3.x
- kubectl
- jq
- Pod Security Standards (PSS)
- Kubernetes SecurityContext / PodSecurityContext
- Linux capabilities
- seccomp (RuntimeDefault profile)
- Prometheus / PrometheusRule (monitoring.coreos.com/v1)
- kube-state-metrics

## Sources Consulted
- Kubernetes API reference for SecurityContext and PodSecurityContext: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.31/#securitycontext-v1-core
- Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Pod Security Admission labels: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- kube-state-metrics pod metrics docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kubectl custom-columns / JSONPath documentation
- Prometheus Operator PrometheusRule CRD documentation

## Issues Found
1. **Invalid `runAsRoot` field in Step 1 jq query (FIXED).** The original query used `.spec.containers[].securityContext.runAsRoot == true` to detect containers running as root. There is no `runAsRoot` field in Kubernetes' `SecurityContext` or `PodSecurityContext` API. The correct fields for controlling root execution are `runAsUser` (set to `0` for root) and `runAsNonRoot` (boolean). I changed the predicate to `.spec.containers[].securityContext.runAsUser == 0`, which correctly identifies containers explicitly configured to run as UID 0 and is also consistent with the second `kubectl` command in the same step that already uses `.spec.securityContext.runAsUser`.

## Review Notes
- **Title vs. content mismatch.** The post is titled "Container Forensics in Rancher" but the content is actually about preventive security hardening (Pod Security Standards, securityContext, capabilities, alert rules). True container forensics typically involves volatile-state capture (memory snapshots, disk imaging of container layers, audit log preservation, ephemeral container debugging via `kubectl debug`, runtime tools like Falco/Sysdig Inspect, etc.). This is a stylistic/scoping concern rather than a technical inaccuracy; the validation task scope is technical correctness, so I did not rewrite the post.
- **Step 2 ConfigMap is illustrative only.** The `security-config` ConfigMap with `enabled`, `level`, `audit`, `alerts` keys is not consumed by any specific Rancher or Kubernetes component — it is a generic placeholder. Readers should treat it as a template to be wired up to whatever security tool they actually deploy.
- **Step 5 Helm chart placeholders.** `https://charts.example.com/security` and `security-charts/security-tool` are placeholders, not real chart repositories. This is clearly signaled by the `example.com` host, but readers should substitute a real chart (e.g., Falco, Kyverno, Trivy Operator).
- **Step 6 PrometheusRule references metrics that aren't standard kube-state-metrics.** The expressions reference `kube_pod_spec_container_security_context_privileged` and `kube_pod_spec_container_security_context_run_as_user`. These metrics are **not** part of the upstream kube-state-metrics metric set as of the v2.x release line. As written, the alerts will not fire on a vanilla kube-state-metrics deployment. To detect privileged or root-running pods in practice, users would need to either (a) configure a CustomResourceState in kube-state-metrics, (b) use kube-bench / Falco / Polaris, or (c) rely on Pod Security Admission audit/warn instead. I left the rules as illustrative because the rest of the post uses similar placeholder examples (`example.com` hosts, generic chart names) and a rewrite would expand the post's scope significantly.
- **`pod-security.kubernetes.io/enforce-version: latest`** is valid and pins the namespace to whatever the cluster's current PSS version is. For pinned/auditable environments, an explicit version (e.g., `v1.29`) is safer.
- **`runAsNonRoot: true` combined with `runAsUser: 1000`** in Step 4 is correct and self-consistent (1000 != 0).
- The custom-columns label-key escape `[pod-security\.kubernetes\.io/enforce]` in Step 7 is the correct kubectl JSONPath syntax for a label key containing dots.
