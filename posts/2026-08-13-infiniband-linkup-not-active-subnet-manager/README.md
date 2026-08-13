# InfiniBand Is LinkUp but Not Active: Find the Missing Control Plane

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: InfiniBand, OpenSM, Subnet Manager, RDMA, Network Troubleshooting

Description: Diagnose an InfiniBand port that completes physical link training but never becomes Active, with checks for the subnet manager, LIDs, link type, and failed fabric sweeps.

---

An InfiniBand port can report `Physical state: LinkUp` while its logical `State` remains `Init`, `Armed`, or `Down`. That is not contradictory. The physical state describes link training between two ports; the logical state describes whether the port has been configured for use in the InfiniBand subnet.

The most common `LinkUp`/`Init` case is a missing or unreachable Subnet Manager (SM). The SM discovers the fabric, assigns Local Identifiers (LIDs), calculates routes, and advances usable ports toward `Active`. It is not the only possible cause, however. A running SM can be bound to the wrong HCA port, fail during a sweep, exclude a port through configuration, or be separated from the host by a broken fabric path.

## Read All of the Port State, Not One Line

Start with the local driver view. Substitute the actual RDMA device and port:

~~~console
$ ibstat mlx5_0 1
$ rdma link show mlx5_0/1
$ cat /sys/class/infiniband/mlx5_0/ports/1/phys_state
$ cat /sys/class/infiniband/mlx5_0/ports/1/state
$ cat /sys/class/infiniband/mlx5_0/ports/1/lid
$ cat /sys/class/infiniband/mlx5_0/ports/1/sm_lid
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
~~~

These sysfs attributes are part of Linux's stable InfiniBand ABI; substitute the actual device and port names on the host. Interpret the result as a set:

| Observation | What it establishes | What it does not establish |
| --- | --- | --- |
| `Physical state: LinkUp` | the two ends completed physical link training | that an SM configured the path |
| `State: Init` | the port is physically initialized but not operational | that the cable is bad |
| `State: Active` | the local IB port is logically usable | that every P_Key, route, or application is correct |
| LID `0x0` and SM LID `0x0` | no usable LID/SM information is installed | by itself, where the SM failure is |
| `link_layer: Ethernet` | this is an Ethernet/RoCE RDMA port at runtime | that OpenSM should manage it |

That last check prevents a common category error. ConnectX VPI hardware may operate a port as Ethernet or InfiniBand. OpenSM manages InfiniBand, not an Ethernet link carrying RoCE. If `link_layer` says `Ethernet`, investigate VPI configuration or the RoCE network rather than trying to make OpenSM activate it.

## Decide Whether an SM Is Reachable

On a healthy InfiniBand port, `sminfo` queries the SMInfo attribute for the SM referenced by local port information:

~~~console
$ sminfo -C mlx5_0 -P 1
~~~

A useful response identifies an SM state such as `Master`, its priority, GUID, and activity count. A timeout does not prove that no SM process exists anywhere. It proves that this local management path did not get a response. Correlate it with the zero LID/SM LID and the logical port state.

Find where the control plane is intended to run before starting anything. It may be:

- an embedded SM on an InfiniBand switch;
- OpenSM on one or more Linux hosts;
- NVIDIA UFM, which includes an SM;
- another fabric-management appliance.

On a Linux SM candidate, service names and package layouts vary by distribution. Check the process as well as plausible units:

~~~console
$ pgrep -a opensm
$ systemctl list-units --type=service | grep -i opensm
$ systemctl status opensm
$ systemctl status opensmd
$ journalctl -b --no-pager | grep -iE 'opensm|subnet manager|sm port'
~~~

Do not treat `active (running)` as proof that OpenSM controls the affected fabric. One OpenSM process binds to one local port GUID. A dual-port HCA, multiple HCAs, or multiple isolated fabrics makes binding important. List the local port GUIDs and compare the configured GUID with the cabling plan:

~~~console
$ ibstat -p
$ ps -eo pid,args | grep '[o]pensm'
~~~

OpenSM's `-g`/`--guid` option selects the local port GUID. Inspect the service configuration or generated command line rather than launching a second ad hoc instance. An SM bound to `mlx5_0` port 1 cannot manage an isolated subnet connected only to another HCA port.

## Use the State Combination to Narrow the Fault

`LinkUp` with `Init`, zero LID, and no `sminfo` response strongly points to an absent or unreachable SM. Check whether the intended SM host is powered on, whether its own IB port is `LinkUp`, and whether OpenSM can bind to its management device (`/dev/infiniband/umad*`). Review the OpenSM log for bind failures, discovery timeouts, duplicate GUIDs, or a sweep that never completes.

`LinkUp` with `Armed` means the port progressed farther: configuration has been applied, but the port was not advanced to `Active`. Inspect the master SM log and the adjacent switch port. Avoid repeatedly cycling the host port; that can erase the timing evidence without fixing the failed sweep or policy.

`LinkUp` with logical `Down` warrants checking administrative state and both ends of the link. The `ibportstate` utility can query and change port state, but changing an HCA state locally can happen without the SM's knowledge. Query first, and coordinate any enable/reset operation with the fabric owner:

~~~console
$ ibportstate -C mlx5_0 -P 1 <switch-lid> <switch-port>
~~~

Do not copy a LID from an example. When the fabric has no working SM and therefore no usable LIDs, LID-routed diagnostics may fail; switch-local commands or properly constructed direct-route diagnostics are then more useful.

## Restore the Intended Manager, Not Just Any Manager

If the design says this host runs OpenSM, repair that instance: install the distribution's OpenSM package if missing, correct its port GUID binding, restore its reviewed `opensm.conf`, partition policy, and routing configuration, and then start the managed service. If a switch or UFM owns the SM role, restore that service instead.

Starting an unconfigured OpenSM on a random compute node is risky. It may participate in master election with different partition, QoS, routing, or LID policies. OpenSM supports redundant managers, but the instances should be planned, consistently configured, and assigned deliberate priorities. An emergency process that happens to make ports `Active` can still reprogram the fabric differently from the intended manager.

After restoration, watch the transition rather than assuming success from the process state:

~~~console
$ watch -n 1 'ibstat mlx5_0 1'
$ sminfo -C mlx5_0 -P 1
$ iblinkinfo -C mlx5_0 -P 1 -l
~~~

The expected endpoint is `State: Active`, `Physical state: LinkUp`, a nonzero LID, and an SM LID that corresponds to the elected master. `iblinkinfo` adds the fabric-side view once management queries work.

## Verify the Data Plane Separately

Logical activation is necessary but not sufficient for an application. After the port becomes `Active`, verify the layer the workload actually uses:

- For IPoIB, confirm the correct P_Key child interface, IP address, route, and MTU on both peers, then test the selected source and destination addresses.
- For verbs, confirm that `ibv_devinfo` exposes the device and that the application selected the intended device, port, GID, and P_Key.
- For fabric-wide validation, run the approved `ibdiagnet` or `ibqueryerrors` workflow from a management node and investigate new errors rather than blindly clearing counters.

This separation avoids declaring the issue fixed merely because `ibstat` says `Active`. The SM establishes the InfiniBand control plane; it does not repair application address selection, permissions, namespace visibility, or an inconsistent IPoIB MTU.

## Official Documentation

- [Linux kernel: check RDMA setup and require an SM for InfiniBand](https://docs.kernel.org/admin-guide/nfs/nfs-rdma.html)
- [Linux kernel: stable InfiniBand sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [rdma-core: `ibstat(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst)
- [rdma-core: `sminfo(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/sminfo.8.in.rst)
- [rdma-core: `ibportstate(8)` manual](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibportstate.8.in.rst)
- [OpenSM: official `opensm(8)` manual](https://github.com/linux-rdma/opensm/blob/master/man/opensm.8.in)
- [NVIDIA: InfiniBand fabric utilities and their reported fields](https://docs.nvidia.com/networking/display/mlnxofedv23105140lts/infiniband-fabric-utilities)

## Conclusion

Treat `LinkUp` and `Active` as evidence from different layers. `LinkUp` proves that the local and remote ports trained a physical link. A non-Active logical state usually means the InfiniBand control plane has not completed its work. Verify the runtime link layer, LID and SM LID, query the elected SM, then repair the manager that is supposed to own the fabric. Once the port is `Active`, test the workload's IPoIB or verbs path as a separate step.
