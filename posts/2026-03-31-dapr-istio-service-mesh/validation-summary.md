# Validation Summary: How to Set Up Dapr with Istio Service Mesh

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, mTLS, Placement Service, service invocation)
- Istio (sidecar injection, PeerAuthentication, AuthorizationPolicy, Envoy proxy)
- Kubernetes (Deployments, namespaces, annotations, labels)

## Sources Consulted
- Dapr CLI reference — mtls command: https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr security — mTLS setup: https://docs.dapr.io/operations/security/mtls/
- Dapr sidecar default port mappings (3500 HTTP, 50001 gRPC API, 50002 internal gRPC, 50005 Placement)
- Istio PeerAuthentication API: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy API: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio traffic annotations (traffic.sidecar.istio.io/excludeInboundPorts, excludeOutboundPorts)

## Issues Found
- **Invalid Dapr CLI command `dapr mtls disable -k`**: The `dapr mtls` CLI command does not have a `disable` subcommand. Its actual subcommands are `expiry`, `export`, and `renew-certificate`. Replaced with the correct approach: using `helm upgrade` with `--set global.mtls.enabled=false` for existing installations, and `dapr init -k --enable-mtls=false` for new installations.

## Review Notes
- The port exclusion strategy in Step 5 is correct: excluding ports 3500 (HTTP API) and 50001 (gRPC API) from Istio interception keeps local app-to-Dapr traffic off the Envoy path, while the internal sidecar-to-sidecar port (50002) remains under Istio's mTLS coverage. This is consistent with the architecture description.
- The AuthorizationPolicy example in Step 7 uses HTTP path matching (`/v1.0/invoke/...`). In practice, Dapr sidecar-to-sidecar communication uses gRPC on the internal port (50002), so HTTP path-based rules may not match inter-sidecar traffic directly. The example is syntactically valid but users should test path matching behavior in their specific deployment.
- The "Pod stuck in Init:0/1" common issue describes a symptom (init container phase) but the fix (`holdApplicationUntilProxyStarts: false`) addresses application container startup ordering, not init container issues. The fix is valid for Dapr+Istio startup deadlocks where Istio holds app containers, but the symptom description could be more precise.
- The Kubernetes version requirement (1.22+) is conservative. Current versions of both Istio and Dapr require Kubernetes 1.26+ or higher. Users should check the specific version compatibility matrices for their chosen Istio and Dapr versions.
- The `apiVersion: security.istio.io/v1beta1` used for PeerAuthentication and AuthorizationPolicy is still functional but `v1` is available in Istio 1.18+. Both API versions work.
