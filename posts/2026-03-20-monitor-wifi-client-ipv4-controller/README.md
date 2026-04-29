# How to Monitor WiFi Client IPv4 Address Assignments on a Controller

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WiFi, DHCP, IPv4, Monitoring, Wireless Controller, UniFi, Client Tracking

Description: Learn how to monitor and track IPv4 address assignments for WiFi clients using a wireless controller, DHCP lease logs, and CLI tools for visibility into connected devices.

---

Tracking which IPv4 address is assigned to each WiFi client helps troubleshoot connectivity issues, enforce access policies, and detect unauthorized devices.

## UniFi Controller: Client Monitoring

```text
Clients → Active Clients
  Filter: Wireless only
  Columns: MAC Address, IP Address, SSID, AP, Signal, Channel, Last Seen
```

From CLI (UniFi OS shell):
```bash
# List all connected wireless clients and their IPs

mca-dump | python3 -m json.tool | grep -E '"ip"|"mac"|"essid"'
```

## OpenWrt: List Associated Clients with IPs

```bash
# List associated clients per interface
iw dev wlan0 station dump

# Cross-reference with DHCP leases
# Format: expiry  mac  ip  hostname  client-id
cat /tmp/dhcp.leases

# Combined view: MAC → IP mapping
awk '{print $2, $3, $4}' /tmp/dhcp.leases
```

## Correlating DHCP Leases with Wireless Associations

```bash
#!/bin/bash
# /usr/local/bin/wifi-clients.sh
echo "MAC              IP              Hostname"
echo "---              --              --------"
iw dev wlan1 station dump | grep "^Station" | awk '{print $2}' | while read mac; do
  line=$(grep -i "$mac" /tmp/dhcp.leases)
  ip=$(echo "$line" | awk '{print $3}')
  host=$(echo "$line" | awk '{print $4}')
  echo "$mac   ${ip:-unassigned}   ${host:--}"
done
```

## Monitoring with Prometheus + SNMP

```yaml
# prometheus.yml scrape for DHCP lease counts per AP
scrape_configs:
  - job_name: wifi_controller
    static_configs:
      - targets: ['controller.example.com']
    metrics_path: /snmp
    params:
      module: [ubiquiti_unifi]
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: snmp_exporter:9116
```

## Detecting Unauthorized Clients

```bash
# Known MACs whitelist
KNOWN=/etc/wifi-known-macs.txt

# Alert on unknown clients
awk '{print $2}' /tmp/dhcp.leases | while read mac; do
  if ! grep -qi "$mac" "$KNOWN"; then
    echo "ALERT: Unknown client $mac connected"
  fi
done
```

## Syslog-Based Tracking

```bash
# dnsmasq logs DHCP assignments to syslog
# /etc/dnsmasq.conf
log-dhcp

# View assignments
grep "DHCPACK" /var/log/messages | grep -E "([0-9]{1,3}\.){3}[0-9]{1,3}"
```

## Key Takeaways

- On OpenWrt, combine `iw dev station dump` and `/tmp/dhcp.leases` to map WiFi clients to their IPv4 addresses.
- Enable `log-dhcp` in dnsmasq to log all DHCP assignments for audit trails and troubleshooting.
- Cross-reference connected MACs against a known-devices list to detect unauthorized clients.
- Wireless controllers (UniFi, Cisco WLC) provide real-time client IP visibility in their dashboards.
