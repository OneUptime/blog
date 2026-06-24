# How to Protect Against SYN Flood Attacks with SYN Cookies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SYN Flood, SYN Cookies, Linux, Security, DDoS, TCP

Description: Enable and configure TCP SYN cookies on Linux to defend against SYN flood DDoS attacks without dropping legitimate connections.

A SYN flood exhausts the server's TCP connection backlog by sending thousands of SYN packets without completing the handshake. SYN cookies allow the server to handle these connections without maintaining state, preserving resources for legitimate users.

## How SYN Floods Work

```text
Normal TCP Handshake:         SYN Flood Attack:
  Client → SYN →  Server        Attacker → SYN (fake src) → Server
  Client ← SYN-ACK ← Server    Server allocates memory (no ACK comes)
  Client → ACK →  Server        Backlog fills up → new connections DROP

The server stores state for each half-open connection in a limited queue.
A flood of SYNs fills this queue, dropping legitimate users.
```

## How SYN Cookies Solve This

With SYN cookies, the server encodes connection state into the SYN-ACK sequence number. No backlog entry is created. If the client completes the handshake (ACK), the state is reconstructed from the cookie:

```text
SYN Cookie Flow:
  Client → SYN → Server
  Server → SYN-ACK (sequence = cryptographic cookie) → Client - NO state stored
  Client → ACK (ACK = cookie + 1) → Server
  Server: validates cookie, creates connection entry
```

## Enable SYN Cookies

```bash
# Enable SYN cookies immediately

sudo sysctl -w net.ipv4.tcp_syncookies=1

# Verify
cat /proc/sys/net/ipv4/tcp_syncookies
# 1 = enabled

# Make permanent
echo "net.ipv4.tcp_syncookies = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Tune the SYN Backlog

SYN cookies activate only when the backlog fills. Increasing the backlog adds a buffer before cookies are needed:

```bash
# Increase the TCP SYN backlog (incomplete connections queue)
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=4096

# Increase the general listen backlog
sudo sysctl -w net.core.somaxconn=65535

# Reduce SYN-ACK retransmit count (faster cleanup)
sudo sysctl -w net.ipv4.tcp_synack_retries=2

# Make permanent
cat << 'EOF' | sudo tee /etc/sysctl.d/99-syn-protection.conf
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 4096
net.core.somaxconn = 65535
net.ipv4.tcp_synack_retries = 2
EOF
sudo sysctl -p /etc/sysctl.d/99-syn-protection.conf
```

## Add iptables Rate Limiting as Second Layer

SYN cookies handle state exhaustion; iptables limits raw packet rate:

```bash
# Allow normal SYN rate, drop excess
sudo iptables -A INPUT -p tcp --syn \
  -m limit --limit 100/second --limit-burst 200 \
  -j ACCEPT

# Log and drop SYNs that exceed the limit
sudo iptables -A INPUT -p tcp --syn \
  -j LOG --log-prefix "SYN-FLOOD: " --log-level 4
sudo iptables -A INPUT -p tcp --syn -j DROP
```

## Monitor for SYN Floods

```bash
# Watch for SYN flood evidence
watch -n 1 'ss -s | grep -i syn'

# Count SYN_RECV connections (half-open = potential flood)
ss -Htan state syn-recv | wc -l

# Check if SYN cookies are being used
netstat -s | grep "SYNs to LISTEN"
# or
netstat -s | grep -i cookie

# View TCP statistics
sudo ss -s
# Output summarizes socket counts, including SYN_RECV when present
```

## Detect and Block SYN Flood Sources

```bash
# Find top IPs sending SYN packets during an attack
sudo tcpdump -nn -c 1000 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn' 2>/dev/null \
  | awk '/ IP / { sub(/\.[0-9]+$/, "", $3); print $3 }' \
  | sort | uniq -c | sort -rn | head -10

# Block the top attacker IPs
sudo iptables -A INPUT -s <attacker-ip> -j DROP
```

SYN cookies combined with iptables rate limiting provide a robust two-layer defense against SYN flood attacks, helping maintain legitimate service availability during attacks.
