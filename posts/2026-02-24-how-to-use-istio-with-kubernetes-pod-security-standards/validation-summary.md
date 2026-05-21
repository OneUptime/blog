# Validation Summary: How to Use Istio with Kubernetes Pod Security Standards

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio CNI
- Kubernetes Pod Security Standards
- Kubernetes Pod Security Admission
- Kubernetes securityContext
- kubectl
- IstioOperator

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace labels for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Istio Install Istio with Pod Security Admission: https://istio.io/latest/docs/setup/additional-setup/pod-security-admission/
- Istio Install the Istio CNI node agent: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio Application Requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio 1.28 upgrade notes for sidecar seccompProfile: https://preliminary.istio.io/latest/news/releases/1.28.x/announcing-1.28/upgrade-notes/

## Issues Found
- The post said pods would fail to schedule when rejected by Pod Security Admission. Changed this to admission-time rejection, which is how PSA enforces policy violations.
- The post said Baseline allows most capabilities and that `NET_ADMIN`/`NET_RAW` only sometimes violate Baseline. Changed this because Kubernetes Baseline only allows a limited list of added capabilities, and Istio documents that `NET_ADMIN` and `NET_RAW` are not allowed by Baseline.
- The post tied the Istio CNI recommendation to Istio 1.22. Removed the version-specific claim because current Istio documentation recommends CNI for PSA without that cutoff.
- The PSS label example used colon-separated labels. Changed it to the actual `kubectl --show-labels` key/value format.
- The Restricted IstioOperator example used the deprecated alpha seccomp annotation. Replaced it with the current `global.proxy.seccompProfile.type=RuntimeDefault` configuration for `istio-proxy` and `istio-validation`.
- The verification command used the wrong namespace for the example deployment. Changed it from `my-app` to `restricted-ns`.
- The CNI verification text implied `istio-init` remains present without needing capabilities. Changed it to say the privileged `istio-init` container should not be injected and that `istio-validation` may appear instead.
- The `istio-system` exemption explanation focused on istiod and ingress gateway capabilities. Changed it to the documented reason: the Istio CNI DaemonSet requires host-level access and hostPath volumes that Baseline and Restricted do not allow.
- The troubleshooting advice recommended "Istio 1.22+" for sidecar PSS failures. Changed it to recommend a recent Istio version with CNI and the `RuntimeDefault` proxy seccomp profile where needed.
- The Restricted requirement list said "No host networking or ports." Changed it to "No host networking or host ports" to avoid implying normal container ports are prohibited.

## Review Notes
The guide is technically relevant and generally aligned with current Istio and Kubernetes guidance after the corrections. For production use, readers should still check their Kubernetes policy version labels and Istio minor version because PSS details and Istio sidecar security defaults can vary by release.
