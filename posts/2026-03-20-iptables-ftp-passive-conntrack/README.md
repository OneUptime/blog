# How to Use ip_conntrack_ftp for Passive FTP Through iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, FTP, Passive Mode, Nf_conntrack_ftp, Connection Tracking, IPv4

Description: Configure the nf_conntrack_ftp kernel module to automatically track FTP passive data connections through iptables, eliminating the need to open a wide port range.

## Introduction

Without `nf_conntrack_ftp`, iptables has no way to know which ephemeral ports an FTP server will use for passive data connections. The connection tracking helper inspects FTP control traffic and, once attached to the control connection, creates expectations for the data connections so they are accepted as RELATED without explicit rules for each port.

## How Connection Tracking Works for FTP

```text
1. Client connects to Server:21  →  iptables sees NEW connection
2. Server sends: 227 Entering Passive Mode (...,117,49)
   → nf_conntrack_ftp parses this response
   → Creates an expectation for Server:30001
3. Client connects to Server:30001  →  iptables sees RELATED connection
   → Automatically accepted by: -m conntrack --ctstate RELATED -j ACCEPT
```

## Loading the Module

```bash
# Load nf_conntrack_ftp helper

sudo modprobe nf_conntrack_ftp

# For older kernels (the module was renamed)
sudo modprobe ip_conntrack_ftp   # legacy name

# Verify it's active
lsmod | grep conntrack_ftp
# Expected output:
# nf_conntrack_ftp       20480  0
# nf_conntrack           163840  3 nf_conntrack_ftp,...

# If conntrack-tools is installed and a passive FTP session is active,
# list FTP expectations
sudo conntrack -L expect | grep ftp
```

## Making the Module Persistent

```bash
# Debian/Ubuntu
echo "nf_conntrack_ftp" | sudo tee -a /etc/modules

# RHEL/CentOS 7
echo "nf_conntrack_ftp" | sudo tee /etc/modules-load.d/ftp.conf

# systemd-based alternative
printf '%s\n' nf_conntrack_ftp | \
  sudo tee /etc/modules-load.d/nf_conntrack_ftp.conf > /dev/null

# Verify at boot (check after reboot)
sudo systemctl status systemd-modules-load
```

## iptables Rules with Connection Tracking

```bash
#!/bin/bash
# Minimal FTP firewall using connection tracking

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Loopback
iptables -A INPUT -i lo -j ACCEPT

# Explicitly attach the FTP helper on newer kernels
iptables -t raw -A PREROUTING -p tcp --dport 21 -j CT --helper ftp

# Allow established and related connections (handles FTP data!)
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow FTP control port
iptables -A INPUT -p tcp --dport 21 -m conntrack --ctstate NEW -j ACCEPT

# No explicit INPUT rule needed for passive ports - RELATED covers them
```

## Verifying Connection Tracking

```bash
# With conntrack-tools installed, while an FTP client is connected
# in passive mode:
sudo watch -n1 'conntrack -L -o extended -p tcp --dport 21'
sudo watch -n1 'conntrack -L expect'

# You should see entries like:
# tcp      6 ... src=client_ip dst=server_ip sport=... dport=21 ... helper=ftp
# tcp      6 ... sport=0 dport=30001 ... master-src=client_ip ... dport=21 helper=ftp

# Count active FTP connections tracked:
sudo conntrack -L -p tcp --dport 21 | wc -l
```

## Non-Standard FTP Port

```bash
# If your FTP server uses a non-standard port, explicitly attach the helper:
sudo iptables -t raw -A PREROUTING -p tcp --dport 2121 -j CT --helper ftp

# If you rely on automatic helper assignment, tell the module the custom port:
# Unload and reload with custom port
sudo modprobe -r nf_conntrack_ftp
sudo modprobe nf_conntrack_ftp ports=2121

# Or set a kernel parameter:
echo "options nf_conntrack_ftp ports=2121" | \
  sudo tee /etc/modprobe.d/nf_conntrack_ftp.conf

# Then allow port 2121 in iptables:
iptables -A INPUT -p tcp --dport 2121 -m conntrack --ctstate NEW -j ACCEPT
```

## Troubleshooting

```bash
# Issue: Passive mode still fails even with module loaded
# Check if the helper is attached and expectations are being created
# (with conntrack-tools installed):
sudo conntrack -L -o extended -p tcp --dport 21
sudo conntrack -L expect

# Issue: RELATED connections not working
# Verify the module is loaded, INPUT accepts ESTABLISHED,RELATED,
# and the raw table attaches the ftp helper:
sudo iptables -L INPUT -n | grep RELATED
sudo iptables -t raw -L PREROUTING -n | grep CT

# Issue: Module loads but PASV still blocked
# Check if nf_conntrack_helper is enabled if you rely on automatic helper assignment
sudo sysctl net.netfilter.nf_conntrack_helper
# If 0, enable:
sudo sysctl -w net.netfilter.nf_conntrack_helper=1
echo "net.netfilter.nf_conntrack_helper=1" | sudo tee -a /etc/sysctl.conf

# Preferred on newer kernels: explicitly attach the helper with CT:
sudo iptables -t raw -A PREROUTING -p tcp --dport 21 \
  -j CT --helper ftp
```

## Conclusion

`nf_conntrack_ftp` eliminates the need for wide passive port range rules. Load it with `modprobe nf_conntrack_ftp`, persist it in `/etc/modules`, and ensure iptables has `-m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT`. On newer kernels, attach the FTP helper explicitly with the raw-table `CT --helper ftp` rule, or enable `nf_conntrack_helper=1` if you prefer automatic helper assignment.
