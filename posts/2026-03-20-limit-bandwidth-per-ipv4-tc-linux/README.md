# How to Limit Bandwidth per IPv4 Address Using tc on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, IPv4, Linux, Bandwidth, QoS, Per-IP

Description: Apply per-IP bandwidth limits on Linux using tc HTB with u32 filters or hash tables to control how much bandwidth each IPv4 address can use.

Limiting bandwidth per IPv4 address is useful for ISPs, shared hosting environments, or any situation where you want to prevent a single host from consuming all available bandwidth.

## Method 1: Explicit Per-IP Classes with u32 Filters

For a small number of IPs, create an HTB class for each and filter by IP. Because HTB shapes egress traffic, use `src` when limiting traffic sent by local hosts, or `dst` when limiting traffic being sent to those hosts:

```bash
# Create root HTB qdisc

sudo tc qdisc add dev eth0 root handle 1: htb default 999

# Root class: 1 Gbps total
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 1000mbit

# Catch-all class for unmatched traffic
sudo tc class add dev eth0 parent 1:1 classid 1:999 htb rate 100mbit ceil 1000mbit

# Per-IP classes - 10 Mbps limit for each IP
sudo tc class add dev eth0 parent 1:1 classid 1:100 htb rate 10mbit ceil 10mbit
sudo tc class add dev eth0 parent 1:1 classid 1:101 htb rate 10mbit ceil 10mbit
sudo tc class add dev eth0 parent 1:1 classid 1:102 htb rate 10mbit ceil 10mbit

# Filter: match source IP to its class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip src 192.168.1.10/32 flowid 1:100

sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip src 192.168.1.11/32 flowid 1:101

sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip src 192.168.1.12/32 flowid 1:102
```

## Method 2: Hash Table Filters for Many IPs

For large numbers of IPs, use a u32 hash table to avoid linear filter scanning. The hash table speeds up classification, but you still create a class for each IP (or group of IPs) you want to limit:

```bash
# Create root HTB
sudo tc qdisc add dev eth0 root handle 1: htb default 30

# Root and catch-all classes
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit
sudo tc class add dev eth0 parent 1:1 classid 1:30 htb rate 100mbit ceil 100mbit

# Per-IP limit classes
sudo tc class add dev eth0 parent 1:1 classid 1:10 htb rate 5mbit ceil 5mbit
sudo tc class add dev eth0 parent 1:1 classid 1:11 htb rate 5mbit ceil 5mbit

# Create a hash filter table
sudo tc filter add dev eth0 parent 1: prio 5 handle 1: protocol ip u32 divisor 256

# Dispatch traffic into the hash table using the last octet of the source IP
sudo tc filter add dev eth0 parent 1: prio 1 protocol ip u32 \
  link 1: hashkey mask 0x000000ff at 12 \
  match ip src 10.0.0.0/24

# Add entries in the hash table for specific IPs
sudo tc filter add dev eth0 parent 1: prio 5 protocol ip u32 \
  ht 1: sample u32 0x0000000a 0x000000ff at 12 \
  match ip src 10.0.0.10/32 \
  classid 1:10

sudo tc filter add dev eth0 parent 1: prio 5 protocol ip u32 \
  ht 1: sample u32 0x0000000b 0x000000ff at 12 \
  match ip src 10.0.0.11/32 \
  classid 1:11
```

## Method 3: Using iptables MARK + tc

Mark packets in iptables, then filter by mark in tc using the same HTB tree as Method 1 - this is more maintainable:

```bash
# Mark packets from specific IPs in iptables
sudo iptables -t mangle -A POSTROUTING -o eth0 -s 192.168.1.10 -j MARK --set-mark 10
sudo iptables -t mangle -A POSTROUTING -o eth0 -s 192.168.1.11 -j MARK --set-mark 11

# In tc, filter by the mark
sudo tc filter add dev eth0 protocol ip parent 1:0 handle 10 fw classid 1:100
sudo tc filter add dev eth0 protocol ip parent 1:0 handle 11 fw classid 1:101
```

## Automation Script: Apply Limits for All IPs in a Subnet

```bash
#!/bin/bash
# apply-per-ip-limits.sh
# Limits every IP in 192.168.1.0/24 to 5 Mbps

IFACE=eth0
RATE=5mbit

# Clean up
tc qdisc del dev $IFACE root 2>/dev/null

# Root HTB
tc qdisc add dev $IFACE root handle 1: htb default 999
tc class add dev $IFACE parent 1: classid 1:1 htb rate 1000mbit
tc class add dev $IFACE parent 1:1 classid 1:999 htb rate 100mbit

# Add a class and filter for each host IP
for i in $(seq 1 254); do
    CID=$((100 + i))
    tc class add dev $IFACE parent 1:1 classid "1:${CID}" htb rate $RATE ceil $RATE
    tc filter add dev $IFACE protocol ip parent 1:0 prio 1 u32 \
        match ip src "192.168.1.${i}/32" flowid "1:${CID}"
done

echo "Per-IP bandwidth limits applied"
```

This approach scales to hundreds of IPs and allows dynamic updates without full reconfiguration.
