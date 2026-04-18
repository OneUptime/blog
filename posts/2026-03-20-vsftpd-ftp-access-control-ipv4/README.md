# How to Set Up FTP Access Control by IPv4 Address in vsftpd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: vsftpd, FTP, IPv4, Access Control, Security, Linux, TCP Wrappers

Description: Learn how to restrict vsftpd FTP access to specific IPv4 addresses and ranges using TCP wrappers and vsftpd's built-in configuration options.

---

Restricting FTP access by source IPv4 address adds a critical layer of security: even if credentials are compromised, attackers from unauthorized IPs cannot connect.

## Method 1: TCP Wrappers (hosts.allow / hosts.deny)

vsftpd supports TCP wrappers for IP-based access control. This is the classic and widely-supported method.

```bash
# /etc/hosts.allow

# Allow FTP from the office network and a specific admin IP
# Use the network/netmask form for IPv4 (CIDR prefix support in libwrap is IPv6-only per hosts_access(5))
vsftpd: 192.168.1.0/255.255.255.0
vsftpd: 203.0.113.5

# /etc/hosts.deny
# Deny FTP from all other sources
vsftpd: ALL
```

TCP wrappers checks `hosts.allow` first; if matched, the connection is allowed. If not matched, it checks `hosts.deny`. A match in `hosts.deny` blocks the connection.

## Method 2: vsftpd tcp_wrappers Directive

Ensure TCP wrappers support is enabled in vsftpd:

```ini
# /etc/vsftpd.conf
tcp_wrappers=YES   # Enable TCP wrappers (vsftpd default is NO; many distros override)
```

```bash
systemctl restart vsftpd
```

## Method 3: iptables / nftables Firewall Rules

Firewall-based restriction is more reliable and doesn't depend on vsftpd having TCP wrappers support.

```bash
# Allow FTP from the internal network
iptables -A INPUT -p tcp --dport 21 -s 192.168.1.0/24 -j ACCEPT

# Allow FTP from a specific admin IP
iptables -A INPUT -p tcp --dport 21 -s 203.0.113.5 -j ACCEPT

# Allow passive mode ports from the internal network
iptables -A INPUT -p tcp --dport 40000:50000 -s 192.168.1.0/24 -j ACCEPT

# Deny all other FTP connections
iptables -A INPUT -p tcp --dport 21 -j DROP
```

## Method 4: Per-User IP Restriction with PAM

For finer-grained control (restrict specific users to specific IPs):

```bash
# /etc/security/access.conf
# Allow ftpuser only from the office subnet
+ : ftpuser : 192.168.1.0/24
# Deny ftpuser from everywhere else
- : ftpuser : ALL
```

```ini
# /etc/vsftpd.conf
# Enable PAM for authentication (required for access.conf)
pam_service_name=vsftpd
```

```text
# /etc/pam.d/vsftpd
# Add this line to enable pam_access checking
account required pam_access.so
```

## Testing Access Control

```bash
# Test allowed source IP (should connect)
ftp 192.168.1.10   # From 192.168.1.50 (in allowed range)

# Test denied source IP (should be refused)
ftp 192.168.1.10   # From 10.0.0.1 (not in allowed range)

# Check vsftpd log for denied connections
tail -f /var/log/vsftpd.log
grep "refused connect" /var/log/syslog | grep vsftpd
```

## Key Takeaways

- TCP wrappers in `/etc/hosts.allow` and `/etc/hosts.deny` provide simple IP-based FTP access control.
- iptables rules are more reliable and apply before the process even starts a handshake.
- Passive mode ports must be allowed in addition to port 21; include them in firewall rules.
- Use `/etc/security/access.conf` with PAM for per-user IPv4 restrictions.
