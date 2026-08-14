# Why a Kubernetes Pod Sees RDMA Devices but UCX Cannot Resolve GIDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, UCX, RDMA, GID, RoCE, InfiniBand, Network Operator

Description: Debug pods that expose uverbs devices but lack the network namespace, GID, route, CNI attachment, or UCX configuration needed for RDMA reachability.

---

`/dev/infiniband` answers one narrow question: some RDMA character devices are visible in the pod. UCX also needs a usable RDMA device and port, provider libraries, network-namespace state, a compatible source GID, and reachability to the peer.

Kubernetes device allocation and pod networking are separate operations. A device plugin can advertise and mount RDMA resources without creating the netdev, IP/VLAN, route, or GID context expected by UCX. That separation is especially visible with RoCE, where GIDs are tied to Ethernet network configuration.

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
$ env | grep '^UCX_'
~~~

Interpret each result separately:

| Evidence | What it proves |
| --- | --- |
| `/dev/infiniband/uverbs*` | userspace verbs character device is mounted |
| `ibv_devices` | libibverbs can enumerate RDMA devices visible to the process |
| `ibv_devinfo` | libibverbs can open and query a device through its provider |
| `rdma link show` | RDMA device and port exist in this network namespace |
| `ucx_info -d` | this UCX build can actually use listed transports and devices |
| `ip address` and `ip route` | pod has source addresses and routes for its netdevs |
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

The `gid_attrs` files depend on the kernel and driver. For RoCE, verify that the GID points to the secondary network interface, address, VLAN, and RoCE type that can reach the peer. A GID copied from the host may not exist in the pod after the netdev moves or a macvlan interface is created.

For native InfiniBand, verify port state, subnet prefix, P_Key membership, and the pod's IPoIB or other intended address model. A link-local GID by itself does not establish that UCX considers two endpoints reachable across the configured fabric.

## Confirm Both Resource Allocation and CNI Attachment

Inspect the live pod, not only its deployment template:

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

NVIDIA's SR-IOV Kubernetes documentation describes two separate components: an RDMA device plugin exposes RDMA devices to the pod, and the SR-IOV CNI provisions the VF network device. NVIDIA Network Operator examples for shared RDMA likewise combine the shared device plugin with a secondary network, CNI, and IPAM.

A schematic workload has both pieces:

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

If pinning is required, select a device and GID that exist inside every pod. Do not assume `mlx5_0:1` or GID index 3 has the same meaning on every node. The UCX FAQ recommends `UCX_IB_GID_INDEX` for explicit RoCE GID selection and documents `UCX_IB_ROCE_REACHABILITY_MODE=all` as a workaround when reachability is incorrectly recognized. Use that workaround only after proving that the correct GIDs and network routes exist; it cannot create missing pod networking.

## Check Userspace and Host Driver Compatibility

A pod can mount uverbs while shipping an incompatible or incomplete userspace stack. Record:

~~~console
$ ucx_info -v
$ ldd "$(command -v ucx_info)" | grep -E 'ucp|uct|ucs|ibverbs|mlx5|rdmacm'
$ ldconfig -p | grep -E 'libibverbs|libmlx5|libucp'
~~~

Compare the container's UCX, rdma-core providers, and vendor support matrix with the host kernel driver. `ucx_info -d` is the useful end-to-end inventory: if `ibv_devinfo` works but UCX lists only TCP, focus on UCX build/provider loading rather than GID routing.

Also verify the pod's effective locked-memory limit when failure occurs during endpoint or buffer setup:

~~~console
$ grep -i 'Max locked memory' /proc/self/limits
~~~

A memlock failure and a GID reachability failure can occur in the same workload, but they are separate root causes.

## Test the Network Before the Full MPI Job

From each pod:

1. confirm the secondary interface and source address;
2. use `ip route get <peer-secondary-address>`;
3. inspect `ucx_info -d` for the exact RDMA port;
4. run a two-endpoint verbs or RDMA CM test appropriate to the link layer;
5. run a short UCX test with `UCX_LOG_LEVEL=info`;
6. only then run Open MPI and confirm the UCX endpoint configuration.

Test both directions and across different nodes. A same-node pod test can use shared memory and bypass the RDMA network entirely.

## Official Documentation

- [Kubernetes: device plugins and extended resources](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/)
- [OpenUCX FAQ: device, GID, and RoCE reachability selection](https://openucx.readthedocs.io/en/master/faq.html)
- [NVIDIA Network Operator: SR-IOV network with RDMA](https://docs.nvidia.com/networking/display/kubernetes2610/quick-start/sriov-network-rdma.html)
- [NVIDIA Network Operator: shared RDMA device with macvlan](https://docs.nvidia.com/networking/display/kubernetes2610/quick-start/macvlan-rdma-shared.html)
- [NVIDIA GPU Operator: GPUDirect RDMA container prerequisites](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-rdma.html)
- [Linux kernel: InfiniBand GID sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)

## Conclusion

Seeing `/dev/infiniband` is necessary for many container RDMA designs, but it is not sufficient. Prove that the pod has the intended RDMA link, CNI-created netdev, source address, route, GID, provider libraries, and UCX transport. Fix the missing layer instead of granting broad privileges or hard-coding a host GID index.
