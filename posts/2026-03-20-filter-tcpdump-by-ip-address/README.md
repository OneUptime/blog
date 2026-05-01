# How to Filter tcpdump Output by IP Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, Networking, Troubleshooting, Linux, Packet Capture, Security

Description: Learn how to filter tcpdump captures by source IP, destination IP, IP range, and protocol to isolate specific network traffic for troubleshooting and analysis.

---

`tcpdump` is the most powerful packet capture tool on Linux. Knowing how to filter by IP address, port, and protocol lets you isolate exactly the traffic you need without being overwhelmed by noise.

---

## Basic IP Address Filters

```bash
# Capture traffic to/from a specific IP

sudo tcpdump -i eth0 host 10.0.0.5

# Capture traffic FROM a specific IP (source)
sudo tcpdump -i eth0 src 10.0.0.5

# Capture traffic TO a specific IP (destination)
sudo tcpdump -i eth0 dst 10.0.0.5

# Capture traffic between two specific IPs
sudo tcpdump -i eth0 host 10.0.0.5 and host 10.0.0.10
```

---

## Filtering by Network/Subnet

```bash
# All traffic to/from the 10.0.0.0/24 subnet
sudo tcpdump -i eth0 net 10.0.0.0/24

# Traffic from the subnet
sudo tcpdump -i eth0 src net 10.0.0.0/24

# Traffic to the subnet
sudo tcpdump -i eth0 dst net 10.0.0.0/24

# Exclude a network
sudo tcpdump -i eth0 not net 10.0.0.0/8
```

---

## Combining IP and Port Filters

```bash
# Traffic from IP on a specific port
sudo tcpdump -i eth0 src 10.0.0.5 and port 443

# Traffic from IP on any of multiple ports
sudo tcpdump -i eth0 host 10.0.0.5 and \(port 80 or port 443\)

# HTTP traffic from a subnet
sudo tcpdump -i eth0 src net 10.0.0.0/24 and dst port 80

# Database traffic from app servers to DB
sudo tcpdump -i eth0 src net 10.0.1.0/24 and dst 10.0.2.5 and dst port 5432
```

---

## IPv6 Address Filtering

```bash
# Traffic to/from an IPv6 address
sudo tcpdump -i eth0 host 2001:db8::10

# IPv6 traffic only
sudo tcpdump -i eth0 ip6

# IPv6 from a specific host
sudo tcpdump -i eth0 ip6 and src 2001:db8::10

# IPv6 to/from a specific network
sudo tcpdump -i eth0 ip6 and net 2001:db8::/32
```

---

## Protocol-Specific IP Filters

```bash
# TCP from a host
sudo tcpdump -i eth0 tcp and src 10.0.0.5

# UDP from a host
sudo tcpdump -i eth0 udp and src 10.0.0.5

# ICMP from a host
sudo tcpdump -i eth0 icmp and src 10.0.0.5

# Non-TCP traffic to/from a host
sudo tcpdump -i eth0 not tcp and host 10.0.0.5
```

---

## Useful Output Options

```bash
# Don't resolve IPs or port names (faster, clearer)
sudo tcpdump -i eth0 -nn host 10.0.0.5

# Show packet contents as hex + ASCII (including link-level header)
sudo tcpdump -i eth0 -XX host 10.0.0.5

# Show verbose output
sudo tcpdump -i eth0 -vv host 10.0.0.5

# Show packet sizes
sudo tcpdump -i eth0 -v host 10.0.0.5 | grep "length"

# Save capture to file for Wireshark
sudo tcpdump -i eth0 -w /tmp/capture.pcap host 10.0.0.5

# Read saved capture
tcpdump -r /tmp/capture.pcap -nn host 10.0.0.5
```

---

## Practical Troubleshooting Examples

```bash
# Debug: Is traffic reaching the server?
sudo tcpdump -i eth0 -nn dst 10.0.0.5 and dst port 8080

# Debug: What is the server responding with?
sudo tcpdump -i eth0 -nn src 10.0.0.5 and src port 8080

# Debug: TCP connection attempts on 443
sudo tcpdump -i eth0 -nn host 10.0.0.5 and port 443 and \
  'tcp[13] & 2 != 0'  # packets with the SYN bit set

# Monitor database connections from app tier
sudo tcpdump -i eth0 -nn \
  src net 10.0.1.0/24 and dst 10.0.2.10 and dst port 5432

# Watch for connection resets
sudo tcpdump -i eth0 -nn \
  'tcp[tcpflags] & (tcp-rst) != 0' and host 10.0.0.5

# Monitor DNS queries from a specific host
sudo tcpdump -i eth0 -nn src 10.0.0.5 and udp dst port 53
```

---

## Filter Syntax Reference

| Filter | Description |
|--------|-------------|
| `host X` | Traffic to or from IP X |
| `src X` | Traffic from IP X |
| `dst X` | Traffic to IP X |
| `net X/Y` | Traffic to/from subnet |
| `port N` | Traffic on port N |
| `not host X` | Exclude IP X |
| `host X and port N` | IP X on port N |
| `host X or host Y` | IP X or IP Y |

---

## Best Practices

1. **Always use `-nn`** - skips DNS resolution for faster output and clearer IPs
2. **Save to file with `-w`** for complex analysis in Wireshark
3. **Limit capture size** with `-c 1000` to avoid filling disk
4. **Use `-s 0`** to use tcpdump's default 262144-byte snaplen and avoid truncated captures: `tcpdump -s 0 -i eth0 host X`
5. **Run as root or with sudo** - pcap requires privileged access

---

## Conclusion

tcpdump's BPF filter syntax makes it easy to isolate traffic by IP, subnet, protocol, and port. Master these filters and you can diagnose most network issues directly from the command line without needing a GUI tool.

---

*Monitor network connectivity and track incidents with [OneUptime](https://oneuptime.com) - real-time uptime monitoring and alerting.*
