# How to Set Up a Network Tap for Traffic Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Traffic Monitoring, tcpdump, Wireshark

Description: Set up network traffic monitoring on Ubuntu using software taps, port mirroring, and packet capture tools to inspect and analyze network traffic.

---

A network tap captures a copy of network traffic for analysis without disrupting the original traffic flow. Physical hardware taps are used in dedicated monitoring deployments, but Ubuntu can act as a software tap using tools like `tcpdump`, `tshark`, and the `tc` traffic control subsystem. This is useful for troubleshooting, security monitoring, and network analysis.

## Software Tap Approaches on Ubuntu

There are several ways to capture and forward traffic on Ubuntu:

1. **tcpdump / tshark** - capture traffic to files for offline analysis
2. **Port mirroring via tc** - mirror traffic from one interface to another
3. **Inline capture with netfilter** - use iptables/nftables to copy packets
4. **TZSP / ERSPAN** - encapsulate and forward captured traffic to a remote analyzer

This guide covers each approach.

## Capturing Traffic with tcpdump

`tcpdump` is the standard tool for command-line packet capture. It writes to pcap files that can be analyzed with Wireshark or other tools.

### Basic Capture

```bash
# Install tcpdump
sudo apt install tcpdump

# Capture all traffic on eth0 to a file
sudo tcpdump -i eth0 -w /tmp/capture.pcap

# Capture with timestamps and a rotation policy
# -C 100 = rotate file every 100MB
# -G 3600 = rotate file every 3600 seconds (1 hour)
# -W 10 = keep at most 10 files
sudo tcpdump -i eth0 -w /tmp/capture-%Y%m%d-%H%M%S.pcap -G 3600 -W 24
```

### Filtered Captures

Capturing everything generates enormous files. Use BPF (Berkeley Packet Filter) expressions to capture only what you need:

```bash
# Capture only HTTP and HTTPS traffic
sudo tcpdump -i eth0 -w /tmp/web-traffic.pcap 'tcp port 80 or tcp port 443'

# Capture traffic to/from a specific host
sudo tcpdump -i eth0 -w /tmp/host-capture.pcap host 192.168.1.100

# Capture traffic between two specific hosts
sudo tcpdump -i eth0 -w /tmp/between.pcap \
  'host 192.168.1.100 and host 192.168.1.200'

# Capture DNS traffic
sudo tcpdump -i eth0 -w /tmp/dns.pcap 'udp port 53'

# Capture SSH traffic
sudo tcpdump -i eth0 -w /tmp/ssh.pcap 'tcp port 22'

# Capture all non-SSH traffic (monitoring without capturing your own session)
sudo tcpdump -i eth0 -w /tmp/capture.pcap 'not tcp port 22'

# Capture ICMP traffic
sudo tcpdump -i eth0 -w /tmp/icmp.pcap icmp
```

### Reading Capture Files

```bash
# Read and display a capture file
sudo tcpdump -r /tmp/capture.pcap

# Read with full verbosity
sudo tcpdump -v -r /tmp/capture.pcap

# Read with ASCII output (shows payload content)
sudo tcpdump -A -r /tmp/capture.pcap

# Read with hex+ASCII output
sudo tcpdump -X -r /tmp/capture.pcap

# Filter when reading
sudo tcpdump -r /tmp/capture.pcap host 192.168.1.100
```

### tcpdump on All Interfaces

```bash
# Capture on all interfaces simultaneously
sudo tcpdump -i any -w /tmp/all-interfaces.pcap

# Show which interface each packet arrived on
sudo tcpdump -i any -e -w /tmp/all-with-iface.pcap
```

## Capturing Traffic with tshark

`tshark` is the command-line version of Wireshark and provides deeper protocol dissection:

```bash
# Install
sudo apt install tshark

# Capture and display HTTP traffic with protocol details
sudo tshark -i eth0 -Y 'http' -T fields -e http.host -e http.request.uri

# Capture DNS queries and responses
sudo tshark -i eth0 -Y 'dns' -T fields \
  -e frame.time -e dns.qry.name -e dns.a

# Follow a TCP stream (show full conversation)
sudo tshark -i eth0 -Y 'tcp.stream eq 5' -T fields -e tcp.payload

# Statistics: top talkers by IP
sudo tshark -i eth0 -q -z ip_hosts,tree
```

## Continuous Background Capture

For security monitoring, capture traffic continuously and rotate files:

```bash
# Create a capture directory
sudo mkdir -p /var/log/network-captures
sudo chown root:root /var/log/network-captures
sudo chmod 750 /var/log/network-captures

# Create a systemd service for continuous capture
sudo tee /etc/systemd/system/network-tap.service <<'EOF'
[Unit]
Description=Continuous network traffic capture
After=network.target

[Service]
Type=simple
# Capture all traffic except the capture tool's own traffic
ExecStart=/usr/sbin/tcpdump -i eth0 \
  -w /var/log/network-captures/capture-%Y%m%d%H%M%S.pcap \
  -G 3600 \
  -W 168 \
  -z gzip \
  'not port 22'
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now network-tap.service
```

This keeps 168 files of 1 hour each = 7 days of traffic history, compressed.

## Software Port Mirroring with tc

To mirror traffic from one interface to another (useful for sending traffic to a dedicated analysis machine or VM), use `tc` with the `mirred` action:

```bash
# Load the necessary kernel modules
sudo modprobe sch_ingress
sudo modprobe act_mirred

# Mirror outgoing (egress) traffic from eth0 to eth1
# Step 1: Add an ingress qdisc to eth0 for outgoing traffic (via IFB)
sudo modprobe ifb
sudo ip link set ifb0 up

# Redirect ingress traffic from eth0 to ifb0
sudo tc qdisc add dev eth0 ingress
sudo tc filter add dev eth0 parent ffff: protocol all u32 \
  match u32 0 0 action mirred egress redirect dev ifb0

# Mirror egress traffic from eth0 to eth1
sudo tc qdisc add dev eth0 root handle 1: prio
sudo tc filter add dev eth0 parent 1: protocol all u32 \
  match u32 0 0 action mirred egress mirror dev eth1
```

A simpler approach for egress-only mirroring:

```bash
# Mirror all outgoing traffic from eth0 to eth1
sudo tc qdisc add dev eth0 root handle 1: prio priomap \
  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
sudo tc filter add dev eth0 parent 1:0 protocol all u32 \
  match u32 0 0 action mirred egress mirror dev eth1 pass
```

The receiving interface (`eth1`) should be in promiscuous mode and have a packet capture running:

```bash
# Put eth1 in promiscuous mode to capture all traffic
sudo ip link set eth1 promisc on

# Capture mirrored traffic
sudo tcpdump -i eth1 -w /tmp/mirrored.pcap
```

## Setting Up a Network TAP on an Inline Host

For a host that sits inline between two networks (acting as a transparent bridge), you can capture all traffic passing through:

```bash
# Create a bridge between eth0 and eth1
sudo apt install bridge-utils
sudo brctl addbr br0
sudo brctl addif br0 eth0
sudo brctl addif br0 eth1
sudo ip link set br0 up

# Both interfaces should have no IP addresses
sudo ip addr flush dev eth0
sudo ip addr flush dev eth1

# Capture on the bridge interface
sudo tcpdump -i br0 -w /tmp/inline-capture.pcap 'not tcp port 22'
```

All traffic passing between the two networks is visible on `br0` and can be captured.

## Remote Traffic Analysis with TZSP

TZSP (TaZmen Sniffer Protocol) encapsulates captured packets and sends them to a remote analyzer over UDP:

```bash
# Install tee-pipe for traffic redirection
# Or use tcpdump to capture and netcat to forward
sudo tcpdump -i eth0 -w - | nc -u analyzer.example.com 37008

# On the analyzer machine, receive and capture
nc -ul 37008 | sudo tcpdump -r - -w /tmp/remote-capture.pcap
```

For production remote tap setups, consider `daemonlogger` or `barnyard2` for more robust capture forwarding.

## Analyzing Captures with Wireshark

Open pcap files captured with tcpdump in Wireshark for GUI analysis:

```bash
# Install Wireshark
sudo apt install wireshark

# Open a capture file
wireshark /tmp/capture.pcap

# Or use tshark for scripted analysis
tshark -r /tmp/capture.pcap -Y 'tcp.flags.syn==1 && tcp.flags.ack==0' \
  -T fields -e ip.src -e ip.dst -e tcp.dstport
```

## Monitoring Connection Events in Real Time

For real-time monitoring without full packet capture, use `conntrack`:

```bash
# Install conntrack
sudo apt install conntrack

# Watch all new connections
sudo conntrack -E

# Watch only TCP connections
sudo conntrack -E -p tcp

# Filter by destination port
sudo conntrack -E -p tcp --dport 80

# Show connection table with statistics
sudo conntrack -L
```

`conntrack` is lower overhead than full packet capture when you only need connection-level visibility.

## Log Capture Statistics

```bash
# Show capture file statistics without reading all packets
capinfos /tmp/capture.pcap

# Get brief stats on a capture
tcpdump -r /tmp/capture.pcap -q 2>&1 | tail -3

# Count packets by protocol
tshark -r /tmp/capture.pcap -q -z io,phs
```

Network taps and traffic capture are powerful tools for understanding what is happening on your network. The key is capturing the right traffic at the right point in the network - full packet capture is often unnecessary when filtered captures or connection-level monitoring provide the information you actually need.
