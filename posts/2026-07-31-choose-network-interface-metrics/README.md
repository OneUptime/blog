# Which Network Interface Should You Graph Without Duplicating Traffic?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Prometheus, Node Exporter, Network Monitoring, Bonding, Bridge, VLAN

Description: Choose the Linux interface layer that matches your monitoring question and avoid double counting traffic across stacked physical and virtual devices.

---

Linux network interfaces form a graph, not a flat list. A packet may cross a VLAN device, a bridge, a bond, a physical NIC, and virtual Ethernet endpoints. Each layer can expose valid counters for its own view of the packet.

Adding every `node_network_*` series therefore does not produce “total host traffic.” It often counts the same packet several times.

## First Decide What the Graph Means

Use the interface whose semantic boundary matches the question:

| Question | Usually graph | Keep as supporting detail |
| --- | --- | --- |
| How much service traffic enters this host? | service-facing logical interface, often a bond or VLAN | physical-member errors and link state |
| Is a bonded link balanced? | each physical bond member | bond aggregate |
| How much traffic belongs to VLAN 120? | VLAN subinterface | lower physical path |
| How much traffic is forwarded across a Linux bridge? | selected bridge ports for the relevant direction | bridge device for traffic delivered to or originated by the host |
| Which container endpoint is noisy? | selected veth/workload metrics | host uplink |
| Is the physical port saturated or faulty? | physical NIC and driver statistics | logical interface throughput |

No single interface is correct for every dashboard.

## Map the Interface Stack on the Host

Start with Linux's link view:

```bash
ip -d link show
ip -s -s link show
```

Useful sysfs relationships include:

```bash
readlink /sys/class/net/bond0/master
readlink /sys/class/net/eth0/master
cat /sys/class/net/eth0/ifindex
cat /sys/class/net/eth0/iflink
```

For bonds:

```bash
cat /proc/net/bonding/bond0
```

For bridges and VLANs:

```bash
bridge link show
bridge vlan show
```

Save this topology as operational metadata. Interface-name regexes alone cannot tell whether `ens5` is a direct uplink, a bond member, or a bridge port.

## Bonds: Aggregate View Versus Member Health

A bond is a logical network interface whose members are physical links.

For application-facing host traffic, the bond is often the best boundary:

```promql
8 * rate(
  node_network_receive_bytes_total{
    device="bond0"
  }[5m]
)
```

For link distribution and faults, keep each member:

```promql
rate(
  node_network_transmit_bytes_total{
    device=~"ens5f0|ens5f1"
  }[5m]
)
```

```promql
rate(
  node_network_receive_errs_total{
    device=~"ens5f0|ens5f1"
  }[5m]
)
```

Do not add the bond's bytes to all member bytes. They are different observations along the same path.

Bonding mode matters. Active-backup, balance-xor, 802.3ad, and broadcast modes distribute traffic differently. A single connection may use only one member even when aggregate traffic can use several. Interpret “50% utilized” against the actual bonding policy and switch configuration.

## VLANs: Logical Tenant Traffic and Physical Wire Traffic

A VLAN subinterface such as `bond0.120` represents traffic at that VLAN layer. The lower `bond0` also observes the traffic carried beneath it.

Use:

- `bond0.120` for traffic attributed to VLAN 120;
- `bond0` for combined traffic on the logical uplink;
- physical members for physical-link distribution and errors.

Summing `bond0.120`, other VLAN interfaces, `bond0`, and bond members creates several copies of the same traffic.

## Bridges: Decide Between the Bridge and Its Ports

A Linux bridge forwards frames among member ports. Depending on the question, monitor:

- the bridge device for traffic delivered to or originated by the host at that logical interface;
- bridge ports for ingress and egress on specific attached segments;
- physical uplinks for actual link capacity and hardware errors;
- workload endpoints for per-workload attribution.

“All bridge plus all ports” is not a meaningful throughput total. A forwarded frame can be visible at ingress and egress ports, and the physical path may be represented again below the bridge.

The Linux bridge documentation also supports per-VLAN statistics when configured. Those statistics answer a more specific question than an unfiltered device total.

## Veth Devices: High Churn and Workload Scope

A veth pair consists of two interconnected virtual Ethernet devices, often placed in different network namespaces. Container platforms can create and delete many pairs, often with generated host-side names.

Fleet host dashboards usually exclude them:

```promql
rate(
  node_network_receive_bytes_total{
    device!~"lo|veth.*|cali.*|cilium_.*"
  }[5m]
)
```

That pattern is only an example. Inspect your CNI and interface inventory first.

If the goal is per-container or per-Pod traffic, host-side veth names are a poor durable identity. Prefer workload-aware metrics that carry namespace, Pod, and container labels. Otherwise a deleted and recreated interface can reuse an opaque label and break continuity.

## Loopback and Other Virtual Devices

Loopback traffic is real host activity, but it does not consume an external NIC. Include `lo` only when measuring local IPC or proxy paths.

Treat these according to purpose:

- `tun`/`tap` and WireGuard devices may be the right boundary for tunnel traffic;
- a tunnel's underlay interface also carries the encapsulated bytes and tunnel overhead, with encrypted tunnels carrying ciphertext there;
- `docker0` and CNI bridges represent container networking layers;
- dummy devices may carry routes without physical traffic;
- SR-IOV virtual functions expose their assigned traffic, while representors can expose hardware-switch port views.

Create an inclusion policy rather than an ever-growing exclusion regex.

## Attach an Operational Role

node_exporter's textfile collector can expose static machine-tied metadata. For example:

```text
node_network_role{
  device="bond0",
  role="service_uplink"
} 1

node_network_role{
  device="ens5f0",
  role="bond_member"
} 1
```

Write the file atomically, as node_exporter recommends for textfile metrics. You can then join the role to traffic:

```promql
rate(node_network_receive_bytes_total[5m])
and on (instance, device)
node_network_role{role="service_uplink"} == 1
```

For centrally managed infrastructure, generate the same role mapping from source-controlled inventory. Alert when a production host has zero or multiple `service_uplink` interfaces.

## Filter at Collection Only After Proving the View

node_exporter supports netdev device include and exclude flags. Collection-time filtering reduces series volume but removes your ability to investigate excluded interfaces later.

Start by filtering dashboards and recording rules. After observing real topology and query usage, apply a reviewed collection filter such as:

```text
--collector.netdev.device-exclude=^(lo|veth.*)$
```

Do not copy this blindly. It may remove an interface your CNI, tunnel, or host networking design needs.

## A Layered Dashboard

A useful node network dashboard has separate sections:

1. service-facing logical throughput;
2. physical member throughput and utilization;
3. drops, errors, carrier state, and link changes per physical device;
4. tunnel or VLAN allocation where relevant;
5. top workload traffic from a workload-aware source;
6. interface topology and role metadata.

This preserves relationships instead of compressing every layer into one false total.

## Validation Exercise

Generate a controlled transfer and observe each layer:

```bash
ip -s -s link show
```

Compare counter changes on:

- the service-facing interface;
- its lower device or bond;
- physical members;
- bridge ports;
- relevant VLAN or tunnel.

Document which interfaces increment and why. Repeat for host-terminated, forwarded, and container traffic; the path can differ.

The right interface is the one that defines the boundary you intend to measure. Once that boundary is explicit, duplicate traffic stops being a Prometheus mystery and becomes a Linux topology fact.

## Official Documentation

- [Linux kernel: Interface statistics](https://docs.kernel.org/networking/statistics.html)
- [Linux kernel: Ethernet bridging](https://docs.kernel.org/networking/bridge.html)
- [Linux kernel: Ethernet bonding driver](https://docs.kernel.org/networking/bonding.html)
- [node_exporter: netdev collector and device filters](https://github.com/prometheus/node_exporter)
- [Prometheus: Query operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)
