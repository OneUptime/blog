# Validation Summary: How to Configure Supply Chain Security in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SUSE Rancher-managed Kubernetes
- Kubernetes Pod Security Admission
- Kubernetes Pod Security Standards
- Kubernetes security contexts
- Helm
- Kubewarden
- Prometheus Operator PrometheusRule
- jq

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Admission controller configuration: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes namespace labels for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes security contexts: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes container images: https://kubernetes.io/docs/concepts/containers/images/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm repo command references: https://helm.sh/docs/helm/helm_repo_add/ and https://helm.sh/docs/helm/helm_repo_update/
- Kubewarden quick start: https://docs.kubewarden.io/quick-start
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- jq manual: https://jqlang.org/manual/

## Issues Found
- The audit command referenced `.securityContext.runAsRoot`, which is not a Kubernetes securityContext field. Replaced it with checks for `runAsUser == 0` and `privileged == true`, including init, regular, and ephemeral containers.
- The "pods running as root" command only inspected pod-level `runAsUser` and missed container-level settings. Replaced it with a jq query that reports containers explicitly configured to run as UID 0.
- The Step 2 ConfigMap was not consumed by any Kubernetes or Rancher component and did not configure a real security feature. Replaced it with a valid Pod Security Admission `AdmissionConfiguration` example.
- The namespace label example did not pin audit and warn policy versions. Added `audit-version` and `warn-version` labels to match Kubernetes Pod Security Admission label semantics.
- The Deployment manifest was invalid for `apps/v1` because it lacked a required `.spec.selector` and matching pod template labels. Added both fields.
- The workload image used the mutable `:latest` tag. Replaced it with a versioned tag to align with Kubernetes guidance for production image tracking and rollback.
- The Helm installation used a placeholder chart repository and chart name that would not work. Replaced it with official Kubewarden Helm chart installation commands.
- The PrometheusRule used non-standard kube-state-metrics metric names for privileged containers and root users. Replaced those rules with Pod Security Admission metrics exposed by kube-apiserver.
- The namespace verification command used fragile custom-column label lookup syntax. Replaced it with a jq-based JSON query.

## Review Notes
The post is now technically valid as a Kubernetes/Rancher security hardening guide. It still focuses more on Pod Security Admission, admission policy tooling, and workload hardening than on SLSA-specific provenance controls; a future content pass could add image signing, attestations, and provenance verification if the title should cover supply chain security more comprehensively.
