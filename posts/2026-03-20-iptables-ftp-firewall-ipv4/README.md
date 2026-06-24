# How to Configure iptables Firewall Rules for FTP on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, FTP, IPv4, Firewall, Active Mode, Passive Mode

Description: Write iptables rules to allow FTP command and data connections for both active and passive modes on IPv4, including the nf_conntrack_ftp module for automatic port tracking.

## Introduction

FTP requires special firewall handling because the data channel uses dynamically negotiated ports. iptables rules for FTP must account for both active mode (server initiates a data connection from port 20 to a client-selected high port) and passive mode (client connects to a server-selected high port). The `nf_conntrack_ftp` kernel module automates most of this when the helper is assigned to the FTP control connection.

## FTP Port Overview

```text
Active Mode:
  Control: Client (random high port) → Server:21
  Data:    Server:20 → Client (client-selected high port)

Passive Mode:
  Control: Client (random high port) → Server:21
  Data:    Client (random high port) → Server (server-selected high port or pasv_min:pasv_max range)
```

## Using nf_conntrack_ftp (Recommended)

```bash
# Load the FTP connection tracking helper

sudo modprobe nf_conntrack_ftp

# Make it persistent across reboots
printf "nf_conntrack_ftp\n" | sudo tee /etc/modules-load.d/nf_conntrack_ftp.conf

# Verify it's loaded
lsmod | grep nf_conntrack_ftp

# On modern kernels, assign the helper to the FTP control connection:
sudo iptables -t raw -A PREROUTING -p tcp --dport 21 -j CT --helper ftp

# Once the helper is assigned, RELATED handles FTP data ports:
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## Complete iptables Ruleset for FTP Server

```bash
#!/bin/bash
# FTP server iptables rules

# Assign FTP helper to the control connection
iptables -t raw -A PREROUTING -p tcp --dport 21 -j CT --helper ftp

# Allow established and related connections
iptables -A INPUT  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow FTP command port (inbound)
iptables -A INPUT -p tcp --dport 21 -m conntrack --ctstate NEW -j ACCEPT

# If you are not using nf_conntrack_ftp, explicitly allow the server's passive range:
# iptables -A INPUT -p tcp --dport 30000:31000 -j ACCEPT

# Log and drop everything else
iptables -A INPUT -j LOG --log-prefix "FW-DROP: "
iptables -A INPUT -j DROP
```

## Restricting FTP Access to Specific IPs

```bash
# Allow FTP only from trusted IPs
iptables -A INPUT -p tcp --dport 21 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 21 -s 203.0.113.20 -j ACCEPT
iptables -A INPUT -p tcp --dport 21 -j DROP    # Block all others

# Allow passive ports only from the same trusted IPs if you are not using nf_conntrack_ftp
iptables -A INPUT -p tcp --dport 30000:31000 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 30000:31000 -s 203.0.113.20 -j ACCEPT
iptables -A INPUT -p tcp --dport 30000:31000 -j DROP
```

## Saving iptables Rules

```bash
# Debian/Ubuntu
sudo apt install iptables-persistent
sudo netfilter-persistent save

# RHEL/CentOS with iptables-services
sudo service iptables save
# or
sudo iptables-save > /etc/sysconfig/iptables

# Verify saved rules
sudo cat /etc/iptables/rules.v4        # Debian/Ubuntu
# or
sudo cat /etc/sysconfig/iptables       # RHEL/CentOS with iptables-services
```

## Testing the Rules

```bash
# From a test client:
ftp 203.0.113.10

# From an internal allowed IP, using a client configured for passive mode:
ftp 203.0.113.10

# Check connection tracking state
sudo cat /proc/net/nf_conntrack | grep ftp

# View iptables hit counts
sudo iptables -L INPUT -v -n | grep -E "21|30000"
```

## Conclusion

Load `nf_conntrack_ftp` and, on modern kernels, assign it to the FTP control connection with the `CT` target so iptables can handle FTP data connections via the `RELATED` state. Add an INPUT rule for port 21; if you are not using the helper, also allow your passive port range. Restrict source IPs with `-s` to limit FTP access to trusted clients. Save rules with `iptables-persistent` or the distribution equivalent for persistence across reboots.
