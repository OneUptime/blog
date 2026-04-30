# How to Set Up Rate Limiting with iptables to Prevent DDoS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, DDoS, Rate Limiting, IPv4, Linux, Security

Description: Use iptables rate limiting modules (limit, hashlimit, connlimit) to protect Linux servers against DDoS attacks and port scanning.

Rate limiting with iptables throttles incoming IPv4 traffic and new connection attempts to prevent resource exhaustion from DDoS attacks, brute force, and connection floods.

## Method 1: Global Rate Limit with --limit

The `limit` module limits packet rates globally:

```bash
# Allow an average of 5 ping requests per second, with an initial burst of 10

sudo iptables -A INPUT -p icmp --icmp-type echo-request \
  -m limit --limit 5/second --limit-burst 10 -j ACCEPT
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j DROP

# Limit new SSH connections to an average of 4 per minute globally, with a burst of 6
sudo iptables -A INPUT -p tcp --dport 22 \
  -m conntrack --ctstate NEW \
  -m limit --limit 4/minute --limit-burst 6 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j DROP
```

## Method 2: Per-IP Rate Limit with --hashlimit

The `hashlimit` module limits rates per source IP:

```bash
# Allow each source IP an average of 4 new SSH connections per minute, with a burst of 6
sudo iptables -A INPUT -p tcp --dport 22 \
  -m conntrack --ctstate NEW \
  -m hashlimit \
  --hashlimit-name ssh-limit \
  --hashlimit-mode srcip \
  --hashlimit-upto 4/min \
  --hashlimit-burst 6 \
  --hashlimit-htable-expire 60000 \
  -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j DROP

# Rate limit new HTTP connections per IP to an average of 100 per minute, with a burst of 200
sudo iptables -A INPUT -p tcp --dport 80 \
  -m conntrack --ctstate NEW \
  -m hashlimit \
  --hashlimit-name http-limit \
  --hashlimit-mode srcip \
  --hashlimit-upto 100/min \
  --hashlimit-burst 200 \
  -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -j DROP
```

## Method 3: Connection Count Limit with --connlimit

Limit the number of concurrent connections from a single IP:

```bash
# Allow max 10 concurrent connections to SSH per source IP
sudo iptables -A INPUT -p tcp --syn --dport 22 \
  -m connlimit --connlimit-above 10 -j REJECT

# Limit concurrent HTTP connections per IP to 20
sudo iptables -A INPUT -p tcp --syn --dport 80 \
  -m connlimit --connlimit-above 20 -j REJECT
```

## SYN Flood Protection

```bash
# Limit SYN packets to an average of 50 per second, with a burst of 100
sudo iptables -N SYN_FLOOD
sudo iptables -A INPUT -p tcp --syn -j SYN_FLOOD
sudo iptables -A SYN_FLOOD \
  -m limit --limit 50/second --limit-burst 100 -j RETURN
sudo iptables -A SYN_FLOOD -j DROP

# Or enable SYN cookies (kernel-level fallback):
sudo sysctl -w net.ipv4.tcp_syncookies=1
echo "net.ipv4.tcp_syncookies = 1" | sudo tee -a /etc/sysctl.conf
```

## Port Scan Detection

```bash
# Create a tracking chain
sudo iptables -N PORTSCAN
sudo iptables -A PORTSCAN \
  -m recent --update --seconds 60 --hitcount 5 --name portscanners -j DROP
sudo iptables -A PORTSCAN -m recent --set --name portscanners -j RETURN

# Track rapid SYN attempts from the same source IP
sudo iptables -A INPUT -p tcp --syn -j PORTSCAN

sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

## Combined Anti-DDoS Script

```bash
#!/bin/bash
# anti-ddos.sh - Multi-layer rate limiting

# SYN flood protection
iptables -N SYN_FLOOD
iptables -A INPUT -p tcp --syn -j SYN_FLOOD
iptables -A SYN_FLOOD -m limit --limit 50/s --limit-burst 100 -j RETURN
iptables -A SYN_FLOOD -j DROP

# Per-IP rate limiting for new SSH connections
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
  -m hashlimit --hashlimit-name ssh --hashlimit-mode srcip \
  --hashlimit-upto 3/min --hashlimit-burst 5 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j DROP

# Concurrent connection limits
iptables -A INPUT -p tcp --syn --dport 80 -m connlimit --connlimit-above 50 -j REJECT
iptables -A INPUT -p tcp --syn --dport 443 -m connlimit --connlimit-above 50 -j REJECT

# ICMP rate limiting
iptables -A INPUT -p icmp -m limit --limit 10/s -j ACCEPT
iptables -A INPUT -p icmp -j DROP

echo "Anti-DDoS rules applied"
```

## Monitoring Rate Limit Hits

```bash
# View hashlimit table
cat /proc/net/ipt_hashlimit/ssh-limit

# Check rule hit counts
sudo iptables -L INPUT -n -v | grep -E "ssh|http|icmp"
```

Rate limiting doesn't stop determined DDoS attacks entirely but prevents single-source floods and brute force from overwhelming the server.
