# Validation Summary: Migrate BlockAffinity Behavior in Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- BlockAffinity resources
- IPPool resources
- Kubernetes
- calicoctl
- kubectl

## Sources Consulted
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico migrate from one IP pool to another guide: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size

## Issues Found
- The post described BlockAffinity as the relationship between a node and assigned IP blocks and implied stale affinities can directly cause duplicate pod IPs. Updated this to match the official definition: BlockAffinity represents affinity for an IPAM block and stale or inconsistent state can waste address space or contribute to routing/IPAM problems.
- The command `calicoctl ipam show --show-blocks --ip=10.244.0.0/16` was invalid because `--ip` is for a specific IP address and is mutually exclusive with `--show-blocks`. Replaced it with `calicoctl ipam show --ip=10.244.0.10`.
- The command `calicoctl ipam release-leaked-ips --dry-run` is not part of the current documented `calicoctl` IPAM command set. Replaced the workflow with `calicoctl ipam check --show-problem-ips -o /tmp/ipam-report.json` and `calicoctl ipam release --from-report=/tmp/ipam-report.json`.
- The IPPool example used a partial old-pool manifest in an apply-style workflow, which could be misleading because Calico resource apply/replace workflows should use complete resource definitions. Replaced it with the documented `calicoctl patch ippool old-pool-24 -p '{"spec": {"disabled": true}}'` approach.
- The migration step implied uncordoning a node by itself causes it to receive a new block. Updated the wording to clarify that uncordoning only allows scheduling, and new pods scheduled on the node should be checked for addresses from the new pool.
- The cleanup section described manually releasing old blocks and removing stale BlockAffinity resources. Updated it to focus on checking/releasing leaked IP allocations and letting Calico manage unused block affinities.
- The best-practice note recommending `--dry-run` for release commands was incorrect for the documented IPAM release flow. Replaced it with guidance to review the `calicoctl ipam check` report before releasing leaked IPs.

## Review Notes
The guide is accurate as a high-level migration pattern for moving workloads to a disjoint new IP pool. For changing only the block size of an existing pool, Calico documentation notes that `blockSize` cannot be edited directly after creation; operators should use the documented temporary-pool migration workflow and ensure the new pool CIDR is valid for their Kubernetes cluster CIDR.
