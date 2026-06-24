# How to Understand Bogon Filtering for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bogon, IPv4, Security, iptables, Firewall, Linux

Description: Implement bogon filtering on Linux to drop packets with source IP addresses that should never appear on the public internet, including private, reserved, and unallocated ranges.

For a static filter, bogon filtering typically starts with IPv4 special-use ranges that should never appear as packet sources on the public internet. Packets with these source IPs are usually spoofed or misconfigured, and filtering them is a fast, effective way to drop obvious garbage traffic before it reaches applications.

## What Are Bogon Addresses?

```text
Range               Type            Reason
------------------  --------------  ------------------------------------
0.0.0.0/8           This network    Source should never be 0.x.x.x
10.0.0.0/8          RFC 1918        Private - invalid on internet
100.64.0.0/10       Shared address  Carrier-grade NAT space
127.0.0.0/8         Loopback        Local loopback
169.254.0.0/16      Link-local      APIPA - not routable
172.16.0.0/12       RFC 1918        Private
192.0.2.0/24        Documentation   Example docs only
192.168.0.0/16      RFC 1918        Private
198.18.0.0/15       Benchmarking    Test ranges
198.51.100.0/24     Documentation   Example docs only
203.0.113.0/24      Documentation   Example docs only
224.0.0.0/4         Multicast       Not valid as source IP
240.0.0.0/4         Reserved        Class E - not assigned
255.255.255.255/32  Broadcast       Not valid as source
```

## Apply Bogon Filtering with iptables

Drop these common special-use ranges arriving on your external interface:

```bash
#!/bin/bash
# bogon-filter.sh - Drop packets from bogon source IPs

IFACE="eth0"  # External/public interface

BOGONS=(
    "0.0.0.0/8"
    "10.0.0.0/8"
    "100.64.0.0/10"
    "127.0.0.0/8"
    "169.254.0.0/16"
    "172.16.0.0/12"
    "192.0.2.0/24"
    "192.168.0.0/16"
    "198.18.0.0/15"
    "198.51.100.0/24"
    "203.0.113.0/24"
    "224.0.0.0/4"
    "240.0.0.0/4"
    "255.255.255.255/32"
)

for bogon in "${BOGONS[@]}"; do
    sudo iptables -A INPUT -i "$IFACE" -s "$bogon" -j DROP
    sudo iptables -A FORWARD -i "$IFACE" -s "$bogon" -j DROP
done

echo "Bogon filtering applied on $IFACE"
```

## Use ipset for Efficient Bogon Filtering

Individual iptables rules for each range work, but ipset is faster:

```bash
# Create a bogon set

sudo ipset create bogons hash:net family inet

# Add the same ranges
BOGONS=("0.0.0.0/8" "10.0.0.0/8" "100.64.0.0/10" "127.0.0.0/8"
        "169.254.0.0/16" "172.16.0.0/12" "192.0.2.0/24" "192.168.0.0/16"
        "198.18.0.0/15" "198.51.100.0/24" "203.0.113.0/24"
        "224.0.0.0/4" "240.0.0.0/4" "255.255.255.255/32")

for bogon in "${BOGONS[@]}"; do
    sudo ipset add bogons "$bogon"
done

# Apply with iptables
sudo iptables -A INPUT -i eth0 -m set --match-set bogons src -j DROP
```

## Log Bogon Hits for Analysis

```bash
# Log bogon packets before dropping
sudo iptables -A INPUT -i eth0 -m set --match-set bogons src \
  -j LOG --log-prefix "BOGON-DROP: " --log-level 4
sudo iptables -A INPUT -i eth0 -m set --match-set bogons src -j DROP

# Analyze logged bogons
sudo dmesg | grep "BOGON-DROP" | grep -oE 'SRC=[^ ]+' \
  | sort | uniq -c | sort -rn | head -10
```

## Enable Kernel Martian Logging

The kernel can also log packets with impossible addresses (martians):

```bash
# Log martian packets (spoofed/impossible source addresses)
sudo sysctl -w net.ipv4.conf.all.log_martians=1
sudo sysctl -w net.ipv4.conf.eth0.log_martians=1

# Make permanent
echo "net.ipv4.conf.all.log_martians = 1" | sudo tee -a /etc/sysctl.conf

# View martian log entries
sudo dmesg | grep "martian"
```

## Verify the Filter Is Working

```bash
# List bogons ipset
sudo ipset list bogons | head -20

# Check rule hit counts
sudo iptables -L INPUT -n -v | grep bogons
# The packets/bytes column should increment if attacks are hitting the rule
```

Bogon filtering is cheap to implement and can drop obviously spoofed or misrouted traffic before it reaches your applications.
