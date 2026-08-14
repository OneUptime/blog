# Why a Kubernetes Pod Sees RDMA Devices but UCX Cannot Resolve GIDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, UCX, RDMA, GID, RoCE, InfiniBand, Network Operator

Description: Debug pods that expose uverbs devices but lack the network namespace, GID, route, CNI attachment, or UCX configuration needed for RDMA reachability.

---

`/dev/infiniband` answers one narrow question: some RDMA character devices are visible in the pod. UCX also needs a usable RDMA device and port, provider libraries, network-namespace state, a compatible source GID, and reachability to the peer.

Kubernetes device allocation and pod networking are separate operations. A device plugin can advertise and allocate RDMA resources without creating the netdev, IP/VLAN, route, or GID context required by the selected network model. That separation is especially visible with RoCE, where GIDs are tied to Ethernet network configuration.

## Compare Every Layer Inside the Pod

Start an interactive shell in the failing container and collect:

~~~console
$ ls -l /dev/infiniband
$ rdma dev show
$ rdma link show
$ ibv_devices
$ ibv_devinfo
$ ucx_info -v
$ ucx_info -d
$ ip -br link
$ ip -br address
$ ip route show
$ ip -6 route show
$ env | grep '^UCX_'
~~~

Interpret each result separately:

| Evidence | What it proves |
| --- | --- |
| `/dev/infiniband/uverbs*` | a userspace verbs device node is visible in the container filesystem |
| `ibv_devices` | libibverbs can enumerate RDMA devices visible to the process |
| `ibv_devinfo` | libibverbs can open and query a device through its provider |
| `rdma link show` | RDMA links and ports are visible to this network namespace |
| `ucx_info -d` | this UCX installation can discover the listed transports and devices |
| `ip address`, `ip route`, and `ip -6 route` | pod has source addresses and IPv4/IPv6 routes for its netdevs |
| GID table | selected RDMA port has candidate source GIDs |

Run the same commands on the node, but do not substitute node output for pod output. Differences are the diagnosis.

## Inspect GIDs and Their Netdev Association

Inside the pod, inspect the intended port:

~~~console
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
$ for gid in /sys/class/infiniband/mlx5_0/ports/1/gids/*; do
    printf '%s ' "$gid"
    cat "$gid"
  done
$ for ndev in /sys/class/infiniband/mlx5_0/ports/1/gid_attrs/ndevs/*; do
    printf '%s ' "$ndev"
    cat "$ndev"
  done 2>/dev/null
$ for type in /sys/class/infiniband/mlx5_0/ports/1/gid_attrs/types/*; do
    printf '%s ' "$type"
    cat "$type"
  done 2>/dev/null
~~~

The `gid_attrs` files depend on the kernel and driver. For RoCE, verify that the GID points to the secondary network interface, address, VLAN, and RoCE type that can reach the peer. A host GID index may be absent, may identify a different GID, or, in shared RDMA namespace mode, may remain visible even though its associated netdev is not usable from the pod after a netdev move or macvlan creation.

For native InfiniBand, verify port state, subnet prefix, and P_Key membership. If the deployment uses IPoIB or an IP-based RDMA CM or bootstrap path, verify that address model too; UCX's native InfiniBand transport itself does not require IPoIB. A link-local GID by itself does not establish that UCX considers two endpoints reachable across the configured fabric.

## Confirm Resource Allocation and Any CNI Attachment

Inspect the live pod, not only its deployment template. For a model that uses a secondary network, verify both resource allocation and CNI attachment:

~~~console
$ kubectl get pod <pod> -n <namespace> -o yaml
$ kubectl describe pod <pod> -n <namespace>
$ kubectl get network-attachment-definition -A
~~~

Check for:

- an RDMA extended-resource request and limit;
- the expected Multus or secondary-network annotation;
- a successful CNI status entry with the intended interface and IP;
- scheduling onto a node advertising that exact resource;
- no mismatch between shared-device and SR-IOV resource names;
- events from the device plugin, CNI, IPAM, or kubelet.

NVIDIA's SR-IOV Kubernetes documentation describes two separate components: the SR-IOV Network Device Plugin advertises and allocates VFs and, when `isRdma` is enabled, makes their RDMA device nodes available to the pod; Multus passes the allocated device information to the SR-IOV CNI, which moves the VF netdev into the pod and applies its network configuration. NVIDIA Network Operator examples for shared RDMA likewise combine the shared device plugin with a secondary network, CNI, and IPAM.

A schematic shared-RDMA workload has both pieces:

~~~yaml
metadata:
  annotations:
    k8s.v1.cni.cncf.io/networks: rdma-secondary-network
spec:
  containers:
    - name: worker
      resources:
        limits:
          rdma/rdma_shared_device_a: 1
~~~

Resource names and annotations are installation-specific. Copy them from the NetworkAttachmentDefinition and operator policy actually deployed in the cluster.

## Identify the Intended Container Network Model

Common models have different expectations:

- **SR-IOV VF passthrough:** the pod receives a VF netdev and associated RDMA function. IPAM, trust, GUID/MAC, and VF policy must match the deployment.
- **Shared RDMA device with macvlan:** the HCA is shared while a macvlan secondary interface gives the pod network identity. GID and reachability must line up with that interface.
- **IPoIB secondary network:** an IPoIB CNI creates or moves the intended InfiniBand interface and assigns addressing.
- **Host networking:** the pod shares the node network namespace. This can make a test work, but changes isolation and port ownership and is not a neutral fix.

Do not combine advice across models. Moving a VF, creating a macvlan, and sharing the PF lead to different sysfs, netdev, and GID views.

## Remove Stale UCX Pinning

UCX normally evaluates available devices and GIDs. A hard-coded setting can refer to a host-only identity:

~~~console
$ env | sort | grep '^UCX_'
$ ucx_info -cf | grep -E 'NET_DEVICES|GID_INDEX|ROCE_REACHABILITY'
~~~

For a diagnostic baseline, remove stale settings and inspect automatic selection:

~~~console
$ env -u UCX_NET_DEVICES -u UCX_IB_GID_INDEX \
    UCX_LOG_LEVEL=info ./ucx_test_program
~~~

If pinning is required, select a device and GID that exist inside every pod. Do not assume `mlx5_0:1` or GID index 3 has the same meaning on every node. The UCX FAQ documents `UCX_IB_GID_INDEX` for explicit RoCE GID selection. For UCX 1.19 and newer, the OpenUCX README documents `UCX_IB_ROCE_REACHABILITY_MODE=all` as a workaround when network routing is incorrectly recognized and peers are reported unreachable. Use that workaround only after proving that the correct GIDs and required network routes exist; it cannot create missing pod networking.

## Check Userspace and Host Driver Compatibility

A pod can expose uverbs while shipping an incompatible or incomplete userspace stack. Record:

~~~console
$ ucx_info -v
$ ldd "$(command -v ucx_info)" | grep -E 'ucp|uct|ucs|ibverbs|mlx5|rdmacm'
$ ldconfig -p | grep -E 'libibverbs|libmlx5|libucp'
~~~

Compare the container's UCX, rdma-core providers, and vendor support matrix with the host kernel driver. `ucx_info -d` is a useful local UCX inventory: if `ibv_devinfo` works but UCX lists no RDMA transport, check the UCX build and module loading, port state, and GID validity or selection before investigating peer routing.

Also verify the pod's effective locked-memory limit when failure occurs during endpoint or buffer setup:

~~~console
$ grep -i 'Max locked memory' /proc/self/limits
~~~

A memlock failure and a GID reachability failure can occur in the same workload, but they are separate root causes.

## Test the Network Before the Full MPI Job

From each pod:

1. for RoCE or IPoIB, confirm the intended interface and source address;
2. for an IP-based data, RDMA CM, or bootstrap path, use `ip route get <peer-secondary-address>` (or `ip -6 route get <peer-secondary-address>`) and verify the returned `dev` and `src`;
3. inspect `ucx_info -d` for the exact RDMA port;
4. run a two-endpoint verbs or RDMA CM test appropriate to the link layer;
5. run a short UCX test with `UCX_LOG_LEVEL=info`;
6. only then run Open MPI and confirm the UCX endpoint configuration.

Test both directions and across different nodes. A same-node pod test can use shared memory and bypass the RDMA network entirely.

## Official Documentation

- [Kubernetes: device plugins and extended resources](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)
- [OpenUCX FAQ: device and GID selection](https://openucx.readthedocs.io/en/master/faq.html)
- [OpenUCX README: RoCE reachability workaround](https://github.com/openucx/ucx#known-issues)
- [NVIDIA Network Operator: SR-IOV network with RDMA](https://docs.nvidia.com/networking/display/kubernetes2640/quick-start/sriov-network-rdma.html)
- [NVIDIA Network Operator: shared RDMA device with macvlan](https://docs.nvidia.com/networking/display/kubernetes2640/quick-start/macvlan-rdma-shared.html)
- [NVIDIA GPU Operator: GPUDirect RDMA container prerequisites](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-rdma.html)
- [Linux kernel: InfiniBand GID sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)

## Conclusion

Seeing `/dev/infiniband` is necessary for many container RDMA designs, but it is not sufficient. Prove that the pod has the intended RDMA link, GID, provider libraries, and UCX transport and, where the selected network model requires them, a CNI-created netdev, source address, and IP route. Fix the missing layer instead of granting broad privileges or hard-coding a host GID index.
