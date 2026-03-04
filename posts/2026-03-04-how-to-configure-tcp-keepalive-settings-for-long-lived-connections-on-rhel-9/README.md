# How to Configure TCP Keepalive Settings for Long-Lived Connections on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking

Description: Step-by-step guide on configure tcp keepalive settings for long-lived connections on rhel 9 with practical examples and commands.

---

TCP keepalive settings on RHEL 9 maintain long-lived connections and detect dead peers.

## View Current Settings

```bash
sysctl net.ipv4.tcp_keepalive_time
sysctl net.ipv4.tcp_keepalive_intvl
sysctl net.ipv4.tcp_keepalive_probes
```

## Configure Keepalive Parameters

```bash
sudo tee /etc/sysctl.d/99-keepalive.conf <<EOF
# Start sending keepalive probes after 300 seconds of idle
net.ipv4.tcp_keepalive_time = 300

# Send probes every 60 seconds
net.ipv4.tcp_keepalive_intvl = 60

# Give up after 5 failed probes
net.ipv4.tcp_keepalive_probes = 5
EOF

sudo sysctl -p /etc/sysctl.d/99-keepalive.conf
```

## Per-Application Keepalive

Applications can set their own keepalive values using socket options:

```python
# Python example
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
s.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 300)
s.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 60)
s.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 5)
```

## When to Use Keepalive

- Database connections through firewalls
- Load balancer connections
- SSH sessions through NAT
- Any connection that traverses stateful firewalls

## Monitor Keepalive

```bash
# View connections with keepalive enabled
ss -tnoe | grep keepalive
```

## Conclusion

TCP keepalive on RHEL 9 prevents idle connection timeouts and detects dead peers. Configure system-wide defaults and allow applications to override as needed for their specific connection patterns.

