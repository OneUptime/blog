# Validation Summary: How to Fix Liveness Probe Failures with Istio mTLS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Kubernetes liveness probes
- Kubernetes startup probes
- Istio mTLS
- Istio sidecar injection and probe rewriting
- Istio PeerAuthentication

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Istio pilot-agent status server source: https://github.com/istio/istio/blob/master/pilot/cmd/pilot-agent/status/server.go

## Issues Found
- The post said rewritten application probes target pilot-agent on port 15021. Istio's current health-check documentation shows rewritten `/app-health/...` probes targeting port 15020, while 15021 is used for Envoy readiness/status checks. Updated the explanatory text, JSON example, and manual curl command to use 15020.
- The direct ConfigMap patch used `sed 's/rewriteAppHTTPProbe: false/rewriteAppHTTPProbe: true/'`, which may not match the quoted JSON-formatted key in the Istio sidecar injector ConfigMap. Updated it to replace `"rewriteAppHTTPProbe": false` with `"rewriteAppHTTPProbe": true`, matching Istio's documented ConfigMap patch style.
- The HTTPS probe section said pilot-agent requires the application's certificate to be trusted. Kubernetes HTTPS probes skip certificate verification, and Istio pilot-agent mirrors that behavior for rewritten HTTPS probes. Updated the section to say certificate verification is skipped and adjusted the self-signed certificate note.

## Review Notes
The annotation `sidecar.istio.io/rewriteAppHTTPProbers` and the port exclusion annotation are valid but are pod-template annotations, not top-level Deployment annotations. The post's examples place them under `spec.template.metadata.annotations`, which is correct.
