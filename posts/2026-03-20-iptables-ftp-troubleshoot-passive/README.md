# How to Troubleshoot FTP Passive Mode Connection Issues on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FTP, Passive Mode, iptables, IPv4, Troubleshooting, Firewall

Description: Diagnose and fix FTP passive mode failures on IPv4 including blocked data ports, NAT traversal issues, pasv_address misconfiguration, and nf_conntrack_ftp problems.

## Introduction

FTP passive mode failures are among the most common FTP problems. The symptoms-directory listings fail, file transfers hang, or connections drop after login-are all caused by the data connection failing. This guide covers systematic diagnosis from network connectivity to configuration issues.

## Understanding Passive Mode Failure Points

```text
Client connects to server:21 → OK
Client sends PASV command → OK
Server responds with IP:PORT → This is where it goes wrong!
Client tries to connect to IP:PORT → FAILS

Failure causes:
1. Server advertises wrong IP (private instead of public)
2. Data port not open in firewall
3. FTP helper not loaded/attached when firewall or NAT relies on it
4. NAT not forwarding data ports
5. Port range exhausted
```

## Step 1: Check What IP the Server Advertises

```bash
# Manual FTP session to see PASV response:

telnet ftp.server.ip 21
# USER ftpuser
# PASS password
# PASV

# Expected response:
# 227 Entering Passive Mode (203,0,113,10,117,49)
# Port = 117*256 + 49 = 30001

# If you see a private IP like (10,0,0,5,117,49):
# pasv_address or MasqueradeAddress is wrong

# Fix vsftpd:
echo "pasv_address=203.0.113.10" | sudo tee -a /etc/vsftpd.conf
sudo systemctl restart vsftpd

# Fix ProFTPD:
echo "MasqueradeAddress 203.0.113.10" | sudo tee -a /etc/proftpd/proftpd.conf
sudo systemctl restart proftpd
```

## Step 2: Check if Data Ports Are Open

```bash
# Verify passive port range is configured in FTP server
grep "pasv_min_port\|pasv_max_port" /etc/vsftpd.conf
# Should show: pasv_min_port=30000  pasv_max_port=31000

# Check iptables allows the passive port range
sudo iptables -L INPUT -n | grep "30000\|31000"

# If missing, add:
sudo iptables -A INPUT -p tcp --dport 30000:31000 -j ACCEPT

# For UFW:
sudo ufw allow 30000:31000/tcp
```

## Step 3: Check nf_conntrack_ftp

```bash
# The FTP helper is only needed if your firewall/NAT relies on helper-assigned
# RELATED connections for FTP data traffic
lsmod | grep nf_conntrack_ftp

# If not loaded:
sudo modprobe nf_conntrack_ftp

# Check whether automatic helper assignment is enabled
cat /proc/sys/net/netfilter/nf_conntrack_helper
# If 0 (the default on current kernels), attach the helper explicitly:
sudo iptables -t raw -A PREROUTING -p tcp --dport 21 -j CT --helper ftp
```

## Step 4: Check NAT/Port Forwarding

```bash
# If FTP server is behind NAT, verify port forwarding
# NAT gateway must forward:
# - Port 21 (command)
# - Ports 30000-31000 (passive data)
# - And allow those forwarded packets to reach the FTP server

# Check iptables NAT rules on gateway:
sudo iptables -t nat -L PREROUTING -n | grep -E "21|30000"

# If missing, add DNAT and FORWARD rules:
FTP_SERVER=10.0.0.5
sudo iptables -t nat -A PREROUTING -p tcp --dport 21 \
  -j DNAT --to-destination $FTP_SERVER:21
sudo iptables -t nat -A PREROUTING -p tcp --dport 30000:31000 \
  -j DNAT --to-destination $FTP_SERVER
sudo iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A FORWARD -p tcp -d $FTP_SERVER --dport 21 -j ACCEPT
sudo iptables -A FORWARD -p tcp -d $FTP_SERVER --dport 30000:31000 -j ACCEPT
```

## Step 5: Use Packet Capture for Confirmation

```bash
# Capture FTP traffic on the server
sudo tcpdump -i eth0 -n "host client.ip and (port 21 or portrange 30000-31000)"

# Watch for:
# - PASV response (server sends port to client)
# - SYN from client to data port (should appear)
# - SYN-ACK from server (confirms port is open)
# - If no SYN seen: client is using the wrong IP/port or traffic is not reaching the server
# - If SYN but no SYN-ACK: firewall blocking or server not listening on that port
```

## Common Quick Fixes

```bash
# All-in-one fix script:
# 1. Load FTP helper if your firewall/NAT relies on it
sudo modprobe nf_conntrack_ftp

# 2. On current kernels, attach the helper explicitly instead of enabling
# global auto-assignment
sudo iptables -t raw -A PREROUTING -p tcp --dport 21 -j CT --helper ftp

# 3. Allow FTP and passive ports
sudo iptables -A INPUT -p tcp --dport 21 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 30000:31000 -j ACCEPT

# 4. Allow established traffic and helper-marked RELATED traffic
sudo iptables -I INPUT 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 5. Restart FTP server
sudo systemctl restart vsftpd   # or proftpd
```

## Conclusion

FTP passive mode failures almost always come from one of four causes: wrong `pasv_address` advertising the wrong IPv4 address, firewall blocking the passive port range, NAT not forwarding the passive ports, or missing FTP helper attachment when the firewall/NAT relies on it. Test systematically: check the PASV response IP, verify the passive range is open, confirm whether you actually need the FTP helper, and use tcpdump to observe the data connection attempt.
