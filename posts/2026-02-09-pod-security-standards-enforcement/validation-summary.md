# Validation Summary: How to Configure Kubernetes Pod Security Standards Enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Pod Security Standards
- Pod Security Admission
- Kubernetes namespace labels
- Kubernetes security contexts
- kubectl
- PrometheusRule / Prometheus metrics
- jq

## Sources Consulted
- Kubernetes documentation: Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes documentation: Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation: Enforce Pod Security Standards by Configuring the Built-in Admission Controller: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes documentation: Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes documentation: Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes documentation: Pod Security Policies: https://kubernetes.io/docs/concepts/security/pod-security-policy/

## Issues Found
- The post stated that Pod Security Admission is enabled by default in Kubernetes 1.25+. Kubernetes documentation says it became available by default in Kubernetes 1.23 as beta and became generally available in 1.25. Updated the wording to reflect both milestones.
- The admission configuration used `pod-security.admission.config.k8s.io/v1` while saying it applied to older versions. Kubernetes documentation states this config API requires Kubernetes 1.25+, with `v1beta1` for Kubernetes 1.23-1.24 and `v1alpha1` for Kubernetes 1.22. Added a compatibility note above the config snippet.
- The restricted test pod claimed that running as root violated Restricted, but the manifest did not explicitly set `runAsUser: 0`. Added `securityContext.runAsUser: 0` to make the example match the stated violation.
- The test command suggested checking Kubernetes events for `forbidden` after rejected pod creation. Rejected admission requests generally surface as API server errors in `kubectl` output, not as created pod events. Replaced the event lookup with guidance to check `kubectl` output for Forbidden PodSecurity violations.
- The Prometheus rules used `apiserver_admission_webhook_admission_duration_seconds_count` with `name="PodSecurity"`, but Pod Security Admission is built into kube-apiserver and exposes dedicated `pod_security_*` metrics. Updated the alert expressions to use `pod_security_evaluations_total{mode="enforce", decision="deny"}`.

## Review Notes
The remaining examples are technically plausible, but production users should pin `pod-security.kubernetes.io/*-version` labels to a specific Kubernetes minor version during controlled rollouts rather than relying on `latest` everywhere. The sample compliance report checks only the first regular container in each pod and is suitable as a quick illustration, not a complete compliance scanner.
