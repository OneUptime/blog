# Prove Open MPI Uses InfiniBand Through UCX

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Open MPI, UCX, InfiniBand, MPI, RDMA, Troubleshooting

Description: Prove that a multi-node Open MPI job selected the UCX PML and an RDMA transport on an InfiniBand port, rather than inferring RDMA use from installed hardware or benchmark speed.

---

An InfiniBand HCA, a loaded `mlx5` driver, and an Open MPI binary do not prove that an MPI message crossed InfiniBand. Open MPI can have several communication components installed, UCX can select among RDMA, TCP, and shared-memory transports, and a one-node test does not prove that traffic traversed an inter-node network path.

Build a chain of evidence instead:

1. the job loaded the Open MPI UCX PML;
2. UCX could see the intended HCA port;
3. the tested ranks were on different hosts;
4. the endpoint configuration named an RDMA transport and device, and the selected port's link layer was InfiniBand;
5. the message sizes of interest used the expected UCX protocol.

## Know Which Layer You Are Proving

In Open MPI 5, InfiniBand and RoCE support for MPI point-to-point traffic is provided through the `ucx` PML. The legacy `openib` BTL is no longer present. These component names matter:

- The PML implements MPI point-to-point semantics. `pml=ucx` proves Open MPI handed those operations to UCX.
- The OSC component handles MPI one-sided operations. If RMA matters, inspect or force `osc=ucx` separately.
- Collective algorithms may use point-to-point operations or a separate collective/offload component. Proving the PML does not prove that every collective used the same path.
- UCX UCP chooses lower-level UCT transports per endpoint, memory type, and message size. `pml=ucx` alone does not prove `rc_mlx5` or `dc_mlx5` was selected.

Intra-node endpoints normally use shared memory. That is desirable, but it means a two-rank job placed on one host says nothing about InfiniBand.

## Verify the Executable and Its UCX Support

Run these on every participating compute host, in the same allocation, container, module environment, and PATH used by the application:

~~~console
$ command -v mpirun
$ command -v ompi_info
$ command -v ucx_info
$ mpirun --version
$ ompi_info --path prefix
$ ompi_info --param pml all
$ ompi_info --param pml ucx --level 9
$ ucx_info -v
$ ucx_info -d
~~~

The resolved paths and `ompi_info --path prefix` help establish which tools and Open MPI prefix are being queried. `ompi_info` must list the `ucx` PML. `ucx_info -v` reports the UCX runtime version and library path seen by that command, along with its build metadata and configure options. Compare that path with the library loaded by an MPI rank or Open MPI's UCX PML component; `ucx_info -v` alone does not prove which `libucp` the rank loaded. `ucx_info -d` is the transport inventory for that UCX installation. Find an RDMA transport entry for the exact port, such as `rc_mlx5` on `mlx5_0:1`.

Do not treat these as equivalent:

- `mlx5_0` is an RDMA device name;
- `mlx5_0:1` is UCX's device-and-port selector;
- `ib0` is commonly an IPoIB network interface;
- a PCI BDF identifies a PCI function.

Map them with `rdma link show`, `ibv_devinfo`, and sysfs before pinning a job to a device.

## Force the PML for a Diagnostic Run

For diagnosis, failing explicitly is better than silently falling back:

~~~console
$ OMPI_MCA_pml=ucx mpirun \
    --map-by ppr:1:node --display map,bindings \
    -x UCX_NET_DEVICES=mlx5_0:1 \
    -x UCX_LOG_LEVEL=info \
    -np 2 ./mpi_bandwidth_test
~~~

Use a known two-node allocation and confirm the hostnames printed by the launcher or test. `OMPI_MCA_pml=ucx` is the environment-variable form of the Open MPI MCA parameter. Pass the same UCX settings to every rank using the launcher's supported environment-export mechanism. The `-x` syntax above is Open MPI syntax; a scheduler-native launcher may propagate variables differently.

The command deliberately does not set `UCX_TLS`. UCX recommends allowing automatic transport selection unless a documented workaround or controlled experiment requires a restriction. An incorrect allow-list can omit auxiliary transports, shared memory, or GPU-memory support and create a different failure from the one being investigated.

If forcing `pml=ucx` fails to select, stop there. Check `ompi_info`, dynamic-library paths, UCX version compatibility, and whether UCX sees a supported network. Removing the MCA setting and accepting a TCP result does not validate InfiniBand.

## Read UCX's Endpoint Evidence

With `UCX_LOG_LEVEL=info`, current UCX releases print endpoint configurations similar to:

~~~text
ep_cfg[...] ... rc_mlx5/mlx5_0:1
~~~

The exact line format changes by UCX version, but the evidence to capture is the lower-level transport and the selected HCA port. Common interpretations are:

| UCX output | Meaning |
| --- | --- |
| `rc_mlx5/mlx5_0:1` or `dc_mlx5/...` | accelerated mlx5 RDMA transport on that port |
| `rc_verbs/...` or `ud_verbs/...` | generic verbs transport on that RDMA port |
| `tcp/<netdev>` | TCP sockets, not InfiniBand verbs data transport |
| `self` or `posix`, `sysv`, `cma`, `xpmem` | loopback or intra-node path |

Seeing shared memory and RDMA entries in one job is normal: local and remote peers need different transports. Seeing only local transports usually means the ranks were co-located or no remote endpoint was created.

For protocol-by-message-size detail, use UCX's protocol introspection on a short, controlled run:

~~~console
$ OMPI_MCA_pml=ucx mpirun --map-by ppr:1:node \
    -x UCX_NET_DEVICES=mlx5_0:1 \
    -x UCX_PROTO_INFO=y \
    -np 2 ./mpi_bandwidth_test
~~~

`UCX_PROTO_INFO=y` reports the protocols and transport lanes chosen for relevant size ranges when the UCX protocol-v2 engine is in use. On older UCX versions where protocol v2 is not the default, the release-specific documentation may call for `UCX_PROTO_ENABLE=y`; do not change that switch in a production comparison without recording it, because it changes protocol selection rather than merely logging.

## Make the Test Discriminating

A useful proof includes more than a successful ping-pong:

- Place one rank on each of two known hosts.
- Test both small and large messages; eager and rendezvous protocols can use different lanes.
- Record `mpirun --version`, `ompi_info`, `ucx_info -v`, and the full launch command.
- Record the port state and link layer with `ibv_devinfo -d mlx5_0 -i 1`.
- Capture UCX info logs from both ranks, not just the launcher.
- If validating GPU buffers, make the benchmark explicitly allocate GPU memory and ensure the UCX build lists the required CUDA or ROCm transports.

As a negative control, restrict the diagnostic to a TCP device and compare the UCX log, not merely throughput. A bandwidth difference is supporting evidence, but CPU frequency, NUMA placement, PCIe topology, message size, and binding can all change benchmark results.

## Avoid False Proofs

These checks are insufficient on their own:

- `ibstat` says the port is active: the local port is up, but this does not prove peer reachability and the process may still use TCP.
- `ldd` lists `libucp`: a linked component need not be selected.
- the job starts with `pml=ucx` forced: UCX may still select TCP.
- bandwidth is “too fast for Ethernet”: the ranks may share a node, or the Ethernet link may be faster than assumed.
- `UCX_NET_DEVICES` is set: a setting is not evidence that the named device was usable.

The strongest practical proof is a two-host job that starts with `pml=ucx` forced, where `ibv_devinfo` reports `link_layer: InfiniBand` for the selected port and UCX's own endpoint/protocol output names the expected RDMA transport and port.

## Official Documentation

- [Open MPI: InfiniBand and RoCE support through the UCX PML](https://docs.open-mpi.org/en/v5.0.x/tuning-apps/networking/ib-and-roce.html)
- [Open MPI: network support and removal of the openib BTL](https://docs.open-mpi.org/en/main/release-notes/networks.html)
- [OpenUCX FAQ: device selection, transport selection, and protocol introspection](https://openucx.readthedocs.io/en/master/faq.html)
- [OpenUCX source documentation for UCX configuration and introspection](https://github.com/openucx/ucx/blob/master/docs/source/faq.md)
- [Open MPI: processor and memory affinity](https://docs.open-mpi.org/en/main/tuning-apps/affinity.html)

## Conclusion

Prove the complete selection chain. Confirm that the intended Open MPI installation contains the UCX PML, that the loaded UCX library exposes the target port, that the port's link layer is InfiniBand, and that ranks really span hosts. Then use `UCX_LOG_LEVEL=info` and, where supported, `UCX_PROTO_INFO=y` to capture the actual transport and protocol lanes. Hardware presence, linkage, and benchmark speed are clues; UCX's runtime endpoint configuration, paired with the port's link layer, is the evidence.
