# Validation Summary: How to Install Istio with Pod Security Admission Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Security Admission
- Kubernetes Pod Security Standards
- Istio sidecar injection
- Istio CNI
- Istio Helm charts
- Istio Gateway chart
- kubectl

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Istio CNI installation guide: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio Helm installation guide: https://istio.io/latest/docs/setup/install/helm/
- Istio Gateway chart values: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/gateway/values.yaml
- Istio istiod chart values: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio CNI chart values: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-cni/values.yaml

## Issues Found
- Corrected the opening explanation to avoid implying the Envoy sidecar itself needs `NET_ADMIN` and `NET_RAW`; Istio's `istio-init` container needs those capabilities when CNI is not used.
- Corrected the Pod Security Standard explanation: baseline does not allow `NET_ADMIN` or `NET_RAW`; only privileged enforcement or PSA exemptions can admit the standard `istio-init` capability requirements.
- Removed an `unconfined` AppArmor injected annotation because baseline PSA allows runtime/default or localhost AppArmor profiles, not unconfined.
- Corrected CNI namespace guidance. The Istio CNI DaemonSet is privileged, so the namespace where it runs must allow privileged pods or be exempted from PSA.
- Corrected Helm CNI chart keys from `cni.cniBinDir` and `cni.cniConfDir` to `cniBinDir` and `cniConfDir`.
- Corrected the istiod Helm value from `istio_cni.enabled` / `istio_cni.chained` to `pilot.cni.enabled=true`, matching current Istio documentation.
- Added `seccompProfile: RuntimeDefault` to the gateway pod security context so the example satisfies restricted PSA seccomp requirements.
- Replaced the `kubectl auth can-i` admission test because it checks RBAC authorization, not PSA admission. The post now uses server-side dry-run checks.
- Replaced the restricted test pod command with a restricted-compatible Pod manifest using `runAsNonRoot`, `allowPrivilegeEscalation: false`, dropped capabilities, and `RuntimeDefault` seccomp.
- Replaced the kube-apiserver log command in the migration section with a server-side dry-run preview, since the original command is not portable to managed clusters and does not itself test admission.
- Updated the summary to avoid recommending baseline enforcement as a valid middle ground for non-CNI Istio sidecar namespaces.

## Review Notes
The examples intentionally avoid pinning a specific Istio or Kubernetes minor version. For production, readers should also pin PSA policy versions with `pod-security.kubernetes.io/<mode>-version` and confirm platform-specific CNI paths before installing.
