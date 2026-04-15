# How to Build Network Flow Analysis with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Network Flow, NetFlow, Security, Analytics

Description: Analyze network flow data (NetFlow/IPFIX) in ClickHouse to detect anomalies, track bandwidth usage, and identify suspicious traffic patterns.

---

Network flow analysis provides visibility into traffic patterns across your infrastructure. ClickHouse handles the high ingest volume of NetFlow and IPFIX records while enabling fast queries for bandwidth analysis and anomaly detection.

## NetFlow Records Table

```sql
CREATE TABLE netflow_records
(
    flow_id UUID DEFAULT generateUUIDv4(),
    src_ip IPv4,
    dst_ip IPv4,
    src_port UInt16,
    dst_port UInt16,
    protocol UInt8,
    packets UInt64,
    bytes UInt64,
    tcp_flags UInt8 DEFAULT 0,
    flow_start DateTime,
    flow_end DateTime,
    duration_ms UInt32,
    exporter_ip IPv4,
    input_interface UInt16 DEFAULT 0,
    output_interface UInt16 DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(flow_start)
ORDER BY (src_ip, dst_ip, flow_start)
TTL toDate(flow_start) + INTERVAL 90 DAY;
```

## Top Traffic Flows by Bandwidth

```sql
SELECT
    src_ip,
    dst_ip,
    dst_port,
    protocol,
    sum(bytes) AS total_bytes,
    sum(packets) AS total_packets,
    count() AS flow_count
FROM netflow_records
WHERE flow_start >= now() - INTERVAL 1 HOUR
GROUP BY src_ip, dst_ip, dst_port, protocol
ORDER BY total_bytes DESC
LIMIT 20;
```

## Bandwidth Usage by Internal Subnet

```sql
SELECT
    IPv4NumToString(bitAnd(CAST(src_ip AS UInt32), 0xFFFF0000)) AS subnet,
    sum(bytes) AS bytes_out,
    sum(packets) AS packets_out,
    countDistinct(dst_ip) AS unique_destinations
FROM netflow_records
WHERE src_ip BETWEEN toIPv4('10.0.0.0') AND toIPv4('10.255.255.255')
  AND flow_start >= now() - INTERVAL 1 HOUR
GROUP BY subnet
ORDER BY bytes_out DESC;
```

## Large Flow Detection (Elephant Flows)

```sql
SELECT
    src_ip,
    dst_ip,
    dst_port,
    bytes,
    packets,
    flow_start,
    flow_end,
    dateDiff('second', flow_start, flow_end) AS duration_sec
FROM netflow_records
WHERE flow_start >= now() - INTERVAL 1 HOUR
  AND bytes > 1073741824
ORDER BY bytes DESC
LIMIT 20;
```

## DDoS Detection - High Packet Rate to One Destination

```sql
SELECT
    dst_ip,
    dst_port,
    countDistinct(src_ip) AS source_ips,
    sum(packets) AS total_packets,
    sum(bytes) AS total_bytes,
    round(sum(packets) / 60.0, 0) AS pps
FROM netflow_records
WHERE flow_start >= now() - INTERVAL 1 MINUTE
GROUP BY dst_ip, dst_port
HAVING source_ips > 100 OR pps > 100000
ORDER BY pps DESC;
```

## Protocol Distribution

```sql
SELECT
    multiIf(protocol = 6, 'TCP', protocol = 17, 'UDP', protocol = 1, 'ICMP', toString(protocol)) AS protocol_name,
    count() AS flows,
    sum(bytes) AS total_bytes,
    round(sum(bytes) * 100.0 / sum(sum(bytes)) OVER (), 2) AS pct_of_traffic
FROM netflow_records
WHERE flow_start >= now() - INTERVAL 1 HOUR
GROUP BY protocol_name
ORDER BY total_bytes DESC;
```

## Hourly Bandwidth Trend

```sql
SELECT
    toStartOfHour(flow_start) AS hour,
    sum(bytes) / (1024 * 1024 * 1024.0) AS gb_transferred,
    sum(packets) AS total_packets,
    countDistinct(src_ip) AS active_sources
FROM netflow_records
WHERE flow_start >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;
```

## Suspicious Outbound Connections to Rare Ports

```sql
SELECT
    src_ip,
    dst_ip,
    dst_port,
    sum(bytes) AS bytes,
    count() AS flows
FROM netflow_records
WHERE flow_start >= now() - INTERVAL 24 HOUR
  AND dst_port NOT IN (80, 443, 53, 22, 25, 110, 143, 993, 587)
  AND src_ip BETWEEN toIPv4('10.0.0.0') AND toIPv4('10.255.255.255')
  AND NOT (dst_ip BETWEEN toIPv4('10.0.0.0') AND toIPv4('10.255.255.255'))
GROUP BY src_ip, dst_ip, dst_port
HAVING bytes > 10485760
ORDER BY bytes DESC;
```

## Summary

ClickHouse stores NetFlow and IPFIX data efficiently with native IPv4 types, fast aggregation for bandwidth summaries, and sliding window queries for DDoS detection. The combination of elephant flow detection, protocol distribution, and suspicious outbound connection analysis gives network security teams comprehensive visibility without dedicated flow analysis tools.
