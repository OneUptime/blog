# Validation Summary: How to Configure Network Policies with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Kubernetes NetworkPolicy
- Kubernetes DNS and service-to-service traffic
- Istio sidecar proxy ports
- kubectl and istioctl debugging commands

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Application Requirements, ports used by Istio: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- The `allow-istiod` NetworkPolicy allowed port `15014` while describing the rule as needed for sidecar xDS and certificate signing. Istio documents `15014` as control plane monitoring, not as a sidecar xDS or CA service port, so it was removed from that allow rule.
- The "Handling Sidecar Ports" section described all listed ports as sidecar ports. Some listed ports are control plane ports, so the heading and lead-in sentence were corrected to refer to Istio ports more generally.
- Port `15020` was described as a health check port. Istio documents `15020` as merged Prometheus telemetry, so the description was corrected.
- The debugging comment said to temporarily remove NetworkPolicies, but the shown command only listed them. The comment was clarified so it matches the command.
- The debug pod command did not explicitly run in the `production` namespace and did not prevent sidecar injection. It now uses `-n production` and the `sidecar.istio.io/inject=false` pod label documented by Istio.

## Review Notes
The examples are syntactically consistent with current `networking.k8s.io/v1` NetworkPolicy and `security.istio.io/v1` AuthorizationPolicy APIs. Actual enforcement behavior still depends on a NetworkPolicy-capable CNI plugin, and namespace or workload labels such as `app: istio-ingressgateway`, `app: prometheus`, and `kubernetes.io/metadata.name` must match the target cluster.
