# Validation Summary: How to Configure Port-Level mTLS in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio PeerAuthentication
- Istio mutual TLS (mTLS)
- Istio port-level mTLS configuration
- Kubernetes Deployments and Services
- kubectl
- istioctl proxy-config
- Prometheus / Istio telemetry metrics

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy-config diagnostic docs: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post said `portLevelMtls` could be applied at namespace scope without a selector. Istio's PeerAuthentication reference says port-level settings only apply when a workload selector is specified. I changed the namespace-wide port-level section to a workload-specific example with a selector.
- The post omitted Istio's caveat that `portLevelMtls` is ignored unless the port is bound to a Service. I added this note near the first explanation of `portLevelMtls`.
- The Prometheus exception example used `portLevelMtls` without a workload selector. I updated the example to include a workload selector.
- The namespace/workload policy section used a namespace-level `portLevelMtls` example and described that exception as something a workload policy would not inherit. I removed the invalid namespace-level port override and adjusted the wording to focus on workload policy precedence.

## Review Notes
- The Istio examples use `security.istio.io/v1`, which is current in the official Istio documentation.
- The `istioctl proxy-config listener/listeners` command and `--port` / `-o json` flags are valid according to the Istio command reference.
- `DISABLE` mode is valid for sidecar mode, but Istio's current reference notes it is not supported in ambient mode. The post appears to describe sidecar behavior and does not discuss ambient mode.
