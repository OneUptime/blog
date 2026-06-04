# Validation Summary: How to Implement Calico with BGP for Pod Network Routing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- BGP
- BIRD
- Calico BGPConfiguration, BGPPeer, BGPFilter, Node, and IPPool resources
- Cisco IOS BGP configuration

## Sources Consulted
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico v3.32.0 manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml
- Cisco IOS BGP command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html

## Issues Found
- The installation command used Calico v3.27.0, which is no longer current. Updated the manifest URL to v3.32.0 to align the guide with the current Calico documentation.
- The node-to-node mesh YAML block included an uncommented `kubectl get` command inside a YAML code fence. Commented it so the block remains valid YAML.
- The route reflector BGPPeer examples used fixed `peerIP` peers, which did not match Calico's recommended route reflector selector-based peering model. Replaced them with `nodeSelector` and `peerSelector` examples for client-to-reflector and reflector-to-reflector peering.
- The Cisco IOS BGP example used invalid `network 0.0.0.0 0.0.0.0` syntax. Changed it to `network 0.0.0.0 mask 0.0.0.0`.
- The AS path prepending example used an unsupported `asPathPrepend` field on BGPPeer. Replaced it with a BGPFilter using the supported `operations.prependASPath` field and attached the filter to the BGPPeer.
- The IPPool comment said BGP advertisement was disabled while `disableBGPExport: false` actually keeps export enabled. Updated the comment.
- The IPPool node selector used invalid Calico selector syntax. Replaced it with `!has(node-role.kubernetes.io/control-plane)`.
- The BGPConfiguration performance example used an unsupported `bgpTimers` field. Replaced it with the supported `nodeMeshMaxRestartTime` graceful restart setting.

## Review Notes
- The guide uses manifest-based Calico installation. Calico also documents operator-based installation paths, but the manifest URL and environment variables used here are valid for the guide's scope.
- The BGP community definitions are valid, but communities are only advertised when referenced by `prefixAdvertisements` or BGPFilter operations.
- The YAML snippets were parsed after edits to catch syntax errors.
