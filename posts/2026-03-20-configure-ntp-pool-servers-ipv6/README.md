# How to Configure NTP Pool Servers over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NTP, NTP Pool, IPv6, Time Synchronization, Chrony, ntpd

Description: Configure your systems to use the NTP Pool Project servers over IPv6, including selecting IPv6-specific pool zones and verifying IPv6 connectivity to pool servers.

---

The NTP Pool Project (pool.ntp.org) is a global network of thousands of volunteer NTP servers. Many pool servers support IPv6, and the pool exposes IPv6 (AAAA) records on zones prefixed with `2.`. Using IPv6 NTP pool servers reduces latency and enables time synchronization on IPv6-only networks.

## NTP Pool IPv6 Zones

The NTP Pool Project only returns IPv6 (AAAA) addresses for zones prefixed with `2.`. There is no separate `ipv6.` subdomain — the `2.` prefix is the official way to request IPv6-capable servers across all zones (global, continental, and country):

```text
# Global zone with IPv6 (AAAA) records
2.pool.ntp.org

# Continental zones with IPv6
2.asia.pool.ntp.org
2.europe.pool.ntp.org
2.north-america.pool.ntp.org
2.oceania.pool.ntp.org
2.south-america.pool.ntp.org

# Country-specific (if they have IPv6 nodes)
2.us.pool.ntp.org
2.de.pool.ntp.org
2.jp.pool.ntp.org
```

Zones without a number prefix or prefixed with `0`, `1`, or `3` return only IPv4 (A) records. Whether IPv6 addresses are actually returned for a given `2.` zone depends on the availability of IPv6-capable servers in that zone.

## Checking IPv6 Availability of Pool Servers

```bash
# Verify the pool resolves to IPv6 addresses
dig AAAA 2.pool.ntp.org +short

# Check specific regional pool
dig AAAA 2.europe.pool.ntp.org +short

# Verify connectivity to the IPv6 pool
ping6 -c 3 2.pool.ntp.org
```

## Configuring chrony with IPv6 Pool Servers

```bash
# /etc/chrony.conf

# Use the dual-stack pool zone (has AAAA records)
pool 2.pool.ntp.org iburst maxsources 4

# Or use the regional dual-stack pool for better latency
pool 2.north-america.pool.ntp.org iburst maxsources 4

# Allow your subnet to use this server as NTP
allow 2001:db8::/32
allow 192.168.0.0/16

driftfile /var/lib/chrony/drift
logdir /var/log/chrony
```

```bash
# Apply configuration
sudo systemctl restart chronyd

# Verify sources include IPv6 addresses
chronyc sources -v
# IPv6 addresses will show in brackets: [2001:db8::x]
```

## Configuring ntpd with IPv6 Pool Servers

```bash
# /etc/ntp.conf

# Use the dual-stack pool zone (returns AAAA records)
pool 2.pool.ntp.org iburst

# Or mix with the standard set (only 2.pool.ntp.org returns AAAA)
pool 0.pool.ntp.org iburst
pool 1.pool.ntp.org iburst
pool 2.pool.ntp.org iburst
pool 3.pool.ntp.org iburst

# Force IPv6 for specific servers using the -6 flag (ntpd option)
# ntpd resolves pool entries and uses AAAA if available

# Access restrictions (ntpd uses 'mask' syntax, not CIDR)
restrict default kod limited nomodify notrap nopeer noquery
restrict 127.0.0.1
restrict ::1
restrict 2001:db8:: mask ffff:ffff:: nomodify notrap nopeer

driftfile /var/lib/ntp/drift
```

## Configuring systemd-timesyncd with IPv6 Pool

```bash
# /etc/systemd/timesyncd.conf

[Time]
# Use the dual-stack pool zone (returns AAAA records)
NTP=2.pool.ntp.org pool.ntp.org
FallbackNTP=time.google.com time.cloudflare.com
```

## Joining the NTP Pool as an IPv6 Server

To contribute an IPv6 NTP server to the pool:

```bash
# Step 1: Configure chrony as an accurate NTP server
# /etc/chrony.conf
pool 2.pool.ntp.org iburst maxsources 4
allow ::/0         # Allow pool monitoring connections
allow 0.0.0.0/0

# Step 2: Ensure your server has a static IPv6 address with proper DNS
dig AAAA your-ntp-server.example.com +short

# Step 3: Configure reverse DNS for your IPv6 address
# Contact your IP provider for PTR record setup

# Step 4: Register at https://www.ntppool.org/manage
# Add your IPv6 address when registering

# Verify your server is accessible before registering
ntpdate -q 2001:db8::your-server
```

## Monitoring Pool Server Performance

```bash
# Monitor which pool servers are being used
chronyc sources

# Check synchronization quality
chronyc sourcestats

# Verify time offset is acceptable
chronyc tracking | grep "System time"

# Watch NTP traffic to pool servers (IPv6)
sudo tcpdump -i eth0 -n ip6 and udp port 123
```

## Handling Dual-Stack NTP Pool Resolution

```bash
# Verify your system prefers IPv6 for NTP pool DNS
# Check /etc/gai.conf for address preference

cat /etc/gai.conf | grep "^precedence"
# Default usually prefers IPv6 when available

# Force IPv6 preference in gai.conf by lowering the precedence of
# IPv4-mapped IPv6 addresses below the default of 10
echo "precedence ::ffff:0:0/96 5" | sudo tee -a /etc/gai.conf
# This deprioritizes IPv4-mapped addresses so native IPv6 is preferred

# These default lines (already higher precedence) keep native IPv6 first:
# precedence  ::1/128       50
# precedence  ::/0          40
```

Using the IPv6-specific NTP pool zones ensures your time synchronization traffic stays on IPv6, reduces cross-protocol overhead, and supports the global pool ecosystem by using IPv6-capable pool members.
