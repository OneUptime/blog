# Validation Summary: Configure Node CIDR Planning with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source IPAM
- Calico IPPool resources
- Calico `calicoctl ipam show`
- Kubernetes node pod capacity reporting with `kubectl`
- Bash capacity-planning arithmetic

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post said `blockSize` could be set when creating or updating an IP pool. Calico documents `blockSize` as create-time only, so I changed the instructions to say existing pools require a replacement pool and workload migration.
- The block-size formula referred to `block_size >= max_pods_per_node + overhead`, which mixed CIDR prefix length with address count and implied fixed reserved addresses. I changed it to compare `addresses_per_block` against max pods plus operational headroom.
- The Bash CIDR recommendation used invalid shell expansion: `${32 - $(...)}`. I rewrote the snippet to compute `REQUIRED_IPS` and `PREFIX` with valid Bash and Python.
- The monitoring section included a pipeline that parsed `calicoctl ipam show --show-blocks` as if block rows exposed per-node ownership. The documented output shows pool and block usage, not node ownership in that table. I removed the incorrect pipeline and kept the documented `--show-blocks` and `--show-borrowed` commands.

## Review Notes
The IPPool manifest fields `apiVersion`, `kind`, `spec.cidr`, `spec.blockSize`, `spec.ipipMode`, `spec.natOutgoing`, and `spec.nodeSelector` are valid for Calico IPPool resources. The local environment did not have `calicoctl` installed, so CLI validation was performed against official Calico command documentation rather than local `--help` output.
