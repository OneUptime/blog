# How to Implement Direct Server Return (DSR) with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DSR, Direct Server Return, Load Balancing, LVS, Performance

Description: A guide to implementing Direct Server Return (DSR) load balancing with IPv6, where servers respond directly to clients bypassing the load balancer for outbound traffic.

Direct Server Return (DSR) is a load balancing mode where the load balancer only processes inbound traffic - servers respond directly to clients without the return traffic passing through the load balancer. This dramatically increases throughput since the load balancer only sees the inbound side of the flow. DSR with IPv6 requires careful NDP handling.

## DSR Architecture

```text
                    ┌──────────────────────────────┐
                    │                              │
Client → Load Balancer → Server 1               Client
         (VIP: 2001:db8:100::80) ↗ (responds direct)
                     ↘
                       Server 2 → Client
                                  (responds direct)
```

The load balancer forwards packets to real servers with the destination VIP unchanged. Each server must have the VIP configured on loopback. In DR mode, the load balancer and real servers must share the same L2 segment because the director forwards packets by changing the destination MAC address rather than the IPv6 destination address.

## Setup: Load Balancer (LVS/IPVS)

```bash
# Assign the VIP to the external interface so the load balancer answers NDP for it
sudo ip -6 addr add 2001:db8:100::80/128 dev eth0

# On the load balancer: configure IPVS in DR mode

sudo ipvsadm -A -t [2001:db8:100::80]:80 -s rr

# Add real servers in DR (-g = gatewaying = DSR) mode
sudo ipvsadm -a -t [2001:db8:100::80]:80 -r [2001:db8:100::11]:80 -g
sudo ipvsadm -a -t [2001:db8:100::80]:80 -r [2001:db8:100::12]:80 -g

# Verify
sudo ipvsadm -L -n

# Enable IPv6 forwarding on load balancer
sudo sysctl -w net.ipv6.conf.all.forwarding=1
```

## Setup: Real Servers

Each real server must accept packets destined for the VIP:

```bash
# Add VIP to loopback interface on each server
sudo ip -6 addr add 2001:db8:100::80/128 dev lo

# Using /128 on loopback makes the VIP local to the host without assigning it
# to the external interface that participates in NDP on the wire

# Verify the address is on loopback
ip -6 addr show lo

# Test: server can receive traffic for VIP
# The packet arrives with dst=2001:db8:100::80
# Because the VIP is configured locally on lo, the kernel accepts it
# Server responds with src=2001:db8:100::80
# Client sees a response from the VIP while the return path bypasses the load balancer
```

## Suppress NDP for VIP on Real Servers

The critical DSR requirement: real servers must NOT respond to Neighbor Solicitation for the VIP (only the load balancer should respond):

```bash
# Method 1: Keep the VIP on loopback only, not on the external interface
sudo ip -6 addr add 2001:db8:100::80/128 dev lo

# Linux still treats the VIP as a local address, but because it is not assigned
# to the external NIC, the server does not answer NDP for it on the LAN

# Method 2: There is no direct IPv6 equivalent of arp_ignore/arp_announce
# for NDP in Linux; keeping the VIP off the external NIC is the usual approach

# Method 3: Be careful with firewall rules: address-resolution Neighbor
# Solicitations are sent to the solicited-node multicast address, not to the
# VIP itself, so a simple `ip6tables -d 2001:db8:100::80` rule would not match
```

## DSR with HAProxy (IPv6)

Standard HAProxy proxy mode is not true DSR. HAProxy's transparent proxying preserves the client source address, but backend return traffic still passes back through HAProxy. For true DSR with IPv6, use LVS/IPVS or a load balancer that explicitly supports direct-routing or gateway mode.

## Verifying DSR

```bash
# On load balancer: verify IPVS is forwarding
sudo ipvsadm -L -n --stats

# On client: send a request to VIP
curl -6 http://[2001:db8:100::80]/

# On the chosen real server: confirm the reply leaves directly with the VIP as source
sudo tcpdump -i eth0 -n 'host 2001:db8:100::80'

# On the load balancer: confirm you see the inbound request but not the reply
sudo tcpdump -i eth0 -n 'host 2001:db8:100::80'

# DSR is working if:
# - Request: client→LB VIP, then LB forwards it to the real server
# - Response: real server→client with src=2001:db8:100::80 (not LB→client)
```

## Performance Comparison

| Mode | LB handles | Throughput | Use case |
|---|---|---|---|
| NAT | Both directions | Limited by LB | Most deployments |
| DR (DSR) | Inbound only | Very high | High-bandwidth apps |
| TUN | Inbound only | High | Geographically distributed |

DSR with IPv6 is particularly valuable for high-bandwidth services like video streaming where response traffic is much larger than request traffic - the load balancer only sees the small inbound requests while servers send large responses directly to IPv6 clients.
