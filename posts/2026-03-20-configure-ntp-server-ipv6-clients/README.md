# How to Configure NTP Server for IPv6 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NTP, IPv6, Time Synchronization, ntpd, Chrony, Server Configuration

Description: Configure an NTP server to accept time synchronization requests from IPv6 clients, covering ntpd and chrony configurations, access control, and firewall rules.

---

NTP (Network Time Protocol) is essential for clock synchronization across your infrastructure. Configuring your NTP server to serve IPv6 clients requires attention to binding configuration, access control lists, and firewall rules for IPv6.

## Understanding NTP with IPv6

NTP uses UDP port 123. For IPv6 client support, your NTP server must:
1. Bind to its IPv6 interface address.
2. Have access control rules that allow IPv6 client networks.
3. Have the UDP port 123 open in the IPv6 firewall.

## Configuring ntpd for IPv6 Clients

Edit the ntp.conf to listen on IPv6 interfaces:

```bash
# /etc/ntp.conf

# Upstream time sources (use pool servers with IPv6 support)

pool 2.pool.ntp.org iburst
server time.google.com iburst

# Listen on all interfaces including IPv6
# ntpd listens on all interfaces by default
# To restrict to specific interfaces:
# interface listen 2001:db8::1

# IPv6 access control - allow your IPv6 network
# Restrict everything by default
restrict default kod limited nomodify notrap nopeer noquery

# Allow localhost IPv4 and IPv6
restrict 127.0.0.1
restrict ::1

# Allow your IPv6 client subnet
restrict 2001:db8:: mask ffff:ffff:: nomodify notrap nopeer

# Allow a specific IPv6 host
restrict 2001:db8::100 nomodify notrap

# Drift file
driftfile /var/lib/ntp/drift

# Log file
logfile /var/log/ntp/ntp.log
```

```bash
# Restart ntpd
sudo systemctl restart ntp

# Verify ntpd is listening on IPv6
ss -ulnp | grep :123

# Check ntpd IPv6 associations
ntpq -6 -p
```

## Configuring chrony for IPv6 Clients

chrony is the modern replacement for ntpd and has excellent IPv6 support:

```bash
# /etc/chrony.conf

# Upstream NTP sources
pool pool.ntp.org iburst

# Allow any IPv6 client from your subnet
allow 2001:db8::/32

# Allow specific IPv6 host
allow 2001:db8::100

# Also allow IPv4 if needed
allow 192.168.1.0/24

# Listen on all interfaces (default)
# To bind to a specific IPv6 address:
# bindaddress 2001:db8::1

# Log directory
logdir /var/log/chrony
```

```bash
# Restart chronyd
sudo systemctl restart chronyd

# Verify chrony is serving NTP on IPv6
ss -ulnp | grep :123

# Check sources and tracking
chronyc sources
chronyc tracking
```

## Firewall Configuration for IPv6 NTP

Open UDP port 123 for IPv6 clients:

```bash
# Using ip6tables
sudo ip6tables -A INPUT -p udp --dport 123 -j ACCEPT

# Restrict to specific subnet
sudo ip6tables -A INPUT -p udp -s 2001:db8::/32 --dport 123 -j ACCEPT

# Save rules
sudo ip6tables-save > /etc/iptables/rules.v6

# Using firewalld
sudo firewall-cmd --zone=public --add-service=ntp --permanent
sudo firewall-cmd --reload
```

## Testing NTP Server IPv6 Functionality

Test from an IPv6 client:

```bash
# Query the NTP server using its IPv6 address
ntpdate -q 2001:db8::1

# Or using chronyc remote query
chronyc -h 2001:db8::1 sources

# Check NTP server statistics from the server
ntpq -6 -n -p

# Using nmap to verify port 123 is open on IPv6
nmap -6 -sU -p 123 2001:db8::1
```

## Configuring NTP Client to Use IPv6 Server

On client machines, point to your IPv6 NTP server:

```bash
# /etc/chrony.conf (client)
server 2001:db8::1 iburst prefer

# Test synchronization
sudo chronyc makestep
chronyc tracking
```

## Monitoring Your IPv6 NTP Server

```bash
#!/bin/bash
# Monitor NTP server health over IPv6

NTP_SERVER="2001:db8::1"

# Check NTP response time
response=$(ntpdate -q $NTP_SERVER 2>&1)
if echo "$response" | grep -q "offset"; then
  offset=$(echo "$response" | grep -oP 'offset \K[\d.-]+')
  echo "NTP server $NTP_SERVER - Offset: ${offset}s"
else
  echo "ERROR: NTP server $NTP_SERVER not responding"
fi

# Check peer status on the server
ntpq -6 -n -c peers $NTP_SERVER
```

A properly configured NTP server that supports IPv6 clients ensures accurate time synchronization across your entire IPv6 network, which is critical for logs, security certificates, Kerberos authentication, and distributed system coordination.
