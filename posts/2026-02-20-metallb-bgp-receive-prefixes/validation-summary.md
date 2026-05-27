# Validation Summary: How to Receive Incoming BGP Prefixes with MetalLB FRR-K8s Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- FRR-K8s
- FRRouting (FRR)
- BGP
- kubectl
- YAML custom resources

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/index.html
- MetalLB advanced BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB BGP concepts documentation: https://metallb.io/concepts/bgp/
- FRR-K8s official repository and README: https://github.com/metallb/frr-k8s
- FRR-K8s FRRConfiguration API type definitions: https://raw.githubusercontent.com/metallb/frr-k8s/main/api/v1beta1/frrconfiguration_types.go
- FRR-K8s FRRConfiguration CRD schema: https://raw.githubusercontent.com/metallb/frr-k8s/main/config/crd/bases/frrk8s.metallb.io_frrconfigurations.yaml
- FRRouting BGP command documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting zebra/kernel route documentation: https://docs.frrouting.org/en/latest/zebra.html
- Kubernetes kubectl debug documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The original FRR-K8s mode verification checked only MetalLB speaker pod containers and said that seeing an `frr` container meant MetalLB was running in FRR mode and could receive prefixes. That can identify deprecated direct FRR mode rather than FRR-K8s mode. Updated the commands to check the FRR-K8s pods with `app=frr-k8s`, verify the `frrconfigurations.frrk8s.metallb.io` CRD, and inspect the FRR-K8s pod containers.
- The original `vtysh` examples exec'd into `<speaker-pod>` without selecting a container. In FRR-K8s mode the FRR daemon is managed by FRR-K8s pods, and multi-container pods require selecting the `frr` container for `vtysh`. Updated the verification and troubleshooting commands to resolve an FRR-K8s pod and run `kubectl exec ... -c frr`.
- The route verification wording referred to the "local routing table" while the command shown was `vtysh -c "show ip route bgp"`, which displays FRR's route table view. Updated the text to say "FRR routing table" and kept the separate node kernel route verification step.

## Review Notes
The `FRRConfiguration` snippets use the current `frrk8s.metallb.io/v1beta1` API and valid `toReceive.allowed` fields (`mode`, `prefixes`, `prefix`, `ge`, and `le`). The FRR `show bgp ... received-routes`, `show bgp ... routes`, and `show ip route bgp` commands match FRRouting documentation. The `kubectl debug node/<node-name> -it --image=busybox -- ...` form is consistent with Kubernetes node debugging syntax.
