# How to Set Up LVS (Linux Virtual Server) for IPv4 Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LVS, Linux Virtual Server, IPv4, Load Balancing, IPVS, NAT

Description: Configure LVS (Linux Virtual Server) using ipvsadm to load balance IPv4 TCP traffic across real servers using NAT and Direct Routing modes.

## Introduction

LVS (Linux Virtual Server) is a kernel-level Layer 4 load balancer built into Linux as IPVS (IP Virtual Server). It is extremely fast with minimal CPU overhead. LVS supports three forwarding modes: NAT (Network Address Translation), DR (Direct Routing), and TUN (IP Tunneling).

## Installing ipvsadm

```bash
sudo apt-get update
sudo apt-get install -y ipvsadm

# Load the IPVS kernel module

sudo modprobe ip_vs
sudo modprobe ip_vs_rr
sudo modprobe ip_vs_wrr
sudo modprobe ip_vs_sh
```

## LVS-NAT Mode

In NAT mode, the LVS director rewrites destination IPs. All traffic passes through the director.

### Network Setup

```text
Client (any IP)
    ↓
LVS Director: eth0=203.0.113.1 (public VIP), eth1=10.0.1.1 (private)
    ↓
Real Servers: 10.0.1.10:80, 10.0.1.11:80, 10.0.1.12:80
(default gateway on real servers must point to LVS director's 10.0.1.1)
```

### Configuring LVS-NAT

```bash
# Enable IP forwarding on the director
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Add a virtual service (VIP:port)
sudo ipvsadm -A -t 203.0.113.1:80 -s rr

# Add real servers to the virtual service
sudo ipvsadm -a -t 203.0.113.1:80 -r 10.0.1.10:80 -m    # -m = masquerading (NAT)
sudo ipvsadm -a -t 203.0.113.1:80 -r 10.0.1.11:80 -m
sudo ipvsadm -a -t 203.0.113.1:80 -r 10.0.1.12:80 -m
```

## LVS-DR Mode (Direct Routing)

Real servers respond directly to clients - the director only handles incoming packets. Much faster than NAT.

### Director Configuration

```bash
# Configure the VIP on the director's client-facing interface
sudo ip addr add 203.0.113.100/32 dev eth0

# Add virtual service with direct routing
sudo ipvsadm -A -t 203.0.113.100:80 -s rr

# Add real servers with direct routing (-g = gatewaying/DR)
sudo ipvsadm -a -t 203.0.113.100:80 -r 10.0.1.10:80 -g
sudo ipvsadm -a -t 203.0.113.100:80 -r 10.0.1.11:80 -g
sudo ipvsadm -a -t 203.0.113.100:80 -r 10.0.1.12:80 -g
```

### Real Server Configuration (for DR Mode)

Each real server needs the VIP on its loopback with ARP suppression:

```bash
# Run on each real server:
sudo ip addr add 203.0.113.100/32 dev lo

# Suppress ARP for the VIP
echo 1 | sudo tee /proc/sys/net/ipv4/conf/all/arp_ignore
echo 2 | sudo tee /proc/sys/net/ipv4/conf/all/arp_announce
echo 1 | sudo tee /proc/sys/net/ipv4/conf/lo/arp_ignore
echo 2 | sudo tee /proc/sys/net/ipv4/conf/lo/arp_announce
```

## Scheduling Algorithms

| Flag | Algorithm | Description |
|---|---|---|
| `-s rr` | Round Robin | Equal distribution |
| `-s wrr` | Weighted Round Robin | By weight |
| `-s lc` | Least Connection | Fewest active connections |
| `-s wlc` | Weighted Least Connection | Weight + connections |
| `-s sh` | Source Hash | Client IP sticky |

```bash
# Use weighted round robin
sudo ipvsadm -E -t 203.0.113.1:80 -s wrr

# Set weights on real servers
sudo ipvsadm -e -t 203.0.113.1:80 -r 10.0.1.10:80 -m -w 3
sudo ipvsadm -e -t 203.0.113.1:80 -r 10.0.1.11:80 -m -w 1
```

## Viewing LVS Table

```bash
# Show virtual services and real servers
sudo ipvsadm -l -n

# Show with statistics
sudo ipvsadm -l -n --stats

# Show connection table
sudo ipvsadm -lc
```

## Saving and Restoring Rules

```bash
# Save rules
sudo sh -c 'ipvsadm-save > /etc/ipvsadm.rules'

# Restore rules
sudo sh -c 'ipvsadm-restore < /etc/ipvsadm.rules'
```

## Conclusion

LVS-NAT is simpler to set up (only configure the director) but all return traffic goes through the director. LVS-DR is faster (return traffic bypasses the director) but requires VIP configuration on each real server with ARP suppression. Use Keepalived alongside IPVS for health checking and director HA.
