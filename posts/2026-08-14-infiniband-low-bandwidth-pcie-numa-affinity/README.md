# Debug Low InfiniBand Bandwidth Beyond ibdiagnet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: InfiniBand, InfiniBand Diagnostics, PCIe, NUMA, CPU Affinity, Performance

Description: Diagnose clean-fabric InfiniBand bandwidth loss by measuring PCIe negotiation, NUMA locality, CPU binding, memory placement, and benchmark methodology.

---

A clean `ibdiagnet` report rules out many fabric topology, routing, and port-health faults. It does not test the complete host data path from application memory through CPU, NUMA interconnect, PCIe root complex, and HCA DMA engine.

If link counters and fabric diagnostics are healthy but bandwidth is low, keep the clean report as evidence and move one layer closer to the hosts. The most productive order is benchmark control, physical link rate, PCIe negotiation, NUMA placement, then CPU scheduling.

## Freeze the Benchmark Before Tuning

Record enough detail to reproduce one result:

~~~console
$ ib_write_bw --version
$ ib_write_bw --help
$ uname -r
$ ibv_devinfo -d mlx5_0 -i 1
$ lscpu
~~~

Use the same perftest version and symmetric options at both ends. The official perftest README warns that some versions are incompatible. Specify the HCA and port instead of accepting the first device found:

~~~console
# Server
$ ib_write_bw -d mlx5_0 -i 1 -s 8388608 -D 20 --report_gbits

# Client
$ ib_write_bw -d mlx5_0 -i 1 -s 8388608 -D 20 --report_gbits server-rdma-name
~~~

These are baseline example options, not universal optimum settings. Confirm them against `ib_write_bw --help` for the installed release. Keep direction, message size, duration, queue-pair count, MTU, connection type, bidirectional mode, memory type, and GID/SL options constant.

Run large messages to approach bulk bandwidth, but also collect a size sweep. Small-message rates can be CPU limited while large-message bandwidth exposes PCIe or memory-placement limits. A bidirectional result is not directly comparable to a unidirectional line rate.

## Verify the Fabric Link Rate First

Confirm that the HCA port negotiated the expected link speed and width:

~~~console
$ ibstat mlx5_0
$ ibv_devinfo -d mlx5_0 -i 1
$ cat /sys/class/infiniband/mlx5_0/ports/1/rate
$ cat /sys/class/infiniband/mlx5_0/ports/1/state
$ cat /sys/class/infiniband/mlx5_0/ports/1/phys_state
~~~

Take port counter deltas around the test. A clean diagnostic from earlier in the day does not exclude errors or congestion during the benchmark. Check both HCAs and the exact switch ports in the path.

Compare payload throughput with the negotiated rate carefully. Encoding, link, transport, packet headers, acknowledgements, PCIe transactions, and the benchmark's unit convention prevent application payload from equalling the raw signaling number. Perftest documents that `--report_gbits` uses decimal Gbit/s, while its default bandwidth unit is MiB/s.

## Map the HCA to Its Exact PCI Function

Find the PCI BDF behind the RDMA device:

~~~console
$ readlink -f /sys/class/infiniband/mlx5_0/device
$ lspci -nnk -s 0000:5e:00.0
$ sudo lspci -vv -s 0000:5e:00.0
~~~

In the verbose PCI output, compare `LnkCap` with `LnkSta`. The capability is what the endpoint can support; status is the currently negotiated generation and width. A high-speed HCA operating at a narrower width or lower generation can cap DMA throughput while InfiniBand remains active and `ibdiagnet` stays clean.

Trace the upstream path as well:

~~~console
$ lspci -tv
$ cat /sys/bus/pci/devices/0000:5e:00.0/current_link_speed
$ cat /sys/bus/pci/devices/0000:5e:00.0/current_link_width
$ cat /sys/bus/pci/devices/0000:5e:00.0/max_link_speed
$ cat /sys/bus/pci/devices/0000:5e:00.0/max_link_width
~~~

The sysfs files are kernel-version dependent, so retain `lspci -vv` as a portable cross-check. If negotiation is low, inspect slot wiring, risers, bifurcation, firmware settings, retimers, and upstream bridge status. Do not force PCIe parameters on a production host before checking the server and adapter support matrices.

Review PCIe error evidence without clearing it:

~~~console
$ dmesg --ctime | grep -iE 'pcie|aer|mlx5'
$ sudo lspci -vv -s 0000:5e:00.0 | grep -A8 -E 'Express|AER'
~~~

Repeated correctable errors can indicate a marginal host PCIe path even when the network fabric is healthy.

## Align CPU and Memory With the HCA

Read the HCA's NUMA node and local CPU mask:

~~~console
$ cat /sys/class/infiniband/mlx5_0/device/numa_node
$ cat /sys/class/infiniband/mlx5_0/device/local_cpulist
$ numactl --hardware
$ lscpu -e=CPU,NODE,SOCKET,CORE,ONLINE
~~~

A `numa_node` value of `-1` means the kernel has no NUMA association for that device; it does not mean node 0. On a normal multi-socket server, bind the benchmark's polling thread and allocate its host buffer on the HCA-local node:

~~~console
$ numactl --cpunodebind=1 --membind=1 \
    ib_write_bw -d mlx5_0 -i 1 -s 8388608 -D 20 --report_gbits
~~~

Run the same policy at each endpoint using each endpoint's local node number. Do not copy node 1 blindly across servers. Recent perftest builds may also expose `--pin_cores` and `--numa_node`; use the options printed by the installed binary rather than mixing both mechanisms without understanding their precedence.

Memory policy matters because DMA can target pages on a remote NUMA node even if the process later migrates to a local CPU. Start a fresh process after changing binding so its buffers are allocated under the intended policy. Use `numastat -p <pid>` during a long run to verify placement.

## Make CPU Placement Reproducible

Polling benchmarks are sensitive to scheduler migration, sibling contention, power state, and oversubscription. Capture the actual affinity:

~~~console
$ taskset -pc <pid>
$ grep Cpus_allowed_list /proc/<pid>/status
$ ps -o pid,psr,comm -p <pid>
~~~

Choose an online physical core local to the HCA and avoid placing unrelated CPU-heavy work or both endpoints of a loopback test on the same core. Compare runs with and without simultaneous-multithreading sibling contention. Do not disable power management globally as a first response; observe CPU frequency and the platform's supported performance policy, then make a controlled, reversible comparison.

Open MPI jobs require rank and memory binding as well as HCA selection. `--report-bindings` confirms rank placement, while UCX info logging confirms the chosen device. A local CPU paired with a remote HCA can result from automatic multi-rail selection or an incorrect `UCX_NET_DEVICES` rule.

## Use a Controlled Comparison Matrix

Change one variable at a time:

| Run | CPU | Memory | HCA | Purpose |
| --- | --- | --- | --- | --- |
| A | unbound | default | explicit | reproduce current result |
| B | HCA-local | local | explicit | test NUMA locality |
| C | remote node | remote | explicit | negative locality control |
| D | local | local | alternate rail | compare PCIe and fabric paths |

If B improves over A and C degrades predictably, locality is a strong cause. If every placement hits the same ceiling, compare that ceiling with negotiated PCIe bandwidth, link rate, and one-direction versus bidirectional semantics. If only one host or rail is slow, swap endpoints and directions to identify the limiting side.

Also watch system-wide contention: other HCAs, NVMe devices, GPUs, memory bandwidth consumers, and VFs can share the same root complex or socket. A topology map explains why two individually healthy devices interfere when tested together.

## Know What ibdiagnet Did Prove

Keep fabric diagnosis in scope when counters change, but do not ask it to prove host properties it cannot see. `ibdiagnet` can validate fabric topology, links, routing, and selected error conditions. It does not establish:

- negotiated PCIe width and speed behind each host;
- memory-page NUMA placement;
- benchmark CPU affinity or frequency;
- host memory bandwidth contention;
- GPU-to-HCA topology;
- whether the benchmark selected the intended HCA, direction, and memory type.

Success is a reproducible result with documented link, PCIe, CPU, and memory placement, not just a higher number after several unrelated tunings.

## Official Documentation

- [linux-rdma perftest: options, units, and test methodology](https://github.com/linux-rdma/perftest)
- [Linux kernel: PCI sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-pci)
- [pciutils: lspci source and documentation](https://github.com/pciutils/pciutils)
- [Open MPI: processor and memory affinity](https://docs.open-mpi.org/en/main/tuning-apps/affinity.html)
- [OpenUCX FAQ: NUMA-aware device and multi-rail selection](https://openucx.readthedocs.io/en/master/faq.html)
- [NVIDIA: comprehensive InfiniBand diagnostics with ibdiagnet](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting/networking_troubleshooting.html)

## Conclusion

A clean fabric can still feed a slow host path. Freeze the benchmark, verify the real link rate, compare PCIe capability with negotiated status, and bind both CPU and newly allocated memory to the HCA-local NUMA node. Controlled locality and direction tests will show whether the ceiling lives in PCIe, NUMA placement, CPU scheduling, or the benchmark itself.
