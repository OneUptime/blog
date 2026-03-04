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
- `starts` / `ends` - Lease start and expiration times
- `binding state` - active, free, abandoned, or expired
- `hardware ethernet` - Client's MAC address
- `client-hostname` - Hostname the client reported

## Listing Active Leases

The lease file can contain both active and expired entries. To see only active leases:

```bash
grep -A 8 "binding state active" /var/lib/dhcpd/dhcpd.leases | grep -E "^lease|hardware|client-hostname|ends"
```

Count active leases:

```bash
grep -c "binding state active" /var/lib/dhcpd/dhcpd.leases
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
echo "Active leases:    $(grep -c 'binding state active' $LEASE_FILE)"
echo "Free leases:      $(grep -c 'binding state free' $LEASE_FILE)"
echo "Abandoned leases: $(grep -c 'binding state abandoned' $LEASE_FILE)"
echo "Expired leases:   $(grep -c 'binding state expired' $LEASE_FILE)"
echo ""
echo "=== Active Lease Details ==="
echo ""

awk '
/^lease / { ip=$2 }
/hardware ethernet/ { mac=$3; gsub(/;/,"",mac) }
/client-hostname/ { name=$2; gsub(/[";]/,"",name) }
/binding state active/ { active=1 }
/^}/ {
    if (active) {
        printf "%-16s %-20s %s\n", ip, mac, name
    }
    active=0; ip=""; mac=""; name=""
}
' $LEASE_FILE | sort -t. -k4 -n

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
ACTIVE=$(grep -c "binding state active" /var/lib/dhcpd/dhcpd.leases)
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

ACTIVE=$(grep -c "binding state active" $LEASE_FILE)
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

A lease becomes "abandoned" when the DHCP server detects that the IP is already in use (by pinging before offering). Abandoned leases don't get reassigned automatically.

Find abandoned leases:

```bash
grep -B 1 "binding state abandoned" /var/lib/dhcpd/dhcpd.leases
```

To reclaim abandoned leases, you need to stop the server, remove them from the lease file, and restart:

```bash
systemctl stop dhcpd

# Back up the lease file
cp /var/lib/dhcpd/dhcpd.leases /var/lib/dhcpd/dhcpd.leases.backup

# Remove abandoned entries (be careful with this)
awk '/^lease.*\{/{lease=$0; data=""} {data=data"\n"$0} /^\}/{if(data !~ /binding state abandoned/) print data}' \
    /var/lib/dhcpd/dhcpd.leases > /var/lib/dhcpd/dhcpd.leases.clean

mv /var/lib/dhcpd/dhcpd.leases.clean /var/lib/dhcpd/dhcpd.leases
chown dhcpd:dhcpd /var/lib/dhcpd/dhcpd.leases

systemctl start dhcpd
```

To prevent the underlying conflict that caused the abandonment, find out what device has that IP statically configured and either change it or create a DHCP reservation for it.

## Lease File Maintenance

The lease file grows over time as expired entries accumulate. ISC DHCP periodically rewrites the file to clean up expired entries, but you can force it:

Stop the server and let it clean up on restart:

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
/starts / { start=$3" "$4; gsub(/;/,"",start) }
/ends / { end=$3" "$4; gsub(/;/,"",end) }
/hardware ethernet/ { mac=$3; gsub(/;/,"",mac) }
/client-hostname/ { name=$2; gsub(/[";]/,"",name) }
/binding state/ { state=$3; gsub(/;/,"",state) }
/^\}/ {
    if (state == "active") {
        printf "%s,%s,%s,%s,%s\n", ip, mac, name, start, end
    }
    ip=""; mac=""; name=""; state=""; start=""; end=""
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
