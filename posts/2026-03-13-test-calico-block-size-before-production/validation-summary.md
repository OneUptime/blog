# Validation Summary: How to Test Changing Calico Block Size Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Kubernetes
- calicoctl CLI
- kubectl CLI
- Calico IPAM (IP Pools, Block Allocation)

## Sources Consulted
- Calico IP Pools resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico changing IP pools guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- kubectl get pods -o wide column layout (Kubernetes docs)

## Issues Found
- **`awk '{print $8}'` in the Verify section**: The verify step is meant to validate IPAM/block size changes after applying a new IPPool. However, `kubectl get pods -A -o wide` produces columns in the order NAMESPACE($1) NAME($2) READY($3) STATUS($4) RESTARTS($5) AGE($6) IP($7) NODE($8). Column $8 is NODE, which is not relevant for verifying block size / IP allocation changes. Fixed by changing it to `$7` (the IP column), which is the column relevant to verifying IPAM behavior.

## Review Notes
- The IPPool spec uses `blockSize: 26`, which happens to be the default IPv4 block size in Calico. The example still works (it's syntactically valid and accepted by Calico), but if the author wants to illustrate an actual change in block size, choosing a non-default value (e.g., `24` or `28`) would make the example more illustrative. Not a technical error, just a presentation note.
- The post mentions Calico v3.20+ as a prerequisite. `calicoctl ipam check` is available from calicoctl v3.18+, so the v3.20+ requirement comfortably covers that.
- Changing block size on an existing IP pool requires creating a new pool and migrating workloads — the post does not cover this migration workflow, only validation of a new IPPool. This is fine given the scope ("test before production"), but readers should be aware that block size cannot be changed in-place on a live pool.
- The Description says "test in a staging environment" while the Introduction says "in production Kubernetes clusters" — a minor inconsistency in framing, but not a technical error.
