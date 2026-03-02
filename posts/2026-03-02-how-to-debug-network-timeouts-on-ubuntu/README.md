# How to Debug Network Timeouts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Troubleshooting, TCP, Performance

Description: Practical guide to diagnosing network timeout issues on Ubuntu, covering TCP timeout tuning, connection state analysis, firewall rules, and application-level timeout debugging.

---

Network timeouts manifest in different ways - SSH sessions that hang, HTTP requests that take 30 seconds before failing, database queries that randomly time out, or services that become unreachable during high traffic periods. The symptoms are frustrating because they are intermittent and rarely leave clear log entries. Debugging them requires understanding where in the connection lifecycle the timeout is happening.

## Understanding Timeout Types

Before jumping to tools, it helps to identify what kind of timeout you are seeing:

- **Connection timeout**: The initial TCP SYN packet never gets a response (SYN-ACK)
- **Read timeout**: Connection was established, but data stopped arriving mid-transfer
- **Idle timeout**: Connection was established and working, but went idle and was dropped
- **DNS timeout**: Name resolution is slow or failing
- **Application-level timeout**: The server responded but the response took longer than the app's configured timeout

Each has different diagnostic approaches.

## Starting with Connection State Analysis

```bash
# View all network connections and their states
ss -tunaop

# Key connection states to look for:
# ESTABLISHED - active connections
# TIME_WAIT - connections closing, waiting for duplicate packets to expire
# CLOSE_WAIT - remote side closed but local side has not
# SYN_SENT - waiting for server to respond to SYN
# SYN_RECV - received SYN, sent SYN-ACK, waiting for ACK

# Count connections by state
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn

# Count connections to a specific port
ss -tan | grep ':443' | wc -l

# Find connections stuck in SYN_SENT (connection attempts that are timing out)
ss -tan | grep SYN_SENT

# Find CLOSE_WAIT connections (potential file descriptor leak)
ss -tan | grep CLOSE_WAIT | wc -l
```

## Diagnosing Connection Timeouts

A connection timeout means your SYN packet is not getting a response.

```bash
# Use tcpdump to capture connection attempts
# Run this, then try connecting in another terminal
sudo tcpdump -n -i any host 10.0.0.50 and port 5432

# What to look for:
# If you see SYN but no SYN-ACK: remote host is unreachable or not listening
# If you see SYN then RST: remote host actively refused
# If you see SYN then nothing for several seconds: firewall is dropping (not rejecting)
```

### Firewall Silently Dropping Packets

When a firewall drops packets rather than rejecting them, connections time out rather than failing immediately. This is a common cause of timeouts.

```bash
# Check if UFW is blocking
sudo ufw status verbose
sudo iptables -L -n -v | head -50

# Test if a port is open (returns immediately if refused, times out if dropped)
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/10.0.0.50/5432'
echo "Exit code: $?"
# Exit code 0: connected
# Exit code 1: connection refused (RST received)
# Exit code 124: timeout (no response - firewall dropping)

# More readable test
nc -zv -w 5 10.0.0.50 5432
```

## Diagnosing Idle Connection Drops

Connections that are established and working but drop after a period of inactivity are usually caused by NAT devices or firewalls that remove idle connection tracking entries.

```bash
# Check current TCP keepalive settings
cat /proc/sys/net/ipv4/tcp_keepalive_time
# Default: 7200 (2 hours before keepalive probes start)

cat /proc/sys/net/ipv4/tcp_keepalive_intvl
# Default: 75 (seconds between keepalive probes)

cat /proc/sys/net/ipv4/tcp_keepalive_probes
# Default: 9 (probes before giving up)
```

The default 2-hour keepalive is too long for most NAT environments. Many AWS and cloud load balancers drop idle TCP connections after 60-350 seconds.

Reduce the keepalive timeout:

```bash
# Set keepalive to start probing after 60 seconds
sudo sysctl -w net.ipv4.tcp_keepalive_time=60
sudo sysctl -w net.ipv4.tcp_keepalive_intvl=10
sudo sysctl -w net.ipv4.tcp_keepalive_probes=6

# Make persistent
sudo tee /etc/sysctl.d/99-tcp-keepalive.conf <<EOF
# Start keepalive probes after 60 seconds of idle time
net.ipv4.tcp_keepalive_time = 60
# Send probe every 10 seconds
net.ipv4.tcp_keepalive_intvl = 10
# Give up after 6 missed probes (60 seconds total)
net.ipv4.tcp_keepalive_probes = 6
EOF

sudo sysctl --system
```

Note: Keepalive settings only apply when the application enables `SO_KEEPALIVE` on the socket, or for applications that explicitly use keepalive.

## Analyzing Slow Application Responses

When connections establish fine but responses are slow:

```bash
# Use curl with timing info to measure where time is spent
curl -w "
    time_namelookup:  %{time_namelookup}s
    time_connect:     %{time_connect}s
    time_appconnect:  %{time_appconnect}s
    time_pretransfer: %{time_pretransfer}s
    time_ttfb:        %{time_starttransfer}s
    time_total:       %{time_total}s
" -o /dev/null -s https://api.example.com/endpoint

# time_namelookup: DNS resolution time
# time_connect: TCP handshake time
# time_appconnect: SSL/TLS handshake time (for HTTPS)
# time_ttfb (time_starttransfer): Time To First Byte - server processing time
```

A high `time_namelookup` points to DNS issues. High `time_connect` points to network routing. High `time_ttfb` points to the server's application or backend.

## TCP Retransmissions and Congestion

Retransmissions indicate packets are being lost in transit, causing timeouts:

```bash
# View TCP statistics including retransmissions
ss -s

# Or use netstat
netstat -s | grep -i 'retransmit\|timeout\|failed'

# Detailed TCP stats
cat /proc/net/snmp | grep -i tcp

# Monitor retransmissions in real time
watch -n 1 'ss -s | grep -A5 TCP'

# Use ss to show retransmit info per connection
ss -tin | grep -A 1 'retrans:[^0]'
```

High retransmit rates without packet loss at the destination usually indicate congestion somewhere in the path. Use mtr to find where:

```bash
mtr -r -n -c 100 destination.com
```

## Diagnosing TIME_WAIT Accumulation

Too many connections in TIME_WAIT state can exhaust ports and cause "Cannot assign requested address" errors (which look like timeouts):

```bash
# Count TIME_WAIT connections
ss -tan | grep TIME_WAIT | wc -l

# If this number is in the thousands, you may be exhausting ephemeral ports
# View ephemeral port range
cat /proc/sys/net/ipv4/ip_local_port_range

# Enable TIME_WAIT socket reuse
sudo sysctl -w net.ipv4.tcp_tw_reuse=1

# For short-lived services with many outbound connections, reduce TIME_WAIT duration
# (only do this on internal networks)
sudo sysctl -w net.ipv4.tcp_fin_timeout=30
```

## Application-Level Timeout Investigation

Sometimes the network is fine but application timeouts need adjustment:

### SSH Session Timeouts

```bash
# SSH client-side keepalive
# Add to ~/.ssh/config or /etc/ssh/ssh_config
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    # Disconnect if no response after 3 minutes

# SSH server-side timeout
# In /etc/ssh/sshd_config
ClientAliveInterval 120
ClientAliveCountMax 3
```

### Database Connection Timeouts

```bash
# PostgreSQL connection timeout
# Check pg_hba.conf for connection issues
sudo cat /etc/postgresql/*/main/pg_hba.conf

# Test with explicit timeout
psql -h dbserver -U user -c "SELECT 1" --connect-timeout=5

# MySQL connection timeout
mysql -h dbserver -u user -p --connect-timeout=5 -e "SELECT 1"
```

## Capturing Traffic for Deep Analysis

When other methods do not reveal the cause:

```bash
# Capture traffic to/from a specific host
sudo tcpdump -n -i eth0 host 10.0.0.50 -w /tmp/capture.pcap

# Capture with full packet content
sudo tcpdump -n -i eth0 host 10.0.0.50 -s 0 -w /tmp/capture-full.pcap

# Capture a specific port
sudo tcpdump -n -i eth0 port 5432 -w /tmp/postgres-capture.pcap

# Capture and display in real time
sudo tcpdump -n -i eth0 host 10.0.0.50 and port 443

# Analyze the capture
tcpdump -r /tmp/capture.pcap | grep -i 'retransmit\|RST\|timeout'
```

## Checking for MTU Issues

MTU (Maximum Transmission Unit) mismatches cause large packets to be fragmented or dropped, resulting in timeouts for large data transfers (file uploads, large responses) while small requests work fine:

```bash
# Check MTU of your interface
ip link show eth0 | grep mtu

# Test connectivity with increasing packet sizes
# If large pings fail and small pings work, you have an MTU issue
ping -c 3 -M do -s 1472 8.8.8.8  # 1472 + 28 byte header = 1500 MTU
ping -c 3 -M do -s 1400 8.8.8.8  # Try smaller

# Path MTU discovery
tracepath 8.8.8.8

# If you suspect MTU issues on a VPN or tunnel interface, reduce MTU
sudo ip link set eth0 mtu 1450
```

## Systematic Debugging Approach

For persistent timeout issues, work through this checklist:

```bash
# 1. Confirm network is up
ping -c 3 8.8.8.8

# 2. Confirm DNS is working
dig +short google.com

# 3. Test TCP connectivity to the target port
nc -zv -w 5 target-host port

# 4. Check firewall for silent drops
sudo iptables -L -n -v | grep DROP

# 5. Check connection states
ss -tan | awk 'NR>1{print $1}' | sort | uniq -c | sort -rn

# 6. Measure where time is spent
curl -w "\ntotal: %{time_total}s\nttfb: %{time_starttransfer}s\n" \
  -o /dev/null -s http://target-host/

# 7. Check for retransmissions
netstat -s | grep retransmit

# 8. Check MTU
ping -M do -s 1472 -c 3 target-host

# 9. Check keepalive settings
cat /proc/sys/net/ipv4/tcp_keepalive_time
```

Network timeouts are rarely from a single cause. The combination of connection state analysis, packet capture, and timing measurement usually narrows it down to a specific layer - usually either a firewall silently dropping packets, idle connection timeouts from NAT, or application-level processing delays on the server side.
