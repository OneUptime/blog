# Validation Summary: Automating Calico IPAM Split Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- calicoctl
- Kubernetes
- Bash scripting
- IPPool resources

## Sources Consulted
- Calico Open Source documentation: `calicoctl ipam split` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/split
- Calico Open Source documentation: `calicoctl ipam check` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source documentation: `calicoctl ipam show` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: IPPool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: `calicoctl patch` - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source documentation: `calicoctl datastore migrate lock` - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico Open Source documentation: `calicoctl datastore migrate unlock` - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Calico Open Source documentation: Create multiple IP pools - https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico Open Source documentation: Assign IP addresses based on topology - https://docs.tigera.io/calico/latest/networking/ipam/assign-ip-addresses-topology

## Issues Found
- The original post described splitting a pool by disabling the source IPPool and manually creating child IPPools with overlapping CIDRs. Calico documents a supported `calicoctl ipam split` command for this workflow, and the IPPool reference documents CIDR overlap validation. I changed the execution flow to use `calicoctl ipam split`.
- The original post omitted the required datastore lock/unlock workflow. Calico's `ipam split` documentation states that the datastore must be locked before the split and unlocked after it. I updated the explanation, scripts, best practices, and conclusion to include `calicoctl datastore migrate lock` and `calicoctl datastore migrate unlock`.
- The original post implied arbitrary sub-CIDR splits. Calico's split command creates equal-size child pools and only supports split counts that are powers of 2. I updated the prerequisites, explanation, and validation script to reflect this.
- The original YAML examples created new IPPools inside the original pool's CIDR. I replaced them with post-split node selector patch examples, because the split command creates the child pools.
- The pre-split script depended on a specific `calicoctl ipam check` output string. I changed it to rely on the command exit status, which is more robust for automation.

## Review Notes
The post is technically relevant and now reflects the supported Calico IPAM split workflow. In a production version, operators should also document how their Calico version names child pools after a split before automating node selector patching.
