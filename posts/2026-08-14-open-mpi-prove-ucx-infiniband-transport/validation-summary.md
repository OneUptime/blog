# Validation Summary: Prove Open MPI Uses InfiniBand Through UCX

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Open MPI 5
- OpenUCX / UCX UCP and UCT
- InfiniBand and RoCE
- MPI point-to-point (PML), one-sided (OSC), and collective communication
- RDMA, mlx5, and generic verbs transports
- rdma-core tools (`ibv_devinfo`, `rdma link`, and `ibstat`)
- CUDA and ROCm memory transports

## Sources Consulted
- [Open MPI 5.0.x: InfiniBand and RoCE support through the UCX PML](https://docs.open-mpi.org/en/v5.0.x/tuning-apps/networking/ib-and-roce.html)
- [Open MPI: network support and removal of the `openib` BTL](https://docs.open-mpi.org/en/main/release-notes/networks.html)
- [Open MPI 5.0.10 `mpirun` manual](https://docs.open-mpi.org/en/v5.0.10/man-openmpi/man1/mpirun.1.html)
- [Open MPI `ompi_info` manual](https://docs.open-mpi.org/en/v5.0.x/man-openmpi/man1/ompi_info.1.html)
- [Open MPI MCA parameter guide](https://docs.open-mpi.org/en/main/mca.html)
- [Open MPI MCA framework descriptions](https://docs.open-mpi.org/en/v5.0.x/developers/frameworks.html)
- [OpenUCX FAQ: device and transport selection, GPU support, and protocol introspection](https://openucx.readthedocs.io/en/master/faq.html)
- [OpenUCX release notes](https://github.com/openucx/ucx/blob/master/NEWS)
- [OpenUCX v1.21 `ucx_info` version-reporting source](https://github.com/openucx/ucx/blob/v1.21.0/src/tools/info/version_info.c)
- [rdma-core `ibv_devinfo` source](https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/examples/devinfo.c)
- [`ibv_devinfo(1)` manual](https://man7.org/linux/man-pages/man1/ibv_devinfo.1.html)

## Issues Found
1. **The one-node claim was absolute.** The post said a one-node test never exercises the network. UCX normally uses shared memory for local peers, but it can use a network transport when local transports are unavailable or restricted. Changed the claim to the guaranteed conclusion: a one-node run does not prove an inter-node network path.
2. **Tool and UCX-library identity were overstated.** `ucx_info -v` reports the UCX runtime seen by the `ucx_info` process, not necessarily the library loaded by an MPI rank. Added path checks for `ompi_info` and `ucx_info`, added `ompi_info --path prefix`, required inventory checks on every participating compute host, scoped `ucx_info -d` to that UCX installation, and instructed readers to compare the reported library with the rank or UCX PML dependency.
3. **The launcher examples used deprecated generic options.** Current Open MPI documentation deprecates `--report-bindings` in favor of `--display bindings`, and the current `mpirun` reference marks the generic launcher `--mca` path as deprecated. Replaced the binding flag with `--display map,bindings` and used the documented `OMPI_MCA_pml=ucx` environment-variable form to force the Open MPI PML.
4. **UCX transport names did not distinguish InfiniBand from RoCE.** Names such as `rc_mlx5`, `dc_mlx5`, and `rc_verbs` prove an RDMA/verbs lane on the selected RDMA port, but the same device family can use an Ethernet link layer for RoCE. Changed the evidence chain and conclusion to require `ibv_devinfo` to report `link_layer: InfiniBand` for the exact selected port, in addition to UCX naming the RDMA transport and port.
5. **An active local port was described as proof that the fabric works.** `ibstat` showing an active port establishes only local port state, not end-to-end peer reachability or the MPI data path. Corrected the wording accordingly.

## Review Notes
- Open MPI 5.0.x support for InfiniBand/RoCE through `pml/ucx`, removal of the `openib` BTL, and the distinction among PML, OSC, and collective components are correct.
- `-x`, `-np`, and `--map-by ppr:1:node` remain accepted Open MPI options. A scheduler-native launcher can have a different environment propagation mechanism, as the post notes.
- `UCX_NET_DEVICES=mlx5_0:1`, automatic transport selection without a restrictive `UCX_TLS` list, the documented `ep_cfg` interpretations, and the CUDA/ROCm caveats match the OpenUCX FAQ.
- UCX protocol v2 became the default in UCX 1.16. The post correctly limits `UCX_PROTO_INFO=y` to protocol-v2 introspection and warns that enabling `UCX_PROTO_ENABLE=y` on older releases changes protocol selection.
- `./mpi_bandwidth_test` is an illustrative user-supplied benchmark executable, not an Open MPI or UCX utility; the launcher syntax was validated, but no benchmark source was provided to review.
- All external documentation links in the post resolved and pointed to the described official material.
