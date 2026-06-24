# How to Monitor DHCP Lease Usage with SNMP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, DHCP, Monitoring, IPv4, Lease, Network Management, OID

Description: Learn how to monitor DHCP pool utilization and lease counts using SNMP OIDs from Microsoft DHCP Server and ISC DHCP, enabling proactive capacity management.

---

DHCP pool exhaustion causes new devices to fail network connectivity. Monitoring lease utilization via SNMP enables proactive alerts before pools run out.

## SNMP OIDs for DHCP Monitoring

### Microsoft DHCP Server (Windows)

Microsoft's DHCP server exposes pool statistics via the `DHCP-MIB`:

| OID | Description |
|-----|-------------|
| `1.3.6.1.4.1.311.1.3.2.1.1.1` | Subnet address (scope IP) |
| `1.3.6.1.4.1.311.1.3.2.1.1.2` | Addresses in use per scope |
| `1.3.6.1.4.1.311.1.3.2.1.1.3` | Addresses available per scope |

```bash
# Walk all DHCP scopes on a Windows DHCP server

snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.4.1.311.1.3.2.1

# Get addresses in use for all scopes
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.4.1.311.1.3.2.1.1.2

# Get available addresses
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.4.1.311.1.3.2.1.1.3
```

### ISC DHCP Server (Linux) - via Custom Script

ISC DHCP doesn't expose SNMP natively. Use a script to parse the lease file and expose it as an SNMP extend.

```bash
# /usr/local/bin/dhcp-lease-count.sh
#!/bin/bash
# Count active DHCP leases for a subnet

SUBNET="192.168.1"
LEASE_FILE="/var/lib/dhcpd/dhcpd.leases"
POOL_SIZE=254  # Total IPs in the pool (x.x.x.1-254)

# Count active (not expired) leases in the subnet
NOW_UTC=$(date -u +%Y%m%d%H%M%S)
NOW_EPOCH=$(date -u +%s)

ACTIVE=$(awk -v subnet="$SUBNET" -v now="$NOW_UTC" -v now_epoch="$NOW_EPOCH" '
function is_expired() {
  if (end_value == "never") return 0
  if (end_epoch != "") return end_epoch <= now_epoch
  if (end_value != "") return end_value <= now
  return 1
}

function finish_lease() {
  if (ip == "" || index(ip, subnet ".") != 1) return

  if (state == "active" && !is_expired()) {
    active[ip] = 1
  } else {
    delete active[ip]
  }
}

/^[[:space:]]*lease[[:space:]]+[0-9.]+[[:space:]]+\{/ {
  finish_lease()
  ip = $2
  state = ""
  end_value = ""
  end_epoch = ""
  next
}

ip != "" && /^[[:space:]]*binding state/ {
  state = $3
  sub(/;$/, "", state)
  next
}

ip != "" && /^[[:space:]]*ends/ {
  if ($2 == "never;") {
    end_value = "never"
  } else if ($2 == "epoch") {
    end_epoch = $3
    sub(/;$/, "", end_epoch)
  } else {
    date = $3
    time = $4
    gsub(/[\/:;]/, "", date)
    gsub(/[\/:;]/, "", time)
    end_value = date time
  }
  next
}

ip != "" && /^[[:space:]]*}/ {
  finish_lease()
  ip = ""
}

END {
  finish_lease()
  for (lease in active) count++
  print count + 0
}
' "$LEASE_FILE")

echo "$ACTIVE"
echo "$POOL_SIZE"
awk "BEGIN {printf \"%.1f\n\", ($ACTIVE/$POOL_SIZE)*100}"
```

```ini
# /etc/snmp/snmpd.conf - expose via SNMP extend
extend dhcp-active-leases /usr/local/bin/dhcp-lease-count.sh
```

```bash
# Query the custom extend OID
snmpwalk -v2c -c public 127.0.0.1 1.3.6.1.4.1.8072.1.3.2
```

## Prometheus Monitoring for ISC DHCP

```bash
# Install the DHCP exporter for Prometheus
go install github.com/DRuggeri/dhcpd_leases_exporter@latest

# Run it pointing at the lease file
dhcpd_leases_exporter \
  --dhcpd.leases=/var/lib/dhcpd/dhcpd.leases \
  --web.listen-address=10.0.0.5:9667

# Prometheus scrape config
# - job_name: dhcp
#   static_configs: [{targets: ['10.0.0.5:9667']}]
```

## Setting Alerts for Pool Exhaustion

### Prometheus AlertRule

```yaml
groups:
  - name: dhcp
    rules:
      - alert: DHCPPoolNearlyExhausted
        # Replace 254 with the usable size of the monitored pool.
        expr: (dhcpd_leases_stats_valid / 254) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "DHCP leases on {{ $labels.instance }} are {{ $value }}% utilized"
          description: "Pool may be exhausted soon. Add more IPs or split the scope."
```

### PRTG Alert

In PRTG, create custom SNMP sensors for the Microsoft `noAddInUse` and `noAddFree` OIDs and alert on low free addresses or calculated utilization above 85%.

## Key Takeaways

- Microsoft DHCP server exposes per-scope lease counts via OID `1.3.6.1.4.1.311.1.3.2.1.1.2`.
- ISC DHCP requires a helper script and `extend` in `snmpd.conf` to expose lease counts via SNMP.
- Alert at 80-85% utilization to provide time to add IP addresses or resize pools before exhaustion.
- For production monitoring, use a dedicated Prometheus exporter or Nagios plugin for richer DHCP metrics.
