# Validation Summary: How to Enable Pod Security Standards in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Security Standards (PSS)
- Pod Security Admission (PSA)
- Kubernetes namespace labels and admission control
- AdmissionConfiguration / PodSecurityConfiguration
- kube-apiserver static pod manifest configuration
- kubectl (labeling, dry-run, neat plugin)
- jq for pod auditing
- Prometheus / PrometheusRule (kube-prometheus-stack metrics)
- nginx-unprivileged container image

## Sources Consulted
- Kubernetes — Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes — Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes — Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes — Configure the Admission Controller (AdmissionConfiguration / PodSecurityConfiguration): https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes — Migrate from PodSecurityPolicy to the Built-In PodSecurity Admission Controller: https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/
- Kubernetes — Configure a Security Context for a Pod or Container: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes — System metrics / apiserver admission metrics: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Docker Hub — nginxinc/nginx-unprivileged: https://hub.docker.com/r/nginxinc/nginx-unprivileged

## Issues Found
No technical issues found.

The post was reviewed against official Kubernetes documentation. All claims and examples are accurate:

- The PSS profile hierarchy (Privileged / Baseline / Restricted) and the three PSA modes (enforce / audit / warn) are correctly described.
- Namespace label keys (`pod-security.kubernetes.io/enforce`, `audit`, `warn` and their `-version` variants) and the `latest` version value are valid.
- The baseline-blocked controls (`hostNetwork`, `hostPID`, `hostIPC`, `privileged`, host paths, added `NET_RAW`) are correct; baseline only permits `NET_BIND_SERVICE` as an added capability, and the note that baseline permits `allowPrivilegeEscalation` is accurate (it is a Restricted-only control).
- The Restricted requirements (`runAsNonRoot: true`, `allowPrivilegeEscalation: false`, seccomp `RuntimeDefault`/`Localhost`, drop `ALL` capabilities) are correct.
- The Restricted-compliant Pod and Deployment manifests are valid and complete (pod-level seccomp, non-root users, read-only root FS with writable emptyDir mounts; nginx-unprivileged listening on 8080).
- The cluster-wide `AdmissionConfiguration` (`apiserver.config.k8s.io/v1`) wrapping `PodSecurityConfiguration` (`pod-security.admission.config.k8s.io/v1`) with `defaults` and `exemptions` is correct for current Kubernetes, as is the `--admission-control-config-file` flag and the file-type hostPath mount.
- The Prometheus expression uses a real metric (`apiserver_admission_controller_admission_duration_seconds_count`) with valid `name="PodSecurity"` and `rejected="true"` labels.
- The kubectl dry-run labeling technique, jq audit queries, and Service port-remapping fix are all valid.

## Review Notes
- The audit step uses `kubectl logs -n kube-system -l component=kube-apiserver | grep "pod-security.kubernetes.io"`. In practice, `warn` messages are returned to the client and `audit` violations are written to the API server audit log (annotation `pod-security.kubernetes.io/audit-violations`), not necessarily to the kube-apiserver container stdout. This command is a reasonable first look but may surface little; the later "Audit Log Analysis" section correctly queries `/var/log/kubernetes/audit.log`, which is the authoritative source. Not a technical error, just a usefulness caveat.
- Using `:latest` tags (`myapp:latest`, `nginxinc/nginx-unprivileged:latest`) is fine for illustration but pinning to a specific digest/tag is the production best practice. The post is consistent with its illustrative intent.
- `pod-security.kubernetes.io/enforce-version: latest` pins to the running cluster's latest known policy version. Pinning to a specific minor version (e.g. `v1.29`) is the more stable choice for production to avoid policy drift on upgrade — worth considering but not incorrect.
