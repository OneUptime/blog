# Validation Summary: How to Exclude Specific Ports from Istio Sidecar Proxy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection
- Istio traffic capture annotations
- Kubernetes Deployments and pod annotations
- Envoy sidecar proxy
- iptables traffic redirection
- Istio CNI
- IstioOperator install values
- Istio ProxyConfig and Sidecar resources

## Sources Consulted
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Traffic Management FAQ: https://istio.io/latest/about/faq/traffic-management/
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio ProxyConfig API reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio Global Mesh Options / mesh ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio `pilot-agent istio-iptables` command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio sidecar injection values and template source: https://github.com/istio/istio/tree/master/manifests/charts/istio-control/istio-discovery

## Issues Found
- The post stated that sidecar injection always adds an `istio-init` container. Updated the explanation to account for Istio CNI, where the CNI node agent configures traffic redirection instead.
- The health check exclusion example used port `15021`, which is an Istio proxy status/readiness port rather than a typical application health check port. Changed the example to exclude an application port, `8081`.
- The `includeOutboundPorts` explanation incorrectly described it as a complete outbound allowlist by itself. Updated the text to match Istio's documented behavior: it explicitly redirects the listed destination ports to Envoy, regardless of destination IP, and is usually considered alongside outbound IP range settings.
- The mesh-wide exclusion section incorrectly described the install-value example as MeshConfig and implied `ProxyConfig` can provide namespace-scoped port-capture exclusions. Updated the section to describe Istio install values as injection defaults and clarified that `ProxyConfig` does not expose port-capture exclusion fields.
- The verification section implied `istio-init` logs are always available. Updated it to apply only when Istio CNI is not used.
- The proxy-config verification claim was too broad for outbound exclusions. Updated it to distinguish inbound listener checks from outbound capture-rule verification.
- The pod restart note tied the requirement only to `istio-init`. Updated it to say traffic redirection rules are set when the pod is created, which also covers Istio CNI.

## Review Notes
The annotation examples use Istio's current alpha traffic capture annotations. The guide now reflects both init-container and Istio CNI sidecar data plane modes. Local `istioctl` and `kubectl` binaries were not installed in the review environment, so command syntax was checked against official documentation rather than local `--help` output.
