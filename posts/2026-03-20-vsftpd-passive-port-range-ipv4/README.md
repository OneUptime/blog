# How to Configure vsftpd Passive Port Range for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: vsftpd, FTP, Passive Mode, Port Range, Firewall, IPv4

Description: Set a specific passive port range in vsftpd using pasv_min_port and pasv_max_port, calculate the right range size, and open exactly those ports in your firewall.

## Introduction

vsftpd uses ephemeral ports for passive data connections. Without restricting the range, vsftpd can select any unprivileged port (1024-65535), making firewall rules impossible to write precisely. `pasv_min_port` and `pasv_max_port` constrain passive data connections to a known range.

## Setting the Port Range

```bash
# /etc/vsftpd.conf

listen=YES
listen_ipv6=NO

pasv_enable=YES

# Define passive port range (1001 ports for up to ~1000 concurrent transfers)

pasv_min_port=30000
pasv_max_port=31000

pasv_address=203.0.113.10
```

## Choosing the Right Range Size

| Concurrent Users | Recommended Range | Port Count |
|---|---|---|
| Up to 10 | 30000-30099 | 100 |
| Up to 50 | 30000-30499 | 500 |
| Up to 100 | 30000-31000 | 1001 |
| Up to 500 | 30000-35000 | 5001 |

Each FTP data transfer consumes one port for its duration. A 100-port range supports approximately 100 simultaneous transfers.

## Firewall Configuration

```bash
# UFW
sudo ufw allow 21/tcp
sudo ufw allow 30000:31000/tcp
sudo ufw reload

# iptables
sudo iptables -A INPUT -p tcp --dport 21 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 30000:31000 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# firewalld
sudo firewall-cmd --permanent --add-port=21/tcp
sudo firewall-cmd --permanent --add-port=30000-31000/tcp
sudo firewall-cmd --reload

# Verify rules
sudo ufw status numbered | grep -E "21|30000"
sudo iptables -L INPUT -n | grep -E "21|30000"
```

## Kernel Connection Tracking

The Linux kernel tracks FTP connections with the `nf_conntrack_ftp` module. It parses the control channel (PASV/EPSV/PORT) to create connection tracking expectations so stateful firewalls can allow the data connection without opening a wide port range. If you have already opened the passive port range in your firewall (as shown above), the helper is optional on the server side:

```bash
# Load connection tracking module (useful when you don't want to open the full passive range)
sudo modprobe nf_conntrack_ftp

# Make persistent
echo "nf_conntrack_ftp" | sudo tee -a /etc/modules

# Verify passive connections are tracked:
sudo cat /proc/net/nf_conntrack | grep ftp
```

## Monitoring Port Usage

```bash
# See which passive ports are currently in use:
sudo ss -tnp | grep vsftpd

# Count concurrent FTP data connections:
sudo ss -tnp | grep vsftpd | grep -v ":21" | wc -l

# Check vsftpd log for passive connections:
sudo tail -f /var/log/vsftpd.log | grep -i pasv

# Verify port range is adequate (no connection refused due to port exhaustion):
sudo grep "PASV" /var/log/vsftpd.log | tail -20
```

## Small Range for High-Security Environments

```bash
# /etc/vsftpd.conf - minimal range for low-traffic servers

pasv_enable=YES
pasv_min_port=30000
pasv_max_port=30009   # Only 10 ports for very few concurrent transfers

# Monitor if range is too small:
# Look for: "425 Failed to establish connection" in logs
sudo grep "425" /var/log/vsftpd.log
```

## Verify Configuration

```bash
# Restart and test
sudo systemctl restart vsftpd

# Confirm vsftpd started without errors
sudo systemctl status vsftpd

# Test passive connection
curl -v --ftp-pasv ftp://ftpuser:password@203.0.113.10/

# Capture the PASV response to verify port range:
# Should see: 227 Entering Passive Mode (203,0,113,10,p1,p2)
# Port = p1*256 + p2 - should be between 30000 and 31000
```

## Conclusion

Use `pasv_min_port` and `pasv_max_port` to restrict vsftpd's passive data ports to a defined range. Size the range based on expected concurrent transfers - 100-500 ports is sufficient for most servers. Open exactly this range in your firewall and forward it through NAT if applicable. Monitor for `425 Failed to establish connection` errors as a sign that the range is exhausted.
