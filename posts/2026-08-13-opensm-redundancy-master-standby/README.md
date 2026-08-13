# Build OpenSM Redundancy Around One Elected Master

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: InfiniBand, OpenSM, High Availability, Subnet Manager, Network Operations

Description: Configure and verify OpenSM redundancy with one elected master, deliberate priorities, compatible policies, and a tested standby handover instead of competing managers.

---

InfiniBand Subnet Manager redundancy is not an active/active design in which two managers independently program the same fabric. Multiple SMs may be present, but in a healthy steady state the subnet-management protocol elects one `Master`; the other participating SMs remain `Standby`. A standby polls the master and takes over when election and failure-detection rules require it.

That makes the correct design simpler than an external split-brain cluster: run independent SM instances on independent failure domains, let the InfiniBand SM state machine choose the master, and keep their fabric policy compatible. Problems begin when operators force both managers to ignore one another, assign priorities accidentally, bind both to the wrong subnet, or deploy different partition and routing policy on the standby.

## Understand What Priority Actually Controls

OpenSM exposes an SM priority from 0 through 15. Its manual defines 0 as the lowest and 15 as the highest. During handover, the higher-priority SM is preferred; if priorities are equal, the SM with the numerically lower port GUID wins. The GUID therefore provides deterministic ordering when priorities are equal, but equal priority obscures operational intent.

A practical layout is:

| Instance | Failure domain | Priority | Expected steady state |
| --- | --- | ---: | --- |
| preferred SM | management host or switch A | 15 | `Master` |
| alternate SM | independent host or switch B | 14 | `Standby` |

Those numbers are examples, not required values. The important properties are an intentional ordering and separate failure domains. Running two OpenSM processes on the same host protects against a process failure but not a host, power, PCIe, cabling, or HCA-port failure.

Set priority through the packaging mechanism used on that system. In a generated `opensm.conf`, the setting is named `sm_priority`; configure each instance separately. On the direct command line, OpenSM uses `-p` or `--priority`:

~~~text
# Preferred instance's opensm.conf
sm_priority 15
~~~

~~~text
# Alternate instance's opensm.conf
sm_priority 14
~~~

Do not append an option blindly to a vendor-managed UFM or switch SM. Use the product's documented configuration path; for example, UFM documents supported `opensm.conf` changes and an SM-configuration REST API. Verify the effective state with SM queries after applying a change.

## Bind Each Instance to the Intended Fabric

An OpenSM process binds to one local port GUID. Redundancy is meaningful only when both selected ports reach the same InfiniBand subnet. List candidate GUIDs on each Linux host:

~~~console
$ ibstat -p
$ ibstat
$ ps -eo pid,args | grep '[o]pensm'
~~~

The OpenSM `-g`/`--guid` option selects the local port GUID. Confirm that each configured GUID belongs to the cabled port in the design and that both ports are physically `LinkUp`. A process that is healthy but bound to an isolated second fabric is not a standby for the first one.

Use separate nodes or embedded managers connected through different leaf switches where the topology permits. Avoid making both SM paths depend on the same top-of-rack switch, power feed, or management VM host. The purpose is control-plane reachability after a real component failure, not merely a second PID.

## Keep Failover Policy-Compatible

The standby can become master and perform a fabric sweep. Its effective configuration must therefore be safe to apply to the same subnet. Review and control at least:

- partition definitions and P_Key membership;
- routing engine and routing files;
- QoS, service-level, VL arbitration, and congestion settings;
- subnet prefix, LMC, SM Key, and management Key policy;
- GUID allowlists and any topology or root-GUID files;
- LID reassignment and GUID-to-LID persistence behavior;
- software version and supported device features.

Byte-for-byte identical configuration is not always possible between an appliance and a host OpenSM, but the resulting policy must be compatible. A standby with a different partition file can make a successful protocol handover look like an application outage. A different routing engine can cause a longer or more disruptive first sweep even though election worked correctly.

OpenSM normally tries to preserve LIDs. Its `--reassign_lids` option explicitly forces reassignment and the manual warns that using it on a running subnet may disrupt traffic. Do not enable it casually on a failover candidate. Upstream OpenSM also exposes `honor_guid2lid_file`, which honors a valid GUID-to-LID cache when coming out of standby. NVIDIA's UFM 6.24.x property table lists the setting but marks it as not applicable to UFM SM. On products that support it, whether to use such persistence is a fabric-policy decision, not a universal HA requirement.

## Do Not Configure the Managers to Compete

The `ignore_other_sm` setting is not a redundancy switch. It tells an SM to ignore other subnet managers. Setting it on managers that should cooperate defeats the normal master/standby relationship and creates the conditions for competing control planes. Leave it disabled for ordinary redundant SM operation.

Likewise, do not use a generic HA product to block all network visibility between the two SMs. An external service manager may restart a failed process, but election and handover belong to the InfiniBand SM protocol. Network isolation can make two live managers unable to observe one another while both can still reach parts of the fabric.

NVIDIA UFM supports an allowed-SM-port-GUID list. If such a control is used, include exactly the approved SM port GUIDs and test it carefully. A standby whose port GUID is omitted is ignored during handover; `(null)` disables the feature, while the special value `0` disallows every other SM.

## Observe the Election from More Than One Port

The `sminfo` utility queries a target SM's SMInfo attribute. With no target argument, it uses the SM LID recorded for the selected local port. Query from hosts on different parts of the fabric:

~~~console
$ sminfo -C mlx5_0 -P 1
$ cat /sys/class/infiniband/mlx5_0/ports/1/sm_lid
$ cat /sys/class/infiniband/mlx5_0/ports/1/state
~~~

The response identifies state, priority, GUID, and activity count. The normal outcome is exactly one `Master` and the other configured instance in `Standby`. Check each SM's own log as well; a client-side query typically reports the current master, not a complete inventory of every standby.

Useful operational evidence includes:

- the master GUID and LID seen from multiple subnet locations;
- each instance's local state and priority;
- last successful sweep and sweep duration;
- master polling failures and state transitions;
- fabric topology and error state before and after handover.

Alert on loss of redundancy, not only loss of the master. A standby that has been dead for three months provides no protection during the next maintenance window.

## Test Handover as a Controlled Failure

A green process dashboard does not validate redundancy. Schedule a test during an approved window:

1. Capture `sminfo`, port state, topology, and application health from several locations.
2. Confirm that the intended preferred instance is `Master` and the alternate is `Standby`.
3. Stop only the master service or isolate only its designated SM port using the documented maintenance procedure.
4. Measure detection, election, first sweep, and application recovery.
5. Verify that the former standby is now the sole `Master` and that ports remain or return `Active`.
6. Compare partitions, routes, LIDs, link state, and error counters with the baseline.
7. Restore the preferred instance and confirm the expected priority-driven transition. Current upstream OpenSM is preemptive, but test the exact versions and product combination rather than assuming identical failback timing or behavior.

Use graceful service control for the first test, then later exercise host or path failure if the risk permits. Killing both managers at once does not test handover. Using `sminfo` to issue an SMInfo Set for a forced state change is also a poor routine test: the official manual warns that using `sminfo` for more than a simple query can malfunction the target SM.

## Plan for Convergence, Not Zero-Time Failover

The standby detects master failure by polling. NVIDIA documents properties such as `sminfo_polling_timeout` and `polling_retry_number`; together with election and the new master's sweep, they make failover non-instantaneous. Do not promise a fixed outage from defaults copied from another release. Measure the effective configuration and the topology-dependent sweep time.

Applications may react differently during that interval. Existing traffic can be affected by topology state, while new path or multicast resolution may wait for the Subnet Administrator. Monitor representative MPI, storage, IPoIB, and management operations, not just whether ports eventually say `Active`.

## Official Documentation

- [OpenSM: official `opensm(8)` manual, including priority and GUID binding](https://github.com/linux-rdma/opensm/blob/master/man/opensm.8.in)
- [rdma-core: `sminfo(8)` states, priority, and safety warning](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/sminfo.8.in.rst)
- [NVIDIA UFM: Subnet Manager properties for priority, polling, allowlists, and other SMs](https://docs.nvidia.com/networking/display/ufmenterpriseumv6242/ufm-subnet-manager-default-properties)
- [NVIDIA: OpenSM application documentation](https://docs.nvidia.com/doca/sdk/nvidia-sm/index.html)
- [Linux kernel: stable InfiniBand sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [rdma-core: `ibstat(8)` port and GUID reporting](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst)

## Conclusion

Healthy OpenSM redundancy has one elected master, one or more observable standbys, deliberate priorities, independent failure domains, and compatible fabric policy. Let the SM protocol perform election; do not set peers to ignore one another or rely on two uncontrolled masters. The final proof is a measured handover that preserves the intended partitions, routes, LIDs, and application behavior—not merely two running services.
