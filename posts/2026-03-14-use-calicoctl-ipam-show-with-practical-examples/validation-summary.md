# Validation Summary: Using calicoctl ipam show with Practical Examples

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes
- Bash and awk

## Sources Consulted
- Calico Open Source 3.32 documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source 3.32 documentation: calicoctl ipam overview - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source 3.32 documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Enterprise 3.22 documentation: calicoctl ipam check - https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check

## Issues Found
- The example `calicoctl ipam show` output omitted the utilization percentages that current Calico output includes in the `IPS IN USE` and `IPS FREE` columns. Updated the examples to include percentage values.
- The `--show-blocks` explanation said the command shows block distribution across nodes, but the documented output shows IP pools and allocated blocks, not node ownership. Updated the wording to describe per-pool utilization and blocks allocated from those pools.
- The monitoring and capacity-planning scripts parsed the table with whitespace-based `awk` fields, which reads the CIDR and separator columns instead of the numeric totals in current table output. Replaced that parsing with pipe-delimited `awk` extraction and stripping of percentage suffixes.

## Review Notes
The reviewed commands and flags are valid in current Calico documentation. The capacity-planning script now aggregates all `IP Pool` rows rather than checking only the first pool, which better matches clusters with multiple pools.
