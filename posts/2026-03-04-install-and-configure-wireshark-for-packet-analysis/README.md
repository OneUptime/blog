# How to Install and Configure Wireshark for Packet Analysis on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Wireshark, Network Monitoring, Linux

Description: Learn how to install and Configure Wireshark for Packet Analysis on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure Wireshark for Packet Analysis on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Install and Configure Wireshark for Packet Analysis requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

DNF resolves Wireshark dependencies automatically from the enabled RHEL repositories, so no EPEL package or development tool group is required.

## Step 2: Install Required Packages

```bash
sudo dnf install -y wireshark wireshark-cli
```

Verify the installation:

```bash
rpm -qi wireshark wireshark-cli
wireshark --version
tshark --version
```

## Step 3: Configure Capture Permissions

Add your user to the `wireshark` group so packet capture can be handled by `dumpcap` without running the full Wireshark application as root:

```bash
sudo usermod -aG wireshark "$USER"
```

Log out and back in, then verify the new group membership:

```bash
id
```

## Step 4: Start Wireshark

```bash
wireshark
```

For systems without a graphical desktop, use `tshark` from the command line:

```bash
tshark -D
```

## Step 5: Verify the Configuration

List available capture interfaces:

```bash
tshark -D
```

Capture a small packet sample and open it for analysis:

```bash
tshark -i enp1s0 -c 10 -w sample.pcapng
tshark -r sample.pcapng
```

## Step 6: Configure Firewall Rules

Local packet capture does not require opening a firewalld service. If you use SSH to collect captures from a remote RHEL host, make sure SSH is allowed on that remote host:

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Use capture limits and ring buffers for long-running captures so files do not grow without bounds:

```bash
dumpcap -i enp1s0 -b filesize:102400 -b files:5 -w capture.pcapng
```

## Security Considerations

- Do not run the Wireshark GUI as root
- Limit packet capture permissions to trusted users in the `wireshark` group
- Store capture files securely because they can contain credentials, tokens, and private traffic
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **No interfaces are listed**: Run `tshark -D` and verify that `dumpcap` is installed from the `wireshark-cli` package
2. **Permission denied**: Verify group membership with `id` and log out and back in after running `usermod`
3. **Capture file is too large**: Use `dumpcap` ring buffers with `-b filesize:<size>` and `-b files:<count>`

## Conclusion

You have successfully installed and configured Wireshark for packet analysis on RHEL. Review capture permissions regularly and keep the packages updated to maintain security and performance.
