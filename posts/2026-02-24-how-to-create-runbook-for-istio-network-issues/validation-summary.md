# Validation Summary: How to Create Runbook for Istio Network Issues

## Status
validated

## Post Type
Technical troubleshooting guide / runbook

## Technologies Covered
- Istio service mesh
- Kubernetes Services, Pods, Endpoints, and Gateways
- Envoy sidecar proxy diagnostics
- Istio traffic management resources: ServiceEntry and DestinationRule
- istioctl and kubectl troubleshooting commands
- Istio CNI and sidecar traffic redirection

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio diagnostic tools for istioctl: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio traffic management problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio DNS proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio application requirements / proxy ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio CNI installation and traffic redirection behavior: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio CNI troubleshooting: https://istio.io/latest/docs/ops/diagnostic-tools/cni/
- Envoy access log response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Kubernetes Services and appProtocol documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The first connectivity test said it ran "inside the sidecar" even though it execs into the application container. Updated the comment to say it tests from the app container through the mesh.
- The direct Pod IP test was described as bypassing the sidecar. In a normal injected pod, outbound traffic can still be intercepted by Istio, so the text now says it bypasses Kubernetes Service discovery/load balancing and recommends testing from a pod without sidecar injection to isolate Kubernetes networking from Istio.
- The response flag section implied all listed response flags map to 503 responses. Envoy's `NR` flag commonly maps to 404, while `UH`, `UF`, and `UO` are typical 503 cases. Updated the wording, decision tree, grep pattern, and flag list to include `UH` and clarify `NR`.
- The protocol mismatch section implied a DestinationRule is how to specify HTTP/2 or gRPC. Istio protocol selection is primarily configured with Service port names or Kubernetes `appProtocol`; `h2UpgradePolicy` is for HTTP/1.1-to-HTTP/2 upstream upgrades. Updated the commands and DestinationRule example accordingly.
- The ingress gateway test only read `.status.loadBalancer.ingress[0].ip`, which fails on load balancers that publish a hostname. Updated it to read either IP or hostname.
- The iptables inspection command attempted to run `iptables` inside the `istio-proxy` container, which is not reliable with modern proxy images and CNI setups. Replaced it with checks for `istio-init` logs when CNI is not enabled and `istio-cni-node` logs when CNI is enabled.

## Review Notes
The remaining examples are intentionally generic and require replacing placeholders such as `<pod>`, `<namespace>`, `<service>`, and `<port>`. Some Envoy admin endpoint commands assume the proxy container image includes a usable HTTP client; in hardened or distroless environments, equivalent `istioctl proxy-config` commands or approved debug tooling may be needed.
