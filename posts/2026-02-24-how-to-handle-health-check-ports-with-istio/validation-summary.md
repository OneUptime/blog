# Validation Summary: How to Handle Health Check Ports with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar proxy
- Istio application probe rewriting
- Kubernetes Deployments, Services, and probes
- Kubernetes NetworkPolicy
- kubectl and pilot-agent debugging commands

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Application Requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post said Istio rewrites application probes to the agent on port 15021. Istio's probe rewrite example shows rewritten probes using port 15020, with the sidecar agent forwarding to the original application probe. Updated the text to use port 15020.
- The port exclusion section implied that excluding an inbound port alone makes kubelet probes bypass the proxy. Istio still rewrites HTTP probes by default, so the kubelet will use the rewritten sidecar-agent endpoint unless `sidecar.istio.io/rewriteAppHTTPProbers: "false"` is set. Added the required annotation for direct kubelet-to-container probing.
- The `excludeInboundPorts` explanation specifically referred to the init container. Current Istio deployments may use init-container or CNI-based redirection setup, so the wording was generalized to Istio's traffic redirection setup.
- The reserved sidecar port list omitted current Istio sidecar ports 15002 and 15008. Added both ports and corrected the conflict warning to mention ports 15020 and 15021 as sidecar-agent ports.
- The protocol detection section showed a Deployment container port name as the place to configure Istio protocol selection. Istio documents protocol selection on Service port names or the Kubernetes `appProtocol` field. Updated the example and wording to use a Service port, and changed the earlier Service example's health port name to `http-health`.

## Review Notes
The Kubernetes probe, NetworkPolicy, and kubectl examples are generally correct. `from: []` in a NetworkPolicy ingress rule is equivalent to an empty source list and matches all sources, but `- {}` is the more common idiom for an allow-all ingress rule.
