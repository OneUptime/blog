# How to Monitor IPv6 Traffic Flows in Data Centers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Monitoring, NetFlow, IPFIX, Traffic Analysis, Data Center

Description: Monitor IPv6 traffic flows in data centers using IPFIX/NetFlow, flow collectors, and visualization tools to gain visibility into network behavior.

## Why Flow Monitoring is Essential

In IPv6 data centers, every device has a globally routable address. Flow monitoring provides visibility into east-west and north-south traffic patterns, helps detect anomalies, and supports capacity planning.

## Enabling IPFIX on Cisco Nexus

Configure IPFIX flow export on Nexus switches to collect IPv6 flow data:

```bash
# Cisco Nexus IPFIX configuration

feature netflow

! Define flow record capturing IPv6 fields
flow record IPv6-RECORD
  match ipv6 source address
  match ipv6 destination address
  match transport source-port
  match transport destination-port
  match ip protocol
  collect counter bytes
  collect counter packets
  collect timestamp sys-uptime first
  collect timestamp sys-uptime last

! Define export destination (flow collector)
flow exporter COLLECTOR
  destination 2001:db8:mgmt::100
  transport udp 4739
  version 9

! Define flow monitor
flow monitor IPv6-MONITOR
  record IPv6-RECORD
  exporter COLLECTOR

! Apply to interfaces (egress NetFlow on Nexus does not support IPv6,
! so attach IPv6 flow monitors in the input direction only)
interface Ethernet1/1
  ipv6 flow monitor IPv6-MONITOR input
```

## pmacct as a Flow Collector

`pmacct` is a powerful open-source flow collector that handles IPv6 IPFIX:

```text
# /etc/pmacct/nfacctd.conf
daemonize: true
pidfile: /var/run/nfacctd.pid
nfacctd_port: 4739

# Store flows in PostgreSQL
plugins: pgsql

pgsql_host: 2001:db8:db::10
pgsql_db: flows
pgsql_table: ipv6_flows
pgsql_user: pmacct
pgsql_passwd: secret

aggregate: src_host,dst_host,src_port,dst_port,proto
```

## Grafana Dashboard for IPv6 Flows

Visualize flow data with Grafana. A useful query to show top IPv6 talkers by bytes:

```sql
-- Top 10 IPv6 source addresses by bytes in last hour
SELECT
    src_host,
    SUM(bytes) as total_bytes
FROM ipv6_flows
WHERE stamp_inserted > NOW() - INTERVAL '1 hour'
GROUP BY src_host
ORDER BY total_bytes DESC
LIMIT 10;
```

## Linux tc + eBPF for High-Res Flow Data

For detailed per-flow monitoring on Linux hosts, use eBPF with bpftrace:

```bash
# Count IPv6 TCP flows by destination port in real-time
bpftrace -e '
kprobe:tcp_v6_connect {
    $sa = (struct sockaddr_in6 *)arg1;
    @dest_port[bswap($sa->sin6_port)] = count();
}
interval:s:5 {
    print(@dest_port);
    clear(@dest_port);
}
'
```

## Anomaly Detection

Set up threshold-based alerting on flow volume. Use OneUptime or similar monitoring platforms to alert when:
- A single source sends more than X Gbps
- A new prefix appears in flows that was not seen before
- Flow symmetry breaks (asymmetric routing detected)

## Conclusion

Monitoring IPv6 traffic flows requires IPFIX/NetFlow export from switches, a flow collector like pmacct, and a visualization layer like Grafana. Flow monitoring is critical for understanding east-west traffic patterns in IPv6 data centers where every workload has a unique, routable address.
