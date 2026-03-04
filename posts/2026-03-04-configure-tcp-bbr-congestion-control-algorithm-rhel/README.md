# How to Configure TCP BBR Congestion Control Algorithm on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TCP, BBR, Networking, Congestion Control, Performance

Description: Enable and configure Google's TCP BBR congestion control algorithm on RHEL for improved network throughput, especially on high-bandwidth, lossy links.

---

BBR (Bottleneck Bandwidth and Round-trip propagation time) is a TCP congestion control algorithm developed by Google. Unlike loss-based algorithms like CUBIC (the RHEL default), BBR models the network path to achieve higher throughput with lower latency, especially on links with packet loss.

## Checking the Current Congestion Control Algorithm

```bash
# View the active congestion control algorithm
sysctl net.ipv4.tcp_congestion_control
# net.ipv4.tcp_congestion_control = cubic

# List available algorithms
sysctl net.ipv4.tcp_available_congestion_control
```

## Enabling BBR

```bash
# Load the BBR kernel module
sudo modprobe tcp_bbr

# Verify it loaded
lsmod | grep tcp_bbr

# Set BBR as the congestion control algorithm
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# Verify the change
sysctl net.ipv4.tcp_congestion_control
```

## Making BBR Persistent

```bash
# Ensure the module loads at boot
echo "tcp_bbr" | sudo tee /etc/modules-load.d/tcp_bbr.conf

# Set the sysctl parameter persistently
sudo tee /etc/sysctl.d/99-tcp-bbr.conf << 'SYSCTL'
# Enable BBR congestion control
net.ipv4.tcp_congestion_control = bbr

# Use fq (fair queue) scheduler for best BBR performance
net.core.default_qdisc = fq
SYSCTL

# Apply the settings
sudo sysctl -p /etc/sysctl.d/99-tcp-bbr.conf
```

## Setting the Queueing Discipline

BBR works best with the `fq` (Fair Queue) queueing discipline.

```bash
# Check the current default qdisc
sysctl net.core.default_qdisc

# Set fq as the default
sudo sysctl -w net.core.default_qdisc=fq

# Apply fq to an existing interface
sudo tc qdisc replace dev ens192 root fq

# Verify the qdisc
tc qdisc show dev ens192
```

## Testing BBR Performance

```bash
# Use iperf3 to compare throughput before and after BBR
# On the server
iperf3 -s

# On the client
iperf3 -c server.example.com -t 30

# Test with simulated packet loss to see BBR's advantage
# On the server, add artificial packet loss
sudo tc qdisc add dev ens192 root netem loss 1%

# BBR handles 1% packet loss much better than CUBIC
# CUBIC throughput drops dramatically, BBR stays near full speed
```

## Monitoring BBR

```bash
# Check BBR stats for active connections
ss -ti | grep bbr

# View detailed connection info
ss -ti dst server.example.com
# Look for "bbr" in the congestion control field
```

## When to Use BBR

BBR is most beneficial for:
- Long-distance (high-RTT) connections
- Links with moderate packet loss
- Content delivery and streaming workloads

For short, low-latency LAN connections, the difference between BBR and CUBIC is minimal.

## Reverting to CUBIC

```bash
# If BBR causes issues, revert to CUBIC
sudo sysctl -w net.ipv4.tcp_congestion_control=cubic
sudo sysctl -w net.core.default_qdisc=fq_codel
```

BBR is safe for production use and is widely deployed on Google's infrastructure. It is included in the RHEL kernel and requires no additional packages.
