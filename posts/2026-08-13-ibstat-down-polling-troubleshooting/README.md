# Diagnose InfiniBand Down/Polling Without Guessing at the Cable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: InfiniBand, ibstat, ConnectX, Cable Diagnostics, Firmware, RDMA

Description: Separate cable, port, firmware, administrative, and VPI link-mode faults when ibstat reports a logical Down state and a physical Polling state.

---

`ibstat` showing `State: Down` and `Physical state: Polling` means the port has not completed physical link training. That places the first fault below subnet management. OpenSM cannot assign a LID or make the port `Active` until two compatible InfiniBand endpoints establish a physical link.

Do not immediately replace the cable, update firmware, and restart every RDMA service. Those simultaneous changes destroy the evidence that distinguishes a bad cable from a disabled switch port, an Ethernet/InfiniBand mode mismatch, unsupported media, or a driver that never initialized the HCA. Work from PCI discovery toward the peer, changing one variable at a time.

## Confirm That You Are Looking at the Right Port

Inventory the PCI function, RDMA device, port, and runtime link layer:

~~~console
$ lspci -nnk | grep -A3 -iE 'infiniband|network controller|mellanox|nvidia'
$ rdma dev show
$ rdma link show
$ ibstat
$ readlink -f /sys/class/infiniband/mlx5_0/device
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
~~~

The RDMA name `mlx5_0` is not a persistent PCI address, and ordering can change after hardware or kernel changes. Map it to its PCI device before touching a cable or firmware image. On a multiport or Socket Direct adapter, also verify the adapter documentation's mapping between PCI functions, physical cages, and logical ports.

If `link_layer` is `Ethernet`, this is not an InfiniBand port at runtime. A VPI-capable adapter can expose RDMA over Ethernet, but an Ethernet port will not train an InfiniBand link against an IB switch port. Query its persistent VPI configuration before changing it:

~~~console
$ sudo mlxconfig -d 0000:5e:00.0 query | grep -E 'LINK_TYPE_P[12]'
~~~

`LINK_TYPE_P1` and `LINK_TYPE_P2` exist only where the device supports those settings. Do not assume every ConnectX SKU is VPI; Ethernet-only and InfiniBand-only products cannot be converted by inventing a `mlxconfig` value.

## Prove That the Driver Initialized the Hardware

When `/sys/class/infiniband` is empty, `Down/Polling` is not yet the right diagnosis. Check kernel modules and the current boot log:

~~~console
$ lsmod | grep -E 'mlx5_core|mlx5_ib|ib_core|ib_uverbs'
$ modinfo mlx5_core | grep -E '^(filename|version|vermagic):'
$ modinfo mlx5_ib | grep -E '^(filename|version|vermagic):'
$ sudo dmesg -T | grep -iE 'mlx5|firmware|infiniband|rdma|module'
~~~

For ConnectX-4 and later NVIDIA adapters, `mlx5_core` provides common device initialization and Ethernet functions, while `mlx5_ib` plugs InfiniBand-specific functions into the RDMA mid-layer. A PCI function can therefore be visible while the RDMA side failed to load. Resolve module, firmware compatibility, Secure Boot, or resource errors before diagnosing the external link.

Do not mix distribution inbox modules with leftover MLNX_OFED/DOCA-OFED components. `modinfo ... filename` shows which installed tree supplies a module; compare its `vermagic` with `uname -r` after a kernel upgrade.

## Compare Both Ends of the Physical Link

Once the local HCA exists and the runtime link layer is InfiniBand, collect the state from the switch port or peer HCA. NVIDIA switch output distinguishes logical state and physical state and reports supported/active speed and width. The useful comparison is:

| Local endpoint | Cable or module | Remote endpoint |
| --- | --- | --- |
| administratively enabled | supported part number and technology | administratively enabled |
| configured for InfiniBand | seated, powered, correct breakout | configured for InfiniBand |
| compatible enabled speed/width | supports that generation and lane layout | compatible enabled speed/width |
| supported firmware | no LOS/module alarm | supported firmware |

A switch port that is shut down can leave the HCA polling. So can plugging an InfiniBand HCA into an Ethernet-configured VPI switch port. Check the switch's actual interface, not a port number inferred from rack labels. If the switch reports an unexpected neighbor or no module, correct the physical mapping first.

Use the read-only form of NVIDIA's physical-layer tool where it supports the device. If the MFT MST driver is not already running, start it so the `/dev/mst` device nodes exist. For an adapter, current MFT documentation says to address the appropriate MST device; switch ports use the port selector:

~~~console
$ sudo mst start
$ sudo mst status -v
$ sudo mlxlink -d /dev/mst/<adapter-device>
$ sudo mlxlink -d /dev/mst/<switch-device> -p <switch-port>
~~~

`mlxlink` reports link and cable information supported by that device and firmware. `--show_module` and `--show_counters` add module and physical counter data. Do not use `--port_state`, `--speeds`, `--fec`, `--test_mode`/PRBS, or `--serdes_tx` during an initial read-only investigation; those are configuration or test operations and can take the link down.

## Isolate Cable and Module Faults Safely

Start with non-destructive physical checks:

1. Verify the exact cable/module part number against both endpoint support matrices.
2. Check that the breakout type and split-port configuration agree at both ends.
3. Inspect module presence, loss-of-signal, temperature, voltage, and per-lane optical power where the module exposes them.
4. Reseat one end during an approved maintenance window, then capture state again.
5. Substitute a known-good, supported cable of the same type and length.

If the failure follows the cable, the cable or integrated transceiver is implicated. If it stays with one receiver port across known-good media, investigate that cage, adapter, switch port, or its SerDes. If it moves when only a module moves, the module is the stronger suspect.

Do not clean optics, bend fiber, or use loopbacks outside the vendor's handling procedure. Active copper cables, active optical cables, and optical modules contain electronics; treating them as passive wire can miss power, firmware, or module compatibility faults.

## Check Enabled Speed and Width Without Forcing Them

The two ports negotiate a common enabled speed and width. An administrator may have restricted one end, a breakout may intentionally use fewer lanes, or the cable may not support the highest generation advertised by the HCA. Query before changing:

~~~console
$ ibstat mlx5_0 1
$ sudo mlxlink -d /dev/mst/<adapter-device>
~~~

When the fabric has an active management path, `ibportstate` can query an InfiniBand port. Its `query` operation validates speed and width against the peer only when the queried port is a switch port, and that peer validation requires working LID routing. For a completely down link, use the local endpoint and switch-local tools instead.

Do not force the HCA's maximum advertised speed at both ends as a troubleshooting shortcut. The common supported set includes the adapter, firmware, switch ASIC, port split, and media. Removing all fallback speeds can turn a degraded but diagnosable link into a hard-down link.

## Treat Firmware as a Verified Dependency

Query firmware and the device PSID; do not flash merely because a newer version exists:

~~~console
$ sudo mlxfwmanager --query
$ cat /sys/class/infiniband/mlx5_0/fw_ver
~~~

The PSID identifies the board-specific firmware configuration used to select a matching image. OEM adapters may require OEM-qualified firmware, and the driver release has its own supported firmware matrix. Compare the installed firmware, adapter PSID, driver stack, and operating-system support documentation. Capture the current state before an approved update and use the vendor's documented reset or reboot procedure afterward.

Firmware becomes a leading hypothesis when logs explicitly report incompatibility, the running release is outside the supported matrix, multiple known-good cables fail on the same hardware, or a documented issue matches the device. It should not outrank a shut switch port or an IB/Ethernet mode mismatch that is already visible.

## Know When the Subnet Manager Matters

The SM becomes the leading focus when physical state reaches `LinkUp` and logical state is `Initializing` while waiting for SM discovery and LID assignment. NVIDIA's troubleshooting documentation explicitly separates that initializing condition from driver/device failures.

Use this boundary:

- `Down/Polling`: diagnose driver initialization, administrative state, link type, endpoints, media, enabled speeds/widths, and firmware.
- `Initializing/LinkUp`: diagnose the Subnet Manager, its reachability, and fabric sweep.
- `Active/LinkUp`: move on to partitions, routes, counters, IPoIB, or the application path.

That state machine prevents spending hours restarting OpenSM while the two PHYs cannot communicate.

## Official Documentation

- [rdma-core: `ibstat(8)` fields and usage](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibstat.8.in.rst)
- [Linux kernel: stable InfiniBand sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [NVIDIA NVOS: InfiniBand interface state, speed, width, and counters](https://docs.nvidia.com/networking/display/nvidianvosusermanualforinfinibandswitchesv25027002/infiniband-interface-commands)
- [NVIDIA MFT 4.36: Linux `mst` service](https://networking-docs.nvidia.com/mftswum/4.36.0/linux)
- [NVIDIA MFT 4.36: `mlxlink` utility](https://networking-docs.nvidia.com/mftswum/4.36.0/mlxlink-utility)
- [NVIDIA MFT 4.36: `mlxfwmanager` query tool](https://networking-docs.nvidia.com/mftswum/4.36.0/mlxfwmanager-firmware-update-and-query-tool)
- [NVIDIA: InfiniBand-related troubleshooting issues](https://docs.nvidia.com/networking/display/mlnxofedv23105140lts/infiniband-related-issues)
- [NVIDIA MFT 4.36: `mlxconfig` VPI link-type parameters](https://networking-docs.nvidia.com/mftswum/4.36.0/using-mlxconfig)

## Conclusion

`Down/Polling` is a physical-link investigation, not an OpenSM investigation. First map the RDMA port to the correct PCI function, confirm the driver and runtime InfiniBand link layer, then compare administrative state, media, speed, width, and module evidence at both endpoints. Use a known-good supported cable as a controlled substitution and consider firmware only against the exact PSID and support matrix. When physical state becomes `LinkUp` and logical state is `Initializing`, the diagnostic boundary moves to the Subnet Manager.
