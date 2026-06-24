# How to Implement Ingress Policing for IPv4 Traffic on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, IPv4, Linux, Ingress Policing, QoS, Rate Limiting

Description: Use tc ingress qdiscs and police actions to drop or mark incoming IPv4 packets that exceed a defined rate limit, implementing inbound traffic policing on Linux.

Ingress policing drops incoming packets that exceed a configured rate, or can pass them to later actions or filters, without buffering them (unlike shaping). It is used to enforce inbound rate limits at the earliest possible point in tc processing.

## Policing vs. Shaping

| Feature | Policing | Shaping |
|---|---|---|
| Mechanism | Drop excess packets | Delay excess packets |
| Direction | Ingress or egress | Egress only (native) |
| Buffering | None | Yes |
| Effect on sender | Packet loss | Rate adaptation (TCP) |

## Step 1: Add an Ingress qdisc

```bash
# The ingress qdisc is a special placeholder for inbound filters

sudo tc qdisc add dev eth0 ingress
```

## Step 2: Add a Police Filter

```bash
# Police inbound traffic to 10 Mbps
# Packets exceeding the rate are dropped
sudo tc filter add dev eth0 parent ffff: \
  protocol ip \
  prio 1 \
  u32 match ip src 0.0.0.0/0 \
  police rate 10mbit burst 100kb drop flowid :1

# Parameters:
# rate 10mbit  - allowed rate
# burst 100kb  - burst allowance before policing kicks in
# drop         - action for packets exceeding the rate (alternatives include pipe, continue, reclassify)
# flowid :1    - flow ID for matched packets
```

## Step 3: Police per Source IP

```bash
# Limit traffic from a specific source IP to 5 Mbps
sudo tc filter add dev eth0 parent ffff: \
  protocol ip \
  prio 1 \
  u32 match ip src 192.168.1.100/32 \
  police rate 5mbit burst 50kb drop flowid :1
```

## Using PIPE Instead of DROP

Set a firewall mark on exceeded packets for downstream handling instead of dropping them:

```bash
# Exceeding packets continue to the next action and get marked
# Conforming packets are accepted without the mark
sudo tc filter add dev eth0 parent ffff: protocol ip prio 1 \
  u32 match ip src 0.0.0.0/0 \
  action police rate 5mbit burst 50kb conform-exceed pipe/ok \
  action skbedit mark 0x1
```

## Checking Policing Statistics

```bash
# View the ingress qdisc and filter statistics
sudo tc -s filter show dev eth0 parent ffff:

# Key fields:
# Sent x bytes: total traffic seen
# dropped x: packets policed (dropped)
```

## Combining Policing with IFB for Shaping

For gentle rate control (buffering instead of dropping), redirect to IFB:

```bash
# Load IFB
sudo modprobe ifb
sudo ip link add ifb0 type ifb && sudo ip link set ifb0 up

# Redirect ingress to IFB for shaping (buffering, not dropping)
sudo tc qdisc add dev eth0 ingress
sudo tc filter add dev eth0 parent ffff: protocol ip u32 \
  match u32 0 0 action mirred egress redirect dev ifb0

# Shape on IFB (buffering)
sudo tc qdisc add dev ifb0 root tbf rate 10mbit burst 64k latency 400ms
```

## Removing Ingress Policing

```bash
# Remove the ingress qdisc (removes all ingress filters too)
sudo tc qdisc del dev eth0 ingress
```

Ingress policing is best for enforcing strict inbound rate limits where packet loss is acceptable (e.g., limiting UDP flood traffic from specific IPs). For TCP traffic, prefer IFB-based shaping to avoid causing excessive retransmissions.
