# Validation Summary: Diagnose an Unavailable mlx5 Port in UCX_NET_DEVICES

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- OpenUCX, including UCP, UCT, `UCX_NET_DEVICES`, `UCX_TLS`, and `ucx_info`
- NVIDIA ConnectX / mlx5 adapters
- InfiniBand and RoCE
- Linux RDMA subsystem, rdma-core, libibverbs, and iproute2 RDMA commands
- Linux sysfs and network namespaces
- Open MPI
- Containers and Kubernetes
- SR-IOV Network Device Plugin, Multus, SR-IOV CNI, and NVIDIA Network Operator

## Sources Consulted
- [OpenUCX FAQ: selecting networks and transports, dependencies, configuration, and protocol introspection](https://openucx.readthedocs.io/en/master/faq.html)
- [OpenUCX repository: supported transports and rdma-core / MLNX_OFED requirements](https://github.com/openucx/ucx#supported-transports)
- [OpenUCX `ucx_info` source: command options and separation of UCT inventory from UCP diagnostics](https://github.com/openucx/ucx/blob/master/src/tools/info/ucx_info.c)
- [OpenUCX UCP diagnostic implementation](https://github.com/openucx/ucx/blob/master/src/tools/info/proto_info.c) and [UCP device/transport configuration](https://github.com/openucx/ucx/blob/master/src/ucp/core/ucp_context.c)
- [UCX 1.13.1 `ucx_info -v` implementation](https://github.com/openucx/ucx/blob/v1.13.1/src/tools/info/build_info.c) and [UCX 1.14.0 implementation](https://github.com/openucx/ucx/blob/v1.14.0/src/tools/info/version_info.c)
- [Open MPI `mpirun` documentation](https://docs.open-mpi.org/en/v5.0.10/man-openmpi/man1/mpirun.1.html)
- [rdma-core `ibv_devinfo(1)` manual](https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_devinfo.1)
- [iproute2 `rdma-dev(8)`](https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-dev.8), [`rdma-link(8)`](https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-link.8), and [`rdma-system(8)`](https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-system.8) manuals
- [Linux kernel InfiniBand sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband) and [Linux RDMA namespace behavior](https://docs.kernel.org/driver-api/infiniband.html)
- [NVIDIA RoCE documentation: GID table population and netdev association](https://docs.nvidia.com/networking/display/mlnxenv23102131201lts/RDMA%2Bover%2BConverged%2BEthernet%2B%28RoCE%29)
- [SR-IOV Network Device Plugin](https://github.com/k8snetworkplumbingwg/sriov-network-device-plugin) and [SR-IOV CNI](https://github.com/k8snetworkplumbingwg/sriov-cni)
- [NVIDIA Network Operator 26.4: SR-IOV network with RDMA](https://docs.nvidia.com/networking/display/kubernetes2640/quick-start/sriov-network-rdma.html) and [version lifecycle](https://docs.nvidia.com/networking/display/kubernetes2640/platform-support.html)

## Issues Found
1. The introduction said `UCX_NET_DEVICES` made UCX use only the listed devices and described the unavailable-device diagnostic as an immediate failure. The setting restricts network-device resources only; shared-memory, accelerator, and self resources are separate. The unavailable-device message itself is a warning; when no usable path remains, UCP can subsequently fail initialization or endpoint creation. The wording now reflects both points.
2. The `mpirun --map-by ppr:1:node` example was presented as generic MPI syntax. `--map-by` is an Open MPI launcher option, not part of the MPI standard. The text now scopes the example to Open MPI.
3. `/sys/class/infiniband/mlx5_0/device/net` is device-level and can list more than one netdev, so it is not an exact port-to-netdev mapping on all topologies. It was replaced with the valid port-specific command `rdma link show mlx5_0/1`.
4. The namespace explanation did not distinguish Linux RDMA subsystem modes. It now explains that RDMA devices are visible in every network namespace in `shared` mode and in only one namespace in `exclusive` mode, and the checks now include `rdma system show`.
5. The Kubernetes paragraph used the ambiguous term “RDMA device plugin” for SR-IOV. It now identifies the SR-IOV Network Device Plugin, a meta-plugin such as Multus, and the SR-IOV CNI, with their correct allocation and network-namespace roles.
6. The post stated that every `ucx_info -v` prints a library path. UCX 1.13 and earlier do not; the runtime-library path and separate runtime/header versions were added in UCX 1.14. The statement is now version-qualified.
7. The comparison used `ucx_info -d` as evidence that UCP automatic selection succeeded. `-d` inventories UCT transport/device resources and does not test UCP filtering by `UCX_NET_DEVICES` or `UCX_TLS`. The comparison now runs the same application with both variables unset and then with only the device restriction applied, explicitly removing an ambient `UCX_TLS` in both cases.
8. The interpretation of an unrestricted success and restricted failure was too narrow: a correctly spelled port can still be unavailable or unusable on that node or fabric. The conclusion now covers the selector, selected port/fabric, and per-node mapping without assuming a spelling error.
9. The `ldd` command inspects `ucx_info`, not necessarily an application or launcher-loaded MPI plugin with a different RPATH. The text now states that scope and directs readers to inspect the relevant executable or plugin separately.
10. The NVIDIA Network Operator link targeted deprecated release 26.1. It was updated to the supported 26.4 documentation current on the validation date.

## Review Notes
- The remaining `ucx_info`, `rdma`, `ibv_devinfo`, sysfs, `ip`, `env`, `ldd`, and `ldconfig` command syntax is valid for the Linux environment discussed.
- The documented UCX requirement remains current: UCX 1.12 and later require rdma-core 28 or later, or MLNX_OFED 5.0 or later, for InfiniBand and RoCE support. Distribution and vendor support matrices can impose stricter combinations.
- Bare `ip route show` displays IPv4 routes. When a RoCE deployment uses an IPv6-derived GID, also inspect `ip -6 route show`; this is an optional completeness improvement rather than an error in the existing IPv4 check.
- `ldd` does not enumerate provider modules loaded later with `dlopen`. `ucx_info -d`, application logs, and loader/process tracing remain the stronger checks for runtime provider usability.
- All external links in the post were reachable after the NVIDIA version update.
