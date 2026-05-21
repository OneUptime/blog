# Validation Summary: How to Handle Source IP Preservation in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes Services
- Kubernetes Deployments
- X-Forwarded-For
- PROXY protocol
- Istio AuthorizationPolicy
- IstioOperator mesh configuration

## Sources Consulted
- Istio documentation: Configuring Gateway Network Topology, https://istio.io/latest/docs/ops/configuration/traffic-management/network-topologies/
- Istio reference: MeshConfig gateway topology and inbound interception mode, https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio reference: Sidecar API and CaptureMode values, https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio reference: Resource annotations, including `sidecar.istio.io/interceptionMode`, https://istio.io/latest/docs/reference/config/annotations/
- Istio reference: AuthorizationPolicy and `remoteIpBlocks`, https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio reference: Authorization policy conditions and `remote.ip`, https://istio.io/latest/docs/reference/config/security/conditions/
- Istio task: Ingress access control and `ipBlocks` vs. `remoteIpBlocks`, https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Kubernetes documentation: Using Source IP with Services and `externalTrafficPolicy: Local`, https://kubernetes.io/docs/tutorials/services/source-ip/

## Issues Found
- The initial echo deployment did not create a Kubernetes Service, so `http://echo:5678` would not resolve. Replaced it with an httpbin Deployment and Service so `/headers` can show the headers the application receives.
- The XFF section described the leftmost address as the original client without the necessary trust caveat. Updated the wording to emphasize trusted client address extraction through configured proxy hops.
- The TPROXY per-workload example used `Sidecar.captureMode: TPROXY`, but the Sidecar `CaptureMode` enum does not include `TPROXY`. Replaced it with the supported `sidecar.istio.io/interceptionMode: TPROXY` pod-template annotation.
- The TPROXY explanation claimed Envoy passes the real source IP through to the application. Narrowed this to the officially documented behavior: TPROXY preserves source and destination information for Envoy policy, logging, and filtering.
- The PROXY protocol section said it works for both HTTP and non-HTTP traffic and used an EnvoyFilter example. Updated it to Istio's current gateway topology `proxyProtocol: {}` configuration and noted Istio's documented limitation that it is intended for TCP forwarding, not L7 traffic or L7 load balancers.
- The custom header example included `forwardClientCertDetails`, which configures XFCC certificate forwarding, not client IP extraction. Removed it from the source IP example.
- The verification notes pointed at `downstream_remote_address` as if it always showed the real client IP. Updated the wording to check `X-Envoy-External-Address` or remote IP depending on topology.
- The AuthorizationPolicy example redundantly matched raw `X-Forwarded-For` with a wildcard header condition while also using `remoteIpBlocks`. Removed the raw header condition and kept `remoteIpBlocks`, which is the intended Istio field for trusted original client IPs from XFF or PROXY protocol.

## Review Notes
The guide is now technically aligned with current Istio 1.30 documentation. Future improvements could add version-specific notes for cloud provider load balancer behavior, because Kubernetes documents that source IP preservation for `LoadBalancer` Services depends on the provider implementation.
