# Validation Summary: How to Fix MetalLB BGP Session Not Establishing

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- MetalLB
- FRR and FRR-K8s
- BGP
- Linux firewall tooling
- kubectl

## Sources Consulted
- MetalLB API reference: https://metallb.io/apis/index.html
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/index.html
- MetalLB advanced BGP configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB release notes: https://metallb.io/release-notes/
- MetalLB home page / BGP backend notes: https://metallb.io/
- FRR-K8s README and status resources: https://github.com/metallb/frr-k8s
- FRRouting BGP command reference: https://docs.frrouting.org/en/latest/bgp.html
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- RFC 4271, Border Gateway Protocol 4: https://www.ietf.org/rfc/rfc4271
- IANA Special-Purpose Autonomous System Numbers registry: https://www.iana.org/assignments/iana-as-numbers-special-registry

## Issues Found
- The post assumed the FRR container in the MetalLB speaker pod was the normal current troubleshooting path. MetalLB 0.16 and later defaults to FRR-K8s, so I added `BGPSessionState` and `FRRNodeState` checks and labeled direct speaker-pod FRR commands as deprecated FRR mode.
- The `vtysh` examples did not specify the `frr` container. I updated the FRR-mode commands to use `kubectl exec ... -c frr`.
- The detailed FRR command used `show bgp neighbors`. FRRouting documents `show bgp neighbor [PEER]`, so I changed the examples to `show bgp neighbor 10.0.0.1`.
- The BGP state explanation was too absolute about Active/Connect always meaning port 179 failure and OpenSent always meaning an OPEN parameter mismatch. I softened the wording to reflect that the TCP connection is not completing or is being retried, and that OpenSent drops are often parameter mismatches.
- The private ASN guidance listed only the 16-bit private range. I added the RFC 6996 32-bit private range `4200000000-4294967294`.

## Review Notes
The remaining commands are generally valid troubleshooting commands, but availability of tools like `nc`, `bash`, `ping`, `ip`, and `netstat` depends on the container image used in a given MetalLB or debug pod.
