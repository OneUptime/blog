# Validation Summary: How to Set Up Multi-GPU Configuration on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NVIDIA CUDA toolkit and drivers
- `nvidia-smi` (topology, NVLink, dmon, query-gpu)
- NVLink / NVSwitch interconnects
- PyTorch (`DataParallel`, `DistributedDataParallel`, `torchrun`)
- TensorFlow (`MirroredStrategy`, `tf.config.list_physical_devices`)
- NCCL (env vars: `NCCL_DEBUG`, `NCCL_P2P_LEVEL`)
- NUMA tooling (`numactl`, `/sys/bus/pci/devices/.../numa_node`)
- `nvtop`, `lspci`, PCIe rescan via sysfs

## Sources Consulted
- NVIDIA System Management Interface (nvidia-smi) manual / `--help` output (topo legend, `nvlink`, `dmon`, `--query-gpu`, `--lock-gpu-clocks`, `--auto-boost-default`)
- NVIDIA NVLink/NVSwitch product documentation (https://www.nvidia.com/en-us/data-center/nvlink/)
- PyTorch distributed docs: https://pytorch.org/docs/stable/distributed.html and https://pytorch.org/docs/stable/notes/cuda.html (peer access, DDP)
- PyTorch `torchrun` (Elastic Launcher) docs: https://pytorch.org/docs/stable/elastic/run.html
- TensorFlow distributed training: https://www.tensorflow.org/guide/distributed_training and https://www.tensorflow.org/api_docs/python/tf/config/set_visible_devices
- NCCL environment variables reference: https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/env.html
- CUDA Driver API (`cuCtxEnablePeerAccess`) and Runtime API (`cudaDeviceEnablePeerAccess`) docs

## Issues Found
1. **NVSwitch mis-categorized as multi-node.** The original text described NVSwitch as a multi-node interconnect ("across many GPU nodes"). NVSwitch is actually an intra-node NVLink switch fabric that fully connects GPUs within a single server (DGX A100/H100, HGX boards); multi-node clusters layer InfiniBand on top. Rewrote the section header and description to reflect intra-node use.
2. **Incorrect `nvidia-smi topo -m` legend entry.** The post listed `SOC: Connected on same SoC (embedded systems)`, which is not a value emitted by `nvidia-smi topo -m`. The actual levels are `SYS`, `NODE`, `PHB`, `PXB`, `PIX`, and `NV#`. Replaced the `SOC` entry with the correct `PIX`, `NODE`, and `SYS` definitions per nvidia-smi documentation.
3. **NVLink throughput unit was wrong.** Comment claimed `nvidia-smi nvlink -gt d` returns throughput "in MB/s". The command actually reports a cumulative counter in KiB; computing a rate requires sampling twice and dividing by elapsed time. Updated the inline comment to reflect this.
4. **Broken peer-access ctypes example.** The original Python snippet called `libcuda.cuCtxEnablePeerAccess(device_1_context, 0)` against an undefined `device_1_context` variable — running it would raise `NameError`, and the call wouldn't have worked even with a valid name (ctypes wrapping of the driver API requires explicit `argtypes` / `restype` and a valid `CUcontext` handle). Replaced the snippet with a short explanatory note pointing at `cudaDeviceEnablePeerAccess` (runtime) and `cuCtxEnablePeerAccess` (driver) for users who genuinely need explicit control, and clarified that PyTorch/NCCL handle this automatically.

## Review Notes
- `nn.DataParallel` is still functional but is considered legacy in modern PyTorch; the post already steers readers toward DDP, which is the correct recommendation.
- The `--auto-boost-default=0` command technically *disables* auto-boost (preparing for clock locking on the next line). The inline comment "Enable all GPUs at max performance" loosely describes the combined effect of the two commands together and was left as-is, since the lock-clocks loop that follows is what actually pins clocks to the max.
- `NCCL_P2P_LEVEL` accepts `LOC`, `NVL`, `PIX`, `PXB`, `PHB`, `SYS`. The post's examples (`NVL`, `PXB`) are valid.
- `nvidia-smi dmon -s putm` selects power/temperature, utilization, PCIe throughput, and memory groups — all valid.
- The TensorFlow `MirroredStrategy(devices=['/GPU:0', '/GPU:1'])` example is correct because after `tf.config.set_visible_devices`, the previously selected physical GPUs are renumbered starting at `/GPU:0`.
- NVLink support claim (RTX 3090, A100, A6000, H100) is accurate for the listed cards; note that newer RTX consumer cards (4090 and later) dropped the NVLink connector, so this guide is implicitly oriented toward Ampere-era consumer + Ampere/Hopper data-center hardware.
