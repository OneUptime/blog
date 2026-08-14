# Validation Summary: Why a Kubernetes Pod Sees RDMA Devices but UCX Cannot Resolve GIDs

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes device plugins and extended resources
- Multus and NetworkAttachmentDefinition resources
- SR-IOV Network Device Plugin and SR-IOV CNI
- NVIDIA Network Operator and RDMA Shared Device Plugin
- RDMA, libibverbs, and rdma-core
- RoCE, InfiniBand, GIDs, IPoIB, and RDMA CM
- OpenUCX and Open MPI
- Linux network and RDMA namespaces

## Sources Consulted
- [Kubernetes: Device Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Multus CNI: How to use Multus](https://k8snetworkplumbingwg.github.io/multus-cni/docs/how-to-use.html)
- [SR-IOV Network Device Plugin](https://github.com/k8snetworkplumbingwg/sriov-network-device-plugin)
- [SR-IOV CNI](https://github.com/k8snetworkplumbingwg/sriov-cni)
- [NVIDIA Network Operator 26.4.0: SR-IOV network with RDMA](https://docs.nvidia.com/networking/display/kubernetes2640/quick-start/sriov-network-rdma.html)
- [NVIDIA Network Operator 26.4.0: Shared RDMA device with macvlan](https://docs.nvidia.com/networking/display/kubernetes2640/quick-start/macvlan-rdma-shared.html)
- [NVIDIA GPU Operator: GPUDirect RDMA](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-rdma.html)
- [OpenUCX FAQ](https://openucx.readthedocs.io/en/master/faq.html)
- [OpenUCX README: Known Issues](https://github.com/openucx/ucx#known-issues)
- [OpenUCX 1.19 source: RoCE reachability configuration](https://github.com/openucx/ucx/blob/v1.19.0/src/uct/ib/base/ib_iface.c)
- [OpenUCX source: RoCE reachability configuration](https://github.com/openucx/ucx/blob/v1.22.0/src/uct/ib/base/ib_iface.c)
- [OpenUCX NEWS](https://github.com/openucx/ucx/blob/master/NEWS)
- [rdma-core](https://github.com/linux-rdma/rdma-core)
- [Linux manual: rdma-link](https://man7.org/linux/man-pages/man8/rdma-link.8.html)
- [Linux manual: rdma-system](https://man7.org/linux/man-pages/man8/rdma-system.8.html)
- [Linux manual: ip-route](https://man7.org/linux/man-pages/man8/ip-route.8.html)
- [Linux kernel: InfiniBand GID sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [Linux kernel: IP over InfiniBand](https://docs.kernel.org/infiniband/ipoib.html)
- [Open MPI: InfiniBand and RoCE networking](https://docs.open-mpi.org/en/v5.0.7/tuning-apps/networking/ib-and-roce.html)

## Issues Found
- The evidence table said that seeing a uverbs node proved it was mounted and that `rdma link show` proved namespace ownership. It now states only what those observations establish: device-node visibility and RDMA-link visibility. Opening and querying the device remains a separate `ibv_devinfo` check.
- The host-GID warning did not account for Linux's shared RDMA namespace mode. It now distinguishes an absent or changed GID index from a visible GID whose associated netdev is unusable in the pod.
- The post implied that native InfiniBand always needs IPoIB, a CNI-created netdev, and an IP route. The affected guidance and conclusion now require those layers only when the selected network model, RDMA CM, or bootstrap path uses them.
- The SR-IOV explanation called the allocating component an RDMA device plugin. It now identifies the SR-IOV Network Device Plugin, its `isRdma` behavior, and the separate SR-IOV CNI role accurately.
- The post attributed `UCX_IB_ROCE_REACHABILITY_MODE` to the UCX FAQ. The FAQ documents `UCX_IB_GID_INDEX`; the OpenUCX README documents the reachability workaround. The post now gives the correct source and notes that the setting is available in UCX 1.19 and newer.
- `ucx_info -d` was described as an end-to-end inventory, and the diagnostic advice excluded port and GID failures. It is now described as a local UCX inventory, with port state and GID validity or selection included among the checks.
- The route inventory was phrased as covering all routes while only displaying IPv4 routes. An explicit IPv6 route command was added.
- The NVIDIA Network Operator links targeted version 26.1.0. They were updated to the current 26.4.0 documentation, whose examples retain the resource names and configuration used in the post.

## Review Notes
- The shell loops, `rdma`, `ibv_*`, `ucx_info`, `ip`, `kubectl`, environment, linker, and limits commands are syntactically valid. The YAML resource configuration is also valid: Kubernetes copies a container limit to its request when no request is specified, and extended-resource requests must equal their limits when both are present.
- The availability of `gid_attrs` entries is kernel- and driver-dependent, as the post already notes.
- `ldconfig -p` is not available in every container image, particularly musl-based or distroless images. It is a useful inventory command where present, while `ibv_devinfo` and `ucx_info -d` provide stronger functional evidence.
