# How to Tune ClickHouse Keeper Performance Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Keeper, Performance, Tuning, Raft

Description: Learn which ClickHouse Keeper settings to tune for better throughput, lower latency, and stable operation under heavy replication load.

---

ClickHouse Keeper's default settings work well for moderate workloads. Under heavy replication load - many tables, frequent inserts, or large clusters - tuning coordination settings can significantly reduce latency and prevent timeouts.

## Identifying Performance Issues

Before tuning, measure current performance:

```bash
clickhouse-keeper-client -h localhost -p 9181 -q "mntr" | grep -E "latency|outstanding|requests"
```

```text
zk_avg_latency          45
zk_max_latency          892
zk_outstanding_requests 23
zk_packets_received     4821039
zk_packets_sent         4821041
```

High `zk_avg_latency` (above 50ms) or frequent `zk_max_latency` spikes indicate that tuning is needed.

## Key Performance Settings

Configure these in your `keeper_config.xml` under `<coordination_settings>`:

```xml
<coordination_settings>
    <!-- How often to take a snapshot (in log entries) -->
    <snapshot_distance>100000</snapshot_distance>

    <!-- Number of snapshots to retain -->
    <snapshots_to_keep>3</snapshots_to_keep>

    <!-- Log entries before rotating to a new log file -->
    <rotate_log_storage_interval>100000</rotate_log_storage_interval>

    <!-- Raft heartbeat interval in milliseconds -->
    <heart_beat_interval_ms>500</heart_beat_interval_ms>

    <!-- Leader election timeout in milliseconds -->
    <election_timeout_lower_bound_ms>1000</election_timeout_lower_bound_ms>
    <election_timeout_upper_bound_ms>2000</election_timeout_upper_bound_ms>

    <!-- Max size of batch of requests sent to Raft -->
    <max_requests_batch_size>100</max_requests_batch_size>

    <!-- Default client operation timeout -->
    <operation_timeout_ms>10000</operation_timeout_ms>
    <!-- Default client session timeout -->
    <session_timeout_ms>30000</session_timeout_ms>

    <!-- Log level for Raft internals (trace, debug, information, warning) -->
    <raft_logs_level>warning</raft_logs_level>
</coordination_settings>
```

## Tuning for High Insert Rates

For clusters with high insert rates, increase batch size and snapshot distance:

```xml
<max_requests_batch_size>500</max_requests_batch_size>
<snapshot_distance>200000</snapshot_distance>
```

Larger batches reduce the overhead per operation. A larger snapshot distance means fewer snapshot operations, reducing I/O load.

## Tuning Timeouts for Cross-Region

For cross-region Keeper clusters with higher WAN latency:

```xml
<heart_beat_interval_ms>1000</heart_beat_interval_ms>
<election_timeout_lower_bound_ms>3000</election_timeout_lower_bound_ms>
<election_timeout_upper_bound_ms>6000</election_timeout_upper_bound_ms>
<operation_timeout_ms>30000</operation_timeout_ms>
<session_timeout_ms>60000</session_timeout_ms>
```

Wider election timeout bounds prevent false leader elections triggered by network jitter.

## Storage Performance

Keeper log writes are synchronous by default. Use fast storage (NVMe SSD) for coordination data:

```bash
# Check I/O latency on coordination storage
iostat -x 1 5 | grep sdb
```

Place log and snapshot directories on separate disks if possible:

```xml
<log_storage_path>/fast-ssd/coordination/log</log_storage_path>
<snapshot_storage_path>/fast-ssd/coordination/snapshots</snapshot_storage_path>
```

## Monitoring After Tuning

Track latency improvements:

```bash
# Sample latency every 10 seconds
watch -n 10 "clickhouse-keeper-client -h localhost -p 9181 -q mntr | grep latency"
```

## Summary

Tune ClickHouse Keeper performance by increasing `max_requests_batch_size` for high insert rates, adjusting election timeouts for WAN deployments, and placing coordination data on fast SSD storage. Monitor `zk_avg_latency` and `zk_outstanding_requests` before and after changes to quantify improvements. Set `raft_logs_level` to `warning` in production to reduce log I/O overhead.
