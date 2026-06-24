# How to Run TCP Traceroute with tcptraceroute

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traceroute, TCP, Linux, Networking, Firewall, Diagnostic

Description: Use tcptraceroute to trace network paths using TCP SYN packets instead of UDP or ICMP, bypassing firewalls that block traditional traceroute probes.

Standard traceroute often hits firewalls that block ICMP or high UDP ports, showing rows of asterisks. tcptraceroute uses TCP SYN packets on real service ports (80, 443, 22), making it useful when you want probes that look more like application traffic on that destination port.

## Why TCP Traceroute?

```text
Traditional traceroute problems:
  - Uses UDP to high ports starting at 33434 - often blocked by firewalls
  - ICMP mode may require privileges and is commonly filtered
  - Shows *** even when the path is working for TCP traffic

tcptraceroute advantage:
  - Uses TCP SYN to any port you specify (80, 443, 22)
  - Uses the same destination port as real application traffic
  - Can pass through some firewalls configured to allow HTTP/HTTPS
  - Helps identify where TCP connectivity may break
```

## Install tcptraceroute

```bash
# Debian/Ubuntu

sudo apt install tcptraceroute -y

# RHEL/CentOS (the traceroute package provides tcptraceroute)
sudo dnf install traceroute -y

# macOS
brew install tcptraceroute
```

## Basic Usage

```bash
# TCP traceroute to port 80 (HTTP)
sudo tcptraceroute google.com 80

# TCP traceroute to port 443 (HTTPS)
sudo tcptraceroute google.com 443

# TCP traceroute to port 22 (SSH)
sudo tcptraceroute github.com 22

# Numeric output (skip DNS)
sudo tcptraceroute -n google.com 80
```

## Reading tcptraceroute Output

```bash
sudo tcptraceroute -n 1.1.1.1 80
# Selected device eth0, address 192.168.1.100, port 54321 for outgoing packets
# Tracing the path to 1.1.1.1 on TCP port 80, 30 hops max
#  1  192.168.1.1   1.3 ms  1.2 ms  1.1 ms
#  2  10.1.0.1      8.5 ms  8.3 ms  8.4 ms
#  3  * * *                          ← no response from that hop
#  4  1.1.1.1 [open]  12.8 ms  12.7 ms  12.9 ms
#              ^^^^^
#     [open] = destination accepted the SYN (port is open and reachable)
#     [closed] = destination reset the SYN (port closed but routed OK)
#     no response = TCP may be filtered, host may be down, or replies may be blocked
```

## Comparing Standard vs TCP Traceroute

```bash
# Standard traceroute (UDP) - many stars due to firewall
traceroute -n 1.1.1.1
#  1  192.168.1.1   1ms
#  2  * * *
#  3  * * *
#  4  * * *
# (can't see the path)

# TCP traceroute on port 80 - uses the same destination port as HTTP
sudo tcptraceroute -n 1.1.1.1 80
#  1  192.168.1.1   1ms
#  2  10.1.0.1      8ms
#  3  172.68.0.1    12ms
#  4  1.1.1.1 [open]  12ms
# (path visible in this case)
```

## Diagnose Web Application Connectivity

```bash
# Check if web server is reachable and where responses stop
sudo tcptraceroute -n app.example.com 443

# If it shows [open] at destination → TCP port 443 is open and reachable
# If it shows stars at destination → port 443 may be filtered or the host may not be responding
# If it shows [closed] at destination → host responded, but TCP port 443 is closed or refused
```

## Using with traceroute -T (Alternative)

If tcptraceroute isn't available, traceroute itself supports TCP mode:

```bash
# Built-in TCP mode in traceroute
sudo traceroute -T -p 80 -n 1.1.1.1   # TCP SYN to port 80
sudo traceroute -T -p 443 -n 1.1.1.1  # TCP SYN to port 443

# traceroute TCP flags (add --sport to control source port)
sudo traceroute -T -p 22 --sport=54321 -n 192.168.1.1
```

## Troubleshoot "Timeout" Connections

```bash
# A web connection that hangs (not refused, not accepted) → possible filtering or host issue
# Trace the TCP path:
sudo tcptraceroute -n problematic-server.com 443

# If last hop shows * * * before destination:
# → A firewall may be silently dropping the TCP SYN, or replies may be filtered
# → Get the last visible IP and check routing, ACLs, and firewall logs around that point
```

TCP traceroute is an essential tool for diagnosing application-level connectivity - it tests TCP reachability to the destination port, not just whether ICMP is allowed.
