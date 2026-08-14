# Debug GPUDirect RDMA Across ACS, IOMMU, and PCIe Topology

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GPUDirect RDMA, PCIe ACS, IOMMU, GPU, ConnectX, CUDA

Description: Determine whether GPUDirect RDMA fails in software registration or because ACS, IOMMU translation, and GPU to HCA PCIe placement block peer access.

---

GPUDirect RDMA lets an HCA access GPU memory through PCIe without staging the payload through ordinary host memory. A healthy GPU, healthy HCA, and active InfiniBand port are not enough. The GPU and HCA must have a supported peer path, the IOMMU must preserve the address model required by GPUDirect RDMA, PCIe ACS must not redirect peer transactions incompatibly, and the kernel/userspace stack must register the GPU memory correctly.

Treat firmware topology changes as the last step, not the first. Start with a host-memory control and map the exact devices that the failing process selected.

## Prove the Failure Is GPU-Memory Specific

Use the same HCA, port, message size, direction, and CPU placement for two tests:

~~~console
# Host-memory baseline
$ ib_write_bw -d mlx5_0 -i 1 -s 8388608 -D 20 --report_gbits peer

# CUDA device-memory test, if supported by this perftest build
$ ib_write_bw -d mlx5_0 -i 1 --use_cuda=0 \
    -s 8388608 -D 20 --report_gbits peer
~~~

Use matching options on the server. If host memory also fails, repair the basic RDMA path first. If host memory reaches the expected range but GPU registration fails or GPU bandwidth collapses, focus on GPUDirect software and PCIe peer access.

Capture the exact error. These stages imply different investigations:

| Failure stage | First checks |
| --- | --- |
| CUDA allocation fails | GPU visibility, driver, memory capacity, container allocation |
| GPU MR registration fails | DMA-BUF or peer-memory support, memlock, IOMMU, provider compatibility |
| registration succeeds but bandwidth is low | GPU-HCA topology, ACS routing, PCIe width, NUMA, direction |
| data corruption or synchronization failure | application memory-ordering and CUDA synchronization semantics |

Do not infer direct access solely because the program accepts a GPU pointer. Preserve perftest/UCX logs that identify the GPU memory type and registration mechanism.

## Map the Exact GPU and HCA to PCIe

Obtain stable PCI BDFs:

~~~console
$ nvidia-smi --query-gpu=index,pci.bus_id,name --format=csv
$ readlink -f /sys/class/infiniband/mlx5_0/device
$ lspci -tv
$ nvidia-smi topo -m
~~~

Recent NVIDIA tools may also provide `nvidia-smi topo -mp` for a more detailed GPU and NIC map. Use the option supported by the installed driver.

CUDA's GPUDirect RDMA documentation says the devices generally need to share the same upstream PCIe root complex. It classifies paths containing only PCIe switches as optimal, a single CPU/root complex as working with possible performance limits, and paths crossing the inter-socket connection as potentially severely limited or unreliable.

Therefore, “same NUMA node” is useful but not a complete topology proof. Two devices can report the same NUMA node and still sit under different root ports. Trace their common upstream bridges in `lspci -t` and validate the server vendor's supported slot population.

Record negotiated PCIe status for both endpoints:

~~~console
$ sudo lspci -vv -s 0000:5e:00.0 | grep -E 'LnkCap|LnkSta'
$ sudo lspci -vv -s 0000:b1:00.0 | grep -E 'LnkCap|LnkSta'
~~~

Replace the BDFs with the actual HCA and GPU. A down-trained link can limit GPU traffic independently of GPUDirect enablement.

## Inspect IOMMU Mode Before Changing It

Collect the boot and runtime evidence:

~~~console
$ cat /proc/cmdline
$ dmesg --ctime | grep -iE 'iommu|dmar|amd-vi'
$ find /sys/kernel/iommu_groups -maxdepth 2 -type l 2>/dev/null | sort
~~~

Current CUDA documentation states that GPUDirect RDMA relies on physical addresses being the same from each PCI device's point of view. IOMMU translation other than 1:1 is incompatible; the IOMMU must be disabled or configured for pass-through translation for the documented path.

Do not translate that statement into an unreviewed fleet-wide bootloader edit. IOMMUs provide isolation for virtualization, device assignment, and security. On a managed system, follow the GPU, HCA, hypervisor, and server vendor support matrix. Confirm whether the intended mode is global pass-through, per-device identity mapping, or a platform-specific supported configuration, then schedule a reboot and rollback plan.

In a VM or container, the host controls much of this state. A privileged container cannot change the physical PCIe topology or host IOMMU mapping.

## Determine Whether ACS Redirects Peer Traffic

PCIe Access Control Services can validate or redirect peer-to-peer transactions upstream. Inspect ACS capability and control bits on the GPU, HCA, and every bridge between them:

~~~console
$ sudo lspci -vv -s 0000:5e:00.0 | grep -A6 -i 'Access Control Services'
$ sudo lspci -vv -s 0000:ae:00.0 | grep -A6 -i 'Access Control Services'
~~~

The relevant bridge path comes from `lspci -t`; checking only the endpoints can miss redirect settings on an upstream switch or root port. Preserve the full `ACSCap` and `ACSCtl` output for vendor review.

Do not use `setpci` to clear ACS bits from an online production system based on a copied offset. Register layout and ownership differ, settings may be reset by firmware, and disabling ACS can weaken device isolation or invalidate virtualization assumptions. Prefer the server BIOS setting, NVIDIA platform tooling, or vendor-supported procedure for the exact platform.

On supported NVIDIA Grace Blackwell and ConnectX systems, NVIDIA documents the `rdma_topo` tool for checking and configuring ACS-related DirectNIC topology. That procedure is platform-specific, not a generic x86 command.

## Validate the GPU Registration Mechanism

NVIDIA GPU Operator documents two kernel-mode approaches:

- Linux DMA-BUF, which NVIDIA recommends when the supported kernel, GPU driver, and network driver combination is available;
- the legacy `nvidia-peermem` module.

Identify which path the workload requested:

~~~console
$ lsmod | grep -E 'nvidia_peermem|nv_peer_mem'
$ modinfo nvidia-peermem 2>/dev/null
$ ib_write_bw --help | grep -E 'use_cuda|dmabuf'
$ ucx_info -d | grep -i cuda
~~~

For perftest, `--use_cuda_dmabuf` is explicit and must be paired with a CUDA buffer according to the installed version's help and the official README. Without it, a build may use another supported peer-memory path. Record the mechanism rather than describing every CUDA run as DMA-BUF.

Check the exact compatibility matrix for:

- GPU model, GPU driver, and open or proprietary kernel module;
- CUDA version;
- kernel and DMA-BUF support;
- rdma-core or MLNX_OFED version;
- HCA model, firmware, and provider;
- UCX or perftest build options.

Only one legacy peer-memory module should own that integration. CUDA documentation warns about conflicts between the older `nv_peer_mem` package and `nvidia-peermem`.

## Compare Near and Far GPU-HCA Pairs

On a multi-GPU server, topology gives a safe diagnostic experiment. Run the same GPU-memory test against:

1. a GPU and HCA under the closest supported PCIe switch/root path;
2. a pair under the same socket but a less direct path;
3. only if supported, a cross-socket pair as a negative control.

Select GPUs by PCI identity when possible. Numeric CUDA indices can reorder after hardware or driver changes. Keep HCA, port, CPU affinity, and benchmark options explicit.

If only the near pair works, the software stack is broadly functional and topology is the leading cause. If no pair can register memory, investigate DMA-BUF/peer-memory and IOMMU mode before performance tuning. If every pair registers but one is slow, inspect ACS routing, PCIe negotiation, and CPU/root-complex contention.

## Check Containers and Kubernetes Separately

A GPUDirect pod needs both GPU and RDMA allocation plus compatible host drivers. Inside the pod, verify:

~~~console
$ nvidia-smi -L
$ rdma link show
$ ucx_info -d
$ grep -i 'Max locked memory' /proc/self/limits
~~~

The NVIDIA GPU Operator documentation distinguishes DMA-BUF and `nvidia-peermem` deployment prerequisites and shows integration with Network Operator resources. Pod device nodes cannot repair an unsupported physical slot layout, ACS policy, or translated host IOMMU mapping.

## Change Platform State Only With a Rollback

Before a BIOS, ACS, or IOMMU change, save:

- complete PCI topology and `lspci -vv` output;
- GPU/HCA BDFs and firmware versions;
- IOMMU groups and boot parameters;
- host-memory and GPU-memory baseline results;
- virtualization and device-assignment dependencies;
- vendor-approved target setting and rollback procedure.

After reboot, verify the setting actually changed, repeat the same A/B benchmark, and rerun device-isolation and VM/VF tests. A faster benchmark is not sufficient if the platform's isolation requirements were broken.

## Official Documentation

- [NVIDIA CUDA: GPUDirect RDMA overview and supported PCIe paths](https://docs.nvidia.com/cuda/gpudirect-rdma/index.html)
- [NVIDIA GPU Operator: DMA-BUF and nvidia-peermem prerequisites](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-rdma.html)
- [linux-rdma perftest: CUDA and DMA-BUF test options](https://github.com/linux-rdma/perftest)
- [NVIDIA: GPUDirect RDMA testing and rdma_topo on supported systems](https://docs.nvidia.com/multi-node-nvlink-systems/grace-blackwell-cx8-gpudirect-rdma-guide/gpudirect_rdma_testing.html)
- [Linux kernel: VFIO, IOMMU groups, and device isolation](https://docs.kernel.org/driver-api/vfio.html)
- [pciutils: lspci utilities](https://github.com/pciutils/pciutils)

## Conclusion

Separate GPU-memory registration from peer-path performance. Prove host RDMA first, map the selected GPU and HCA to exact BDFs, then inspect their root complex, negotiated links, IOMMU translation, and ACS controls. Use DMA-BUF or `nvidia-peermem` only in a supported software combination, and never trade away platform isolation with an unreviewed ACS or IOMMU change.
