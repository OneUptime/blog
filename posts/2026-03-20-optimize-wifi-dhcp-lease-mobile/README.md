# How to Optimize WiFi DHCP Lease Times for Mobile Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, WiFi, Lease Time, Mobile Devices, Performance, Optimization

Description: Learn how to optimize DHCP lease times for WiFi networks serving mobile devices, balancing IP pool efficiency against reconnection speed for phones, laptops, and IoT devices.

## The DHCP Lease Time Dilemma

DHCP lease time affects two competing concerns:

**Short lease times (< 1 hour):**
- Free up IPs quickly when devices leave
- More DHCP traffic and processing overhead
- Devices may fail to renew during brief network gaps
- Better IP pool utilization in high-churn environments

**Long lease times (> 24 hours):**
- Fewer DHCP requests = less overhead
- Devices retain IP after brief disconnections
- Pool exhaustion if many devices visit (coffee shop, conference)
- Better for stable environments (office, home)

## Step 1: Analyze Your Client Base

```bash
# Count current active DHCP leases

cat /var/lib/misc/dnsmasq.leases | wc -l

# Check how many unique devices have connected recently
cat /var/lib/misc/dnsmasq.leases | awk '{print $2}' | sort -u | wc -l

# Show lease expiry distribution
cat /var/lib/misc/dnsmasq.leases | awk '{print $1}' | while read ts; do
  echo "$(date -d @$ts)"
done | sort
```

## Step 2: Configure Lease Times by Device Type

Use DHCP classes to give different lease times to different clients:

```bash
# /etc/dnsmasq.conf

# Short leases for vendor-detected mobile/IoT devices
# Long leases for corporate devices and servers

# Short lease class (1 hour) for IoT
dhcp-host=tag:iot,set:short_lease
dhcp-option=tag:short_lease,51,3600   # 1 hour lease

# Default 12-hour lease for most WiFi clients
dhcp-range=192.168.1.100,192.168.1.200,12h

# Long leases for reserved hosts (servers, printers)
dhcp-host=AA:BB:CC:DD:EE:FF,192.168.1.10,hostname,24h   # 24 hours
dhcp-host=11:22:33:44:55:66,192.168.1.11,printer,7d     # 7 days
```

## Step 3: Optimize for High-Churn Environments (Cafe, Event)

For venues with many transient clients:

```bash
# /etc/dhcp/dhcpd.conf - high-churn WiFi

subnet 192.168.50.0 netmask 255.255.255.0 {
    range 192.168.50.10 192.168.50.254;     # Large pool (245 IPs)
    option routers 192.168.50.1;
    option domain-name-servers 8.8.8.8, 1.1.1.1;

    # Short leases for guest WiFi
    default-lease-time 1800;    # 30 minutes
    max-lease-time 3600;        # 1 hour max

    # Require clients to re-authenticate more frequently
}
```

## Step 4: Optimize for Enterprise/Office (Stable Clients)

For offices where devices stay connected for full working days:

```bash
# /etc/dhcp/dhcpd.conf - office WiFi

subnet 192.168.10.0 netmask 255.255.255.0 {
    range 192.168.10.50 192.168.10.200;
    option routers 192.168.10.1;
    option domain-name-servers 192.168.10.1;

    # Long leases for stable office clients
    default-lease-time 86400;    # 24 hours (typical work day + some)
    max-lease-time 604800;       # 7 days max

    # Clients on this network are typically known, managed devices
}
```

## Step 5: Configure Fast Lease Release for Mobile Devices

Mobile devices (Android/iOS) often move between networks without properly releasing leases:

```bash
# Enable ping check before assigning - avoids giving leases
# to IPs still in use by sleeping devices
ping-check true;
ping-timeout 2;

# Or with dnsmasq - probe before assigning
# (dnsmasq sends an ICMP echo request by default; disable with --no-ping)

# For faster IP reclaim, reduce lease time but provide DHCP option
# to suggest preferred client polling behavior
```

## Step 6: Monitor Pool Utilization

```bash
# dnsmasq: check current pool usage
cat /var/lib/misc/dnsmasq.leases | wc -l

# Alert if pool is nearly full (>80%)
POOL_SIZE=150
ACTIVE=$(cat /var/lib/misc/dnsmasq.leases | wc -l)
PCTUSED=$(( ACTIVE * 100 / POOL_SIZE ))
echo "Pool usage: $ACTIVE/$POOL_SIZE ($PCTUSED%)"
if [ $PCTUSED -gt 80 ]; then
    echo "WARNING: DHCP pool is $PCTUSED% full"
fi

# ISC DHCPD statistics
dhcpd -T    # Test lease file
cat /var/lib/dhcp/dhcpd.leases | grep "^lease " | wc -l
```

## Conclusion

Optimize WiFi DHCP lease times based on client churn: use 30-60 minute leases for high-churn guest networks (cafes, events), 8-24 hour leases for office/home environments, and permanent reservations for servers and printers. The key metric is ensuring your DHCP pool has headroom - never exceed 80% utilization during peak hours. Monitor with `wc -l /var/lib/misc/dnsmasq.leases` and adjust the pool size or lease time as needed.
