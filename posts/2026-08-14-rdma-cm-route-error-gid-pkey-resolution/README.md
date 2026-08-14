# Trace RDMA_CM_EVENT_ROUTE_ERROR Through GIDs and P_Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RDMA CM, InfiniBand, RoCE, GID, P_Key, RDMA Core

Description: Trace RDMA CM route failures from source address selection through GID, P_Key, Subnet Administrator, and network namespace state.

---

`RDMA_CM_EVENT_ROUTE_ERROR` means an accepted asynchronous route-resolution request failed. Address resolution had already completed successfully, allowing the application to call `rdma_resolve_route()`, but route resolution did not produce the information needed to establish a connection.

That distinction matters. DNS success, an IP route, or even `RDMA_CM_EVENT_ADDR_RESOLVED` does not prove that the selected RDMA device, GID, P_Key, and fabric path form a usable route.

## Capture the Event, Status, and Selected Address

Log every CM transition and preserve `event->status` before acknowledging the event:

~~~c
struct rdma_cm_event *event;

if (rdma_get_cm_event(channel, &event) == 0) {
    fprintf(stderr, "cm event=%s status=%d id=%p\n",
            rdma_event_str(event->event), event->status,
            (void *)event->id);
    rdma_ack_cm_event(event);
}
~~~

The status carries the failure detail. A negative value represents `-errno` and can be decoded with `strerror(-event->status)`. Some nonzero positive values are transport-specific, so preserve the numeric value and interpret it for the event and transport in use. Do not replace either form with a generic timeout message. Also log the source and destination socket addresses passed to `rdma_resolve_addr()`, the timeout values, address family, and port space.

Check each asynchronous CM call's immediate return value too. If `rdma_resolve_route()` returns `-1`, log `errno` and do not wait for a route event. A zero return means only that the operation started; its result arrives on the event channel.

The expected active-side sequence is:

~~~text
rdma_resolve_addr()
  -> if started: RDMA_CM_EVENT_ADDR_RESOLVED
                 or RDMA_CM_EVENT_ADDR_ERROR
on RDMA_CM_EVENT_ADDR_RESOLVED:
  rdma_resolve_route()
    -> if started: RDMA_CM_EVENT_ROUTE_RESOLVED
                   or RDMA_CM_EVENT_ROUTE_ERROR
on RDMA_CM_EVENT_ROUTE_RESOLVED:
  rdma_connect()
~~~

Calling `rdma_resolve_route()` before address resolution has completed is an application error that normally fails immediately rather than generating `RDMA_CM_EVENT_ROUTE_ERROR`. The official rdma-core `rping` example calls it only from the `ADDR_RESOLVED` event handler and checks its return value.

## Confirm Which Device and Port Address Resolution Selected

When no source address is supplied and the CM ID has not already been bound to a device, RDMA CM uses local routing information to select one and binds the CM ID to a local RDMA device. A route to the destination through the management network can therefore select a different interface from the intended RDMA fabric.

Inspect the failing namespace:

~~~console
$ ip route get 192.0.2.20
$ ip -br address
$ rdma dev show
$ rdma link show
$ ibv_devinfo
~~~

For a multihomed application, bind an explicit source address that belongs to the intended RDMA interface and log the address returned by `rdma_get_local_addr()`. Do not bind a host-wide address merely because it can reach the peer with ICMP.

For RoCE, the IP route, associated Ethernet netdev, VLAN, and GID table are linked. For native InfiniBand, IPoIB can provide IP-to-GID resolution, while the InfiniBand Subnet Administrator supplies path information. The details differ, so first read the port's link layer:

~~~console
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
$ cat /sys/class/infiniband/mlx5_0/ports/1/state
$ cat /sys/class/infiniband/mlx5_0/ports/1/phys_state
~~~

## Inspect GIDs in the Same Network Namespace

List every GID and correlate it with the selected RDMA device, port, and netdev:

~~~console
$ for gid in /sys/class/infiniband/mlx5_0/ports/1/gids/*; do
    printf '%s ' "$gid"
    cat "$gid"
  done
$ for attr in /sys/class/infiniband/mlx5_0/ports/1/gid_attrs/ndevs/* \
              /sys/class/infiniband/mlx5_0/ports/1/gid_attrs/types/*; do
    printf '%s ' "$attr"
    cat "$attr"
  done 2>/dev/null
~~~

The available sysfs attributes depend on kernel and driver versions. On RoCE, GIDs are derived from network configuration, so a container may expose `/dev/infiniband` while lacking the netdev, VLAN, address, or GID visible on the host. Run the inspection inside the failing pod or namespace.

Check these mismatches:

- the source address maps to another HCA or port;
- the selected GID disappeared after an address or VLAN change;
- peers use incompatible address families or RoCE GID types;
- a link-local IPv6 address lacks the correct scope/interface;
- the destination is routed through a non-RDMA interface;
- the pod and host have different GID and route views.

Do not hard-code a GID index across hosts. Index allocation can differ with interface, VLAN, and address configuration. Select by the intended address and GID type, then verify the resolved route.

## Verify P_Key Membership on Native InfiniBand

P_Keys partition an InfiniBand subnet. Inspect the port's P_Key table:

~~~console
$ for key in /sys/class/infiniband/mlx5_0/ports/1/pkeys/*; do
    printf '%s ' "$key"
    cat "$key"
  done
~~~

Both endpoints must share the same 15-bit partition value, at least one endpoint must have full membership, and any switch P_Key enforcement must be programmed consistently. A nonzero entry is not enough; verify the intended partition value and full or limited membership policy. The default partition can make a basic test pass while the application's chosen partition fails.

For IPoIB, the network interface is also associated with a P_Key. Check that the source address belongs to the interface for the intended partition rather than a similarly named interface on another P_Key.

Do not rewrite P_Key tables from an application host as a speculative fix. They are normally assigned by the Subnet Manager and partition configuration. Preserve the current tables and involve the fabric control plane.

## Check the Subnet Administrator and Path

On native InfiniBand, logical port state should be `ACTIVE`, and the configured path-resolution service must succeed. librdmacm can use IB ACM, whose default backend uses and caches Subnet Administrator PathRecord queries, or fall back to a direct kernel SA query. A physical `LinkUp` state alone is insufficient. Confirm:

- a Subnet Manager is present;
- both ports are active in the same routed fabric or have a configured inter-subnet path;
- the destination GID is known;
- the SGID, DGID, P_Key, and service/QoS policy can yield a reversible path record with usable service level, MTU, and rate;
- the path-resolution service's permissions and partition policy allow resolution.

Use read-only fabric tools approved by the administrator. `ibdiagnet` and SA query tools can affect or load a shared management plane, so avoid broad scans from every job node during an incident.

For RoCE, there is no InfiniBand Subnet Administrator path-record lookup. Current Linux constructs the route data locally, so address, GID, netdev, or VLAN faults can instead surface as `RDMA_CM_EVENT_ADDR_ERROR` or an immediate error from `rdma_resolve_route()`, rather than `RDMA_CM_EVENT_ROUTE_ERROR`. Focus on IP routing, neighbor resolution, GID selection, VLAN, and the Ethernet path. A title or log that mentions GIDs does not imply native InfiniBand.

## Isolate Application, Host, and Fabric Failures

Use a known rdma-core CM example with the same source and destination addresses. If it succeeds, compare the application's address family, port space, bind sequence, timeouts, and namespace. If it fails identically, continue below the application.

A useful comparison matrix is:

| Test | What it establishes |
| --- | --- |
| `ip route get <peer>` | kernel-selected source and netdev |
| `rdma link show` | RDMA device and port state, plus the associated netdev when reported |
| GID and P_Key sysfs tables | local addressing and partition inputs |
| two-way CM test | address and route resolution in both directions |
| verbs data test after CM success | QP and data-path behavior beyond route resolution |

Run from both endpoints. A valid path in one direction does not guarantee symmetric source selection or policy in the other.

## Avoid Common Misdiagnoses

- Increasing the route timeout does not repair a nonexistent GID, wrong P_Key, or wrong source interface.
- `ping` proves IP reachability, not an RDMA CM route on the selected port.
- `/dev/infiniband` proves character-device exposure, not namespace addressing.
- `ADDR_RESOLVED` proves only the earlier CM stage completed.
- Changing `UCX_IB_GID_INDEX` does not configure librdmacm for a non-UCX application.

After fixing the underlying source, GID, P_Key, or path, require `ROUTE_RESOLVED` and a successful connection. Route resolution alone does not validate memory registration or RDMA data transfer.

## Official Documentation

- [rdma-core manual: RDMA CM event types](https://man7.org/linux/man-pages/man3/rdma_get_cm_event.3.html)
- [rdma-core manual: address resolution](https://man7.org/linux/man-pages/man3/rdma_resolve_addr.3.html)
- [rdma-core API: route resolution sequence and address structures](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/rdma_cma.h)
- [rdma-core rping reference event flow](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/examples/rping.c)
- [Linux kernel: InfiniBand GID and P_Key sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [NVIDIA MLNX_OFED v24.10 LTS: RoCE and GID tables](https://docs.nvidia.com/networking/display/nvidia-mlnx-ofed-documentation-v24-10-2-1-8-0-lts-2024-lts-u2.pdf)

## Conclusion

`RDMA_CM_EVENT_ROUTE_ERROR` begins after address resolution and before connection. Capture its status, identify the source address and bound RDMA port, then inspect the GID, P_Key, namespace, and control plane appropriate to native InfiniBand or RoCE. Fixing the selected route inputs is more reliable than increasing timeouts or guessing a GID index.
