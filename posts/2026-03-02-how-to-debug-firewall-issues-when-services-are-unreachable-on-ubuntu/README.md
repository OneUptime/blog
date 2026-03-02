# How to Debug Firewall Issues When Services Are Unreachable on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Firewall, Troubleshooting, Networking, Sysadmin

Description: Systematically diagnose and fix firewall-related connectivity issues on Ubuntu when services appear to be running but are unreachable, using tcpdump, iptables tracing, and connection testing tools.

---

Few troubleshooting scenarios are more frustrating than a service that's running, configured correctly, and listening on the right port - but completely unreachable. Firewall rules are a frequent culprit, but the challenge is that firewall issues can look identical to network issues or service configuration problems. A systematic approach saves time.

## First: Confirm the Service Is Actually Running

Before blaming the firewall, verify the service is up and listening:

```bash
# Check if the service is running
sudo systemctl status nginx
sudo systemctl status postgresql

# Check what ports are actually listening
sudo ss -tlnp   # TCP listening
sudo ss -ulnp   # UDP listening

# Or with netstat (older tool, may not be installed)
sudo netstat -tlnp

# Check if a specific port is listening
sudo ss -tlnp | grep ':80'
sudo ss -tlnp | grep ':5432'
```

If the port isn't in the listening list, the service isn't running or isn't configured to listen on that port - no amount of firewall work will fix that.

## Step 1: Test Local Connectivity

Before testing remote connectivity, verify the service works locally:

```bash
# Test from the same server (bypasses all network firewalls)
curl -v http://localhost:80
curl -v http://127.0.0.1:80

# For non-HTTP services
nc -zv localhost 5432
nc -zv 127.0.0.1 22

# For SSL services
openssl s_client -connect localhost:443
```

If local connectivity fails, the issue is with the service configuration, not the firewall. Fix the service first.

## Step 2: Test from Another Host on the Same Network

From another machine on the same network (no NAT or routing in between):

```bash
# Test TCP connectivity
nc -zv 192.168.1.10 80
nc -zv 192.168.1.10 443

# Test with a timeout
nc -zv -w 5 192.168.1.10 80

# Test HTTP explicitly
curl -v http://192.168.1.10

# Diagnose connection behavior:
# - Connection refused: Service not listening on that port
# - Connection timeout: Firewall is dropping packets (DROP rule)
# - "Connection refused" immediately: Firewall is rejecting (REJECT rule)
```

The behavior tells you something:
- **Connection refused**: Port not open or service not listening - firewall rule isn't the issue (a firewall DROP would time out, not refuse)
- **Connection timeout**: Firewall is DROPping packets - check firewall rules
- **Connection reset**: Application is resetting connections, or a proxy is interfering

## Step 3: Check Firewall Rules

### UFW

```bash
# Check UFW status and rules
sudo ufw status verbose

# Check if UFW is active
sudo ufw status | head -1
```

If UFW shows `Status: inactive`, it's not the problem. If active, check whether there's a rule that would allow the connection.

### iptables

```bash
# List all INPUT rules with packet counters
sudo iptables -L INPUT -n -v --line-numbers

# Look specifically for rules matching your port
sudo iptables -L INPUT -n | grep "80\|443\|5432"

# Check all tables (not just filter)
sudo iptables -L -n -v -t filter
sudo iptables -L -n -v -t nat
sudo iptables -L -n -v -t mangle
```

The packet counters (`pkts` column) show which rules are matching traffic. A rule with zero packets hasn't matched anything.

### nftables

```bash
# List all rules with counters
sudo nft -a list ruleset

# List specific chain
sudo nft list chain inet filter input

# Add a temporary counter rule to see traffic
sudo nft add rule inet filter input tcp dport 80 counter
```

## Step 4: Use tcpdump to Watch Packets

tcpdump shows you exactly what's happening at the packet level:

```bash
# Watch for connection attempts on port 80
sudo tcpdump -n -i eth0 'tcp port 80'

# Watch while making a connection from another host
# On the server (in one terminal):
sudo tcpdump -n -i any 'port 80'

# From another machine (in another terminal):
curl http://server-ip
```

What to look for in the output:

```
# Successful connection - you see SYN, SYN-ACK, ACK
14:30:01.123456 IP 192.168.1.100.54321 > 192.168.1.10.80: Flags [S]   # SYN
14:30:01.123500 IP 192.168.1.10.80 > 192.168.1.100.54321: Flags [S.]  # SYN-ACK
14:30:01.123600 IP 192.168.1.100.54321 > 192.168.1.10.80: Flags [.]   # ACK

# Firewall DROP - you see SYN but no SYN-ACK (client times out)
14:30:01.123456 IP 192.168.1.100.54321 > 192.168.1.10.80: Flags [S]   # SYN only, no response

# Connection refused - SYN then RST (Reset)
14:30:01.123456 IP 192.168.1.100.54321 > 192.168.1.10.80: Flags [S]   # SYN
14:30:01.123500 IP 192.168.1.10.80 > 192.168.1.100.54321: Flags [R.]  # RST (reset)
```

If you see SYN packets arriving but no SYN-ACK, the firewall is dropping them.

## Step 5: Trace Packets Through iptables

For complex rule sets, iptables tracing shows exactly which rules a packet matches:

```bash
# Enable tracing for packets on port 80
sudo iptables -t raw -A PREROUTING -p tcp --dport 80 -j TRACE
sudo iptables -t raw -A OUTPUT -p tcp --dport 80 -j TRACE

# Make a connection from another host
# Watch the trace in the kernel log
sudo journalctl -f -k | grep TRACE

# Or in syslog
sudo tail -f /var/log/kern.log | grep TRACE

# IMPORTANT: Remove trace rules when done (they generate huge log volume)
sudo iptables -t raw -D PREROUTING -p tcp --dport 80 -j TRACE
sudo iptables -t raw -D OUTPUT -p tcp --dport 80 -j TRACE
```

The trace output shows each table and chain the packet passes through, and which rule it matches. This makes it possible to find exactly where a packet is being dropped.

## Step 6: Check for UFW and Docker Interaction

Docker modifies iptables directly and can interfere with UFW rules:

```bash
# Check Docker's iptables rules
sudo iptables -L DOCKER -n
sudo iptables -L DOCKER-USER -n

# See the full iptables ruleset (can be long)
sudo iptables-save | grep -E "DOCKER|docker"
```

A common issue: UFW blocks port 80, but Docker's iptables rules allow it anyway. The fix is to configure Docker to not modify iptables, or to use the DOCKER-USER chain (which is evaluated before Docker's other rules):

```bash
# Block in DOCKER-USER chain (respected before Docker's rules)
sudo iptables -I DOCKER-USER -p tcp --dport 80 -j DROP
```

## Step 7: Check Application-Level Firewalls

Some applications have their own access control that can look like a firewall block:

```bash
# PostgreSQL pg_hba.conf
sudo cat /etc/postgresql/14/main/pg_hba.conf

# PostgreSQL listen_addresses
grep listen_addresses /etc/postgresql/14/main/postgresql.conf
# If set to 'localhost', it won't accept external connections

# Nginx - check if it's bound to all interfaces or just localhost
sudo grep -E "listen|server_name" /etc/nginx/sites-enabled/*

# Apache
sudo grep -E "Listen|BindAddress" /etc/apache2/ports.conf
```

An application bound to `127.0.0.1` won't accept connections from other hosts regardless of firewall rules.

## Step 8: Check SELinux/AppArmor

While Ubuntu uses AppArmor rather than SELinux, some environments have SELinux installed:

```bash
# Check AppArmor status
sudo aa-status

# Check if AppArmor is blocking a specific process
sudo journalctl | grep "apparmor" | grep "DENIED" | tail -20

# Check audit logs for denials
sudo ausearch -m AVC -ts recent 2>/dev/null | tail -20
```

## Building a Diagnostic Checklist

A structured checklist for firewall troubleshooting:

```bash
#!/bin/bash
# Quick firewall connectivity diagnostic
# Usage: sudo ./diagnose-connectivity.sh <port>

PORT="$1"
if [ -z "$PORT" ]; then
    echo "Usage: $0 <port>"
    exit 1
fi

echo "=== Connectivity Diagnostic for Port $PORT ==="

echo ""
echo "1. Service listening?"
ss -tlnp | grep ":$PORT" && echo "YES - port is listening" || echo "NO - port is not listening"

echo ""
echo "2. UFW status?"
ufw status | head -1
ufw status | grep "$PORT" || echo "No UFW rule found for port $PORT"

echo ""
echo "3. iptables rules for port $PORT?"
iptables -L INPUT -n | grep "$PORT" || echo "No iptables INPUT rules for port $PORT"

echo ""
echo "4. Default iptables policy?"
iptables -L INPUT -n | head -3

echo ""
echo "5. Listening on all interfaces or just localhost?"
ss -tlnp | grep ":$PORT" | awk '{print "Interface:", $4}'

echo ""
echo "=== End Diagnostic ==="
```

```bash
chmod +x /usr/local/bin/diagnose-connectivity.sh
sudo /usr/local/bin/diagnose-connectivity.sh 80
```

## Common Scenarios and Solutions

### Service works locally but not remotely

```bash
# Check if service is bound to localhost only
sudo ss -tlnp | grep ':80'
# If output shows "127.0.0.1:80" instead of "0.0.0.0:80", bind to all interfaces
# Edit the service configuration to listen on 0.0.0.0 or *
```

### Connection times out instead of being refused

```bash
# This means packets are being DROPped (not REJECTed)
# Check for DROP rules in iptables
sudo iptables -L INPUT -n | grep DROP

# Temporarily disable UFW to test
sudo ufw disable
# Test connectivity
curl -v http://server-ip:80
# Re-enable UFW
sudo ufw enable
```

### Works without firewall but not with it

```bash
# This confirms it's a firewall issue
# Check UFW rules for the port
sudo ufw status | grep "80\|http"

# Add missing rule
sudo ufw allow 80/tcp
sudo ufw reload
```

### Intermittent connectivity

```bash
# Could be rate limiting
sudo grep "LIMIT BLOCK" /var/log/ufw.log | grep "DPT=80"

# Check connection tracking table for exhaustion
sudo cat /proc/sys/net/netfilter/nf_conntrack_count
sudo cat /proc/sys/net/netfilter/nf_conntrack_max
```

If `nf_conntrack_count` is close to `nf_conntrack_max`, you're running out of connection tracking entries. Increase the limit:

```bash
sudo sysctl -w net.netfilter.nf_conntrack_max=131072
echo "net.netfilter.nf_conntrack_max=131072" | sudo tee -a /etc/sysctl.conf
```

Firewall debugging requires a methodical approach - resist the urge to start disabling rules randomly. Following the connection path from client to service, using tcpdump to see what packets actually arrive, and checking iptables counters to see which rules are matching will locate the problem reliably without making a mess of your firewall configuration in the process.
