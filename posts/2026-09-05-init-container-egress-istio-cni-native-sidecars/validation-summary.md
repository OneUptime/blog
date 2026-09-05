# Validation Summary: Init-Container Egress Skips the Mesh: Secure Pre-Proxy Traffic with Istio CNI or Native Sidecars

## Status

validated

## Post Type

Technical guide covering mesh startup behavior, diagnosis, and defensive egress configuration.

## Technologies Covered

- Istio sidecar injection, CNI, Envoy traffic interception, access logs, and egress gateways
- Kubernetes init containers, native sidecars, Deployments, Jobs, and startup probes
- Kubernetes NetworkPolicy, Pod Security Standards, and projected service-account tokens
- Mutual TLS, workload identity, Linux capabilities, and seccomp
- kubectl, jq, Bash, and YAML

## Sources Consulted

- Istio CNI installation, lifecycle, repair defaults, and init-container compatibility: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio annotation names, scope, nativeSidecar status, and precedence: https://istio.io/latest/docs/reference/config/annotations/
- Istio 1.24 annotation introduction: https://istio.io/latest/news/releases/1.24.x/announcing-1.24/change-notes/
- Istio injector environment settings and native-sidecar default: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio security boundaries and egress enforcement: https://istio.io/latest/docs/ops/best-practices/security/
- Istio security model: https://istio.io/latest/docs/ops/deployment/security-model/
- Istio NetworkPolicy integration: https://istio.io/latest/docs/setup/additional-setup/network-policy/
- Istio egress gateway behavior: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio gateway TLS origination and separate upstream authentication: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway-tls-origination/
- Istio TLS configuration and passthrough behavior: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio access logging: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Kubernetes sidecar lifecycle and startup conditions: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes versioned sidecar documentation confirming stability in 1.33: https://v1-34.docs.kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes sidecar adoption and 1.28 termination caveat: https://v1-32.docs.kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/
- Kubernetes init-container ordering and retries: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Deployment requirements: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes NetworkPolicy scope and enforcement dependencies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Restricted security requirements: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes projected service-account tokens: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- jq manual: https://jqlang.org/manual/
- Locally installed kubectl get/logs help and global options output.

## Issues Found

1. **Identity observation could misclassify legitimate egress as bypass.** An external destination does not normally receive the originating workload's mesh identity. Changed the diagnostic paragraph and lifecycle checklist to inspect identity at the authenticating mesh peer and correlate the request at the final destination.
2. **CNI race wording was too absolute.** Changed “closes” to “mitigates” because validation and repair handle missing redirection but do not eliminate the scheduling race itself. The existing explanation of default validation and repair remains correct.
3. **Deployment example was incomplete without being labeled partial.** It lacks a selector, matching Pod labels, and a container specification. Explicitly identified it as an excerpt to merge into an existing Deployment and stated that sidecar injection must already be enabled. The annotation selects the sidecar model; it does not independently enable injection.
4. **Exclusion scope conflated UID and IP/port behavior.** Clarified that IP/port annotations affect the Pod's application traffic, while a UID exemption applies to processes using that UID. Traffic from a different, non-exempt application UID remains captured.
5. **NetworkPolicy cannot separate containers in one Pod.** Replaced the unqualified instruction to prevent application use of an init exclusion with destination-side authorization and the explicit limitation of Pod-level policy.
6. **Init containers were described as inherently privileged and pre-identity.** Replaced that claim with the narrower pre-proxy lifecycle issue. Init containers can run without elevated capabilities and already have a Kubernetes service-account identity.
7. **The egress policy sketch omitted control-plane access.** Added the Istiod path for proxy configuration and certificates, and noted required internal dependencies. A policy allowing only DNS and the gateway can prevent proxy startup or ongoing operation.
8. **Gateway identity and L7 visibility were unconditional.** Qualified identity on mTLS configuration and HTTP visibility on access to HTTP; opaque TLS passthrough does not expose HTTP routing details to the gateway.

## Review Notes

- Confirmed the central distinction between capture installation and proxy availability, including the failure of captured init traffic with a legacy regular sidecar.
- Confirmed Kubernetes native-sidecar milestones (alpha 1.28, default-enabled beta 1.29, stable 1.33), restartPolicy: Always, startup-probe gating, and Job completion behavior.
- Confirmed the nativeSidecar annotation was introduced in Istio 1.24, remains classified Alpha in the consulted annotation catalog, overrides ENABLE_NATIVE_SIDECARS, and that the consulted command reference documents auto as the default. Release-matched documentation remains necessary because latest URLs change.
- Confirmed capability-drop and security-context fields are valid at container scope. Restricted admission requires compliance across the complete Pod; this fragment alone is not an admission configuration.
- All eight linked official documentation pages resolved to relevant resources. The author profile is attribution rather than a technical source.
- Syntax checks passed for all four Bash blocks. Both jq filters executed successfully against a representative Pod JSON fixture. Both YAML snippets parsed successfully with PyYAML. kubectl flags were checked against documentation and local help without contacting a cluster.
- Pod names, namespaces, CNI labels, and fetch-config are examples requiring local substitution. The Deployment is a partial example, and the securityContext is a container-level fragment.
- No live Kubernetes/Istio deployment, packet capture, positive egress request, or negative network test was executed. Runtime capture, probe ordering, access-log contents, shutdown, and dual-stack enforcement remain environment-specific checks, as the post instructs.
- Changes were limited to technical corrections within the existing sections; no sections were added or reorganized.
