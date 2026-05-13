# Validation Summary: Monitor BlockAffinity Behavior in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- BlockAffinity resources
- Kubernetes
- calicoctl
- Prometheus Operator PrometheusRule

## Sources Consulted
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico IPAM concepts: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico IP pool block size reference: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico kube-controllers Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico kube-controllers configuration reference: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico node decommissioning guide: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node

## Issues Found
- The introduction implied pods always receive IPs from affiliated blocks. Calico tries to allocate from associated blocks by default, but can also allocate borrowed IPs from non-affine blocks. Updated the wording to avoid the absolute claim.
- The default block size was described only as `/26`. Calico documents `/26` for IPv4 and `/122` for IPv6. Updated the introduction and best practices.
- The `calicoctl ipam show --show-blocks` grep example matched `^Block`, but the documented output uses table rows beginning with `| Block`. Updated the grep expression so it matches actual output rows.
- The cleanup section used `calicoctl ipam release --ip=<orphaned-block-start-ip>`, which releases one assigned IP address, not a whole block or BlockAffinity. Replaced it with the documented `calicoctl ipam check -o report.json` and `calicoctl ipam release --from-report=report.json` workflow.
- The cleanup section described `calicoctl ipam check --show-all-ips` as a full garbage collection. That flag prints all checked IPs; it does not perform GC by itself. Updated the wording.
- The Prometheus alert used non-documented metric names `calico_ipam_blocks_used` and `calico_ipam_blocks_total`. Replaced them with documented kube-controllers IPAM metrics: `ipam_allocations_in_use` and `ipam_ippool_size`.
- The best practices recommended cluster autoscaler labels for block affinity cleanup. Calico documents the node controller as the component responsible for cleanup of data for removed Kubernetes nodes, so the recommendation was corrected.

## Review Notes
BlockAffinity resources are managed by Calico IPAM and are not intended to be manually created, updated, or deleted. The post now focuses remediation on IPAM leak checks and documented release workflows rather than direct BlockAffinity mutation.
