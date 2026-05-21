# Validation Summary: How to Debug Health Check Failures with Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio sidecar proxy and pilot-agent
- Kubernetes liveness, readiness, and startup probes
- Kubernetes NetworkPolicy
- Istio mTLS and PeerAuthentication
- kubectl troubleshooting commands

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Application Requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post used port `15021` for rewritten `/app-health/...` application probe paths. Current Istio documentation shows rewritten application probes are sent to the sidecar agent on port `15020`, while `15021` is used for the sidecar health endpoint such as `/healthz/ready`. Updated the example event, probe rewrite description, test commands, quick reference table, and debugging script accordingly.
- The post said TCP and exec probes are not rewritten. Istio documentation says HTTP, TCP, and gRPC probes can be rewritten; exec probes work without changes. Updated the probe-type caveat.
- The mTLS section described the `istio-system` PeerAuthentication check as a namespace-level policy. In Istio, a PeerAuthentication in the root namespace, commonly `istio-system`, is mesh-level. Updated the command comment.
- The NetworkPolicy section implied Kubernetes NetworkPolicies commonly block kubelet probe traffic and recommended allowing the kubelet IP range. Kubernetes documentation states traffic from the pod's node is allowed for ingress isolation. Updated the guidance to check CNI-specific host endpoint policies, node firewalls, or cloud firewalls when node-originated probes appear blocked.

## Review Notes
The remaining commands and YAML snippets are syntactically valid for the documented troubleshooting workflow. The examples assume a conventional Istio sidecar setup and that `istio-system` is the mesh root namespace; installations with a different root namespace should adjust that command.
