# Validation Summary: Creating the Calico BGPFilter Resource in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BGPFilter and BGPPeer Calico resources
- kubectl
- calicoctl

## Sources Consulted
- Calico BGPFilter resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl configuration overview: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post implied that applying a BGPFilter makes it active. Calico requires the BGPFilter name to be added to the `filters` field of a corresponding `BGPPeer`, so the post now states that requirement and includes a minimal BGPPeer example.
- The verification commands used `bgpfilter.projectcalico.org` and omitted the resource name from the describe command. Calico documents the kubectl alias as `bgpfilters.projectcalico.org`, so the commands now use that alias and describe `allow-specific-prefixes`.
- The post described the example CIDRs as sensible defaults. They are example environment-specific values, so the wording now says to adjust them for the target environment.
- The calicoctl validation wording overstated `apply` as the validation mechanism. The post now uses `calicoctl validate -f bgpfilter.yaml` for offline validation and describes `calicoctl apply` separately.
- The advanced labels section implied labels directly target BGPFilter behavior. It now clarifies that labels and selectors apply through related resources such as `BGPPeer`.
- The troubleshooting section recommended restarting calico-node pods when components did not pick up the resource. The post now points readers to verify the `BGPPeer` `spec.filters` reference and inspect calico-node logs instead.

## Review Notes
The BGPFilter manifest syntax and fields are valid for current Calico documentation. The Calico docs note that unmatched BGPFilter routes default to `Accept`; the sample's final `Reject` rules are therefore appropriate when the desired behavior is explicit deny after the allow rules.
