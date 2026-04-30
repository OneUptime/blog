# How to Troubleshoot FTP Passive Mode Issues on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FTP, Passive Mode, Networking, Troubleshooting, Firewall, NAT, Linux

Description: Learn how to diagnose and fix FTP passive mode connection failures on IPv4 networks caused by firewalls, NAT, incorrect PASV IP configuration, and port range issues.

---

FTP passive mode (PASV) is the standard mode for FTP behind NAT and firewalls. Despite being the "safer" mode, it introduces its own set of configuration challenges. This guide covers the most common passive mode failures and their solutions.

---

## How FTP Passive Mode Works

```text
Client → Server port 21 (control connection)
Client asks "enter passive mode"
Server responds: 227 Entering Passive Mode (IP, port_hi, port_lo)
Client → Server high port (data connection)
```

The server tells the client which IP and port to connect to for data transfer. Problems arise when the server advertises the wrong IP (e.g., a private IP behind NAT) or the data port is blocked by a firewall.

---

## Common Passive Mode Errors

```text
425 Can't open data connection
227 Entering Passive Mode (10,0,0,1,...)  # Private IP - wrong!
Connection refused to 192.168.x.x on port 50000-50100
```

---

## Diagnosing the Problem

### Step 1: Check What IP the Server Advertises

```bash
# Connect to FTP and enter passive mode manually

telnet ftp.example.com 21
USER anonymous
PASS test@test.com
PASV
# 227 Entering Passive Mode (10,0,0,5,195,150)
# Server is advertising private IP 10.0.0.5 - this won't work from outside!
```

### Step 2: Parse the PASV Response

```bash
# PASV response format: (h1,h2,h3,h4,p1,p2)
# IP = h1.h2.h3.h4
# Port = p1 * 256 + p2
# 227 Entering Passive Mode (192,168,1,5,195,150)
# IP = 192.168.1.5
# Port = 195 * 256 + 150 = 49,942
```

---

## Fix 1: Correct the Passive IP in vsftpd

The server must advertise its public IP, not the internal one:

```bash
# /etc/vsftpd.conf
pasv_enable=YES
pasv_address=203.0.113.10  # Public/external IP
pasv_min_port=49152
pasv_max_port=49252
pasv_addr_resolve=NO

sudo systemctl restart vsftpd
```

### Using Dynamic Public IP

```bash
# Use a DNS name; vsftpd resolves it at startup
pasv_address=ftp.example.com
pasv_addr_resolve=YES
```

Restart vsftpd after the public IP changes so it re-resolves the hostname.

---

## Fix 2: Open Passive Port Range in Firewall

The passive port range must be open in both the server firewall and any upstream firewalls/NAT:

```bash
# iptables - open passive port range
sudo iptables -A INPUT -p tcp --dport 49152:49252 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 21 -j ACCEPT

# nftables
nft add rule inet filter input tcp dport 49152-49252 accept
nft add rule inet filter input tcp dport 21 accept

# firewalld
sudo firewall-cmd --add-port=49152-49252/tcp --permanent
sudo firewall-cmd --add-service=ftp --permanent
sudo firewall-cmd --reload
```

---

## Fix 3: Configure NAT Port Forwarding

If the FTP server is behind NAT (home router/firewall), forward both the control port and data port range:

```bash
# Forward port 21 to FTP server
iptables -t nat -A PREROUTING -p tcp --dport 21 -j DNAT \
    --to-destination 10.0.0.5:21
iptables -A FORWARD -p tcp -d 10.0.0.5 --dport 21 -j ACCEPT

# Forward passive data ports
iptables -t nat -A PREROUTING -p tcp --dport 49152:49252 -j DNAT \
    --to-destination 10.0.0.5:49152-49252
iptables -A FORWARD -p tcp -d 10.0.0.5 --dport 49152:49252 -j ACCEPT
```

---

## Fix 4: Load nf_conntrack_ftp (Connection Tracking Helper)

On a Linux firewall or router, the FTP connection tracking helper can allow stateful firewall rules to recognize related FTP data connections. It does not replace correct PASV IP or passive port forwarding, and modern kernels may require explicit helper assignment:

```bash
# Load the module
sudo modprobe nf_conntrack_ftp

# Make it persistent
echo "nf_conntrack_ftp" | sudo tee -a /etc/modules

# Verify
lsmod | grep ftp
# nf_conntrack_ftp        20480  0
```

If you use firewalld, `--add-service=ftp` adds the FTP service/helper. With direct nftables or iptables rules, you may also need an explicit helper assignment rule.

---

## ProFTPD Passive Mode Configuration

```bash
# /etc/proftpd/proftpd.conf
PassivePorts 49152 49252
MasqueradeAddress 203.0.113.10  # Public IP
```

---

## Pure-FTPd Passive Mode Configuration

```bash
# Set passive port range
echo "49152 49252" > /etc/pure-ftpd/conf/PassivePortRange

# Set external IP
echo "203.0.113.10" > /etc/pure-ftpd/conf/ForcePassiveIP

sudo systemctl restart pure-ftpd
```

---

## Testing Passive Mode

```bash
# Use curl to test passive mode on IPv4 (force PASV instead of EPSV)
curl -v --disable-epsv ftp://ftp.example.com/ --user "user:pass"

# Use lftp with explicit passive mode
lftp ftp://ftp.example.com
lftp> set ftp:passive-mode yes
lftp> ls

# Use BSD/tnftp client (passive mode is the default)
ftp ftp.example.com
```

---

## Troubleshooting Checklist

| Issue | Check | Fix |
|-------|-------|-----|
| Server advertises private IP | PASV response shows RFC 1918 address | Set `pasv_address` to public IP |
| Data port refused | Port range blocked | Open 49152-49252 in firewall |
| Connection works locally but not remotely | NAT not forwarding data ports | Forward port range in router/firewall |
| Intermittent failures | Too small port range | Increase range to 1000+ ports |

---

## Best Practices

1. **Use EPSV (Extended Passive)** instead of PASV when possible - simpler and works with IPv6
2. **Set a port range of at least 100 ports** - concurrent transfers need separate ports
3. **Use nf_conntrack_ftp only when needed** on Linux firewalls/routers - it can help with related FTP data connections, but modern kernels may require explicit helper assignment
4. **Consider SFTP as a modern alternative** - FTPS adds TLS, but it still uses FTP data connections and passive mode
5. **Monitor FTP connections** at the firewall level to catch port exhaustion

---

## Conclusion

FTP passive mode failures are almost always caused by wrong advertised IP, closed firewall ports, or missing NAT port forwarding. Set `pasv_address` to your public IP, open the passive port range in firewalls, and use the FTP helper on Linux firewalls only when you actually need stateful FTP connection tracking.

---

*Monitor your FTP and file transfer services with [OneUptime](https://oneuptime.com).*
