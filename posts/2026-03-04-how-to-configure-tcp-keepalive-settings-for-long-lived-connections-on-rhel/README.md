# How to Configure TCP Keepalive Settings for Long-Lived Connections on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TCP Keepalive, Networking, Linux, Connection Management

Description: Learn how to configure TCP keepalive parameters on RHEL to detect dead connections and maintain long-lived connections through firewalls and NAT devices.

---

TCP keepalive probes detect dead connections by sending periodic packets to the remote host. This is useful for applications with long-lived connections, and for preventing NAT gateways and firewalls from dropping idle connections.

## Checking Current Keepalive Settings

```bash
# Time before first keepalive probe (default: 7200 seconds / 2 hours)
sysctl net.ipv4.tcp_keepalive_time

# Interval between keepalive probes (default: 75 seconds)
sysctl net.ipv4.tcp_keepalive_intvl

# Number of unacknowledged probes before dropping (default: 9)
sysctl net.ipv4.tcp_keepalive_probes
```

## Tuning Keepalive Settings

For most production environments, the defaults are too conservative:

```bash
# Send first keepalive probe after 60 seconds of idle
sudo sysctl -w net.ipv4.tcp_keepalive_time=60

# Send subsequent probes every 10 seconds
sudo sysctl -w net.ipv4.tcp_keepalive_intvl=10

# Drop connection after 6 failed probes
# Total timeout: 60 + (10 * 6) = 120 seconds
sudo sysctl -w net.ipv4.tcp_keepalive_probes=6
```

## Making Changes Persistent

```bash
# Write settings to sysctl configuration
cat << 'SYSCTL' | sudo tee /etc/sysctl.d/99-tcp-keepalive.conf
# Send first keepalive probe after 60 seconds
net.ipv4.tcp_keepalive_time = 60

# Send probes every 10 seconds
net.ipv4.tcp_keepalive_intvl = 10

# Drop after 6 failed probes
net.ipv4.tcp_keepalive_probes = 6
SYSCTL

# Apply the changes
sudo sysctl -p /etc/sysctl.d/99-tcp-keepalive.conf
```

## Application-Level Keepalive

Applications must explicitly enable keepalive on their sockets. Here is an example in Python:

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Enable keepalive
sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)

# Override system defaults per-socket (Linux only)
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 60)   # idle time
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 10)  # interval
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 6)     # probe count
```

## Common Use Cases

- **Database connections**: Keep database pool connections alive through load balancers.
- **SSH sessions**: Prevent SSH connections from being dropped by NAT timeouts.
- **Message queues**: Maintain persistent connections to brokers like RabbitMQ or Kafka.

For SSH, you can also use the `ServerAliveInterval` and `ServerAliveCountMax` options in `~/.ssh/config`, which operate at the application level rather than TCP level.
