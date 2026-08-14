# Diagnose an Unavailable mlx5 Port in UCX_NET_DEVICES

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UCX, UCX_NET_DEVICES, ConnectX, InfiniBand, RoCE, Container, RDMA

Description: Diagnose an unavailable UCX mlx5 device selector by checking UCX's own inventory, namespace visibility, port identity, link layer, and loaded build dependencies.

---

`UCX_NET_DEVICES=mlx5_0:1` is a restriction, not a request to create or discover that port. UCX will use only the listed network devices, so a name copied from the host or another node can remove a usable network fallback, emit a “network device is not available” warning, and, when no usable path remains, produce a connection or initialization failure.

The decisive question is simple: does the failing process's UCX installation list that exact device and port? Everything else, including host `ibstat`, a mounted character device, or a matching PCI card, is supporting evidence.

## Reproduce in the Failing Execution Context

Run the inventory through the same launcher, container, user, and node image as the application:

~~~console
$ ucx_info -v
$ ucx_info -d
$ ucx_info -c | grep -E '^UCX_(NET_DEVICES|TLS)'
$ rdma dev show
$ rdma link show
$ ibv_devinfo -d mlx5_0 -i 1
~~~

For an Open MPI job, execute the checks on every allocated node rather than just the login node:

~~~console
$ mpirun --map-by ppr:1:node sh -c \
    'hostname; ucx_info -v; ucx_info -d | grep -E "Transport:|Device:|mlx5"'
~~~

Device numbering is local. `mlx5_0` on node A need not represent the same physical rail, or exist at all, on node B. A portable job should map devices by topology and consistent provisioning rather than assuming enumeration is identical.

## Use UCX's Name, Not a Neighboring Name

The UCX FAQ defines the selector forms:

- `UCX_NET_DEVICES=mlx5_2:1` selects RDMA device `mlx5_2`, port 1;
- `UCX_NET_DEVICES=eth2` selects an Ethernet netdev for the TCP transport.

An IPoIB or Ethernet interface name such as `ib0`, `ens6f0`, or `net1` is not interchangeable with `mlx5_0:1` for verbs transports. Conversely, a PCI BDF such as `0000:5e:00.0` is not a UCX network-device selector.

Map the identities explicitly:

~~~console
$ readlink -f /sys/class/infiniband/mlx5_0/device
$ rdma link show mlx5_0/1
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
~~~

On multi-port, SR-IOV, multi-host, and Socket Direct adapters, do not infer the physical connector from the `mlx5_N` suffix.

## Check Namespace Visibility, Not Just Device Nodes

Netdevs are scoped to a network namespace. RDMA device visibility also depends on the RDMA subsystem's namespace mode: an RDMA device is accessible from every network namespace in `shared` mode and visible in only one in `exclusive` mode. A container can have `/dev/infiniband/uverbs0` mounted while the relevant RDMA device is outside its exclusive namespace, or while its associated netdev, address, route, or GID context is absent.

Compare host and container views:

~~~console
$ readlink /proc/self/ns/net
$ rdma system show
$ rdma dev show
$ rdma link show
$ ip -br link
$ ip -br address
$ ip route show
$ ls -l /dev/infiniband
~~~

For RoCE, the associated netdev and its IP/VLAN-derived GIDs are particularly important. Exposing a uverbs character device does not configure the pod's network. In Kubernetes, pair the appropriate device allocation with the intended CNI attachment. For SR-IOV, the SR-IOV Network Device Plugin allocates the VF; a meta-plugin such as Multus passes it to the SR-IOV CNI, which moves and configures it in the pod network namespace.

Do not “fix” namespace mismatch with a blanket privileged container or host networking before understanding the intended isolation model. That changes security and routing semantics and can mask a missing CNI/device allocation.

## Verify Port and Link-Layer State

Inspect the selected port:

~~~console
$ ibv_devinfo -d mlx5_0 -i 1
$ cat /sys/class/infiniband/mlx5_0/ports/1/state
$ cat /sys/class/infiniband/mlx5_0/ports/1/phys_state
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
~~~

For native InfiniBand, check physical `LinkUp`, logical `Active`, a Subnet Manager, LID/GID/P_Key membership, and the intended fabric. For Ethernet/RoCE, check the associated netdev, carrier, IP/VLAN, GID table, and routing in the process namespace.

A port can exist but be unusable for the requested transport. Do not assume an `mlx5` device is native InfiniBand: mlx5 supports both InfiniBand and Ethernet/RoCE products and modes.

## Verify the Loaded UCX Build

`ucx_info -v` prints the version and configure options. UCX 1.14 and later also print the loaded library path and distinguish the runtime-library version from the API-header version. `ucx_info -d` prints the transport and device resources that UCT can probe in the current environment; it does not test UCP selection under `UCX_NET_DEVICES` or `UCX_TLS`. Use both because these failures differ:

- UCX was built without usable verbs/mlx5 support;
- the build has support, but runtime provider libraries are missing;
- `LD_LIBRARY_PATH` loads a different UCX than the application was built against;
- an old UCX is paired with an unsupported rdma-core version;
- container userspace and host kernel/provider ABI do not match.

Inspect `ucx_info`'s dynamic linkage without modifying it:

~~~console
$ command -v ucx_info
$ ldd "$(command -v ucx_info)" | grep -E 'ucp|uct|ucs|ibverbs|rdmacm'
$ ldconfig -p | grep -E 'libibverbs|libmlx5|libucp'
~~~

This verifies the diagnostic tool's resolved ELF dependencies and the loader cache. If the application or a launcher-loaded MPI UCX plugin has its own RPATH, inspect that executable or plugin separately.

The OpenUCX project currently documents that UCX 1.12 and later require rdma-core 28 or later, or MLNX_OFED 5.0 or later, for InfiniBand and RoCE. Distribution and vendor support matrices may impose tighter combinations; follow the matrix for the installed stack.

## Remove Conflicting Transport Restrictions

Inspect all UCX variables passed to the process:

~~~console
$ env | sort | grep '^UCX_'
$ ucx_info -cf | less
~~~

`UCX_NET_DEVICES` and `UCX_TLS` constrain different dimensions. A device can be visible but still unusable because `UCX_TLS` excludes its transport. If an allow-list is necessary, use names reported by the installed UCX version and retain required shared-memory, auxiliary, and accelerator transports. The safest diagnostic baseline is usually to unset both variables, confirm automatic selection, and then add only the minimal device restriction.

Compare:

~~~console
$ env -u UCX_NET_DEVICES -u UCX_TLS \
    UCX_LOG_LEVEL=info ./ucx_application
$ env -u UCX_TLS \
    UCX_NET_DEVICES=mlx5_0:1 UCX_LOG_LEVEL=info ./ucx_application
~~~

If automatic selection succeeds but the restricted run fails, the restriction identifies a resource that is unavailable or unusable in at least one failing context; check the selector, selected port or fabric, and per-node device mapping. If neither run can use an RDMA transport, focus on namespace, driver/provider, link, and UCX build visibility.

## A Reliable Triage Order

1. Capture the exact host, container image, UCX version, and full error.
2. Run `ucx_info -d` inside the failing context.
3. Confirm the exact `mlx5_N:port` name there.
4. Map it to PCI, physical port, link layer, and associated netdev.
5. Compare network namespace, addresses, routes, and GIDs with the host.
6. Check `ucx_info -v`, dynamic linkage, and provider-library availability.
7. Remove stale `UCX_TLS` and `UCX_NET_DEVICES` restrictions, then reintroduce the intended selector.
8. Repeat on every node because device enumeration can differ.

## Official Documentation

- [OpenUCX FAQ: selecting network devices and transports](https://openucx.readthedocs.io/en/master/faq.html)
- [OpenUCX project: supported transports and rdma-core requirements](https://github.com/openucx/ucx)
- [Linux kernel: InfiniBand sysfs port ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [rdma-core: userspace RDMA libraries and device inspection](https://github.com/linux-rdma/rdma-core)
- [NVIDIA Network Operator: SR-IOV network with RDMA](https://docs.nvidia.com/networking/display/kubernetes2640/quick-start/sriov-network-rdma.html)

## Conclusion

An unavailable `mlx5_0:1` selector means the failing UCX context cannot use that exact name and port under its current restrictions. Start with `ucx_info -d` inside the process namespace, map the RDMA name to the real link, and verify namespace network state and UCX provider support. A character device on the host, or even inside a pod, does not establish a usable UCX transport.
