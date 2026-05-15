# How to Capture and Analyze Network Traffic with tcpdump and Wireshark on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Wireshark, Network Monitoring, tcpdump, Linux

Description: Learn how to capture and Analyze Network Traffic with tcpdump and Wireshark on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Capture and Analyze Network Traffic with tcpdump and Wireshark on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A graphical desktop if you plan to run the Wireshark GUI locally

## Overview

Capture and Analyze Network Traffic with tcpdump and Wireshark requires careful planning and execution. This guide walks through installing the tools, capturing packets to a pcap file, and analyzing the capture with tcpdump, TShark, or the Wireshark GUI.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Confirm that your enabled RHEL repositories are available:

```bash
sudo dnf repolist
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y tcpdump wireshark-cli wireshark
```

Verify the installation:

```bash
rpm -qi tcpdump wireshark-cli wireshark
tcpdump --version
tshark --version
```

If the system is server-only and you do not need a graphical analyzer on the RHEL host, install `tcpdump` and `wireshark-cli` only. You can copy the `.pcap` file to a workstation and open it with Wireshark there.

## Step 3: Configure the Capture

```bash
ip -brief link
sudo mkdir -p /var/tmp/packet-captures
```

Choose the interface you want to capture from, such as `enp1s0`, `eth0`, or `any`. Packet capture normally requires root privileges or capture capabilities, so the examples use `sudo`.

## Step 4: Capture Traffic

```bash
sudo tcpdump -D
sudo tcpdump -i enp1s0 -nn -s 0 -c 100 -w /var/tmp/packet-captures/sample.pcap 'host 192.0.2.10 or port 443'
```

The `-D` option lists capture interfaces, `-i` selects the interface, `-nn` disables name and port lookups, `-s 0` captures full packets, `-c 100` stops after 100 packets, and `-w` writes packets to a capture file.

## Step 5: Verify the Configuration

Read the capture file with tcpdump:

```bash
tcpdump -nn -r /var/tmp/packet-captures/sample.pcap
```

Analyze the same file with TShark:

```bash
tshark -r /var/tmp/packet-captures/sample.pcap -Y 'tcp.port == 443' -T fields -e frame.number -e ip.src -e ip.dst -e tcp.srcport -e tcp.dstport
```

Open the file with the Wireshark GUI if a desktop environment is available:

```bash
wireshark /var/tmp/packet-captures/sample.pcap
```

## Step 6: Configure Firewall Rules

Local packet capture does not require opening an inbound firewall port. Keep the firewall unchanged unless you are intentionally exposing a separate remote access service. You can confirm the current firewall state with:

```bash
sudo firewall-cmd --state
sudo firewall-cmd --list-all
```

## Step 7: Performance Tuning

Monitor resource usage and limit capture size based on your workload:

```bash
sudo tcpdump -i enp1s0 -nn -s 0 -C 100 -W 10 -w /var/tmp/packet-captures/rolling.pcap
top -p $(pidof tcpdump)
```

The `-C 100 -W 10` options rotate capture files at 100 MB each and keep 10 files. Use capture filters, packet counts, and rotation to avoid filling the filesystem on busy systems.

## Security Considerations

- Capture only the traffic needed for troubleshooting
- Treat packet captures as sensitive data because they can contain hostnames, IP addresses, headers, and payload data
- Restrict read access to capture files
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **No packets captured**: Verify the interface with `ip -brief link` or `tcpdump -D`, then simplify the capture filter
2. **Permission denied**: Run the capture with `sudo` and verify the output directory permissions with `ls -ldZ /var/tmp/packet-captures`
3. **Capture file grows too large**: Use `-c`, `-C`, `-W`, and narrow capture filters such as `host`, `port`, `tcp`, or `udp`

## Conclusion

You have successfully configured capture and analyze network traffic with tcpdump and Wireshark on RHEL. Monitor capture size carefully and keep the tools updated to maintain security and performance.
