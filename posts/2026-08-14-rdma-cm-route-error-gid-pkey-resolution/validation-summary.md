# Validation Summary: Trace RDMA_CM_EVENT_ROUTE_ERROR Through GIDs and P_Keys

## Status
validated

## Post Type
Troubleshooting guide / technical reference

## Technologies Covered
- RDMA Connection Manager (librdmacm)
- rdma-core
- Native InfiniBand
- RoCE and RoCEv2
- IP over InfiniBand (IPoIB)
- Global Identifiers (GIDs) and the Linux GID table
- InfiniBand partition keys (P_Keys)
- Subnet Manager, Subnet Administrator, and IB ACM path resolution
- Linux network namespaces and iproute2 RDMA tooling
- UCX configuration (misdiagnosis warning)

## Sources Consulted
- [rdma-core `rdma_get_cm_event(3)` manual source](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/man/rdma_get_cm_event.3) - event definitions, status semantics, and event acknowledgment lifetime.
- [rdma-core `rdma_resolve_addr(3)` manual source](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/man/rdma_resolve_addr.3) - optional source address, route-based source selection, device binding, and IP-to-GID behavior.
- [rdma-core `rdma_resolve_route(3)` manual source](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/man/rdma_resolve_route.3) and [`rdma_cm(7)`](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/man/rdma_cm.7) - call ordering, immediate return semantics, and asynchronous completion behavior.
- [rdma-core public API header](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/rdma_cma.h) - current structures, accessors, event types, and function signatures.
- [rdma-core `rping` example](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/examples/rping.c) and [`rping(1)`](https://man7.org/linux/man-pages/man1/rping.1.html) - event-driven call sequence, return-value handling, source binding, and CM/data-path testing.
- [Linux kernel RDMA CM implementation](https://github.com/torvalds/linux/blob/master/drivers/infiniband/core/cma.c) - native-InfiniBand SA queries, RoCE local path-record construction, route-event generation, and synchronous error paths.
- [Linux InfiniBand sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband) and [current sysfs implementation](https://github.com/torvalds/linux/blob/master/drivers/infiniband/core/sysfs.c) - port-state output and indexed GID, GID-type, netdev, and P_Key attributes.
- [Linux IPoIB documentation](https://docs.kernel.org/infiniband/ipoib.html) - P_Key-specific IPoIB interfaces and partition behavior.
- [rdma-core IB ACM documentation](https://github.com/linux-rdma/rdma-core/blob/master/Documentation/ibacm.md) - cached, preloaded, multicast-derived, and SA-backed path-resolution modes.
- [RFC 4391](https://www.rfc-editor.org/rfc/rfc4391.html) and [RFC 4392](https://www.rfc-editor.org/rfc/rfc4392.html) - IPoIB addressing, path attributes, and P_Key full/limited membership rules.
- [OpenSM partition configuration](https://github.com/linux-rdma/opensm/blob/master/doc/partition-config.txt) - 15-bit partition values, membership configuration, and the default partition.
- [iproute2 `rdma-link(8)`](https://man7.org/linux/man-pages/man8/rdma-link.8.html), [`rdma-dev(8)`](https://man7.org/linux/man-pages/man8/rdma-dev.8.html), and [`rdma-system(8)`](https://man7.org/linux/man-pages/man8/rdma-system.8.html) - command syntax, conditional link attributes, and RDMA network-namespace modes.
- [NVIDIA MLNX_OFED v24.10 LTS documentation](https://docs.nvidia.com/networking/display/nvidia-mlnx-ofed-documentation-v24-10-2-1-8-0-lts-2024-lts-u2.pdf) - RoCE path construction, GID population, GID sysfs attributes, VLAN association, and RDMA CM selection.
- [UCX FAQ: RoCE](https://openucx.readthedocs.io/en/master/faq.html#roce) - scope of `UCX_IB_GID_INDEX`.

## Issues Found
1. **Synchronous failures were conflated with `RDMA_CM_EVENT_ROUTE_ERROR`.** An asynchronous CM call can fail immediately, in which case it returns `-1`, sets `errno`, and does not produce the completion event the application was waiting for. The opening explanation and event-flow example now distinguish an accepted asynchronous request from an immediate failure, and the text now requires checking `rdma_resolve_route()` before waiting on the event channel.
2. **The source-selection condition was incomplete.** Route-based source selection applies when no source address is supplied and the CM ID has not already been bound to a device. Added the missing precondition from the librdmacm API contract.
3. **RoCE faults were assigned too broadly to the route-error event stage.** Current Linux constructs RoCE route data locally; address, GID, netdev, and VLAN problems commonly surface as `RDMA_CM_EVENT_ADDR_ERROR` or an immediate `rdma_resolve_route()` error instead of an asynchronous route-error event. The RoCE paragraph now states this explicitly while retaining the relevant diagnostic checks.
4. **The GID attribute commands did not display attribute values.** `ls -l` showed only file metadata and index names for `gid_attrs/ndevs` and `gid_attrs/types`. Replaced those commands with a loop that reads each indexed sysfs attribute, allowing the GID index to be correlated with its actual type and netdev.
5. **P_Key matching was described imprecisely.** Peers do not need identical 16-bit table entries: the low 15 bits identify the partition, the high bit identifies membership, and at least one endpoint must be a full member. Replaced the “exact P_Key” wording with the actual compatibility rule and qualified switch enforcement.
6. **The native-InfiniBand path-resolution description overstated direct SA use and input fields.** librdmacm may obtain path data through IB ACM rather than a direct kernel SA query, and Linux requests SGID, DGID, P_Key, reversibility, service information, and QoS/traffic class while SL, MTU, and rate are returned path attributes. Updated the paragraph and checklist accordingly. Also corrected the literal sysfs state spelling from `Active` to `ACTIVE`.
7. **The `rdma link show` matrix entry implied a universal netdev association.** A netdev is reported conditionally, notably for RoCE/Ethernet links; native-InfiniBand links need not expose an IPoIB netdev through that command. Qualified the matrix entry.
8. **The NVIDIA reference was outdated for this topic.** The linked programming manual's substantive revision predates RoCEv2 and network-namespace coverage. Replaced it with NVIDIA's modern MLNX_OFED v24.10 LTS documentation.

## Review Notes
- The C event-logging snippet uses current, non-deprecated librdmacm APIs. Its types and format specifiers are valid, it reads event data before acknowledgment, and its status interpretation matches the current manual.
- The displayed `ip`, `rdma`, `ibv_devinfo`, and sysfs commands are valid. The post correctly treats sysfs availability as kernel- and driver-dependent.
- All external links in the post were checked after the edit and resolve to the intended resources.
- The post specifies no fixed rdma-core or kernel version. The corrected behavior was checked against current upstream rdma-core and Linux; the same native-IB/RoCE route-resolution split is also present in supported older kernel lines.
- In containers, running commands in the target network namespace is necessary, but a host-bind-mounted or restricted `/sys` can still present a misleading RDMA view. Recording `rdma system show` and the container's mount setup can help in future expansions of the guide.
