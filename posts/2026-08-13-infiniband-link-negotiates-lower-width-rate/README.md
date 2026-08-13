# Why InfiniBand Negotiated 1X or a Lower Link Rate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: InfiniBand, Link Width, Link Speed, ConnectX, mlxlink, Network Performance

Description: Explain and diagnose an InfiniBand link that activates at 1X or below the adapter's advertised rate by comparing supported, enabled, and active capabilities end to end.

---

An HCA advertised as HDR, NDR, or another high InfiniBand generation does not guarantee that every connection will run at that rate or at 4X width. Link training selects an operating combination that both endpoints and the media can use under their current configuration. The HCA nameplate is only one input.

The fastest diagnosis separates three different values:

- **Supported** is what a port or component is capable of.
- **Enabled** is the subset an administrator or firmware currently permits.
- **Active** is what this link actually negotiated.

`ibstat` is valuable, but it primarily shows local port state and the aggregate active rate; it does not report the negotiated lane width separately. It cannot, by itself, tell you whether 1X is an intentional breakout, the remote port is restricted, the cable supports a lower generation, or one end failed to train the wider common mode.

## Record the Active Link Before Changing It

Capture the local driver view and the fabric view:

~~~console
$ ibstat mlx5_0 1
$ cat /sys/class/infiniband/mlx5_0/ports/1/rate
$ cat /sys/class/infiniband/mlx5_0/ports/1/state
$ cat /sys/class/infiniband/mlx5_0/ports/1/phys_state
$ iblinkinfo -C mlx5_0 -P 1 -l
~~~

`ibstat` reports the local LID, SM LID, state, aggregate active rate, and physical state. Linux also exposes that aggregate rate-active width multiplied by active speed-through the stable InfiniBand sysfs ABI. `iblinkinfo` gives each discovered link's active width and speed plus its remote endpoint, which prevents comparing the HCA with the wrong switch port.

Save this output with device GUIDs and node descriptions. Port names such as `mlx5_0` and switch faceplate labels can be reordered or mapped differently after maintenance. A GUID-to-port record makes the before/after comparison trustworthy.

## Compare the Whole Capability Chain

The operational combination cannot exceed any limiting component:

~~~text
local port supported and enabled set
        intersect
local cage / port-split lane allocation
        intersect
cable or optical module capabilities
        intersect
remote cage / port-split lane allocation
        intersect
remote port supported and enabled set
        equals
possible negotiated combinations
~~~

Inspect both endpoints. NVIDIA switch commands report supported and active speeds and widths. NVIDIA's `mlxlink` provides a physical-layer view for supported devices and media. First list the devices, then assign the appropriate path from the `MST` column to `adapter_mst_device` before running the two `mlxlink` commands:

~~~console
$ sudo mst status -v
$ sudo mlxlink -d "$adapter_mst_device"
$ sudo mlxlink -d "$adapter_mst_device" --show_module
~~~

For a switch, use its documented local interface command or address the switch device and port with the appropriate `mlxlink -p` selector. MFT documentation cautions that adapters may use distinct MST devices for their ports, so do not copy a switch-style port selector onto an HCA without checking that release's mapping.

Record supported, enabled, and active speed/width on both sides plus cable part number, technology, and breakout identity. The first asymmetric row usually explains the negotiation.

## Recognize Intentional 1X and Split-Port Designs

A 1X result is not automatically a failed lane. Modern switch cages can expose multiple logical ports, and breakout cables divide the available lanes according to a supported split profile. In that design, a logical connection may be expected to use fewer lanes than the unsplit physical cage.

Verify:

- the switch port split profile;
- which leg of the breakout reaches this HCA;
- the port numbering formula used by the switch generation;
- the adapter and cable support matrix for that split;
- whether the topology file expects a 1X, 2X, or 4X link.

NVIDIA's `ibdiagnet` supports expected-link-width checks such as `--lw` for versions documented by the tool, but an expectation must come from the actual topology. Running a blanket “all links must be 4X” policy against intentional breakouts creates false alarms.

## Find Administrative Restrictions

Either endpoint may enable only a subset of its supported speeds or widths. On NVIDIA switches, the relevant interface settings are named `ib-speed` and `lanes` in NVOS, or `speed` and `width` in MLNX-OS; defaults and valid values depend on port/module type. The `ibportstate` diagnostic can query port state and, when querying a switch port over functioning LID routing, validate link speed/width relative to the peer. It can also change settings.

After assigning the discovered switch LID and port to shell variables, use its explicit query operation first:

~~~console
$ ibportstate -C mlx5_0 -P 1 "$switch_lid" "$switch_port" query
~~~

The values assigned to `switch_lid` and `switch_port` must be discovered from the real fabric. Do not paste example addresses. Configuration operations such as `speed` or `width` can take down or destabilize a link and should be made through the fabric's supported change process.

Common configuration causes include:

- a port left restricted after an earlier compatibility test;
- different allowed speed masks on the two switch ends;
- a split profile that allocates fewer lanes than expected;
- a saved firmware setting that became active only after reboot;
- a switch template applied to the wrong port range.

Correct the inconsistent policy rather than forcing only the highest rate. Keeping no compatible fallback can make the link remain `Polling` instead of negotiating a usable lower mode.

## Validate the Cable and Module Capability

The media must support the selected generation, reach, connector, lane count, and modulation used by both endpoints. Read the module data and compare the exact part number with the adapter and switch support matrices. “QSFP” or “OSFP” describes a form factor, not universal protocol or rate compatibility.

Look for:

- a cable qualified only for a lower InfiniBand generation;
- an incorrect breakout assembly or swapped breakout leg;
- active optical or copper firmware outside the supported matrix;
- loss-of-signal, power, temperature, or per-lane diagnostic alarms;
- a marginal lane that prevents the wider training combination.

Substitute one known-good, validated cable of the same intended type. If the active width/rate returns to the expected value and remains stable under traffic, the original media is implicated. If the restriction remains on the same receiver port across cables, investigate that port, cage, or SerDes.

## Distinguish Capability Mismatch from Signal Degradation

A stable lower link with clean physical counters often points to capability or enabled-mask intersection. A link that flaps, accumulates physical errors, or changes width/rate after reseating is more consistent with signal integrity.

Collect counters before and during a controlled traffic interval:

~~~console
$ perfquery -C mlx5_0 -P 1
$ sudo mlxlink -d "$adapter_mst_device" --show_counters
$ ibqueryerrors -C mlx5_0 -P 1 --report-port --details
~~~

`perfquery` reads standard performance-management counters; `ibqueryerrors` reports fabric ports exceeding configured thresholds. Modern links can also expose BER, FEC, and link-level retransmission details through `mlxlink` or `ibdiagnet`. A clean standard symbol-error counter alone does not prove a high-speed link is healthy, because newer physical correction and link-level retry mechanisms may handle errors elsewhere.

Do not clear counters until you have saved both ends and their collection time. Absolute totals without a known baseline are less useful than synchronized deltas under known traffic.

## Check Firmware and Hardware Identity Last

Firmware influences supported modes and interoperability, but an update is not the first response to a 1X link. Query the exact device, PSID, and firmware first:

~~~console
$ sudo mlxfwmanager --query
$ cat /sys/class/infiniband/mlx5_0/fw_ver
~~~

Compare them with the vendor or OEM support matrix for the driver stack and peer device. Firmware becomes a strong candidate when the installed combination is unsupported or release notes describe the exact negotiation issue. Preserve OEM PSID requirements and follow the documented reset or reboot procedure.

After any approved cable, split-profile, enabled-mask, or firmware change, verify all three values again: supported, enabled, and active. Then run sustained traffic and confirm the error/recovery counters do not grow.

## Official Documentation

- [rdma-core: `ibstat(8)` basic local port status reporting](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst)
- [rdma-core: `iblinkinfo(8)` fabric link reporting](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/iblinkinfo.8.in.rst)
- [rdma-core: `ibportstate(8)` speed/width query and configuration](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibportstate.8.in.rst)
- [NVIDIA NVOS: InfiniBand switch `ib-speed` and `lanes` commands](https://docs.nvidia.com/networking/display/nvidianvosusermanualforinfinibandswitchesv25027002/infiniband-interface-commands)
- [NVIDIA MFT: `mlxlink` physical-layer diagnostics](https://networking-docs.nvidia.com/mftswum/4350/mlxlink-utility)
- [NVIDIA: `ibdiagnet` fabric diagnostic manual](https://networking-docs.nvidia.com/ibdiagnetutilityum/2250)
- [Linux kernel: stable InfiniBand sysfs rate and state interfaces](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)

## Conclusion

A lower active rate or 1X width is the result of the end-to-end supported and enabled intersection, not a contradiction of the HCA's maximum specification. Map the actual peer, record active values, compare both endpoints and media, and recognize intentional split-port designs. Configuration asymmetry with clean counters points toward an enabled-mask or capability limit; flaps and growing physical diagnostics point toward media or a receiver. Change one cause at a time, then prove the expected width, rate, and stability under load.
