# How to Monitor IPv6 with SNMP using Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, SNMP, IPv6, Monitoring, Network, MIB

Description: A guide to monitoring IPv6 statistics from network devices using SNMP, the SNMP Exporter for Prometheus, and Grafana dashboards.

SNMP (Simple Network Management Protocol) provides IPv6 traffic statistics through RFC 4293 (IP-MIB) and routing information through RFC 4292 (IP-FORWARD-MIB). This guide covers scraping IPv6 SNMP metrics from network devices and visualizing them in Grafana.

## Step 1: Install and Configure SNMP Exporter

```bash
# Download SNMP exporter

wget https://github.com/prometheus/snmp_exporter/releases/download/v0.30.1/snmp_exporter-0.30.1.linux-amd64.tar.gz
tar xzf snmp_exporter-0.30.1.linux-amd64.tar.gz
sudo mv snmp_exporter-0.30.1.linux-amd64/snmp_exporter /usr/local/bin/
```

## Step 2: Generate SNMP Module for IPv6 MIBs

Use the `generator` tool to create a config for IPv6-related OIDs:

```bash
git clone https://github.com/prometheus/snmp_exporter.git
cd snmp_exporter/generator
make generator mibs
```

```yaml
# generator.yml - Generate SNMP config for IPv6 statistics
auths:
  public_v2:
    version: 2
    community: public

modules:
  ipv6_stats:
    walk:
      - ipSystemStatsTable
      - ipIfStatsTable
      - inetCidrRouteTable
    lookups:
      - source_indexes: [ipIfStatsIfIndex]
        lookup: IF-MIB::ifDescr
      - source_indexes: [ipIfStatsIfIndex]
        lookup: IF-MIB::ifName
    overrides:
      ifDescr:
        ignore: true
      ifName:
        ignore: true
```

```bash
# Generate snmp.yml from generator.yml
./generator generate -m ./mibs -g ./generator.yml -o ./snmp.yml
```

## Step 3: Configure snmp.yml for IPv6 Devices

```yaml
# snmp.yml - use the generated auth and module names in the runtime config
auths:
  public_v2:
    version: 2
    community: public

modules:
  ipv6_stats:
    walk:
      - ipSystemStatsTable
      - ipIfStatsTable
      - inetCidrRouteTable
```

## Step 4: Prometheus Configuration for SNMP + IPv6

```yaml
# prometheus.yml - Scrape IPv6 stats via SNMP Exporter
scrape_configs:
  # Scrape IPv6 stats from network devices
  - job_name: "snmp-ipv6-devices"
    static_configs:
      - targets:
          - "2001:db8::1"   # IPv6 address of the device
          - "2001:db8::2"
    metrics_path: /snmp
    params:
      auth: [public_v2]
      module: [ipv6_stats]
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        # SNMP Exporter listening on IPv6
        replacement: "[::1]:9116"
```

## Step 5: Start SNMP Exporter on IPv6

```bash
# Start SNMP Exporter listening on IPv6
snmp_exporter --config.file=snmp.yml \
  --web.listen-address="[::]:9116"
```

## Step 6: Grafana Dashboard for SNMP IPv6 Metrics

Useful PromQL queries for Grafana panels:

```promql
# IPv6 interface receive rate (packets/sec)
rate(ipIfStatsHCInReceives{instance=~"$device",ipIfStatsIPVersion="ipv6"}[5m])

# IPv6 interface transmit rate
rate(ipIfStatsHCOutTransmits{instance=~"$device",ipIfStatsIPVersion="ipv6"}[5m])

# IPv6 routing table size
count by (instance) (inetCidrRouteIfIndex{instance=~"$device",inetCidrRouteDestType="ipv6"})

# IPv6 interface discards
rate(ipIfStatsInDiscards{instance=~"$device",ipIfStatsIPVersion="ipv6"}[5m])
rate(ipIfStatsOutDiscards{instance=~"$device",ipIfStatsIPVersion="ipv6"}[5m])
```

## Step 7: Import Community SNMP IPv6 Dashboard

```bash
# Import a general SNMP dashboard from Grafana.com with the Grafana UI
# Dashboards > New > Import > Enter 11169
# Then add panels for the IPv6 IP-MIB queries above
curl -L -o snmp-stats-dashboard.json \
  "https://grafana.com/api/dashboards/11169/revisions/latest/download"
```

## Verify SNMP IPv6 Collection

```bash
# Test manual SNMP query to IPv6 device
snmpwalk -v2c -c public 'udp6:[2001:db8::1]:161' 1.3.6.1.2.1.4.31.2

# Test SNMP Exporter is collecting IPv6 stats
curl -G "http://[::1]:9116/snmp" \
  --data-urlencode "auth=public_v2" \
  --data-urlencode "module=ipv6_stats" \
  --data-urlencode "target=udp://[2001:db8::1]:161" | \
  grep 'ipIfStats.*ipv6'
```

Combining SNMP with the SNMP Exporter and Grafana provides comprehensive IPv6 visibility for network devices that may not have modern telemetry APIs, making it essential for monitoring legacy hardware alongside modern cloud infrastructure.
