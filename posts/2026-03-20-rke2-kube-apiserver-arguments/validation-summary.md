# Validation Summary: How to Configure RKE2 Kube-apiserver Arguments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- kube-apiserver
- Kubernetes audit logging
- Kubernetes admission controllers
- Pod Security Admission
- OIDC authentication
- Kubernetes feature gates

## Sources Consulted
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Default Pod Security Standards: https://docs.rke2.io/security/pod_security_standards
- RKE2 CIS Self-Assessment Guide: https://docs.rke2.io/security/cis_self_assessment110
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes Admission Controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Pod Security Admission configuration: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes Feature Gates documentation: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes Removed Feature Gates documentation: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/

## Issues Found
- The audit logging introduction said audit logging records all API requests. Updated it to say audit logging records API activity according to the configured policy, since Kubernetes audit policy controls what is logged.
- The audit policy placed the `None` rule for read-only verbs after resource-specific logging rules. Moved the `None` rule before those rules because Kubernetes uses the first matching audit policy rule.
- The audit log path used `/var/log/kubernetes/audit.log`. Updated it to `/var/lib/rancher/rke2/server/logs/audit.log` and created that directory in the setup command, matching RKE2's documented audit log location.
- The admission plugin examples used `PodSecurityAdmission`, which is not the kube-apiserver plugin name. Replaced it with the valid `PodSecurity` admission plugin name.
- The Pod Security Admission configuration passed `admission-control-config-file` through `kube-apiserver-arg`. Updated the example to use RKE2's documented `pod-security-admission-config-file` setting for overriding the PSA configuration file.
- The admission controller description implied all API requests pass through admission control. Narrowed it to create, update, delete, and some custom requests, since read requests bypass admission control.
- The performance example used the obsolete `default-watch-cache-size` flag. Removed it and kept the current `watch-cache` flag.
- The service account token comments implied all tokens are extended automatically. Updated the wording to reflect that `service-account-extend-token-expiration` extends admission-injected projected tokens during the legacy-token transition.
- The feature gate example used removed feature gates (`EphemeralContainers` and `ServerSideApply`). Replaced them with feature gates that are still recognized by current Kubernetes and noted that feature gates must be supported by the Kubernetes version in use.

## Review Notes
The remaining examples are version-sensitive because RKE2 ships a specific Kubernetes minor version. Readers should check the kube-apiserver and feature gate reference for their exact RKE2/Kubernetes version before applying non-default feature gates or changing API server concurrency limits.
