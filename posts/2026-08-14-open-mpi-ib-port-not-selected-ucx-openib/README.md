# Open MPI IB Port Warnings After UCX Replaced openib

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Open MPI, UCX, OpenIB BTL, InfiniBand, RoCE, MPI

Description: Interpret Open MPI InfiniBand port-selection warnings by version, migrate legacy openib BTL options to UCX, and verify the transport actually selected at runtime.

---

An Open MPI warning about an InfiniBand port being ignored or not selected is often diagnosed with obsolete `btl_openib_*` parameters. That can be exactly wrong on a modern installation: Open MPI deprecated the `openib` BTL in the 4.0 series, and Open MPI 5 removed it. When built with UCX, Open MPI 5 supports InfiniBand and RoCE point-to-point traffic through the UCX PML and selects it by default when a supported device is detected.

The first troubleshooting question is therefore not “which `openib` include list should I set?” It is “which Open MPI release and communication component produced this message?”

## Identify the Stack Before Changing Options

Run the commands from the job environment, including inside its container if applicable:

~~~console
$ command -v mpirun
$ mpirun --version
$ ompi_info --param pml all
$ ompi_info --param btl all
$ ompi_info --param pml ucx --level 9
$ ucx_info -v
$ ucx_info -d
~~~

Interpret the inventory by major version:

- Open MPI 5.x should expose `pml: ucx` when built with UCX. It does not include `btl: openib`.
- Open MPI 4.x may still contain `openib`, but Open MPI documents it as deprecated and superseded by UCX.
- An older vendor build may carry backports or packaging changes. Trust `ompi_info` from the executable in use, not a configuration guide for another image.

Also inspect the job script for inherited MCA settings:

~~~console
$ env | grep '^OMPI_MCA_'
$ ompi_info --all | grep -E 'mca_base_param_files|pml|btl'
~~~

Open MPI can read system-wide and user MCA parameter files. A stale `btl=openib,self,vader` or `btl_openib_if_include=...` setting may survive a software upgrade and produce a warning, an unknown-parameter message, or a failure to load the intended component.

## Understand Why the Old Fix No Longer Maps

The historical path was roughly:

~~~text
MPI point-to-point -> ob1 PML -> openib BTL -> libibverbs
~~~

The Open MPI 5 InfiniBand/RoCE path, when UCX is available and selected, is:

~~~text
MPI point-to-point -> ucx PML -> UCX/UCP -> selected UCT transport
~~~

This changes both the configuration namespace and the selection model. Options such as `btl_openib_if_include` configure a component that no longer exists in Open MPI 5. The closest UCX device selector is `UCX_NET_DEVICES`, but it is not a mechanical rename: UCX can combine network, shared-memory, and accelerator transports and choose protocols based on topology and message size.

Do not add `--mca pml ob1 --mca btl openib,...` to recreate the old path on Open MPI 5. There is no `openib` component to select. On Open MPI 4, doing so opts back into a deprecated implementation and can hide the real UCX packaging or device problem.

## Classify the Warning

Preserve the exact message, hostname, rank, and component prefix. Then place it into one of these categories:

### A legacy openib warning

If the text names the `openib` component, the process loaded or attempted to load the legacy BTL. An unknown-parameter message that merely names a `btl_openib_*` setting instead indicates stale configuration and is not evidence that the BTL loaded. On Open MPI 4, remove forced `ob1/openib` settings and, if `pml: ucx` is present, test UCX with `--mca pml ucx --mca btl '^openib'`; selecting UCX alone does not prevent 4.x from initializing `openib` in other internal contexts. On Open MPI 5, a message emitted by the `openib` component strongly suggests mixed binaries, old logs, or a vendor-modified installation because upstream 5.x removed the component.

### A UCX device-selection error

If the text names UCX or says a `UCX_NET_DEVICES` value is unavailable, inspect `ucx_info -d` in the same namespace. UCX expects an RDMA device and port such as `mlx5_0:1`, not an IPoIB name such as `ib0`, unless selecting a TCP netdev.

### A normal component exclusion

Open MPI probes components and rejects those that do not apply. A verbose “not selected” line is not necessarily a job failure. The decisive evidence is which PML and UCX transport were selected for an inter-node endpoint.

### A real port-health problem

UCX cannot use a port merely because the component is installed. Verify it independently:

~~~console
$ rdma link show
$ ibv_devinfo -d mlx5_0 -i 1
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
~~~

For native InfiniBand, the logical port should be active and have valid fabric addressing. For RoCE, verify the associated Ethernet netdev, IP/VLAN configuration, GID table, and routing.

## Move the Diagnostic to UCX

From a two-node allocation, use an explicit UCX PML selection for a short two-host test:

~~~console
$ UCX_NET_DEVICES=mlx5_0:1 UCX_LOG_LEVEL=info \
    mpirun --mca pml ucx \
    --map-by ppr:1:node --display bindings \
    -n 2 ./mpi_pingpong
~~~

This test should fail clearly if the UCX PML or selected device cannot be used. With UCX logging enabled, a successful run should also print endpoint-configuration output naming a transport such as `rc_mlx5/mlx5_0:1`; a UCX build configured with `--disable-logging` can succeed without those messages. Because `UCX_NET_DEVICES` is a strict allow-list, the forced test should use the selected RDMA device or fail rather than fall back to TCP. When testing default selection without that setting, an inter-node endpoint whose only network transport is `tcp/<interface>` is using TCP.

In normal operation, consider removing `UCX_NET_DEVICES` after diagnosis. UCX's default is to evaluate available devices using characteristics such as bandwidth, PCIe bandwidth, and NUMA locality. Hard-coding `mlx5_0:1` can be wrong on another node or prevent multi-rail selection.

Avoid setting `UCX_TLS=rc` casually. UCX transport aliases can imply auxiliary transports, and GPU-aware jobs must include the appropriate memory transports when an allow-list is set. The UCX FAQ explicitly warns that non-default tuning can produce undefined or unsupported combinations.

## Check for Mixed Installations

Warnings that contradict `mpirun --version` often come from library skew. Record these on compute nodes; run the final command from an allocation containing at least two nodes:

~~~console
$ which mpirun ompi_info ucx_info
$ ldd "$(command -v mpirun)" | grep -E 'open-pal|open-rte|prrte|pmix'
$ ldd ./mpi_pingpong | grep -E 'libmpi|open-pal|ucp|ucs'
$ mpirun --map-by ppr:1:node -n 2 sh -c 'hostname; command -v ompi_info; ompi_info --version'
~~~

Launcher and rank environments can differ under SSH, Slurm, modules, and containers. Do not combine an Open MPI launcher from one prefix with application libraries from another. If the application is dynamically linked, inspect it with `ldd` as well; that identifies its `libmpi` and any directly linked UCX libraries. A dynamically loaded UCX component may not appear there, so runtime transport evidence is still required.

## Decide What Success Means

A clean modern result has all of these properties:

1. `ompi_info` lists the UCX PML from the same Open MPI prefix.
2. `ucx_info -d` lists the intended HCA port and RDMA transport.
3. a forced `--mca pml ucx` two-host test succeeds;
4. when UCX logging is available, its endpoint output names the intended RDMA device rather than a TCP-only inter-node endpoint;
5. old `btl_openib_*` settings have been removed from job, user, and system configuration.

Only after that should you optimize device choice, rails, affinity, or protocol thresholds. Port-selection warnings are configuration evidence, not a request to revive a removed component.

## Official Documentation

- [Open MPI 5: InfiniBand and RoCE support](https://docs.open-mpi.org/en/v5.0.x/tuning-apps/networking/ib-and-roce.html)
- [Open MPI network release notes: openib deprecation and removal](https://docs.open-mpi.org/en/main/release-notes/networks.html)
- [Open MPI: networking support depends on build-time libraries](https://docs.open-mpi.org/en/main/tuning-apps/networking/index.html)
- [OpenUCX FAQ: selecting network devices and inspecting transports](https://openucx.readthedocs.io/en/master/faq.html)
- [OpenUCX project: supported transports and rdma-core requirements](https://github.com/openucx/ucx)

## Conclusion

Treat an “IB port not selected” warning as versioned component information. On Open MPI 5, configure and inspect the UCX PML; the removed `openib` BTL and its MCA parameters are not a valid repair path. Eliminate mixed installations and stale MCA files, prove that UCX sees the port, and, when UCX logging is available, capture a two-host endpoint configuration showing the actual RDMA transport.
