# Validation Summary: How to Use Kubernetes Service Internal Traffic Policy with Topology Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes internal traffic policy
- Kubernetes Service Topology / topology keys
- Kubernetes EndpointSlices
- Kubernetes traffic distribution and topology-aware routing
- kubectl
- AWS CLI Cost Explorer

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- AWS CLI get-cost-and-usage command reference: https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html

## Issues Found
- `internalTrafficPolicy: Local` did not mention drop behavior when a node has no local endpoint. Updated the explanation and test expectations to state that kube-proxy drops traffic instead of falling back to another node.
- The test loop used Bash brace expansion inside a `/bin/sh` session. Replaced it with a POSIX-compatible `while` loop.
- The post said topology keys were deprecated as of Kubernetes 1.27. Corrected this to state that Service Topology was deprecated in Kubernetes 1.21 and removed after Kubernetes 1.22.
- The `topologyKeys` example could be read as current API usage. Added wording that it only applied to older clusters that supported Service Topology and should not be used on current clusters.
- The post described `service.kubernetes.io/topology-aware-hints: auto` as the current approach. Replaced current examples with `spec.trafficDistribution: PreferSameZone` and noted the older `service.kubernetes.io/topology-mode: Auto` and pre-1.27 `service.kubernetes.io/topology-aware-hints` annotations.
- The requirements incorrectly said the Service cannot use `externalTrafficPolicy: Local`. Updated this to the relevant internal-traffic constraint: `internalTrafficPolicy: Local` takes precedence over topology preferences for internal Service traffic.
- Troubleshooting used a literal `kube-proxy-xxxxx` pod name placeholder and an unsafe `xargs` form. Replaced these with more generally usable `kubectl` commands.
- Updated remaining wording and examples from “topology hints” to `trafficDistribution: PreferSameZone` where the corrected manifests now use the current Service field.

## Review Notes
- Verified all YAML snippets parse successfully with PyYAML.
- `kubectl` was not installed in the local environment, so CLI behavior was checked against official Kubernetes documentation rather than local `kubectl --help` output.
- The legacy `topologyKeys` manifest is intentionally retained as historical context, but it is not valid for current supported Kubernetes clusters.
