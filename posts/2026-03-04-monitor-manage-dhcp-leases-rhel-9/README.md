# How to Monitor and Manage DHCP Leases on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DHCP, Lease Management, Linux

Description: Learn how to monitor, manage, and troubleshoot DHCP leases on RHEL, including tracking active leases, identifying pool utilization, and cleaning up stale entries.

---

Once your DHCP server is running, you need to keep an eye on it. How many leases are active? Is the pool running low? Are there stale or abandoned leases wasting addresses? This guide covers the practical side of managing DHCP leases on RHEL.

## Understanding the Lease File

ISC DHCP stores all lease information in `/var/lib/dhcpd/dhcpd.leases`. This is a plain text file that dhcpd updates in real time.

View the lease file:

```bash
cat /var/lib/dhcpd/dhcpd.leases
```

A typical lease entry looks like:

```bash
lease 192.168.1.150 {
  starts 4 2026/03/04 10:15:30;
  ends 4 2026/03/04 11:15:30;
  cltt 4 2026/03/04 10:15:30;
  binding state active;
  next binding state free;
  rewind binding state free;
  hardware ethernet 00:11:22:33:44:55;
  uid "\001\000\021\"3DU";
  client-hostname "workstation1";
}
```

Key fields:
- `starts` / `ends` - Lease start and expiration times, recorded in UTC
- `binding state` - active, free, or abandoned for DHCPv4; DHCPv6 leases commonly use active or expired
- `hardware ethernet` - Client's MAC address
- `client-hostname` - Hostname the client reported

## Listing Active Leases

The lease file is append-only: if the same lease appears more than once, the last entry is the current one. To see current active leases:

```bash
awk '
/^lease / { ip=$2; mac=""; name=""; end=""; state="" }
/^[[:space:]]*ends / { end=$3" "$4; gsub(/;/,"",end) }
/^[[:space:]]*hardware ethernet/ { mac=$3; gsub(/;/,"",mac) }
/^[[:space:]]*client-hostname/ { name=$2; gsub(/[";]/,"",name) }
/^[[:space:]]*binding state/ { state=$3; gsub(/;/,"",state) }
/^}/ { lease[ip]=state "|" end "|" mac "|" name }
END {
    for (ip in lease) {
        split(lease[ip], f, "|")
        if (f[1] == "active") {
            printf "%-16s %-20s %-20s %s\n", ip, f[3], f[4], f[2]
        }
    }
}
' /var/lib/dhcpd/dhcpd.leases | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n
```

Count active leases:

```bash
awk '
/^lease / { ip=$2; state="" }
/^[[:space:]]*binding state/ { state=$3; gsub(/;/,"",state) }
/^}/ { leases[ip]=state }
END {
    for (ip in leases) {
        if (leases[ip] == "active") count++
    }
    print count + 0
}
' /var/lib/dhcpd/dhcpd.leases
```

## Building a Lease Summary Script

For regular monitoring, a simple script helps:

```bash
cat > /usr/local/bin/dhcp-status.sh << 'SCRIPT'
#!/bin/bash
# DHCP lease status summary

LEASE_FILE="/var/lib/dhcpd/dhcpd.leases"

echo "=== DHCP Lease Status ==="
echo ""
awk '
/^lease / { ip=$2; mac=""; name=""; state="" }
/hardware ethernet/ { mac=$3; gsub(/;/,"",mac) }
/client-hostname/ { name=$2; gsub(/[";]/,"",name) }
/^[[:space:]]*binding state/ { state=$3; gsub(/;/,"",state) }
/^}/ {
    states[ip]=state
    details[ip]=mac "|" name
}
END {
    for (ip in states) {
        counts[states[ip]]++
    }
    printf "Active leases:    %d\n", counts["active"]
    printf "Free leases:      %d\n", counts["free"]
    printf "Abandoned leases: %d\n", counts["abandoned"]
}
' "$LEASE_FILE"
echo ""
echo "=== Active Lease Details ==="
echo ""

awk '
/^lease / { ip=$2; mac=""; name=""; state="" }
/^[[:space:]]*hardware ethernet/ { mac=$3; gsub(/;/,"",mac) }
/^[[:space:]]*client-hostname/ { name=$2; gsub(/[";]/,"",name) }
/^[[:space:]]*binding state/ { state=$3; gsub(/;/,"",state) }
/^}/ {
    states[ip]=state
    details[ip]=mac "|" name
}
END {
    for (ip in states) {
        if (states[ip] == "active") {
            split(details[ip], f, "|")
            printf "%-16s %-20s %s\n", ip, f[1], f[2]
        }
    }
}
' "$LEASE_FILE" | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n

echo ""
SCRIPT

chmod +x /usr/local/bin/dhcp-status.sh
```

Run it:

```bash
/usr/local/bin/dhcp-status.sh
```

## Monitoring Pool Utilization

Knowing how full your DHCP pool is prevents outages. If you have `range 192.168.1.100 192.168.1.200`, that's 101 addresses.

Quick pool check:

```bash
TOTAL=101
ACTIVE=$(awk '
/^lease / { ip=$2; state="" }
/^[[:space:]]*binding state/ { state=$3; gsub(/;/,"",state) }
/^}/ { leases[ip]=state }
END { for (ip in leases) if (leases[ip] == "active") count++; print count + 0 }
' /var/lib/dhcpd/dhcpd.leases)
PERCENT=$((ACTIVE * 100 / TOTAL))
echo "Pool utilization: $ACTIVE/$TOTAL ($PERCENT%)"
```

## Setting Up Monitoring Alerts

Create a cron job to alert when the pool is getting full:

```bash
cat > /usr/local/bin/dhcp-pool-alert.sh << 'SCRIPT'
#!/bin/bash
LEASE_FILE="/var/lib/dhcpd/dhcpd.leases"
TOTAL_POOL=101
THRESHOLD=80

ACTIVE=$(awk '
/^lease / { ip=$2; state="" }
/^[[:space:]]*binding state/ { state=$3; gsub(/;/,"",state) }
/^}/ { leases[ip]=state }
END { for (ip in leases) if (leases[ip] == "active") count++; print count + 0 }
' "$LEASE_FILE")
PERCENT=$((ACTIVE * 100 / TOTAL_POOL))

if [ $PERCENT -ge $THRESHOLD ]; then
    logger -p local7.warning "DHCP pool utilization at ${PERCENT}% ($ACTIVE/$TOTAL_POOL)"
fi
SCRIPT

chmod +x /usr/local/bin/dhcp-pool-alert.sh
```

Add to cron:

```bash
echo "*/15 * * * * root /usr/local/bin/dhcp-pool-alert.sh" > /etc/cron.d/dhcp-monitor
```

## Handling Abandoned Leases

A lease becomes "abandoned" when the DHCP server detects that the IP is already in use, such as by pinging before offering. Abandoned leases remain unavailable for at least `abandon-lease-time` seconds, then dhcpd can try to reclaim them if no free leases are available.

Find abandoned leases:

```bash
awk '
/^lease / { ip=$2; mac=""; name=""; state="" }
/^[[:space:]]*hardware ethernet/ { mac=$3; gsub(/;/,"",mac) }
/^[[:space:]]*client-hostname/ { name=$2; gsub(/[";]/,"",name) }
/^[[:space:]]*binding state/ { state=$3; gsub(/;/,"",state) }
/^}/ {
    states[ip]=state
    details[ip]=mac "|" name
}
END {
    for (ip in states) {
        if (states[ip] == "abandoned") {
            split(details[ip], f, "|")
            printf "%-16s %-20s %s\n", ip, f[1], f[2]
        }
    }
}
' /var/lib/dhcpd/dhcpd.leases | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n
```

If you must manually clear abandoned leases instead of waiting for dhcpd to reclaim them, stop the server, back up the lease file, edit carefully, and restart:

```bash
systemctl stop dhcpd

# Back up the lease file

cp /var/lib/dhcpd/dhcpd.leases /var/lib/dhcpd/dhcpd.leases.backup

# Remove abandoned entries (be careful with this)
awk '
/^lease[[:space:]][^{]+[[:space:]]*\{/ {
    in_lease=1; block=$0 ORS; abandoned=0; next
}
in_lease {
    block=block $0 ORS
    if ($0 ~ /^[[:space:]]*binding state abandoned;/) abandoned=1
    if ($0 ~ /^}/) {
        if (!abandoned) printf "%s", block
        in_lease=0; block=""; abandoned=0
    }
    next
}
{ print }
' \
    /var/lib/dhcpd/dhcpd.leases > /var/lib/dhcpd/dhcpd.leases.clean

mv /var/lib/dhcpd/dhcpd.leases.clean /var/lib/dhcpd/dhcpd.leases
chown dhcpd:dhcpd /var/lib/dhcpd/dhcpd.leases

systemctl start dhcpd
```

To prevent the underlying conflict that caused the abandonment, find out what device has that IP statically configured and either change it or create a DHCP reservation for it.

## Lease File Maintenance

The lease file grows over time as old entries accumulate. ISC DHCP periodically rewrites the file from its in-memory lease database to prevent unbounded growth.

If you have just restored or manually maintained the lease file, restart the service after checking the file:

```bash
systemctl restart dhcpd
```

If the file gets very large, check its size:

```bash
ls -lh /var/lib/dhcpd/dhcpd.leases
```

A backup file (dhcpd.leases~) is maintained automatically.

## Tracking Lease History

If you need to know what IP a device had at a specific time, the lease file has the history. Search by MAC address:

```bash
grep -A 8 "00:11:22:33:44:55" /var/lib/dhcpd/dhcpd.leases
```

Or by hostname:

```bash
grep -B 5 -A 3 "workstation1" /var/lib/dhcpd/dhcpd.leases
```

## Using OMAPI for Dynamic Management

ISC DHCP supports OMAPI (Object Management API) for dynamic management without restarting the server. Enable it in dhcpd.conf:

```bash
omapi-port 7911;
omapi-key omapi-key;

key omapi-key {
    algorithm hmac-sha256;
    secret "your-base64-secret-here";
}
```

Then use `omshell` to query and modify leases:

```bash
omshell << 'EOF'
server localhost
port 7911
key-algorithm HMAC-SHA256
key omapi-key your-base64-secret-here
connect
new lease
set ip-address = 192.168.1.150
open
EOF
```

This is advanced but useful for automation.

## Exporting Lease Data

For reporting or integration with monitoring tools, export lease data to a structured format:

```bash
awk '
/^lease / { ip=$2 }
/^[[:space:]]*starts / { start=$3" "$4; gsub(/;/,"",start) }
/^[[:space:]]*ends / { end=$3" "$4; gsub(/;/,"",end) }
/^[[:space:]]*hardware ethernet/ { mac=$3; gsub(/;/,"",mac) }
/^[[:space:]]*client-hostname/ { name=$2; gsub(/[";]/,"",name) }
/^[[:space:]]*binding state/ { state=$3; gsub(/;/,"",state) }
/^\}/ {
    states[ip]=state
    details[ip]=mac "," name "," start "," end
    ip=""; mac=""; name=""; state=""; start=""; end=""
}
END {
    for (ip in states) {
        if (states[ip] == "active") {
            print ip "," details[ip]
        }
    }
}
' /var/lib/dhcpd/dhcpd.leases > /tmp/dhcp-leases.csv

echo "IP,MAC,Hostname,Start,End"
cat /tmp/dhcp-leases.csv
```

## Best Practices

1. **Monitor pool utilization** regularly. Set alerts at 80% and 90% thresholds.
2. **Review abandoned leases** monthly. They indicate IP conflicts on your network.
3. **Back up the lease file** before any maintenance.
4. **Keep lease times reasonable.** Too short creates unnecessary traffic. Too long wastes addresses. 1-4 hours for workstations, 12-24 hours for servers is a common approach.
5. **Use reservations** for devices that need consistent addresses rather than static configuration. This keeps all IP management in one place.

Good lease management prevents the most common DHCP headaches: pool exhaustion, address conflicts, and stale entries consuming resources. A few minutes of monitoring each week saves hours of emergency troubleshooting.
