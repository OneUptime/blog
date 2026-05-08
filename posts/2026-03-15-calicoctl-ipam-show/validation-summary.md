# Validation Summary: How to Use calicoctl ipam show with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Calico IPAM
- Kubernetes
- Bash scripting

## Sources Consulted
- Calico Open Source 3.32 documentation: `calicoctl ipam show` - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source 3.32 documentation: `calicoctl ipam` overview - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Open Source 3.32 documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Open Source 3.32 documentation: IPAM configuration - https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Kubernetes documentation: `kubectl` reference - https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The introduction said `calicoctl ipam show` reports reserved addresses per IP pool and per node. The official command output reports overall pool usage and, with `--show-blocks`, block usage; it does not provide a per-node summary in the standard table. Updated the wording to describe pool and allocation-block output.
- The introduction said IP exhaustion causes pods to fail scheduling. IPAM exhaustion usually occurs when the CNI plugin tries to assign an address after scheduling, so the pod may be scheduled but fail to start successfully. Updated the wording.
- The `--show-configuration` description said the command includes maximum blocks per host. The documented `--show-configuration` table shows current IPAM configuration such as `StrictAffinity` and `AutoAllocateBlocks`. Updated the description.
- The sample `calicoctl ipam show` tables omitted the percentage values shown in current documented output for `IPS IN USE` and `IPS FREE`. Updated the examples to include those values.
- The Bash examples parsed `calicoctl ipam show` with whitespace-based `awk` field numbers that do not match the documented pipe-delimited table output, especially because `IPS IN USE` and `IPS FREE` include percentages. Updated the scripts to parse pipe-delimited columns and extract numeric values before arithmetic.

## Review Notes
- The command names and flags used in the post are current in the Calico Open Source 3.32 documentation.
- The example scripts assume IPv4-sized numeric totals. Calico supports IPv6 pools, and the official output may display very large IPv6 totals in scientific notation, which would need different arithmetic handling in production monitoring scripts.
