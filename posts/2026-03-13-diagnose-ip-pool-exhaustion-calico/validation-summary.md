# Validation Summary: How to Diagnose IP Pool Exhaustion in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Calico IPAM
- calicoctl
- Kubernetes pods and kubelet events
- Kubernetes networking

## Sources Consulted
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: IP pool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Get started with IP address management, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: Change IP pool block size, https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: Migrate from one IP pool to another, https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools

## Issues Found
- The introduction said pod scheduling fails with IP allocation errors. IP allocation failures from Calico occur during pod sandbox/network setup after scheduling, so this was changed to pod startup failing with network plugin IP allocation errors.
- The introduction implied addresses are never returned when pod termination or cleanup has problems. This was narrowed to say addresses may not be returned when pods terminate improperly or IPAM cleanup lags.
- The block allocation explanation implied nodes always hold blocks and that new nodes fail merely because all blocks are allocated. Calico can create and destroy blocks as needed, and hosts may borrow IPs from other blocks when configuration allows it, so the explanation was changed to focus on no usable IPs remaining in eligible pools.
- The symptoms listed a `FailedScheduling` event for IP allocation. Network setup failures normally surface as kubelet pod sandbox failures, so this was changed to `FailedCreatePodSandBox`.
- The `calicoctl ipam show` comment said the command shows free blocks. Official output shows total, in-use, and free IP counts per pool; block details require `--show-blocks`, so the comment was corrected.
- The `calicoctl ipam check` comment overstated the output. It was changed to match the command's documented behavior of checking IPAM data against Kubernetes and reporting leaked or inconsistent allocations.
- The grep command used lowercase patterns that would miss current `calicoctl ipam show` headers such as `IPS IN USE` and `IPS FREE`. It was changed to use case-insensitive matching.
- The running pod count command used a generic text grep. It was changed to use Kubernetes field selection and `--no-headers` for a more reliable count.

## Review Notes
The post remains version-neutral. Calico IP pool `blockSize` defaults and `calicoctl ipam show --show-blocks` are accurate for the current Calico documentation consulted during review.
