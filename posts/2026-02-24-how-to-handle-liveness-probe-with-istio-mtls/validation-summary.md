# Validation Summary: How to Handle Liveness Probe with Istio mTLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio mutual TLS
- Kubernetes liveness probes
- Kubernetes Deployment manifests
- Envoy sidecar injection
- kubectl

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio Sidecar Injection Problems / startup ordering guidance: https://istio.io/latest/docs/ops/common-problems/injection/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The post used `security.istio.io/v1beta1` for `PeerAuthentication`. Updated examples to `security.istio.io/v1`, matching current Istio documentation.
- The post said rewritten probes target port `15021`. Current Istio health-check documentation shows application probe rewrites targeting the agent status port `15020`, so the text and curl example were updated.
- The verification commands checked `rewriteAppHTTPProbers` in a generic `istio` ConfigMap. Updated them to check `rewriteAppHTTPProbe` in the documented `istio-sidecar-injector` ConfigMap.
- The post said probe rewriting only works for HTTP probes and that TCP probes are not rewritten. Current Istio documentation says probe rewrite is used for HTTP, TCP, and gRPC probes by default, so that explanation was corrected.
- The `portLevelMtls` section did not mention that the key is the workload port and must be bound by a Service for this use case. Added a short clarification based on the Istio authentication policy documentation.
- The post stated probe rewriting is enabled by default since Istio 1.10. Reworded this to the current documented behavior: enabled by default in Istio's built-in configuration profiles.

## Review Notes
The remaining Kubernetes probe examples and `kubectl` commands are syntactically valid. The exec probe approach is technically correct, with the Kubernetes-documented caveat that exec probes fork a process for each check and can add CPU overhead in dense clusters.
