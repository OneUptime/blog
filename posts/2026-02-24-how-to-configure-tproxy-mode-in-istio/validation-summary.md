# Validation Summary: How to Configure TPROXY Mode in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar traffic interception
- TPROXY and REDIRECT modes
- Linux iptables, netfilter, and policy routing
- Envoy transparent proxy sockets
- Kubernetes Deployments, Services, and Pod Security Standards
- Istio CNI plugin

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio MeshConfig `InboundInterceptionMode`: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Platform Requirements: https://istio.io/latest/docs/ops/deployment/platform-requirements/
- Istio CNI installation guide: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio `pilot-agent` command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio 1.29.2 source for sidecar injection and `istio-iptables`: https://github.com/istio/istio/tree/1.29.2
- Linux kernel transparent proxy documentation: https://docs.kernel.org/networking/tproxy.html
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/

## Issues Found
- The introduction described TPROXY as preserving IPs throughout the entire proxy chain. Istio documents `interceptionMode` as an inbound interception setting and states outbound traffic still uses iptables `REDIRECT`, so the wording was narrowed to inbound interception.
- The REDIRECT explanation said packet source addresses are rewritten. REDIRECT changes the destination for interception; the source-IP loss happens because Envoy opens a proxied connection to the workload. Updated the wording accordingly.
- The example TPROXY mark used `0x1/0x1`. Istio's default inbound TPROXY mark is `1337`, with route table `133`, so the example rules and `ip rule` output were corrected.
- The detailed iptables section omitted current Istio chains such as `ISTIO_DIVERT` and `ISTIO_TPROXY`. Updated the example to match the generated Istio 1.29.x rule structure.
- The route-table example used `default via 127.0.0.1 dev lo`. Istio configures a local route to loopback, equivalent to `ip route add local default dev lo table 133`, so the output was corrected.
- The post described the marked routing rule as outbound traffic. Istio's TPROXY routing rule is for inbound TPROXY packets, while outbound interception remains REDIRECT.
- The kernel check only mentioned `xt_TPROXY`. The Linux kernel and Istio requirements also involve related netfilter support such as socket, mark, and connmark modules, so the check was expanded.
- The security context example added `NET_RAW` to the sidecar. Current Istio TPROXY sidecar injection adds `NET_ADMIN`; `NET_RAW` is used by the non-CNI init-container path, so it was removed from the sidecar example.
- The Pod Security Standards statement said Baseline was sufficient for TPROXY. Kubernetes Baseline disallows adding `NET_ADMIN`, so it was corrected to require the Privileged profile or an explicit exemption.
- The verification command queried Envoy `server_info` and grepped for mode, which does not reliably verify Istio interception mode. Replaced it with checking `ISTIO_META_INTERCEPTION_MODE` in the proxy container.

## Review Notes
The article remains version-sensitive because Istio's generated iptables chains can change between releases and between iptables and nftables backends. The reviewed examples align with current Istio 1.29.x sidecar behavior and official documentation as of 2026-05-21.
