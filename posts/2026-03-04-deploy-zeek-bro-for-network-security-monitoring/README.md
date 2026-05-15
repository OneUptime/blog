# How to Deploy Zeek (Bro) for Network Security Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Zeek, Network Monitoring, Linux

Description: Learn how to deploy Zeek (Bro) for Network Security Monitoring on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Deploy Zeek (Bro) for Network Security Monitoring on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Deploy Zeek (Bro) for Network Security Monitoring requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y epel-release
sudo dnf install -y bison cmake cppzmq-devel gcc gcc-c++ flex git libpcap-devel make openssl-devel python3 python3-devel swig zlib-devel
sudo dnf install -y python3-GitPython python3-semantic_version
```

## Step 2: Install Required Packages

```bash
git clone --recurse-submodules https://github.com/zeek/zeek
cd zeek
./configure
make
sudo make install
```

Verify the installation:

```bash
/usr/local/zeek/bin/zeek --version
/usr/local/zeek/bin/zeekctl help
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /usr/local/zeek/etc/node.cfg
```

For a single-sensor deployment, set the monitored interface in `node.cfg`:

```ini
[zeek]
type=standalone
host=localhost
interface=ens192
```

Replace `ens192` with the interface that receives the mirrored or tapped traffic. You can also configure local policy in `/usr/local/zeek/share/zeek/site/local.zeek`, which ZeekControl loads by default.

## Step 4: Start and Enable the Service

```bash
sudo /usr/local/zeek/bin/zeekctl deploy
sudo /usr/local/zeek/bin/zeekctl status
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo /usr/local/zeek/bin/zeekctl check
```

Check the logs for any errors:

```bash
sudo /usr/local/zeek/bin/zeekctl diag
sudo ls -l /usr/local/zeek/logs/current/
```

## Step 6: Configure Firewall Rules

For a standalone passive sensor, Zeek reads packets from a network interface and does not require an inbound firewall service. If you deploy a multi-node Zeek cluster, allow only the required management and cluster communication between trusted Zeek hosts.

```bash
sudo firewall-cmd --list-all
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
sudo /usr/local/zeek/bin/zeekctl top
sudo /usr/local/zeek/bin/zeekctl capstats
```

## Security Considerations

- Run Zeek with the least privilege model appropriate for your packet-capture setup
- Restrict ZeekControl and cluster communication to trusted management networks
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Zeek fails to start**: Check `sudo /usr/local/zeek/bin/zeekctl diag` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **No traffic in logs**: Verify the interface in `/usr/local/zeek/etc/node.cfg` and confirm that mirrored or tapped traffic is reaching the sensor

## Conclusion

You have successfully deployed Zeek (Bro) for network security monitoring on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
