# Validation Summary: Troubleshoot Node CIDR Planning in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico IPAM
- Calico IPPool resources
- calicoctl
- Kubernetes
- CIDR and pod networking

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM configuration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico calicoctl ipam configure reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico migrate from one IP pool to another guide: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico create multiple IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico decommission a node guide: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node

## Issues Found
- The IPPool examples set both `ipipMode: Never` and `vxlanMode: CrossSubnet`. Calico documents `ipipMode` and `vxlanMode` as mutually exclusive fields, so I removed `ipipMode` from the VXLAN examples.
- The block-utilization `awk` example looked for `Node` and `In use` text that does not match the documented `calicoctl ipam show --show-blocks` table. I changed it to parse `Block` rows and the `IPS IN USE` column.
- The pool utilization `grep` example looked for `Capacity` and `Available`, but the documented columns are `IPS TOTAL`, `IPS IN USE`, and `IPS FREE`. I updated the command accordingly.
- The post stated a default maximum of 5 blocks per node. Calico documents `maxBlocksPerHost` with a default of 20, so I corrected the text and command.
- The post described `calicoctl ipam check` as releasing orphaned allocations. The documented workflow is to lock the datastore, run `ipam check -o`, release leaked addresses with `ipam release --from-report`, then unlock the datastore. I updated the command sequence and best-practice note.
- The post suggested resizing an existing CIDR as an expansion approach. Calico's documented guidance is to add or migrate to another pool, and IPPool block size is create-time only, so I changed the wording to adding a non-overlapping pool and migrating workloads if needed.
- The supplemental pool example did not mention the Kubernetes cluster CIDR constraint. Calico recommends keeping IP pools within the Kubernetes cluster CIDR, so I added that caveat to the example comment.

## Review Notes
The remaining examples are broadly accurate for current Calico Open Source documentation. The article still uses `calicoctl` for resource operations; current Calico docs note that newer releases can use the Calico API server with `kubectl` for many resources, but `calicoctl` remains required for IPAM subcommands, so the guide's tool choice is appropriate for this topic.
