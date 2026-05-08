# Validation Summary: Creating the Calico BGPPeer Resource in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Calico BGPPeer resources
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Open Source calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source BGP-to-workload guide, for projectcalico.org/v3 API access guidance: https://docs.tigera.io/calico/latest/networking/configuring/bgp-to-workload

## Issues Found
- The post used `keepOriginalNextHop: true` in the BGPPeer manifest and described `keepOriginalNextHop` as a key field. Official Calico documentation marks `keepOriginalNextHop` as deprecated and says to use `nextHopMode` instead. I changed the field description to `nextHopMode` and updated the manifest to `nextHopMode: Keep`.
- The post said every manifest field was set to a sensible default, but `peerIP`, `asNumber`, `nodeSelector`, and `nextHopMode` are environment-specific example values. I changed the wording to call them practical example values.
- The verification command said it described the specific resource, but `kubectl describe bgppeer.projectcalico.org` omitted the resource name. I changed it to `kubectl describe bgppeer.projectcalico.org rack1-tor-switch`.
- The Calico log command assumed the `calico-system` namespace. I added a note to adjust the namespace for deployments that run Calico in `kube-system`.
- The troubleshooting section implied that checking for Calico API server pods is always the right way to troubleshoot a missing BGPPeer after `kubectl apply`. Official Calico documentation states that `projectcalico.org/v3` resources are available to `kubectl` through the Calico API server, or can be managed with `calicoctl`. I changed the check to verify that `projectcalico.org` API resources include BGPPeer.
- The validation guidance mentioned valid CIDRs for these fields, but the shown BGPPeer fields require IP addresses, AS numbers, and selectors rather than CIDRs. I corrected the wording.

## Review Notes
The BGPPeer API group, kind, `peerIP`, `asNumber`, and `nodeSelector` examples match the official Calico documentation. The `calicoctl apply -f` and `calicoctl get bgppeer -o yaml` commands are valid according to the official calicoctl references.
