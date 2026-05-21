# Validation Summary: How to Fix Envoy Proxy Not Receiving Configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- xDS
- Kubernetes
- Istiod
- Istio Sidecar resources

## Sources Consulted
- Istio documentation: Debugging Envoy and Istiod - https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio documentation: pilot-agent command reference - https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio documentation: Sidecar API reference - https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio documentation: Application requirements and Istio ports - https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio documentation: Istio CNI node agent - https://istio.io/latest/docs/setup/additional-setup/cni/
- Envoy documentation: Administration interface / config_dump - https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy documentation: xDS configuration API overview - https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/dynamic_configuration

## Issues Found
- The post said Envoy does not read config files. This was too absolute because Envoy can use static/bootstrap configuration; in Istio, the sidecar receives most mesh configuration dynamically from Istiod over xDS. Updated the wording to distinguish bootstrap configuration from dynamic mesh configuration.
- The Istiod connectivity test used `curl` against `https://istiod.istio-system.svc:15012/debug/connections`. Port 15012 is the TLS/mTLS gRPC xDS and CA port, so an HTTP `curl` path is not a reliable connectivity check. Replaced it with `pilot-agent request GET clusters | grep xds-grpc`, which queries the local Envoy admin API through the supported Istio agent command and checks for the xDS cluster.
- The Sidecar resource example used `networking.istio.io/v1beta1`. Updated it to the current `networking.istio.io/v1` API version used in Istio's latest Sidecar API documentation.
- The init-container remediation suggested manually adding `NET_ADMIN` and `NET_RAW` to an `istio-init` container. For injected sidecars, the more accurate fix is to allow those capabilities for the injected init container or use Istio CNI. Replaced the snippet with that guidance.

## Review Notes
The remaining commands and explanations are consistent with the current Istio troubleshooting flow. The post does not pin an Istio version, so the review used the latest Istio documentation available on 2026-05-21.
