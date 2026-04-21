# How to Filter tcpdump Output by Host, Port, and Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, BPF, Linux, Networking, Filtering, Packet Capture

Description: Write effective tcpdump filters using host, port, and protocol primitives to capture only the packets you need and reduce noise in network analysis.

Without filters, tcpdump captures everything - gigabytes of unrelated traffic drowning out what you're looking for. tcpdump's Berkeley Packet Filter (BPF) syntax lets you express precise capture conditions directly at the kernel level.

## Host Filters

```bash
# Capture traffic to or from a specific host

sudo tcpdump host 192.168.1.50

# Capture traffic originating FROM a host
sudo tcpdump src host 192.168.1.50
# or shorter:
sudo tcpdump src 192.168.1.50

# Capture traffic going TO a host
sudo tcpdump dst host 8.8.8.8
sudo tcpdump dst 8.8.8.8

# Capture traffic involving a subnet
sudo tcpdump net 192.168.1.0/24

# Capture traffic from a subnet
sudo tcpdump src net 10.0.0.0/8
```

## Port Filters

```bash
# Capture traffic on port 80 (source or destination)
sudo tcpdump port 80

# Capture traffic to port 443
sudo tcpdump dst port 443

# Capture traffic from port 22
sudo tcpdump src port 22

# Capture a range of ports
sudo tcpdump portrange 8000-9000
```

## Protocol Filters

```bash
# TCP only
sudo tcpdump tcp

# UDP only
sudo tcpdump udp

# ICMP only
sudo tcpdump icmp

# IPv4 only (excludes IPv6 and other protocols)
sudo tcpdump ip

# ARP traffic
sudo tcpdump arp
```

## Combining Filters

Use `and`, `or`, `not` to combine primitives:

```bash
# TCP traffic on port 80 OR 443
sudo tcpdump 'tcp and (port 80 or port 443)'

# Traffic from a host on port 22
sudo tcpdump 'src 192.168.1.50 and port 22'

# All traffic except SSH (port 22)
sudo tcpdump 'not port 22'

# HTTP/HTTPS traffic between two specific hosts
sudo tcpdump 'host 192.168.1.100 and host 10.0.0.50 and (port 80 or port 443)'

# Not from loopback (exclude local traffic)
sudo tcpdump 'not src 127.0.0.1'
```

## Complex Filters

```bash
# Capture TCP connection attempts to port 22 from outside LAN
sudo tcpdump 'tcp[tcpflags] & tcp-syn != 0 and dst port 22 and not src net 192.168.0.0/16'

# Capture ICMP echo requests (pings) only
sudo tcpdump 'icmp[icmptype] = icmp-echo'

# Capture packets 1000 bytes or larger
sudo tcpdump 'greater 1000'

# Capture small packets (ARP, DNS, etc.) 100 bytes or smaller
sudo tcpdump 'less 100'

# Capture TCP FIN or RST packets
sudo tcpdump 'tcp[tcpflags] & (tcp-fin|tcp-rst) != 0'
```

## Combining Filters with Output Options

```bash
# Filter + numeric + verbose + save
sudo tcpdump -nn -v 'tcp and port 443 and host 10.0.0.1' -w /tmp/https.pcap

# Filter + packet count limit
sudo tcpdump -c 200 'udp and port 53'

# Filter + hex and ASCII output (see raw bytes)
sudo tcpdump -X 'tcp and dst port 80'

# Filter + ASCII output (readable for HTTP)
sudo tcpdump -A 'tcp and dst port 80 and tcp[tcpflags] & tcp-push != 0'
```

Good tcpdump filters follow the "as specific as possible" principle - narrow your capture to exactly the traffic you care about to avoid overwhelming output and reduce disk usage when saving captures.
