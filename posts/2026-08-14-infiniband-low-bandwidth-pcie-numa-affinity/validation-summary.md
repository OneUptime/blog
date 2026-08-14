# Validation Summary: Debug Low InfiniBand Bandwidth Beyond ibdiagnet

## Status

validated

## Post Type

Technical diagnostic guide

## Technologies Covered

- InfiniBand and NVIDIA `ibdiagnet`
- linux-rdma perftest and `ib_write_bw`
- RDMA core tools (`ibstat` and `ibv_devinfo`)
- Linux PCIe sysfs and pciutils (`lspci`)
- PCI Express link negotiation and Advanced Error Reporting (AER)
- Linux NUMA policy, CPU affinity, and memory placement
- Open MPI process binding
- OpenUCX device selection and multi-rail behavior

## Sources Consulted

- [linux-rdma perftest README at release 26.04.17](https://github.com/linux-rdma/perftest/blob/26.04.17/README) and [current option parsing/help source](https://github.com/linux-rdma/perftest/blob/master/src/perftest_parameters.c)
- [Linux kernel InfiniBand sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [Linux kernel PCI sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-pci) and [current PCI sysfs implementation](https://github.com/torvalds/linux/blob/master/drivers/pci/pci-sysfs.c)
- [pciutils PCI Express capability decoder](https://github.com/pciutils/pciutils/blob/master/ls-caps.c), [AER decoder](https://github.com/pciutils/pciutils/blob/master/ls-ecaps.c), and [`lspci(8)` manual](https://man7.org/linux/man-pages/man8/lspci.8.html)
- [`ibv_devinfo(1)` manual](https://man7.org/linux/man-pages/man1/ibv_devinfo.1.html) and [rdma-core source repository](https://github.com/linux-rdma/rdma-core)
- [`numactl(8)` manual](https://man7.org/linux/man-pages/man8/numactl.8.html), [`numastat(8)` manual](https://man7.org/linux/man-pages/man8/numastat.8.html), and [Linux NUMA memory-policy documentation](https://docs.kernel.org/admin-guide/mm/numa_memory_policy.html)
- [`taskset(1)` manual](https://man7.org/linux/man-pages/man1/taskset.1.html), [`ps(1)` manual](https://man7.org/linux/man-pages/man1/ps.1.html), and [`dmesg(1)` manual](https://man7.org/linux/man-pages/man1/dmesg.1.html)
- [Open MPI processor and memory affinity documentation](https://docs.open-mpi.org/en/main/tuning-apps/affinity.html) and [Open MPI 5.x `mpirun` documentation](https://docs.open-mpi.org/en/v5.0.x/man-openmpi/man1/mpirun.1.html)
- [OpenUCX FAQ: device selection, logging, and multi-rail behavior](https://openucx.readthedocs.io/en/master/faq.html)
- [NVIDIA IBUtils2 2.26: default `ibdiagnet` checks](https://networking-docs.nvidia.com/ibdiagnetutilityum/2.26.0/running-ibdiagnet-without-parameters), [PCI diagnostics](https://networking-docs.nvidia.com/ibdiagnetutilityum/2.26.0/pci-diagnostics), and [routing validation](https://networking-docs.nvidia.com/ibdiagnetutilityum/2.26.0/routing-validation)

## Issues Found

- The post overstated what an unspecified clean `ibdiagnet` run proves. A default run does not perform topology comparison or full routing validation; those checks require their corresponding options and inputs. The opening and scope discussion now distinguish enabled checks from a default or fabric-only run.
- The post categorically said `ibdiagnet` cannot establish PCIe width and speed. Recent NVIDIA IBUtils2 releases provide optional PCI diagnostics through `--get_p_info` and a PCIe connectivity health report. The post now documents that exception and uses the dedicated current IBUtils2 manual instead of the broader NCCL troubleshooting page.
- The opening described the host data path as passing through the CPU, which could imply that RDMA payload data traverses a CPU core. It now distinguishes CPU scheduling from the host-side DMA data path.
- The NUMA guidance did not account for perftest 26.04.17 and current upstream behavior. With libnuma, these builds automatically bind the benchmark thread and memory to the selected HCA's NUMA node by default. The post now documents automatic binding, `--disable_numa`, the CPU-only behavior of `--pin_cores`, the CPU-and-memory behavior of `--numa_node`, and the mutual exclusion of the two explicit options. The comparison matrix now records the actual current policy instead of assuming the baseline is unbound.
- The AER filter matched `AERCap` too late in pciutils output and could omit the preceding `UESta` and `CESta` status fields. It now matches the full `Advanced Error Reporting` heading with sufficient context. `sudo` was also added to `dmesg` for systems with restricted kernel-log access.
- When PCI sysfs reports `numa_node` as `-1`, `local_cpulist` may contain every online CPU rather than an HCA-local set. The post now warns that this list does not prove locality when the node is unknown.
- `numastat -p` reports process-wide per-node resident-page placement, not the placement of the RDMA benchmark buffer alone. The description was narrowed accordingly.
- Open MPI 5.x deprecates `--report-bindings` in favor of `--display bindings`. The post now uses the current option, retains an Open MPI 4.x compatibility note, and makes `UCX_LOG_LEVEL=info` explicit for reporting selected UCX transports and devices.
- The instruction to change one variable at a time conflicted with rows that intentionally changed CPU and memory locality together. It now describes changing one placement policy or path at a time.

## Review Notes

- The `ib_write_bw` server/client syntax and the `-d`, `-i`, `-s`, `-D`, and `--report_gbits` options were verified. The same-options requirement, version-compatibility warning, decimal Gbit/s reporting, default MiB/s reporting, and aggregate bidirectional semantics are correct.
- The InfiniBand port `rate`, `state`, and `phys_state` paths are stable kernel ABI. The PCIe current/max speed and width attributes are implemented in current kernels but remain kernel-version-dependent as the post states.
- The `LnkCap` versus `LnkSta` explanation and the `lspci`, `numactl`, `lscpu`, `taskset`, and `ps` command syntax are correct.
- The affinity commands shown inspect the supplied PID. For a multithreaded benchmark, a future expansion could also inspect every worker TID with `taskset -apc <pid>` or `/proc/<pid>/task/<tid>/status`.
- All external links in the revised post returned HTTP 200 during validation.
