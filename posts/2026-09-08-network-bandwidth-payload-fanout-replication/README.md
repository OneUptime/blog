# How to Plan Bandwidth for Payload, Fan-Out, and Replication Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Capacity Planning, Scalability, Performance, Cloud Computing

Description: Convert directional payload distributions, internal fan-out, replicas, and protocol overhead into tested bandwidth, packet-rate, and flow requirements.

---

Frontend payload size multiplied by RPS rarely describes the network. A request can trigger several service calls, replicated writes, acknowledgements, cache fills, and cross-zone transfers. Small packets may hit packet-rate or flow limits before a nominal gigabit limit.

Create a directional traffic graph and calculate every traversed edge.

## Inventory traffic classes and paths

For each operation class record:

```text
arrival rate
request and response byte distributions
calls to each dependency
request and response bytes per dependency call
replication, acknowledgement, and repair behavior
cache-hit and compression state
source, destination, zone, and region
connection reuse and packets per operation
```

Use bytes observed at the layer being planned. Application body bytes exclude TLS, HTTP, TCP or QUIC, IP, tunneling, and link framing overhead. Interface counters include more of the stack but may include unrelated traffic. Measure both and reconcile the boundary.

Keep ingress and egress separate. Links and cloud instance limits can apply differently by direction or destination.

## Calculate offered throughput per edge

For edge `e`:

```text
bytes/second_e
  = sum(lambda_i * calls_i,e * bytes_i,e)

bits/second_e = bytes/second_e * 8
```

Suppose 2,000 writes per second send a 20-KiB payload to an API. Each accepted write produces three 12-KiB replica transfers and a 1-KiB acknowledgement from each replica:

```text
client ingress = 2,000 * 20 KiB              = 40,000 KiB/s
replica egress = 2,000 * 3 * 12 KiB          = 72,000 KiB/s
replica ingress acknowledgements
               = 2,000 * 3 * 1 KiB           = 6,000 KiB/s
```

For the API host, count these directions separately and include response, protocol, health-check, telemetry, and control-plane traffic. If replicas are peers that also forward data, draw their edges rather than charging everything to the API node.

Use binary KiB consistently in the calculation, then convert to the decimal bits per second used in network specifications. Do not call `MB/s * 8` an exact `Mbps` conversion without resolving decimal versus binary units.

## Preserve distributions and correlation

Average payloads hide batch uploads and large responses. Calculate ordinary, p95-bucket, and maximum-valid payload scenarios from measured size histograms. Do not multiply p99 RPS by p99 payload and label it p99 bandwidth; the peaks may not coincide. Measure joint time buckets or construct a documented stress scenario.

Fan-out can vary with cache state, shard count, replica availability, and retries. A degraded replica can cause repair or rerouting traffic exactly when usable capacity falls. Include:

- cross-zone and cross-region replication;
- rebalancing, bootstrap, snapshot, and restore;
- retry and hedged-request budgets;
- backups and compaction traffic;
- rollout image pulls and cache warming;
- monitoring and log export.

Plan maintenance and recovery as time-bounded scenarios, not necessarily a permanent sum of all maxima.

## Convert traffic into a capacity target

Choose a tested sustained utilization target:

```text
required link or instance bandwidth
  = forecast offered bandwidth / target utilization
```

If measured peak egress is 6.4 Gbps and the tested target is 65 percent:

```text
required capacity = 6.4 / 0.65 = 9.85 Gbps
```

A nominal 10-Gbps instance is only a candidate. AWS documents that some instance types have baseline and burst bandwidth and that destination, packet-per-second, and tracked-connection allowances can reduce attainable throughput. Google Cloud documents per-instance, per-destination, and per-flow constraints. Azure documents VM-wide egress allocation across NICs and separate flow considerations.

Use the sustained baseline for sustained traffic. Burst credits are appropriate only when the burst duration and recharge model are proven.

## Test bandwidth, packets, and flows

Replay the production payload and connection mix end to end. Measure:

- application useful bytes and interface bytes by direction;
- bits per second and packets per second;
- active flows and connection creation rate;
- retransmits, loss, out-of-order packets, and errors;
- socket queueing and drops;
- CPU used for TLS, checksums, interrupts, and proxies;
- latency and useful throughput by operation class;
- provider allowance-exceeded metrics when available.

Large-stream benchmarks can reach line rate while a small-message workload fails on packets per second. One flow may also be capped below aggregate instance bandwidth. Use enough parallel flows to match production, not enough to manufacture an irrelevant maximum.

Verify every hop: Pod or container, node NIC, overlay, load balancer, firewall, NAT, inter-zone link, gateway, and receiving service. The narrowest shared component controls throughput. Account for network appliances twice where each forwarded connection creates inbound and outbound work.

## Make the forecast actionable

Record a capacity graph:

```yaml
edge: api-a-to-replica-zone-b
forecast_peak_gbps: 6.4
target_utilization: 0.65
required_gbps: 9.85
packet_rate_peak: 620000
active_flows_peak: 85000
recovery_scenario: one-replica-rebuild
validated_instance_type: provider-type-and-generation
```

Alert on time to saturation, retransmits, drops, queue delay, and skew, not bandwidth percentage alone. Recompute after payload schema, compression, fan-out, replica count, topology, encryption, or instance changes.

## Conclusion

Plan network capacity from a directional traffic graph. Multiply each operation class by its measured payload and fan-out per edge, include replication and recovery scenarios, and retain protocol overhead, packet rate, and flow count. Validate the exact cloud destination and production connection mix because nominal instance bandwidth is only one of several limits.

## Official Documentation

- [Amazon EC2 instance network bandwidth](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html)
- [Google Compute Engine network bandwidth](https://cloud.google.com/compute/docs/network-bandwidth)
- [Azure virtual machine network bandwidth](https://learn.microsoft.com/en-us/azure/virtual-network/virtual-machine-network-throughput)
- [Azure Accelerated Networking overview](https://learn.microsoft.com/en-us/azure/virtual-network/accelerated-networking-overview)
- [Linux interface statistics](https://www.kernel.org/doc/html/latest/networking/statistics.html)
