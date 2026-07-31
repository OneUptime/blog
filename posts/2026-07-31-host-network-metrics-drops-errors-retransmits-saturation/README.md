# Which Network Metrics Catch Real Host Problems? Drops, Errors, Retransmits, and Saturation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Prometheus, Node Exporter, Network Monitoring, TCP, Alerting

Description: Detect host network failures with interface state, drop and error rates, TCP retransmissions, directional utilization, and workload symptoms.

---

Network byte throughput is useful, but it rarely identifies the failure by itself. A host can be far below link speed and still lose packets because a receive ring, kernel queue, virtual switch, firewall, or remote path is unhealthy.

For host monitoring, organize signals by layer:

1. **link state:** can the interface carry traffic?
2. **interface delivery:** are packets dropped or malformed locally?
3. **transport recovery:** is TCP retransmitting?
4. **capacity:** is a direction near a meaningful limit?
5. **service impact:** are requests slow or failing?

Each layer answers a different question. Alerting on all of them with the same severity creates noise.

## Start with Interface State

The node exporter `netclass` collector exposes:

```promql
node_network_up
```

A value of one means the kernel operational state is `up`; zero means otherwise. It also exposes carrier change counters such as:

```promql
rate(node_network_carrier_down_changes_total[15m])
```

An unexpected down state on the primary interface is immediately actionable. A down loopback, unused NIC, container veth, or standby bond member may be normal.

Maintain an inventory or a stable label that says which interfaces are expected to be up. A regex that alerts on every device name will page on ephemeral interfaces.

## Drops and Errors Are Counters

Common default netdev metrics include:

```text
node_network_receive_drop_total
node_network_transmit_drop_total
node_network_receive_errs_total
node_network_transmit_errs_total
node_network_receive_packets_total
node_network_transmit_packets_total
```

Query recent event rates:

```promql
rate(node_network_receive_drop_total[5m])
```

```promql
rate(node_network_transmit_errs_total[5m])
```

Never alert on `node_network_receive_drop_total > 0`. A counter preserves events since boot, so one historic drop would keep the condition true forever.

Linux defines generic receive drops as packets received but not processed, for example because of insufficient resources or an unsupported protocol. Transmit drops are packets discarded on their way to transmission. Error counters cover malformed frames and device or protocol failures, but their detailed meaning depends on the driver and interface type.

For physical NIC diagnosis, node exporter's optional `ethtool` collector can expose driver statistics corresponding to `ethtool -S`. Enable it selectively: metric names and availability are driver-dependent and can add substantial cardinality.

## Normalize Drops by Traffic

An absolute rate catches a severe burst:

```promql
rate(node_network_receive_drop_total[5m]) > 100
```

A share distinguishes 100 drops during 200 packets from 100 drops during 20 million:

```promql
rate(node_network_receive_drop_total[5m])
/
(
  rate(node_network_receive_packets_total[5m])
  +
  rate(node_network_receive_drop_total[5m])
)
```

This is a practical observed receive-drop share based on the kernel's good-packet and dropped-packet counters. It is not a universal end-to-end loss percentage. Driver accounting, hardware filtering, offload, and folded procfs fields affect what reaches these counters.

Require a minimum event or traffic rate so an idle interface does not produce a dramatic ratio from one packet:

```promql
(
  rate(node_network_receive_drop_total[5m])
  /
  (
    rate(node_network_receive_packets_total[5m])
    +
    rate(node_network_receive_drop_total[5m])
  )
  > 0.005
)
and
(
  rate(node_network_receive_drop_total[5m]) > 10
)
```

Choose the ratio and event threshold from known-good and known-bad periods for each interface class.

## TCP Retransmissions Describe the Path, Not Just the NIC

The node exporter `netstat` collector exposes Linux TCP counters including:

```text
node_netstat_Tcp_RetransSegs
node_netstat_Tcp_OutSegs
```

Recent retransmissions:

```promql
rate(node_netstat_Tcp_RetransSegs[5m])
```

A normalized diagnostic indicator:

```promql
rate(node_netstat_Tcp_RetransSegs[5m])
/
(
  rate(node_netstat_Tcp_OutSegs[5m])
  +
  rate(node_netstat_Tcp_RetransSegs[5m])
)
```

Do not label this a precise packet-loss percentage. Linux documents that `TcpOutSegs` excludes retransmitted segments but includes SYN, ACK, and RST traffic, and its interaction with segmentation offload differs from some receive counters. The ratio is useful for tracking change on the same host and workload.

Retransmissions can be caused by:

- congestion or loss anywhere on the path;
- a remote receiver that cannot keep up;
- reordering;
- local queuing;
- a faulty link;
- virtual-network or security-device behavior.

An interface with zero local error counters can still have high TCP retransmissions because the loss occurs after packets leave that interface.

## Calculate Directional Link Utilization Carefully

The node exporter exports:

```text
node_network_receive_bytes_total
node_network_transmit_bytes_total
node_network_speed_bytes
```

`node_network_speed_bytes` is already expressed in bytes per second. Receive utilization:

```promql
rate(node_network_receive_bytes_total[5m])
/ on (job, instance, device)
(
  node_network_speed_bytes > 0
)
```

Transmit utilization:

```promql
rate(node_network_transmit_bytes_total[5m])
/ on (job, instance, device)
(
  node_network_speed_bytes > 0
)
```

The explicit match works even if netdev metrics carry an additional optional label such as `ifalias`, and the comparison removes zero or negative speed values. Format the resulting ratio as percent in the dashboard, or multiply by 100 exactly once.

For a full-duplex interface, receive and transmit can each approach the nominal speed at the same time. Adding both directions and dividing by one speed can legitimately exceed one, so keep directions separate unless the medium or enforced limit is shared.

Speed may be missing, unknown, misleading, or unrelated to the enforced limit for:

- loopback and virtual interfaces;
- tunnels;
- bonds and teams;
- cloud VM NICs;
- traffic-shaped interfaces;
- interfaces whose driver reports an invalid speed.

Use the platform's documented bandwidth limit or a configured inventory metric when sysfs link speed is not the real capacity.

## Saturation Is More Than High Throughput

A link near nominal speed is not necessarily unhealthy if queues remain controlled and service objectives are met. Stronger saturation evidence includes:

- increasing transmit drops or qdisc drops;
- receive missed or overrun errors;
- rising TCP retransmissions;
- increasing request latency;
- socket send or receive buffer errors;
- backlog growth;
- a known bandwidth or packet-per-second quota being approached.

The optional node exporter `qdisc` collector reports queuing-discipline statistics, and the `ethtool` collector provides driver-specific detail. Because both are disabled by default, test their scrape duration and series count before fleet-wide rollout.

Bytes per second can also hide packet-rate exhaustion. Sixty-four-byte packets impose far more per-packet processing work than the same byte rate in large packets. Keep packet rates alongside byte rates:

```promql
rate(node_network_receive_packets_total[5m])
```

## An Example Drop Warning

```yaml
groups:
  - name: host-network
    rules:
      - alert: HostInterfaceReceiveDrops
        expr: |
          (
            rate(node_network_receive_drop_total{device=~"eth.*|en.*|bond.*"}[5m])
            /
            (
              rate(node_network_receive_packets_total{device=~"eth.*|en.*|bond.*"}[5m])
              +
              rate(node_network_receive_drop_total{device=~"eth.*|en.*|bond.*"}[5m])
            )
            > 0.005
          )
          and
          (
            rate(node_network_receive_drop_total{device=~"eth.*|en.*|bond.*"}[5m])
            > 10
          )
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Receive drops on {{ $labels.instance }} {{ $labels.device }}"
```

The device pattern is only an example. Prefer inventory-driven selection when predictable labels are available.

For paging, combine network diagnostics with an actionable symptom such as elevated request errors, timeout rate, or loss of connectivity. Interface drops that remain below any user-visible or redundancy impact may belong in a warning or ticket.

## A Fast Investigation Sequence

1. Confirm whether the affected interface is physical, virtual, bonded, tunneled, or a container peer.
2. Compare receive and transmit drop and error rates.
3. Check carrier changes and operational state.
4. Compare packets per second, bytes per second, and the real directional limit.
5. Check TCP retransmissions and socket-level errors.
6. Inspect qdisc and driver counters where available.
7. Compare both ends of the path and the intervening network.
8. Correlate the first change with deployments, traffic shifts, MTU changes, or infrastructure events.

Do not assume a receive error on one host and a retransmission on another share the same cause until timestamps, interfaces, and traffic paths match.

## Summary

Use state and carrier metrics for link failures, counter rates for local drops and errors, TCP retransmissions for path-level recovery, and separate receive/transmit ratios for capacity. Normalize noisy counters only when traffic is large enough, verify whether reported link speed is meaningful, and correlate network signals with queues and service impact before paging.

## Official Documentation

- [Linux kernel interface statistics and counter definitions](https://docs.kernel.org/networking/statistics.html)
- [Linux kernel TCP and SNMP counter documentation](https://docs.kernel.org/networking/snmp_counter.html)
- [Prometheus node exporter netdev collector source](https://github.com/prometheus/node_exporter/blob/master/collector/netdev_linux.go)
- [Prometheus node exporter netclass collector source](https://github.com/prometheus/node_exporter/blob/master/collector/netclass_linux.go)
- [Prometheus node exporter netstat collector source and default fields](https://github.com/prometheus/node_exporter/blob/master/collector/netstat_linux.go)
- [Prometheus node exporter collector guidance](https://github.com/prometheus/node_exporter#collectors)
- [Prometheus `rate()` documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
