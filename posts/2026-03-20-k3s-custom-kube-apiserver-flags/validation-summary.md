# Validation Summary: How to Configure K3s with Custom kube-apiserver Flags - Kube

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes kube-apiserver
- Pod Security Admission
- Kubernetes audit logging
- OpenID Connect (OIDC)
- systemd / `journalctl`

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Architecture: https://docs.k3s.io/architecture
- K3s FAQ: https://docs.k3s.io/faq
- K3s CIS Hardening Guide: https://docs.k3s.io/security/hardening-guide
- K3s CIS Self Assessment Guide 1.10: https://docs.k3s.io/security/self-assessment-1.10
- Kubernetes kube-apiserver flags reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes Pod Security Admission configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes coordinated leader election: https://kubernetes.io/docs/concepts/cluster-administration/coordinated-leader-election/
- Kubernetes authentication reference: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Google OpenID Connect ID token claims: https://developers.google.com/identity/openid-connect/openid-connect?hl=en-US

## Issues Found
- The original feature gate examples used `EphemeralContainers` and `ServerSideApply`, which are removed feature gates in current Kubernetes releases. I replaced them with a current example using `CoordinatedLeaderElection` and the required `runtime-config` setting.
- The Pod Security section treated `PodSecurity` as something that needed to be explicitly enabled and combined two different files in one YAML block. I changed the section to configure Pod Security Admission via `admission-control-config-file`, separated the file example correctly, and added the missing `audit-version` and `warn-version` fields from the current Kubernetes example.
- The audit logging examples used generic log and policy paths without the K3s-specific directory setup guidance. I aligned the paths with current K3s hardening guidance and added the log-directory creation step.
- The Step 1 example included audit log flags without an audit policy file, which would not actually produce audit events. I removed the partial audit example and kept only standalone kube-apiserver flags there.
- The verification section suggested checking a separate `kube-apiserver` process or pod, which is misleading for K3s because K3s runs control-plane components within a single process. I replaced that with the supported `journalctl -u k3s` log-based verification approach used in K3s documentation.
- The performance section claimed `watch-cache-sizes=pods#1000,nodes#100` would increase cache sizes. Current kube-apiserver documentation states that only `0` is meaningful for this flag and non-zero values are equivalent, so I removed that incorrect tuning advice.
- The OIDC example used Google as the issuer while also referencing a `groups` claim. Google’s documented standard ID token claims do not include `groups` by default, so I removed that line.
- The best-practices section implied that `--audit-log-path` alone records all API server operations. I corrected this to mention both `--audit-log-path` and `--audit-policy-file`, and noted that the audit policy determines what is recorded.

## Review Notes
- The `--oidc-*` flags used in the post are still supported, but newer Kubernetes releases also support structured authentication via `--authentication-config` for more advanced JWT/OIDC setups.
- The Pod Security Admission config shown uses `pod-security.admission.config.k8s.io/v1`, which is appropriate for Kubernetes v1.25 and newer. Older K3s releases bundled with older Kubernetes versions require earlier API versions.
- Feature gates remain version-specific. Even with the corrected example, readers should verify feature availability against the Kubernetes version bundled with their target K3s release.
