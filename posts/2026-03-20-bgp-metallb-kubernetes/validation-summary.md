# Validation Summary: How to Set Up BGP with MetalLB in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- Cisco IOS
- `kubectl`

## Sources Consulted
- MetalLB installation docs: https://metallb.io/installation/
- MetalLB configuration docs: https://metallb.io/configuration/
- MetalLB advanced BGP configuration docs: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB BGP concepts docs: https://metallb.io/concepts/bgp/
- MetalLB troubleshooting docs: https://metallb.io/troubleshooting/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB v0.14.5 native manifest: https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Cisco IOS BGP command reference (`maximum-paths eibgp`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html

## Issues Found
- The `aggregationLength` comment was incorrect. It said the field controlled AS path prepending, but MetalLB uses `aggregationLength` to control route aggregation, so the comment was corrected.
- The commented `BGPPeer.nodeSelectors` example used `kubernetes.io/role: worker`, which is not a standard Kubernetes node label. It was replaced with the standard `kubernetes.io/hostname` label used in MetalLB documentation.
- The Cisco IOS example implied ECMP behavior without enabling router multipath. The router snippet was updated with `maximum-paths eibgp 2`, and the surrounding text/conclusion were clarified so ECMP is correctly presented as dependent on router multipath support.
- The test step created only a `Service`. MetalLB does not advertise a service with no active endpoints, so the route-verification step could fail. A minimal `Deployment` plus readiness/wait commands were added so the BGP advertisement check matches actual MetalLB behavior.
- The MetalLB readiness command used `condition=ready`; it was updated to the canonical `condition=Ready` form shown in Kubernetes reference examples.

## Review Notes
- The post pins MetalLB to `v0.14.5`. That manifest URL is still valid, and the CRD versions used in the post remain correct for the native BGP workflow shown here.
- MetalLB’s current public docs are published for newer releases than `v0.14.5`, so future readers should check release notes if they choose to upgrade the manifest version.
