# Validation Summary: How to Create Kubernetes Pod Security Policies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Pod Security Standards
- Kubernetes Pod Security Admission
- Kubernetes admission controller configuration
- Kubernetes namespace labels
- kubectl dry-run workflows
- Kubernetes audit policy
- PrometheusRule monitoring

## Sources Consulted
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace label enforcement task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes admission controller configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Pod Security Admission KEP metrics details: https://github.com/kubernetes/enhancements/blob/master/keps/sig-auth/2579-psp-replacement/README.md

## Issues Found
- The admission controller setup text said earlier Kubernetes versions need the plugin enabled. I narrowed this to Kubernetes 1.22, where Pod Security Admission was alpha, and clarified that it became available by default in 1.23 and generally available in 1.25.
- The cluster-wide configuration example used `system:serviceaccount:kube-system:*` as an exempt username. Kubernetes Pod Security Admission exemptions require explicitly enumerated usernames, so I changed the example to a concrete service account username.
- The dry-run validation script defined an unused `NAMESPACE` variable. I removed it to avoid implying that the variable controls the test namespace.
- The Prometheus alert used `apiserver_admission_controller_admission_duration_seconds_count` with `name="PodSecurity"` and `rejected="true"`. Pod Security Admission exposes `pod_security_evaluations_total` with `mode` and `decision` labels, so I changed the alert to use `pod_security_evaluations_total{mode="enforce",decision="deny"}`.

## Review Notes
The examples use policy version `v1.28` in several namespace labels. This is technically valid version pinning, but future readers should update pinned versions deliberately when they want newer Pod Security Standard behavior. The restricted examples are Linux-focused; Kubernetes relaxes some restricted controls for Windows pods when `.spec.os.name` is `windows`.
