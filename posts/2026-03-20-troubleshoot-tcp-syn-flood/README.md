# How to Troubleshoot TCP SYN Flood Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Security, DDoS, SYN Flood, Linux, iptables

Description: Detect a TCP SYN flood attack in progress and apply kernel-level mitigations including SYN cookies and iptables rate limiting to maintain service availability.

## Introduction

A SYN flood attack sends a large volume of TCP SYN packets without completing the handshake, filling the server's SYN queue with half-open connections. When the queue is full, legitimate connections are dropped. Attackers typically use spoofed source IPs to prevent the SYN-ACK from completing. Linux's SYN cookie mechanism provides the primary defense.

## Detecting a SYN Flood

```bash
# Sign 1: High number of SYN_RECV connections

ss -tn state syn-received | wc -l
# Normal: < 10; Under attack: thousands

# Sign 2: Kernel warning in dmesg
dmesg | grep -i "SYN flooding"
# "Possible SYN flooding on port 80. Sending cookies."

# Sign 3: TCP statistics showing drops
netstat -s | grep -i "syn"
# SYNs to LISTEN sockets dropped: 12345  <- actively dropping

# Sign 4: High traffic rate on the interface
watch -n 1 "ip -s link show eth0 | grep -A1 'RX:'"

# Sign 5: tcpdump showing massive SYN volume
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-syn != 0' 2>/dev/null | \
  head -20  # Should show varied source IPs = distributed/spoofed attack
```

## Enable SYN Cookies (Primary Defense)

SYN cookies allow the server to respond without storing SYN state, defeating the queue exhaustion:

```bash
# Enable SYN cookies
sysctl -w net.ipv4.tcp_syncookies=1

# Verify it's working during attack
dmesg | grep cookie
# "TCP: request_sock_TCP: Possible SYN flooding...Sending cookies."

# Persist
echo "net.ipv4.tcp_syncookies=1" >> /etc/sysctl.conf
```

## Rate Limiting with iptables

```bash
# Limit SYN packets per second from each source IP
iptables -N SYN-FLOOD-PROTECT

# Allow up to 10 SYN/sec from each source IP, burst 20
iptables -A SYN-FLOOD-PROTECT -p tcp --syn \
  -m hashlimit \
  --hashlimit-name syn-flood \
  --hashlimit-mode srcip \
  --hashlimit-upto 10/sec \
  --hashlimit-burst 20 \
  -j RETURN

# Log and drop excess SYN packets
iptables -A SYN-FLOOD-PROTECT -p tcp --syn \
  -m limit --limit 1/sec \
  -j LOG --log-prefix "SYN Flood DROP: "
iptables -A SYN-FLOOD-PROTECT -p tcp --syn -j DROP

# Apply the chain
iptables -I INPUT -p tcp --syn -j SYN-FLOOD-PROTECT
```

## Increase SYN Queue Size

```bash
# More room in the queue before SYN cookies kick in
sysctl -w net.ipv4.tcp_max_syn_backlog=8192

# Reduce SYN-ACK retransmissions to free queue faster
sysctl -w net.ipv4.tcp_synack_retries=2
```

## Block Known Attack Sources

```bash
# If attack comes from identifiable IP ranges, block them
# Check top sources
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-syn != 0' -c 1000 2>/dev/null | \
  awk '{split($3,a,"."); print a[1]"."a[2]"."a[3]"."a[4]}' | \
  sort | uniq -c | sort -rn | head -20

# Block top attacking IP
iptables -I INPUT -s 198.51.100.0/24 -j DROP

# For large distributed attacks: coordinate with ISP for upstream filtering
```

## Monitoring Attack Progress

```bash
# Watch SYN_RECV queue depth during attack
watch -n 1 "ss -tn state syn-received | wc -l"

# Monitor drop counters
watch -n 2 "netstat -s | grep 'SYNs to LISTEN sockets dropped'"

# Check if service is still accepting connections during mitigation
nc -zv <your-server> 80
```

## Conclusion

SYN flood defense requires a layered approach: SYN cookies at the kernel level handle queue exhaustion without degrading legitimate traffic, rate limiting with hashlimit per source IP reduces individual attacker impact, and ISP-level filtering is required for volumetric attacks that saturate your network link before reaching the server.
