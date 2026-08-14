# Validation Summary: Debug GPUDirect RDMA Across ACS, IOMMU, and PCIe Topology

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- NVIDIA GPUDirect RDMA and CUDA
- NVIDIA ConnectX HCAs, mlx5, InfiniBand, and RoCE
- PCI Express topology, link negotiation, and Access Control Services (ACS)
- Linux IOMMU identity/pass-through modes and VFIO isolation
- Linux DMA-BUF, `nvidia-peermem`, and legacy `nv_peer_mem`
- linux-rdma perftest and libibverbs memory registration
- OpenUCX GPU-memory support
- Containers, Kubernetes, NVIDIA GPU Operator, and NVIDIA Network Operator

## Sources Consulted

- [NVIDIA CUDA GPUDirect RDMA 13.3 documentation](https://docs.nvidia.com/cuda/gpudirect-rdma/index.html)
- [NVIDIA System Management Interface topology documentation](https://docs.nvidia.com/deploy/nvidia-smi/index.html#topology)
- [NVIDIA GPU Operator: GPUDirect RDMA and GPUDirect Storage](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-rdma.html)
- [NVIDIA Grace Blackwell with ConnectX-8 GPUDirect RDMA testing guide](https://docs.nvidia.com/multi-node-nvlink-systems/grace-blackwell-cx8-gpudirect-rdma-guide/gpudirect_rdma_testing.html)
- [NVIDIA Grace Performance Tuning Guide: IOMMU and ACS settings](https://docs.nvidia.com/dccpu/grace-perf-tuning-guide/os-settings.html)
- [linux-rdma perftest README at the reviewed revision](https://github.com/linux-rdma/perftest/blob/6a66a60c60a2fab43514d26bbfda0788929b61fe/README#L246-L273)
- [linux-rdma perftest command-line parser](https://github.com/linux-rdma/perftest/blob/6a66a60c60a2fab43514d26bbfda0788929b61fe/src/perftest_parameters.c#L3297-L3317)
- [linux-rdma perftest MR registration implementation](https://github.com/linux-rdma/perftest/blob/6a66a60c60a2fab43514d26bbfda0788929b61fe/src/perftest_resources.c#L1952-L1998)
- [rdma-core libibverbs permissions documentation](https://github.com/linux-rdma/rdma-core/blob/master/Documentation/libibverbs.md#permissions)
- [OpenUCX FAQ: CUDA support and `ucx_info -d`](https://github.com/openucx/ucx/blob/6d75cec7cc3a252257f0d05d1c2674c8f9eddff8/docs/source/faq.md#L345-L423)
- [Linux kernel VFIO and IOMMU-group documentation](https://docs.kernel.org/driver-api/vfio.html)
- [Linux kernel PCI peer-to-peer DMA documentation](https://docs.kernel.org/driver-api/pci/p2pdma.html)
- [pciutils `lspci(8)` manual](https://man7.org/linux/man-pages/man8/lspci.8.html)
- [pciutils `setpci(8)` manual](https://man7.org/linux/man-pages/man8/setpci.8.html)
- [util-linux `dmesg(1)` manual](https://man7.org/linux/man-pages/man1/dmesg.1.html)
- [iproute2 `rdma-link(8)` manual](https://man7.org/linux/man-pages/man8/rdma-link.8.html)
- [Docker privileged-container documentation](https://docs.docker.com/reference/cli/docker/container/run/#privileged)

## Issues Found

- The IOMMU-group command used `find -maxdepth 2`, but device symlinks are normally at `/sys/kernel/iommu_groups/<group>/devices/<BDF>`, depth 3 from the search root. Changed it to `-maxdepth 3` so it returns the intended device links.
- The `dmesg` command was shown as an unprivileged invocation even though `kernel.dmesg_restrict=1` commonly denies that access. Added `sudo` so the evidence-collection command works on restricted systems.
- `nvidia-smi topo -mp` was described only as a more detailed map. NVIDIA defines it as a PCI-only GPU/NIC matrix that excludes NVLink, so the description now states its actual scope.
- The statement that a privileged container cannot change host IOMMU mappings was too absolute because privileged containers can receive host-device access, all capabilities, and writable `/sys`. Reworded it to the accurate diagnostic point: privilege alone does not change physical topology or make an incompatible host IOMMU configuration suitable for GPUDirect RDMA.
- The ACS warning said register layouts differ, although the ACS extended-capability layout is standardized. Corrected it to explain that capability locations and implemented bits vary and that platform software can override settings.
- The peer-memory inspection commands were said to identify the mechanism requested by a workload, but they only show loaded modules and installed-tool capabilities. Reworded the lead-in and directed readers to the workload command line and runtime logs for the mechanism actually used.
- The perftest DMA-BUF explanation did not capture the current parser's option ordering or registration behavior. It now places `--use_cuda_dmabuf` after a CUDA selector and distinguishes DMA-BUF registration from the `ibv_reg_mr` path that depends on peer-memory integration.

## Review Notes

The remaining commands and claims match the current authoritative documentation. In particular, current CUDA documentation still requires a shared supported PCIe path and identity/pass-through IOMMU translation for the documented GPUDirect RDMA path; NVIDIA currently recommends DMA-BUF over legacy `nvidia-peermem`; and the Grace Blackwell/ConnectX-8 ACS procedure is correctly identified as platform-specific. Current `nvidia-smi` releases also offer `topo -nic` as a focused GPU-to-NIC view, but the corrected `-m` and `-mp` guidance remains valid. Runtime bandwidth and supported topology still depend on the exact GPU, HCA, firmware, kernel, driver, and server platform matrix.
