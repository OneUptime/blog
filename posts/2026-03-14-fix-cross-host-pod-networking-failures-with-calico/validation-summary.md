# Validation Summary: Fixing Cross-Host Pod Networking Failure Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- calicoctl
- IPIP and VXLAN encapsulation
- BGP peering
- Calico IPAM

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking configuration: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- calicoctl node status command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl IPAM command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- calicoctl IPAM show command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The IPPool patch command used `default-ipv4-pool`, but Calico's documented default pool name is commonly `default-ipv4-ippool`. Changed the command to patch `default-ipv4-ippool`.
- The recovery checklist used `calicoctl ipam check`, which is not listed as a Calico Open Source IPAM subcommand in the current official documentation. Changed it to `calicoctl ipam show --show-blocks`, which is documented and provides pool and block-level IPAM visibility.
- The pod-to-pod connectivity layer used `wget` against `http://kubernetes.default.svc/healthz`, which tests Kubernetes API service reachability rather than pod-to-pod connectivity and uses the wrong plain-HTTP endpoint for the default Kubernetes service. Changed it to a `ping` test against a target pod IP, matching the post's earlier verification command.

## Review Notes
The post assumes an operator-style Calico namespace of `calico-system`; manifest-based installations may use `kube-system` instead. The commands are otherwise technically plausible for clusters that use Calico Open Source with the Calico API resources and `calicoctl` configured.
