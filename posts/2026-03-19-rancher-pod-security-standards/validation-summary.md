# Validation Summary: How to Configure Pod Security Standards in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes Pod Security Standards (PSS)
- Kubernetes Pod Security Admission (PSA)
- RKE2
- `kubectl`
- Prometheus Operator `PrometheusRule`

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Enforce Pod Security Standards by Configuring the Built-in Admission Controller: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes Audit Annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Rancher PSS and PSA overview: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/pod-security-standards
- Rancher PSA configuration templates: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/psa-config-templates
- Rancher sample PodSecurityConfiguration: https://ranchermanager.docs.rancher.com/reference-guides/rancher-security/psa-restricted-exemptions
- RKE2 default Pod Security Standards: https://docs.rke2.io/security/pod_security_standards
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config

## Issues Found
- The post said Rancher PSA support started at Rancher v2.7, but Rancher documents PSA configuration templates as available in v2.7.2 and later. I updated the prerequisite.
- The post described PSA as only stable in 1.25+ without clarifying that it is enabled by default from Kubernetes 1.23. I corrected the prerequisite wording.
- The `baseline` and `restricted` policy descriptions were inaccurate. I fixed `baseline` to cover `hostIPC` and full `HostPath` restrictions, and removed the incorrect claim that `restricted` enforces a read-only root filesystem.
- The Rancher UI instructions described namespace-level PSA controls that do not match Rancher’s documented UI flow. I replaced them with the documented PSA template workflow.
- The cluster-wide admission configuration example used the `v1` API without noting that Kubernetes 1.23 and 1.24 require `v1beta1`. I added the version caveat.
- The RKE2 configuration example used a generic API server argument instead of RKE2’s documented `pod-security-admission-config-file` setting. I corrected the config snippet and aligned the exemption block structure.
- The system-namespace label example only changed `enforce`, which would still leave `audit` and `warn` at stricter defaults. I updated the example to set all three modes to `privileged` and added `--overwrite`.
- The rollout step suggested checking standard kube-apiserver pod logs for audit violations. PSA audit results are recorded as audit annotations or can be previewed with server-side dry run. I replaced that command with the documented dry-run preview flow.
- The monitoring example used `apiserver_admission_webhook_rejection_count`, which applies to admission webhooks, not the built-in PodSecurity admission plugin. I replaced it with `pod_security_evaluations_total`-based monitoring.
- The “compliant pod” example used `nginx`, which is a poor fit for a non-root restricted-policy example. I replaced it with a simple `busybox` sleep pod that satisfies restricted admission checks more reliably.

## Review Notes
- Pod Security Admission is enabled by default in Kubernetes 1.23+ and generally available in Kubernetes 1.25+.
- For Kubernetes 1.23 and 1.24, the PodSecurity admission configuration API version is `pod-security.admission.config.k8s.io/v1beta1`; `v1` requires Kubernetes 1.25+.
- Rancher exposes PSA primarily through cluster-level configuration templates. Namespace labels remain the standard Kubernetes mechanism and can still be applied directly with `kubectl`.
- The exact list of Rancher namespaces that should be exempted depends on the installed Rancher components and distribution features; Rancher publishes a sample AdmissionConfiguration with the current full list.
- A local `kubectl` binary was not available in this workspace, so CLI syntax was verified against official Kubernetes documentation rather than local `--help` output.
