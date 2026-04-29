# How to Monitor NDP (Neighbor Discovery Protocol) in IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NDP, Monitoring, Prometheus, Grafana, Networking

Description: Monitor IPv6 Neighbor Discovery Protocol activity including neighbor cache states, message rates, and anomaly detection with Prometheus and Grafana.

## Key NDP Metrics to Monitor

| Metric | Description | Alert Threshold |
|---|---|---|
| Neighbor cache size | Total entries in NDP table | > 80% of gc_thresh3 |
| INCOMPLETE entries | Unresolved NS outstanding | > 200 |
| FAILED entries | Unreachable neighbors | > 50 |
| NS/NA rate | NDP message frequency | > 1000/s |
| STALE→PROBE transitions | Active reachability checks | Spike > 5x baseline |

## Capturing NDP Metrics with Scripts

```bash
#!/usr/bin/env bash
# /usr/local/bin/ndp-stats.sh - NDP metrics collector

get_ndp_stats() {
    local IFACE=${1:-"all"}

    if [ "${IFACE}" = "all" ]; then
        IP_CMD="ip -6 neigh show"
    else
        IP_CMD="ip -6 neigh show dev ${IFACE}"
    fi

    # Count by state (state is always the last field)
    REACHABLE=$(${IP_CMD} | awk '$NF=="REACHABLE"' | wc -l)
    STALE=$(${IP_CMD} | awk '$NF=="STALE"' | wc -l)
    DELAY=$(${IP_CMD} | awk '$NF=="DELAY"' | wc -l)
    PROBE=$(${IP_CMD} | awk '$NF=="PROBE"' | wc -l)
    FAILED=$(${IP_CMD} | awk '$NF=="FAILED"' | wc -l)
    INCOMPLETE=$(${IP_CMD} | awk '$NF=="INCOMPLETE"' | wc -l)
    PERMANENT=$(${IP_CMD} | awk '$NF=="PERMANENT"' | wc -l)
    TOTAL=$((REACHABLE + STALE + DELAY + PROBE + FAILED + INCOMPLETE + PERMANENT))

    echo "ndp_cache_total{iface=\"${IFACE}\"} ${TOTAL}"
    echo "ndp_cache_reachable{iface=\"${IFACE}\"} ${REACHABLE}"
    echo "ndp_cache_stale{iface=\"${IFACE}\"} ${STALE}"
    echo "ndp_cache_delay{iface=\"${IFACE}\"} ${DELAY}"
    echo "ndp_cache_probe{iface=\"${IFACE}\"} ${PROBE}"
    echo "ndp_cache_failed{iface=\"${IFACE}\"} ${FAILED}"
    echo "ndp_cache_incomplete{iface=\"${IFACE}\"} ${INCOMPLETE}"
}

# Output Prometheus text format

echo "# HELP ndp_cache_total Total NDP cache entries"
echo "# TYPE ndp_cache_total gauge"
for IFACE in eth0 eth1 vxlan100; do
    get_ndp_stats ${IFACE} 2>/dev/null
done
```

## Prometheus Node Exporter Textfile Collector

```bash
#!/bin/bash
# /usr/local/bin/ndp-prometheus.sh
# Run via cron: * * * * * /usr/local/bin/ndp-prometheus.sh

OUTPUT="/var/lib/node_exporter/textfile_collector/ndp.prom"

{
    echo "# HELP ndp_neighbor_cache_entries NDP neighbor cache size"
    echo "# TYPE ndp_neighbor_cache_entries gauge"

    for IFACE in $(ip link show | grep -E "^[0-9]" | awk '{print $2}' | tr -d ':' | grep -v lo); do
        for STATE in REACHABLE STALE DELAY PROBE FAILED INCOMPLETE PERMANENT; do
            COUNT=$(ip -6 neigh show dev ${IFACE} nud ${STATE,,} 2>/dev/null | wc -l)
            echo "ndp_neighbor_cache_entries{interface=\"${IFACE}\",state=\"${STATE}\"} ${COUNT}"
        done
    done

    # Cache threshold utilization
    GC_THRESH3=$(sysctl -n net.ipv6.neigh.default.gc_thresh3)
    TOTAL=$(ip -6 neigh show | wc -l)
    echo "ndp_cache_threshold_utilization $(echo "scale=3; ${TOTAL}/${GC_THRESH3}" | bc)"

} > "${OUTPUT}.tmp" && mv "${OUTPUT}.tmp" "${OUTPUT}"
```

## NDP Message Rate Monitoring with tcpdump

```bash
#!/bin/bash
# monitor-ndp-rate.sh - Real-time NDP message rate

IFACE=${1:-eth0}
INTERVAL=10  # seconds

echo "Monitoring NDP rates on ${IFACE} (${INTERVAL}s window)"
echo "Time | NS/s | NA/s | RA/s | RS/s"

while true; do
    COUNTS=$(tcpdump -i ${IFACE} -n -c 1000 'icmp6' 2>/dev/null | \
        awk '
            /neighbor solicitation/ {ns++}
            /neighbor advertisement/ {na++}
            /router advertisement/ {ra++}
            /router solicitation/ {rs++}
            END {print ns+0, na+0, ra+0, rs+0}
        ')

    echo "$(date +%H:%M:%S) | ${COUNTS}" | awk '{
        printf "%s | %4d | %4d | %4d | %4d\n", $1, $3, $4, $5, $6
    }'
done
```

## Alerting Rules (Prometheus)

```yaml
# prometheus-ndp-alerts.yml
groups:
  - name: ndp
    rules:
      - alert: NDPCacheOverflow
        expr: |
          ndp_neighbor_cache_entries{state="INCOMPLETE"} > 500
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "NDP cache overflow - {{ $value }} incomplete entries on {{ $labels.interface }}"

      - alert: NDPHighFailedCount
        expr: |
          ndp_neighbor_cache_entries{state="FAILED"} > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High NDP failed count: {{ $value }} on {{ $labels.interface }}"

      - alert: NDPCacheHighUtilization
        expr: ndp_cache_threshold_utilization > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "NDP cache at {{ $value | humanizePercentage }} utilization"
```

## Grafana Dashboard Queries

```text
# Panel: NDP Cache by State (stacked bar)
ndp_neighbor_cache_entries

# Panel: NDP Cache Utilization (gauge)
ndp_cache_threshold_utilization * 100

# Panel: FAILED entries rate (line)
rate(ndp_neighbor_cache_entries{state="FAILED"}[5m])

# Panel: INCOMPLETE entries (anomaly detection)
ndp_neighbor_cache_entries{state="INCOMPLETE"}
```

## Conclusion

NDP monitoring requires both cache state tracking and message rate analysis. Prometheus textfile collector exports NDP cache statistics from the `ip -6 neigh` command. Alert on INCOMPLETE entries (> 500 = potential attack), FAILED entries (> 100 = connectivity issues), and cache utilization (> 80% = risk of overflow). Real-time message rates from `tcpdump` complement long-term trending. A healthy system shows mostly REACHABLE and STALE entries with occasional PROBE, and near-zero INCOMPLETE and FAILED.
