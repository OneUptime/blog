# How to Stop Telegraf StatsD Packet Drops with `number_workers_threads`, Queue, and Socket-Buffer Tuning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, StatsD, UDP, Performance Tuning, Linux

Description: Locate StatsD loss at the kernel socket, Telegraf pending-message queue, parser workers, or output buffer and tune the constrained stage with evidence.

---

UDP StatsD is intentionally lightweight: the sender does not establish a connection, wait for acknowledgment, or retransmit a lost datagram. Telegraf therefore has to keep up with bursts across several independent stages. Enlarging only `allowed_pending_messages` can delay a drop without increasing throughput, while adding workers cannot recover packets already lost in the kernel.

Tune in this order: measure, identify the first saturated stage, change one control, and replay a representative burst.

## Map the Four Queues

A UDP metric crosses these boundaries:

1. the kernel receive buffer for the StatsD socket;
2. Telegraf's pending datagram channel, sized by `allowed_pending_messages`;
3. parser workers, counted by `number_workers_threads`; and
4. each output's independent Telegraf buffer and remote backend.

`read_buffer_size` requests the socket receive-buffer size. If that buffer fills before Telegraf reads it, the kernel drops datagrams. After a successful socket read, Telegraf tries to enqueue the datagram; if its pending channel is full, the plugin drops it and logs `Statsd message queue full`.

Slow output writes are a later problem. They can fill `internal_write` buffers and drop parsed metrics, but increasing StatsD parser workers will not repair an undersized output buffer or slow destination.

## Establish a Measured Baseline

Enable Telegraf self-monitoring:

```toml
[[inputs.internal]]
  collect_memstats = true
  per_instance = true
```

Current StatsD code registers plugin-specific `internal_statsd` fields including `udp_packets_received`, `udp_packets_dropped`, `udp_bytes_received`, `pending_messages`, `max_pending_messages`, and `parse_time_ns`, tagged by listener `address`. Here, `udp_packets_dropped` counts datagrams discarded because Telegraf's pending channel was full; it cannot see packets the kernel dropped before delivery to the process.

On Linux, inspect the other layers during the same load window:

```bash
netstat -su
ss -u -a -m | grep ':8125'
journalctl -u telegraf --since '-10 minutes' --no-pager
```

Track the host UDP receive-buffer error counter before and after a burst, the Telegraf plugin drop counter, queue depth, CPU saturation, garbage collection, and `internal_write` buffer fullness. Reconcile a uniquely named test counter at the sender and destination when possible.

## Tune the Plugin as a System

The documented defaults are a 10,000-message pending queue and five parser workers; `read_buffer_size` uses the OS default when unset. A starting experiment for a measured burst might be:

```toml
[[inputs.statsd]]
  alias = "application_statsd"
  protocol = "udp"
  service_address = ":8125"
  allowed_pending_messages = 50000
  number_workers_threads = 8
  read_buffer_size = 4194304
  percentile_limit = 1000
```

These values are examples, not universal recommendations:

- raise `read_buffer_size` when kernel drops rise and the application is not reading bursts quickly enough;
- raise `allowed_pending_messages` when `pending_messages` reaches `max_pending_messages`, accepting additional memory and queueing latency; and
- raise `number_workers_threads` when the pending queue grows while CPU capacity remains available and parsing is the bottleneck.

More workers add scheduling and synchronization overhead and eventually stop helping. Complex templates, DogStatsD extensions, many tags, and high-rate timers can make parsing and aggregation more expensive. `percentile_limit` controls timing and histogram samples retained per measurement; raising it increases percentile accuracy at the cost of memory and CPU.

## Raise the Linux Socket Ceiling When Required

Linux limits the receive buffer a process can request with `net.core.rmem_max`. Inspect the current ceiling:

```bash
sysctl net.core.rmem_default net.core.rmem_max
```

If the requested Telegraf buffer exceeds the allowed maximum, raise the host setting through the distribution's persistent `sysctl.d` mechanism, for example:

```text
net.core.rmem_max = 4194304
```

Then reload the supported sysctl configuration, restart Telegraf so it recreates the socket, and use `ss -m` to inspect the effective socket memory. Linux may account socket memory differently from the application-requested number, so verify rather than assuming the configured byte value was applied exactly.

Containers share the host kernel limit. Setting only the Telegraf container option does not bypass `rmem_max`, and changing a host sysctl is an infrastructure decision—not a reason to run the container privileged.

## Reduce Work Before Adding Capacity

Client-side sampling such as `|@0.1` is part of the StatsD counter and timing protocols; use it only when the aggregation semantics tolerate sampling and the client applies it correctly. Pack several StatsD values into one datagram only within the sender, network, and receiver size limits. Oversized UDP datagrams can fragment and become more loss-prone.

If reliable transport matters more than UDP latency, the plugin also supports `protocol = "tcp"` with `max_tcp_connections` and optional keepalives. TCP supplies delivery and backpressure properties that UDP lacks, but clients must support it and connection capacity becomes a new limit. Switching transports is an architecture change, not just a tuning flag.

Reduce unnecessary tags and expensive percentile sets. Confirm that the collection/flush cadence fits the StatsD aggregation semantics and that output batch size, flush interval, and buffer capacity can absorb the resulting metrics.

## Prove the Result Under Bursts

StatsD is a service input, so a short `--test` run may produce no output unless traffic arrives in its finite window. A production-like load test should use the normal daemon or a sufficiently long `--test-wait`, send a known count with the same packet sizes and tag shapes as real clients, and run long enough to include output flushes.

Success means all layers agree: no increase in kernel receive errors, no increase in `internal_statsd.udp_packets_dropped`, pending depth returns to normal after a burst, CPU has headroom, and output buffers do not approach their limits. Tune for the expected peak plus operational headroom, then alert on both kernel and Telegraf counters.

## Official Documentation

- [Telegraf StatsD input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/statsd/)
- [Monitor Telegraf with the internal input](https://docs.influxdata.com/telegraf/v1/administer/monitor/)
- [Telegraf output buffering and delivery](https://docs.influxdata.com/telegraf/v1/concepts/data-pipeline/)
- [Current StatsD queue and self-stat implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/statsd/statsd.go)
- [Linux receive-buffer sysctls](https://docs.kernel.org/admin-guide/sysctl/net.html#rmem-max)

## Conclusion

Stop StatsD loss by finding the first counter that moves. Size the kernel receive buffer for bursts, keep enough pending capacity for short spikes, add parser workers only while CPU allows, and ensure output buffers and backends drain the parsed metrics. Because UDP cannot acknowledge delivery, sustained monitoring and realistic burst tests are part of the solution.
