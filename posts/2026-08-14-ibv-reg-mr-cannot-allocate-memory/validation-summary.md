# Validation Summary: Diagnose Cannot Allocate Memory from ibv_reg_mr()

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- C and the libibverbs `ibv_reg_mr()`/`ibv_dereg_mr()` APIs
- Linux RDMA userspace verbs and rdma-core
- InfiniBand, RoCE, protection domains, memory regions, and HCA resources
- Linux `RLIMIT_MEMLOCK`, procfs pin accounting, and capabilities
- systemd, Slurm, OCI containers, Kubernetes, and RDMA cgroups
- On-demand paging, HugeTLB memory, and RDMA translation resources
- CUDA memory, DMA-BUF registration, and legacy peer-memory paths
- iproute2 `rdma`, `ibv_devinfo`, `ibv_devices`, and `dmesg`

## Sources Consulted

- Current rdma-core `ibv_reg_mr(3)` manual at review commit `a4b8d50`: https://github.com/linux-rdma/rdma-core/blob/a4b8d50e6357a4a581347111396fc8218cad838c/libibverbs/man/ibv_reg_mr.3
- Current rdma-core device-query manual and `ibv_devinfo` implementation: https://github.com/linux-rdma/rdma-core/blob/a4b8d50e6357a4a581347111396fc8218cad838c/libibverbs/man/ibv_query_device_ex.3 and https://github.com/linux-rdma/rdma-core/blob/a4b8d50e6357a4a581347111396fc8218cad838c/libibverbs/examples/devinfo.c
- Current Linux RDMA memory pinning and ODP implementations at review commit `2f1baf1`: https://github.com/torvalds/linux/blob/2f1baf1fc8929e6c48370be543ad028ac7ad4131/drivers/infiniband/core/umem.c and https://github.com/torvalds/linux/blob/2f1baf1fc8929e6c48370be543ad028ac7ad4131/drivers/infiniband/core/umem_odp.c
- Linux kernel userspace-verbs documentation: https://docs.kernel.org/infiniband/user_verbs.html
- Linux `getrlimit(2)`, `/proc/<pid>/limits`, and `/proc/<pid>/status` manuals: https://man7.org/linux/man-pages/man2/getrlimit.2.html, https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html, and https://man7.org/linux/man-pages/man5/proc_pid_status.5.html
- Linux capabilities manual: https://man7.org/linux/man-pages/man7/capabilities.7.html
- GNU Bash `ulimit` documentation: https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html
- systemd resource-limit documentation: https://man7.org/linux/man-pages/man5/systemd.exec.5.html
- Slurm memlock propagation documentation: https://slurm.schedmd.com/faq.html and https://slurm.schedmd.com/srun.html
- OCI process-rlimit specification: https://github.com/opencontainers/runtime-spec/blob/6999a89a76a0329f440d5740497bedb9dd431297/config.md#posix-process
- Linux RDMA cgroup documentation: https://docs.kernel.org/admin-guide/cgroup-v1/rdma.html
- iproute2 `rdma resource` manual: https://man7.org/linux/man-pages/man8/rdma-resource.8.html
- rdma-core `ibv_devinfo(1)` and `ibv_devices(1)` manuals: https://man7.org/linux/man-pages/man1/ibv_devinfo.1.html and https://man7.org/linux/man-pages/man1/ibv_devices.1.html
- util-linux `dmesg(1)` manual: https://man7.org/linux/man-pages/man1/dmesg.1.html
- Linux HugeTLB and transparent-huge-page documentation: https://docs.kernel.org/admin-guide/mm/hugetlbpage.html and https://docs.kernel.org/admin-guide/mm/transhuge.html
- NVIDIA NCCL networking troubleshooting: https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting/networking_troubleshooting.html
- NVIDIA GPUDirect RDMA documentation: https://docs.nvidia.com/cuda/gpudirect-rdma/ and https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-rdma.html
- NVIDIA RDMA Aware Networks Programming User Manual 1.7: https://docs.nvidia.com/rdma-aware-networks-programming-user-manual-1-7.pdf

## Issues Found

- The process-limit probes used `/proc/$$`, and the container checklist used `/proc/self`; those paths identify the diagnostic shell or `cat`, not necessarily the failing application. The commands now assign the application's PID to `failing_pid` and inspect its quoted procfs paths, so application-lowered limits and cgroup placement are visible.
- The production-sizing sentence conflated the per-process `RLIMIT_MEMLOCK` value with ranks-per-node capacity. It now sizes each process from that process's worst-case pinned set, including page rounding and duplicate registrations, and treats the ranks-per-node multiplication as a separate host-capacity check.
- The count-threshold test said to deregister every MR but then interpreted repeated registrations as live-MR exhaustion. The procedure and result matrix now explicitly test many concurrently live small MRs; the matrix also includes aggregate lock/pin-budget exhaustion.
- The post presented an invalid or wrong protection domain as a normal `ibv_reg_mr()` failure direction. A valid supplied PD is simply the PD in which registration occurs, while a later MR/QP PD mismatch is a data-path error and a stale PD is invalid API use. The misleading references were removed, and the matrix now refers to invalid arguments or provider/device failure.
- The ODP explanation conflated ordinary page residency with RDMA pinning and HCA translation population. It now says that ODP avoids eager pinning and obtains translations on demand, and it states the exact whole-address-space implicit-ODP and explicit-ODP-only `IBV_ACCESS_HUGETLB` semantics.
- The generic huge-page wording said that huge pages require system reservation, which is not true for transparent huge pages and was too absolute for surplus HugeTLB pages. It now specifically discusses explicit HugeTLB allocation and available or configured huge-page capacity.
- Touching anonymous pages does not necessarily produce a recoverable allocation error under Linux overcommit; it can expose pressure through OOM handling. The procedure now says that touching pages exposes backing-memory pressure before registration.

## Review Notes

- The C example uses current, non-deprecated libibverbs APIs and preserves `errno` before diagnostic calls. Its access flags satisfy the rule that remote write or atomic access requires local write access.
- All referenced URLs resolved to the described resources. All displayed command names and options are current and syntactically valid.
- `VmPin` counts RDMA-pinned pages, but repeated pins of the same pages are counted repeatedly, so it can exceed the amount of unique physical memory pinned.
- `dmesg --ctime` is valid, but access may be denied by `dmesg_restrict` or an unprivileged container, and converted timestamps can be inaccurate across suspend/resume. Host logs may be required.
- The NVIDIA RDMA Aware manual 1.7 is dated and contains historical experimental APIs elsewhere, but the basic MR material cited by this post remains correct. Current API conclusions were checked primarily against upstream rdma-core.
- Provider- and HCA-specific real-time capacity remains hardware, firmware, virtualization, and workload dependent; advertised maxima are capability ceilings rather than availability counters.
