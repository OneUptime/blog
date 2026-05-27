# Validation Summary: How to Configure BFD Profile Parameters in MetalLB

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB BFDProfile and BGPPeer CRDs
- BGP
- BFD
- FRRouting (FRR)
- kubectl

## Sources Consulted
- MetalLB API reference docs: https://metallb.io/apis/
- MetalLB configuration docs, BFD support for BGP sessions: https://metallb.io/configuration/
- MetalLB upstream BFDProfile CRD schema: https://github.com/metallb/metallb/blob/main/config/crd/bases/metallb.io_bfdprofiles.yaml
- MetalLB upstream BGPPeer CRD schema: https://github.com/metallb/metallb/blob/main/config/crd/bases/metallb.io_bgppeers.yaml
- FRRouting BFD documentation: https://docs.frrouting.org/en/stable-10.2/bfd.html
- RFC 4271, BGP-4 timers: https://www.rfc-editor.org/rfc/rfc4271
- RFC 5880, Bidirectional Forwarding Detection: https://www.rfc-editor.org/rfc/rfc5880

## Issues Found
- The post stated that BGP failure detection can take up to three minutes as if that were the protocol default. RFC 4271 suggests a 90-second default hold time, while some implementations use other defaults such as 180 seconds. I changed the wording to "tens of seconds or longer" depending on the negotiated hold timer.
- The post described MetalLB BFD support as only the "FRR backend." MetalLB's current docs describe BFD support for FRR-based modes, including FRR and FRR-K8s. I updated the wording accordingly.
- The BFD detection-time formula used only the local `receiveInterval`. FRR and the MetalLB CRD describe detection as the remote transmission interval, negotiated against the local receive interval, multiplied by the local detect multiplier. I corrected the formula and kept the symmetric 300ms example result.
- The prerequisite said BFD must be enabled on the router interface. BFD for a BGP session must be configured for the matching router-side BGP peer or neighbor, with exact syntax varying by platform. I updated that prerequisite.
- The aggressive profile was labeled "sub-100ms" while the example calculates 150ms detection. I changed the label to "faster detection."
- The echo-mode explanation omitted FRR's current caveats. I added that FRR echo mode is disabled by default, unsupported for multihop sessions, and only works with another FRR peer unless distributed BFD is used.
- The common-mistakes table said MetalLB and router BFD parameters must "agree." BFD timers are negotiated, so exact equality is not required. I changed this to "compatible intervals and multiplier."

## Review Notes
The YAML examples use current MetalLB CRD APIs: `BFDProfile` is `metallb.io/v1beta1`, and `BGPPeer` examples use the non-deprecated `metallb.io/v1beta2` API. The listed BFDProfile fields and validation ranges match the upstream CRD schema. The `kubectl apply`, `kubectl get`, and `kubectl exec ... vtysh -c "show bfd peers"` commands are syntactically valid, though exact FRR output formatting can vary by FRR version.
