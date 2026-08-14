# Validation Summary: Open MPI IB Port Warnings After UCX Replaced openib

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Open MPI 4.x and 5.x
- Open MPI Modular Component Architecture, PMLs, and BTLs
- UCX, UCP, and UCT transports
- InfiniBand and RoCE
- Linux RDMA, rdma-core, and libibverbs
- PRRTE, PMIx, and dynamic library diagnostics

## Sources Consulted
- Open MPI 5 InfiniBand and RoCE support: https://docs.open-mpi.org/en/v5.0.x/tuning-apps/networking/ib-and-roce.html
- Open MPI network release notes for `openib` deprecation and removal: https://docs.open-mpi.org/en/main/release-notes/networks.html
- Open MPI 4 OpenFabrics warning guidance, including explicit `openib` exclusion: https://www.open-mpi.org/faq/?category=openfabrics#ofa-device-error
- Open MPI networking build-time dependency guidance: https://docs.open-mpi.org/en/main/tuning-apps/networking/index.html
- Open MPI MCA parameter and configuration-file documentation: https://docs.open-mpi.org/en/main/mca.html
- Open MPI `ompi_info(1)` manual: https://docs.open-mpi.org/en/main/man-openmpi/man1/ompi_info.1.html
- Open MPI 5 `mpirun(1)` options, mapping, environment, and PRRTE architecture: https://docs.open-mpi.org/en/v5.0.x/man-openmpi/man1/mpirun.1.html
- Open MPI installation-location and mixed-installation guidance: https://docs.open-mpi.org/en/v5.0.x/installing-open-mpi/installation-location.html
- OpenUCX architecture, device selection, transport selection, multi-rail, and introspection FAQ: https://openucx.readthedocs.io/en/master/faq.html
- OpenUCX guidance for running Open MPI with UCX: https://openucx.readthedocs.io/en/master/running.html#openmpi-with-ucx
- OpenUCX `ucx_info` source and option definitions: https://github.com/openucx/ucx/blob/master/src/tools/info/ucx_info.c
- OpenUCX release configuration showing that logging can be compiled out: https://github.com/openucx/ucx/blob/master/contrib/configure-release
- rdma-core `ibv_devinfo(1)` manual: https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_devinfo.1
- iproute2 `rdma-link(8)` manual: https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-link.8
- Linux stable InfiniBand sysfs ABI: https://github.com/torvalds/linux/blob/master/Documentation/ABI/stable/sysfs-class-infiniband
- Linux `ldd(1)` manual: https://man7.org/linux/man-pages/man1/ldd.1.html

## Issues Found
- The introduction and modern-path diagram described UCX as unconditional in Open MPI 5. Open MPI only exposes and automatically selects the UCX PML when it was built with UCX support and a supported device is detected. Both statements now include that condition.
- The legacy-warning classification treated any occurrence of `openib` as proof that the legacy BTL loaded. It now distinguishes a component-originated warning from an unknown stale `btl_openib_*` parameter. The Open MPI 4 advice also now uses `--mca btl '^openib'`, because selecting `--mca pml ucx` alone does not prevent 4.x from initializing the deprecated BTL in other internal contexts.
- The Open MPI 5 test used deprecated `--report-bindings` and defined UCX variables through the deprecated `-x` environment-export interface. It now uses `--display bindings`, command-local environment assignments, and the preferred `-n` process-count spelling.
- The UCX diagnostic promised endpoint output for every run and treated any listed TCP lane as proof of a TCP data path. UCX can be compiled with logging disabled, endpoint configurations can contain multiple lanes, and the forced `UCX_NET_DEVICES` value is a strict allow-list. The post now accounts for logging-disabled builds, states that the forced RDMA test must use that device or fail, and identifies TCP only when it is the endpoint's sole inter-node network transport during default selection.
- The mixed-installation rank command did not guarantee that its two ranks ran on different hosts. It now maps one rank per node and explicitly requires a two-node allocation.
- The `ldd` filter for `mpirun` looked for MPI and UCX libraries even though the Open MPI 5 launcher is PRRTE-based and does not establish which libraries the application loads. The filter now checks launcher dependencies such as `open-pal`, PRRTE, and PMIx; a separate application `ldd` command checks `libmpi` and directly linked UCX libraries, with a warning that dynamically loaded components still require runtime transport evidence.

## Review Notes
- The remaining `ompi_info`, `ucx_info`, `rdma link`, `ibv_devinfo`, sysfs, shell, MCA, and mapping commands are current and syntactically valid for the versions discussed.
- The UCX device syntax, UCP/UCT layering, default device scoring, multi-rail behavior, `UCX_TLS` alias caveats, GPU-memory transport requirement, and `UCX_LOG_LEVEL=info` endpoint format all match upstream UCX documentation.
- The two-host examples assume an existing `./mpi_pingpong` executable and an allocation containing at least two nodes.
- Open MPI and UCX were not installed in the review environment, so their commands were validated against upstream manuals and source rather than executed on an RDMA cluster.
- All five external documentation links in the post and the author link returned HTTP 200 and pointed to the described resources during review.
