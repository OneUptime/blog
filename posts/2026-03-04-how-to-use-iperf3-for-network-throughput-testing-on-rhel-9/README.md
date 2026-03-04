# How to Use iperf3 for Network Throughput Testing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Networking, Performance

Description: Step-by-step guide on use iperf3 for network throughput testing on RHEL with practical examples and commands.

---

iperf3 measures network throughput between RHEL systems for bandwidth validation and troubleshooting.

## Install iperf3

```bash
sudo dnf install -y iperf3
```

## Start the Server

On the receiving end:

```bash
iperf3 -s
```

## Basic Throughput Test

From the client:

```bash
iperf3 -c server-ip -t 30
```

## Bidirectional Test

```bash
iperf3 -c server-ip -t 30 --bidir
```

## UDP Test

```bash
# Client
iperf3 -c server-ip -u -b 10G -t 30

# Measures packet loss and jitter
```

## Multiple Streams

```bash
iperf3 -c server-ip -P 8 -t 30
```

## Reverse Mode (Server to Client)

```bash
iperf3 -c server-ip -R -t 30
```

## JSON Output

```bash
iperf3 -c server-ip -t 30 -J > /tmp/iperf-results.json
```

## Firewall Configuration

```bash
sudo firewall-cmd --permanent --add-port=5201/tcp
sudo firewall-cmd --reload
```

## Key Metrics

- **Bandwidth**: Throughput in Gbps or Mbps
- **Retransmits**: TCP retransmissions (indicates congestion)
- **Jitter**: Variation in latency (UDP mode)
- **Packet Loss**: Lost packets percentage (UDP mode)

## Conclusion

iperf3 on RHEL validates network bandwidth between systems. Use it to verify network infrastructure, troubleshoot throughput issues, and compare performance before and after tuning changes.

