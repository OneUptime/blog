# Validation Summary: How to Validate BGP Peering in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BIRD
- calicoctl
- kubectl
- Linux routing

## Sources Consulted
- Calico documentation: `calicoctl node status` command - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: IPPool resource and IPAM block routing - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Troubleshooting commands for BIRD and learned routes - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: Configure calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: Node resource and BGP fields - https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation: `calicoctl get` resource names - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: `kubectl run` generated reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The route-advertisement section referred to checking the pod CIDR for each node. Calico commonly advertises workload routes aggregated by IPAM allocation blocks rather than a Kubernetes per-node pod CIDR, so the wording was corrected to "Calico workload routes or IPAM block routes."
- The node route verification command used `ip route | grep -E 'cali|tunl|vxlan'`, which can miss BGP-learned routes in non-overlay or differently configured deployments. It was changed to `ip route | grep bird`, matching Calico troubleshooting guidance for verifying BIRD-learned routes.
- The `kubectl run --overrides` examples omitted `apiVersion` in the inline override object. Kubernetes documents that `--overrides` requires a valid `apiVersion`, so both examples now include `"apiVersion":"v1"`.
- The test pod examples now include `--restart=Never`, which is the standard mode for one-off diagnostic pods and avoids creating repeatedly restarting test pods after the sleep command exits.
- The Calico resource command was changed from plural `calicoctl get bgppeers` to the documented resource name `calicoctl get bgppeer`.

## Review Notes
The post is technically valid after the targeted fixes. The `birdcl` commands are appropriate for Calico deployments using BIRD; future revisions could mention that environments not using Calico BGP/BIRD, or clusters using overlays without BGP peering, will need different validation checks.
