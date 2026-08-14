# Validation Summary: Run ib_write_bw on the Intended Path and Memory Type

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- linux-rdma perftest and `ib_write_bw`
- RDMA verbs and RDMA Connection Manager
- InfiniBand and RoCE
- RoCE GID tables, VLANs, and network-device mapping
- NVIDIA CUDA and GPUDirect RDMA
- DMA-BUF and legacy `nvidia-peermem` registration
- Linux RDMA sysfs, rdma-core, and iproute2 tools
- NUMA placement, numactl, and NVIDIA GPU/NIC topology

## Sources Consulted
- linux-rdma perftest README, current review commit: https://github.com/linux-rdma/perftest/blob/b848400df9c1c14b31175da8d6ff5c59b201e9b7/README
- perftest current option definitions and validation: https://github.com/linux-rdma/perftest/blob/b848400df9c1c14b31175da8d6ff5c59b201e9b7/src/perftest_parameters.c
- perftest default socket control channel and RDMA CM resolved-path handling: https://github.com/linux-rdma/perftest/blob/b848400df9c1c14b31175da8d6ff5c59b201e9b7/src/perftest_communication.c
- perftest memory registration implementation: https://github.com/linux-rdma/perftest/blob/b848400df9c1c14b31175da8d6ff5c59b201e9b7/src/perftest_resources.c
- perftest CUDA allocation implementation: https://github.com/linux-rdma/perftest/blob/b848400df9c1c14b31175da8d6ff5c59b201e9b7/src/cuda_memory.c
- rdma-core userspace libraries, tools, and librdmacm interfaces: https://github.com/linux-rdma/rdma-core
- rdma-core `ibv_devinfo` manual: https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_devinfo.1
- iproute2 `rdma link` and `ip address` manuals: https://man7.org/linux/man-pages/man8/rdma-link.8.html and https://man7.org/linux/man-pages/man8/ip-address.8.html
- Linux kernel InfiniBand sysfs ABI: https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband
- NVIDIA MLNX_EN RoCE GID-table documentation: https://docs.nvidia.com/networking/display/mlnxenv23102131201lts/rdma-over-converged-ethernet-roce.pdf
- NVIDIA CUDA GPUDirect RDMA documentation: https://docs.nvidia.com/cuda/gpudirect-rdma/
- NVIDIA GPU Operator GPUDirect RDMA and DMA-BUF documentation: https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-rdma.html
- NVIDIA System Management Interface documentation: https://docs.nvidia.com/deploy/nvidia-smi/
- util-linux `lscpu` manual: https://man7.org/linux/man-pages/man1/lscpu.1.html
- pciutils `lspci` manual: https://man7.org/linux/man-pages/man8/lspci.8.html
- numactl manual: https://man7.org/linux/man-pages/man8/numactl.8.html

## Issues Found
- The post treated `-x` as authoritative even with `-R`. RDMA CM route resolution can select a different HCA, port, and GID from the requested `-d`, `-i`, and `-x` values. The text now limits explicit `-x` selection to non-`-R` tests and tells readers using `-R` to verify the resolved values and constrain the source address with `--bind_source_ip` where supported.
- The RoCE inventory loop printed only GID values. RoCEv1 and RoCEv2 entries can have the same GID value, and the value alone does not identify the associated netdev or VLAN. The loop now also reads each index's `gid_attrs/types` and `gid_attrs/ndevs` entries.
- The CUDA build wording did not reflect current perftest behavior. It now states that perftest 25.07 and later auto-detect `cuda.h` in the standard CUDA location, while older releases require `CUDA_H_PATH` and current builds retain it for compatibility.
- The evidence checklist classified DMA-BUF as a memory type alongside host and CUDA memory. DMA-BUF is a CUDA-buffer export and registration mechanism, not an allocation type. The checklist and conclusion now distinguish host versus CUDA device allocation from DMA-BUF versus legacy peer-memory registration.
- The NUMA instruction referred to choosing a node on each server even though both server and client allocate benchmark buffers. It now correctly says to choose the local node on each endpoint.

## Review Notes
- All displayed `ib_write_bw`, sysfs, `nvidia-smi`, `lscpu`, and numactl commands are syntactically valid. The documented meanings of `-d`, `-i`, `-s`, `-D`, `-R`, `-x`, `-b`, `-a`, `-q`, `--report_gbits`, and `--use_cuda` match current upstream perftest.
- Current perftest can automatically bind to the RDMA device's NUMA node when built with libnuma and no external affinity is already set. The explicit numactl example remains valid, and the post appropriately tells readers to check their installed build.
- In current perftest, a CUDA selector such as `--use_cuda=0` or `--use_cuda_bus_id=...` should precede `--use_cuda_dmabuf` on the command line. The post does not show a combined DMA-BUF command, so no displayed command required a change.
- Current NVIDIA documentation does not explicitly support CUDA Unified/managed memory with GPUDirect RDMA and warns of stale-data or data-loss risks. The validated comparison therefore records host or CUDA device allocation rather than presenting managed memory as an equivalent supported path.
- NVIDIA's current CUDA guide deprecates the legacy NV-P2P APIs starting with CUDA 13.0 and states that they will be removed in CUDA 14.0. NVIDIA recommends DMA-BUF over the legacy `nvidia-peermem` path where the platform supports it.
