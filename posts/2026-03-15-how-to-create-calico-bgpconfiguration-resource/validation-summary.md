# Validation Summary: How to Create the Calico BGPConfiguration Resource

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- Calico BGPConfiguration resources
- calicoctl
- kubectl

## Sources Consulted
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico resource definitions reference: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico service IP advertisement documentation: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico API server documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico native v3 CRDs documentation: https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico calicoctl create command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/create
- RFC 6996, Autonomous System (AS) Reservation for Private Use: https://www.rfc-editor.org/rfc/rfc6996
- IANA Special-Purpose Autonomous System Numbers registry: https://www.iana.org/assignments/iana-as-numbers-special-registry

## Issues Found
- The post said any non-default BGPConfiguration requires explicit reference from BGPPeer or node configurations. Calico documents `default` as the global configuration and `node.<nodename>` as the node-specific override form, with only `prefixAdvertisements`, `listenPort`, and `logSeverityScreen` overridable that way. I corrected the explanation.
- The route advertisement section said `serviceClusterIPs` and `serviceExternalIPs` advertise pod and service CIDRs. These fields advertise Kubernetes service IP ranges, not pod CIDRs. I changed the wording to service CIDRs and included `serviceLoadBalancerIPs` in the field list.
- The route reflector note said disabling node-to-node mesh is required when using route reflectors. Calico documents disabling the mesh as a way to enable other BGP topologies. I softened this to "commonly used" for dedicated route reflectors.
- The verification text implied `calicoctl node status` shows the node-to-node mesh setting. Calico documents it as showing BGP status for the local node. I changed the text to refer to expected BGP sessions and peer state.
- The `kubectl get` example used `bgpconfigurations.crd.projectcalico.org`, which targets the internal/backing CRD API group in common API-server mode. Calico documentation says `projectcalico.org/v3` resources are managed through the Calico API server or native v3 CRDs, so I changed the command to `kubectl get bgpconfigurations.projectcalico.org default -o yaml`.
- The troubleshooting section only listed `64512-65534` as the private ASN range. RFC 6996 and IANA also reserve `4200000000-4294967294` for private use. I updated the range list.

## Review Notes
The examples use `apiVersion: projectcalico.org/v3`, which is correct for calicoctl, the Calico API server, and native v3 CRD mode. In older or default installations where users only interact with the backing `crd.projectcalico.org/v1` CRDs directly, kubectl behavior can differ, but Calico documentation recommends managing v3 Calico APIs through the API server or native v3 CRDs rather than editing the backing CRDs directly.
