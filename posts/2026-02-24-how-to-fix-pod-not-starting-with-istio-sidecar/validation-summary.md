# Validation Summary: How to Fix Pod Not Starting with Istio Sidecar

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection
- Istio CNI
- IstioOperator configuration
- Istio sidecar resource and proxy configuration annotations
- Kubernetes pods, init containers, sidecars, probes, resource quotas, and termination
- Kubernetes Pod Security Admission and AppArmor
- kubectl troubleshooting commands

## Sources Consulted
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio Application Requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- IstioOperator Options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes AppArmor tutorial: https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The introduction and container list stated that sidecar injection always adds both `istio-init` and `istio-proxy`. Updated the wording to account for Istio CNI, where the CNI node agent replaces the privileged init container.
- The security policy section referenced PodSecurityPolicy without noting that it is an older mechanism. Updated the wording to emphasize Pod Security Admission while still acknowledging older PodSecurityPolicy environments.
- The AppArmor example used the deprecated `container.apparmor.security.beta.kubernetes.io/*` annotation. Replaced it with the current `securityContext.appArmorProfile` field and noted that Kubernetes v1.30 and later use this API.
- The private registry IstioOperator example configured `hub` and `tag` under `values.global`. Updated the snippet to use the current top-level `spec.hub` and `spec.tag` fields documented by IstioOperator.
- The `holdApplicationUntilProxyStarts` explanation said Istio adds a `postStart` hook. Updated it to match Istio's documented behavior: the injector starts the proxy first and blocks other containers until the proxy is ready.
- The probe section said HTTP probes simply go through the sidecar. Updated it to explain Istio's default probe rewrite behavior for HTTP, TCP, and gRPC probes.
- The Istio sidecar port list omitted several current well-known ports and mislabeled port `15020` as a health-check port. Updated the list to match Istio's application requirements documentation.
- The resource-quota example set sidecar CPU and memory request annotations without matching limit annotations. Added `sidecar.istio.io/proxyCPULimit` and `sidecar.istio.io/proxyMemoryLimit` because Istio documents that request overrides should be paired with explicit limits.

## Review Notes
The remaining commands and configuration snippets are broadly correct for Istio sidecar mode, but several recommendations remain environment-dependent. CNI installation may require revision-specific `values.pilot.cni.enabled=true` in revisioned Istio deployments, AppArmor exceptions should be scoped carefully because a pod-level `Unconfined` profile applies broadly, and the exact default proxy resources can vary by Istio installation profile and operator overrides.
