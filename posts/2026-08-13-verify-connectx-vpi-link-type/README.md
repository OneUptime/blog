# Verify ConnectX Ethernet or InfiniBand Mode Before Reconfiguring VPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ConnectX, VPI, InfiniBand, Ethernet, RoCE, mlxconfig

Description: Verify a ConnectX port's runtime link layer and persistent VPI setting, map it to the correct PCI function, and change link type only when the exact SKU and peer support it.

---

An NVIDIA ConnectX port that appears in RDMA tools is not necessarily running InfiniBand. RDMA over an Ethernet link is normally RoCE, and libibverbs exposes both InfiniBand and Ethernet link layers. Conversely, a VPI-capable physical port may be configured to boot as either InfiniBand or Ethernet.

Before changing firmware configuration, answer three separate questions:

1. What link layer is the running kernel using now?
2. What link type is configured persistently for the next initialization?
3. Does this exact adapter SKU, port combination, peer, and cable support the desired mode?

Confusing those questions causes unnecessary outages. A pending `mlxconfig` value may differ from runtime until the product's documented reboot, firmware reset, or power cycle, and an Ethernet-only ConnectX SKU cannot become InfiniBand just because it uses the `mlx5` driver.

## Read the Runtime Link Layer First

Use the Linux RDMA port, not a guessed network-interface name:

~~~console
$ rdma dev show
$ rdma link show
$ ibv_devinfo -d mlx5_0 -i 1
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
~~~

The decisive runtime values are:

- `InfiniBand`: the port uses the native InfiniBand link layer and depends on an InfiniBand Subnet Manager to become logically `Active`.
- `Ethernet`: the RDMA device is associated with an Ethernet link layer; RDMA traffic, if configured, is RoCE. OpenSM does not manage it.

`rdma link show` adds state and, for Ethernet/RoCE ports, commonly shows the associated netdev. `ibv_devinfo` reports the verbs view. The stable sysfs `link_layer` file is a simple kernel view suitable for scripts.

Do not infer mode from these weak signals:

- Device name `mlx5_0`: mlx5 supports NVIDIA Ethernet, RoCE, and InfiniBand functions.
- Presence of `/dev/infiniband`: that directory also serves RDMA devices whose link layer is Ethernet.
- Netdev name: interfaces can have predictable or administratively assigned names, and IPoIB is itself a Linux netdev.
- Cable form factor: QSFP and OSFP modules are not inherently one protocol.

## Map the RDMA Port to the Correct PCI Device

The persistent setting is applied to a PCI device and physical port. Map deliberately:

~~~console
$ readlink -f /sys/class/infiniband/mlx5_0/device
$ lspci -nnk -s 0000:5e:00.0
$ sudo mlxfwmanager --query
~~~

Use the BDF printed by `readlink`, including the PCI domain. `mlxfwmanager --query` adds device type, PSID, part number, firmware, and port identities where supported. On multi-host, Socket Direct, SR-IOV, and multi-function cards, several PCI functions can represent one product; use the adapter manual's mapping rather than assuming function 0 means physical port 1.

For an Ethernet netdev, `ethtool -i <interface>` can report its `bus-info`, which provides another mapping back to PCI. A guest with a passed-through VF sees only its assigned function and normally cannot change the physical port's VPI firmware policy; that belongs on the host/PF.

## Query Persistent VPI Configuration Read-Only

NVIDIA MFT's `mlxconfig` reads device configuration by BDF or MST device:

~~~console
$ sudo mlxconfig -d 0000:5e:00.0 query | grep -E 'LINK_TYPE_P[12]'
~~~

Typical capable-device values are `IB(1)` for InfiniBand and `ETH(2)` for Ethernet. MFT also accepts textual values such as `IB` and `ETH`; numeric values `1` and `2` remain supported and also appear in current NVIDIA documentation.

Treat this output as the saved device configuration that will be loaded on initialization. Compare it with runtime sysfs. If someone set a new value but has not completed the product's documented activation step, these can legitimately disagree:

| Runtime `link_layer` | Saved `LINK_TYPE` | Interpretation |
| --- | --- | --- |
| InfiniBand | IB | consistent |
| Ethernet | ETH | consistent |
| Ethernet | IB | pending change, wrong PCI mapping, or failed activation |
| InfiniBand | ETH | pending change or wrong PCI mapping |

Do not “fix” a mismatch until you confirm maintenance history and the exact BDF. Performing the documented activation step in the middle of diagnosis may activate a previously staged change and remove the evidence.

## Prove That the Hardware Is Actually VPI

`mlxconfig` can show only parameters supported by the device firmware. Also verify the exact ordering part number in NVIDIA's adapter documentation. Products within one ConnectX generation have different protocol capabilities; for example, an Ethernet-focused SKU is not made VPI by a driver option.

Check all of these before setting a link type:

- adapter OPN/PSID and user manual;
- firmware/MFT supported-parameter output (`mlxconfig -d <device> show_confs` where documented);
- allowed per-port combinations for a dual-port card;
- supported speed in the desired protocol;
- cable/module support for both adapter and peer;
- the peer switch port's protocol and breakout configuration.

Some VPI devices permit one port in InfiniBand and another in Ethernet, but the valid speed combinations are device-specific. Do not generalize one ConnectX-6 or ConnectX-8 matrix to every card.

## Decide Whether Reconfiguration Is the Right Fix

Use runtime evidence to classify the original symptom:

- If the intended fabric is InfiniBand but sysfs says `Ethernet`, a VPI mode mismatch is plausible. Confirm the switch port is InfiniBand and the hardware is VPI.
- If sysfs says `InfiniBand` and physical state is `Polling`, inspect peer mode, administrative state, cable, speed, and width. Rewriting the already-correct HCA mode adds no value.
- If sysfs says `InfiniBand`, physical state is `LinkUp`, and logical state is `Init`, investigate the Subnet Manager rather than VPI.
- If sysfs says `Ethernet` and RoCE is intended, keep Ethernet mode and investigate the Ethernet/RoCE configuration, GIDs, VLAN, lossless policy where required, and application selection.

This prevents using a firmware-level change to solve a control-plane or transport-selection problem.

## Change Link Type as a Planned Outage

Before the change, save the full query, firmware/PSID, runtime link layer, PCI mapping, network configuration, and a rollback value. Drain RDMA, IPoIB, storage, and cluster workloads using the port. Ensure the management session does not depend on the interface being changed.

For a device whose documentation confirms VPI support, the command shape is:

~~~console
$ sudo mlxconfig -d 0000:5e:00.0 set LINK_TYPE_P1=IB
~~~

The equivalent numeric form is `LINK_TYPE_P1=1` for IB and `LINK_TYPE_P1=2` for Ethernet. Set only the intended physical port; do not copy `LINK_TYPE_P2` onto a single-port device. Review the interactive summary before accepting it.

NVIDIA's generic MFT port-type procedure requires a reboot for the new configuration to load, while some products require a full power cycle. Follow the exact adapter and platform documentation. Some products support particular firmware reset flows, but use one only when the exact adapter, platform, and MFT documentation says it safely activates this setting. A planned reboot or power cycle is preferable to improvising a live reset around active storage or networking.

After the documented activation step, verify independently:

~~~console
$ cat /sys/class/infiniband/mlx5_0/ports/1/link_layer
$ sudo mlxconfig -d 0000:5e:00.0 query | grep LINK_TYPE_P1
$ ibv_devinfo -d mlx5_0 -i 1
$ rdma link show
~~~

In InfiniBand mode, also require `Physical state: LinkUp`, a reachable SM, a nonzero LID, and logical `Active`. In Ethernet mode, verify the expected netdev, link, VLAN, IP/GID table, and RoCE transport. A correct `LINK_TYPE` value is not an end-to-end test.

## Official Documentation

- [Linux kernel: stable InfiniBand `link_layer` sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [rdma-core: `ibv_devinfo(1)` userspace device query](https://github.com/linux-rdma/rdma-core/blob/master/libibverbs/man/ibv_devinfo.1)
- [NVIDIA MFT: querying and setting IB/ETH parameters with `mlxconfig`](https://docs.nvidia.com/networking/display/nvidia-firmware-tools-mft-documentation-v4-31-0-6012.0-6012.pdf)
- [NVIDIA MFT: supported parameters and textual values](https://docs.nvidia.com/networking/display/nvidia-firmware-tools-mft-documentation-v4-31-0-6012.0-6012.pdf)
- [NVIDIA: Linux port type management and reboot requirement](https://docs.nvidia.com/networking/display/RHEL94/port-type-management.pdf)
- [NVIDIA: ConnectX-6 VPI per-port combinations and `LINK_TYPE` values](https://docs.nvidia.com/networking/display/nvidia-connectx-6-adapter-cards-firmware-release-notes-v20-43-4100-lts-2024-lts-u4.4100%20LTS%20%282024%20LTS%20U4%29.pdf)
- [NVIDIA: high-speed port link type and persistent configuration](https://docs.nvidia.com/networking/display/ConnectX8OCP3/Setting-High-Speed-Port-Link-Type)
- [NVIDIA: ConnectX-8 C8180P port configurations and power-cycle requirement](https://networking-docs.nvidia.com/connectx8ocphw/port-configurations)

## Conclusion

Verify runtime `link_layer`, persistent `LINK_TYPE`, and hardware capability as separate facts. Map the RDMA port to an exact PCI BDF and PSID, because `mlx5_0` and a ConnectX family name do not establish physical-port identity or VPI capability. Reconfigure only when the card, peer, cable, and per-port combination support the desired protocol, then activate it through the documented reboot, firmware reset, or power cycle and test the complete InfiniBand or RoCE path.
