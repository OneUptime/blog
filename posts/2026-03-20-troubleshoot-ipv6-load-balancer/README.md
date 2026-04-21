# How to Troubleshoot IPv6 Load Balancer Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Load Balancer, Troubleshooting, Connectivity, HAProxy, IPVS

Description: A systematic guide to diagnosing and resolving IPv6 load balancer connectivity issues, covering VIP reachability, backend health, routing, and common misconfigurations.

## Troubleshooting Decision Tree

```text
Cannot reach IPv6 load balancer VIP?
├─ VIP has IPv6 address?
│   ip -6 addr show | grep vip
├─ LB is listening on IPv6 port?
│   ss -6 -tlnp | grep <port>
├─ Firewall allows traffic to VIP?
│   ip6tables -L -n -v
├─ IPv6 routing to VIP?
│   ip -6 route show
└─ Backends healthy?
    ipvsadm -L -n / haproxy stats
```

## Step 1: Verify VIP Is Configured

```bash
# Check VIP is on an interface

ip -6 addr show | grep "2001:db8::vip"

# For keepalived VIP: check which node owns it
# Run on MASTER candidate:
sudo systemctl status keepalived
ip -6 addr show | grep vip   # Should be present on MASTER only

# For IPVS:
sudo ipvsadm -L -n | grep "2001:db8::vip"
```

## Step 2: Check Load Balancer Is Listening

```bash
# HAProxy
ss -6 -tlnp | grep haproxy

# nginx
ss -6 -tlnp | grep nginx

# IPVS (virtual service exists)
sudo ipvsadm -L -n | grep "2001:db8::vip"

# LVS doesn't listen on ports like HAProxy/nginx - it works at kernel level
# Verify the virtual service exists in ipvsadm
```

## Step 3: Test VIP Reachability

```bash
# From a client: test basic IPv6 connectivity to VIP
ping6 -c 3 2001:db8::vip

# Test TCP connection to VIP port
nc -6 -w 5 2001:db8::vip 443

# Full HTTP test
curl -6 -v --max-time 10 https://2001:db8::vip/health

# If ping works but HTTP doesn't: issue is in the LB or backend
# If ping fails: routing or firewall issue
```

## Step 4: Check Firewall Rules

```bash
# List all IPv6 firewall rules
sudo ip6tables -L -n -v --line-numbers

# Check if port is allowed
sudo ip6tables -L INPUT -n | grep -E "dpt:443|dpt:80"

# Trace a specific packet through the firewall
sudo ip6tables -t nat -L PREROUTING -n -v

# Add a trace rule to debug (match and log packets)
sudo ip6tables -t raw -A PREROUTING \
  -d 2001:db8::vip -p tcp --dport 80 \
  -j TRACE

# View trace output
sudo dmesg | grep TRACE
```

## Step 5: Verify Backend Health

### HAProxy

```bash
# Check stats for backend status
curl -s http://localhost:8404/stats?csv | awk -F',' '{print $2, $18, $19, $20}'
# Column 18 = status, 19 = weight, 20 = act (active servers/flag)

# A server showing "DOWN" will not receive traffic
```

### IPVS

```bash
# Show backend active connections and weights
sudo ipvsadm -L -n

# Look for:
# -> RemoteAddress:Port    Forward Weight ActiveConn InActConn
# -> [2001:db8::server1]:80  Masq    1      0          0
# Zero ActiveConn may mean no traffic is reaching that backend
```

### nginx Upstream

```bash
# Enable nginx_status
# In nginx.conf: location /nginx_status { stub_status on; }
curl http://localhost/nginx_status

# Check error_log for upstream errors
sudo tail -f /var/log/nginx/error.log | grep -i "upstream\|IPv6\|connect"
```

## Step 6: Test Backend Directly

```bash
# Bypass the load balancer - test backends directly
for server in 2001:db8::server1 2001:db8::server2 2001:db8::server3; do
  echo -n "Testing $server: "
  curl -6 -s -o /dev/null -w "%{http_code}" \
    --max-time 5 \
    http://[$server]/health
  echo ""
done
```

## Step 7: Check IPv6 Forwarding

```bash
# Forwarding must be enabled for NAT/IPVS
cat /proc/sys/net/ipv6/conf/all/forwarding
# Must be 1

# Check per-interface
cat /proc/sys/net/ipv6/conf/eth0/forwarding

# Enable if needed
sudo sysctl -w net.ipv6.conf.all.forwarding=1
```

## Common Issues and Fixes

| Issue | Symptom | Fix |
|---|---|---|
| No VIP on interface | ping6 VIP fails | Start keepalived or add address manually |
| LB not listening | Connection refused | Start HAProxy/nginx service |
| Firewall blocking | No response (timeout) | Open port in ip6tables |
| No IPv6 forwarding | Backends unreachable | `sysctl net.ipv6.conf.all.forwarding=1` |
| No masquerade | Backends can't respond | Add ip6tables POSTROUTING MASQUERADE |
| Backend health failing | Traffic not distributed | Fix backend service or health check URL |

## Packet Capture for Deep Debugging

```bash
# Capture on VIP interface
sudo tcpdump -i eth0 -n -w lb-debug.pcap 'ip6 and host 2001:db8::vip'

# Capture on LVS with IPVS
sudo tcpdump -i eth0 -n 'ip6 and (host 2001:db8::vip or host 2001:db8::server1)'

# Analyze in Wireshark
wireshark lb-debug.pcap
# Look for: SYN without SYN-ACK (backend down), RSTs (connection refused)
```

Systematic troubleshooting - working from VIP configuration through firewall, forwarding, and backend health - identifies the layer where IPv6 load balancer connectivity fails.
