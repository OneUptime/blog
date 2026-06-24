# How to Use Connection Tracking (conntrack) with iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Conntrack, Linux, Firewall, Stateful, Networking

Description: Use iptables connection tracking (conntrack) and the state module to create stateful firewall rules that track TCP session states and automatically handle return traffic.

Connection tracking is what makes iptables a stateful firewall. Without it, you'd need separate rules for both directions of every connection. With it, you write rules for new connections only - iptables automatically allows established and related packets back.

## How Connection Tracking Works

```text
Without conntrack:
  Need: allow outbound TCP port 80 AND allow inbound responses to ephemeral client ports
  (difficult to write safe, reliable rules for dynamic return ports)

With conntrack:
  Track: "host 10.0.0.1 made a NEW connection to 8.8.8.8:80"
  Auto-allow: any ESTABLISHED packet back from 8.8.8.8 to 10.0.0.1 on that flow

States:
  NEW         - Packet belongs to a connection that has not seen traffic in both directions yet
  ESTABLISHED - Packet belongs to a connection that has seen traffic in both directions
  RELATED     - Starts a new connection related to an existing one (FTP data, ICMP errors)
  INVALID     - Doesn't fit the expected behavior of a tracked connection
```

## Basic Stateful Firewall

```bash
# Allow loopback traffic
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A OUTPUT -o lo -j ACCEPT

# Allow established and related connections (covers return traffic)
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow new inbound connections to specific services
sudo iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT

# Allow all new outbound connections (from this server)
sudo iptables -A OUTPUT -m conntrack --ctstate NEW -j ACCEPT

# Drop everything else
sudo iptables -A INPUT -j DROP
sudo iptables -A OUTPUT -j DROP
sudo iptables -A FORWARD -j DROP

# This is a basic stateful host firewall example for SSH and HTTP
```

## Drop Invalid Packets

```bash
# Invalid packets don't fit the expected behavior of a tracked connection
# They are usually dropped early
sudo iptables -I INPUT 1 -m conntrack --ctstate INVALID -j DROP
sudo iptables -I FORWARD 1 -m conntrack --ctstate INVALID -j DROP
```

## View the Connection Tracking Table

```bash
# Install conntrack tools
sudo apt install conntrack -y

# View all tracked connections
sudo conntrack -L

# View only TCP connections
sudo conntrack -L -p tcp

# View only ESTABLISHED connections
sudo conntrack -L | grep ESTABLISHED

# View specific IP's connections
sudo conntrack -L | grep 192.168.1.50

# Example output:
# tcp      6 86385 ESTABLISHED src=192.168.1.100 dst=8.8.8.8 sport=54321 dport=80 src=8.8.8.8 dst=192.168.1.100 sport=80 dport=54321 [ASSURED] mark=0 use=1
```

## Manage Connection Table

```bash
# Delete all entries for a specific IP (kick connections)
sudo conntrack -D -s 1.2.3.4

# Delete entries to a specific destination
sudo conntrack -D -d 10.0.0.50

# Flush entire connection table (use with caution)
sudo conntrack -F

# Get connection table statistics
sudo conntrack -S

# Monitor connection events in real time
sudo conntrack -E
```

## FTP and Other Multi-Connection Protocols

RELATED state handles "related" connections like FTP data channels:

```bash
# FTP uses two connections: control (port 21) and data (random port)
# conntrack can mark the data connection as RELATED when the FTP helper is attached

# Load FTP helper module
sudo modprobe nf_conntrack_ftp

# Attach the FTP helper to inbound FTP control connections
sudo iptables -t raw -A PREROUTING -p tcp --dport 21 -j CT --helper ftp

# Allow FTP control
sudo iptables -A INPUT -p tcp --dport 21 -m conntrack --ctstate NEW -j ACCEPT

# Allow related FTP data connections (auto-tracked by helper)
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## Tune Connection Tracking Limits

```bash
# Check current conntrack table utilization
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max

# Increase max for high-traffic servers
sudo sysctl -w net.netfilter.nf_conntrack_max=262144
```

Connection tracking is the foundation of stateful firewalling - it eliminates the need to write complex rules for return traffic and enables accurate matching based on connection state.
