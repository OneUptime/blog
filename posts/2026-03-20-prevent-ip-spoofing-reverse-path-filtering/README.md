# How to Prevent IP Spoofing with Reverse Path Filtering on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Security, IP Spoofing, Reverse Path Filtering, Sysctl, Networking

Description: Enable reverse path filtering (rp_filter) on Linux to automatically drop packets with spoofed source IP addresses at the kernel level.

IP spoofing - sending packets with a forged source IP - is used in amplification DDoS attacks and to bypass IP-based access controls. Reverse path filtering (RPF) checks whether the kernel has a route back to the packet's claimed source. In strict mode, that route must go through the interface the packet arrived on.

## How Reverse Path Filtering Works

```text
Incoming packet: SRC=8.8.8.8, arrived on eth1

RPF check:
  "If I were to send a packet TO 8.8.8.8, which interface would I use?"
  Routing table says: via eth0 (default route)

  Arrived on:  eth1
  Expected on: eth0  ← MISMATCH → DROP (spoofed!)
```

## Checking Current rp_filter Settings

```bash
# Check per-interface setting (0=off, 1=strict, 2=loose)

cat /proc/sys/net/ipv4/conf/eth0/rp_filter
cat /proc/sys/net/ipv4/conf/all/rp_filter

# Or use sysctl
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.eth0.rp_filter
```

## Enable Strict Reverse Path Filtering

Mode 1 (strict): drops packet unless the best route to the source is via the receiving interface:

```bash
# Enable strict RPF for all interfaces
sudo sysctl -w net.ipv4.conf.all.rp_filter=1
sudo sysctl -w net.ipv4.conf.default.rp_filter=1

# Enable for each existing interface
for iface in /proc/sys/net/ipv4/conf/*/rp_filter; do
    sudo sysctl -w "$(echo $iface | sed 's|/proc/sys/||; s|/|.|g')=1"
done
```

## Enable Loose Reverse Path Filtering

Mode 2 (loose): drops packet only if no route exists to the source at all - useful when asymmetric routing is unavoidable:

```bash
# Loose mode - less strict, checks only that the source is reachable
sudo sysctl -w net.ipv4.conf.all.rp_filter=2
```

## Make Settings Permanent

Edit `/etc/sysctl.conf` to persist across reboots:

```bash
# /etc/sysctl.conf

# Strict reverse path filtering on all interfaces
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Or add per-interface:
# net.ipv4.conf.eth0.rp_filter = 1

# Apply immediately
sudo sysctl -p
```

## Complement with iptables Bogon Filtering

RPF handles routing-based checks; iptables handles known invalid source ranges:

```bash
# Drop packets from RFC 1918 ranges arriving on the public interface
# (should never come from the internet)
sudo iptables -A INPUT -i eth0 -s 10.0.0.0/8 -j DROP
sudo iptables -A INPUT -i eth0 -s 172.16.0.0/12 -j DROP
sudo iptables -A INPUT -i eth0 -s 192.168.0.0/16 -j DROP

# Drop loopback-sourced packets from external interface
sudo iptables -A INPUT -i eth0 -s 127.0.0.0/8 -j DROP

# Drop multicast source addresses
sudo iptables -A INPUT -i eth0 -s 224.0.0.0/4 -j DROP
```

## Verify RPF Is Working

```bash
# Check that rp_filter is active
sysctl net.ipv4.conf.all.rp_filter
# net.ipv4.conf.all.rp_filter = 1

# Check the kernel counter for reverse-path filter drops
nstat -az TcpExtIPReversePathFilter
```

## Caveats

RPF mode 1 can break asymmetric routing. If your server uses policy routing or has packets arriving via a different interface than the return route, use mode 2. If you need to disable RPF for only one interface, do not leave `net.ipv4.conf.all.rp_filter` set to `1` or `2`, because Linux uses the maximum of `conf/all/rp_filter` and `conf/<iface>/rp_filter`:

```bash
# Disable the global floor, then enable strict RPF only where you want it
sudo sysctl -w net.ipv4.conf.all.rp_filter=0
sudo sysctl -w net.ipv4.conf.eth0.rp_filter=1
sudo sysctl -w net.ipv4.conf.eth1.rp_filter=0
```

Reverse path filtering is a lightweight, kernel-level source-validation defense that can block spoofed-source traffic before it consumes firewall or application resources.
