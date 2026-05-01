# How to Fix DNS Resolution Failures on IPv4 Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, IPv4, Troubleshooting, nslookup, dig

Description: Learn how to diagnose and fix DNS resolution failures on IPv4 networks, including identifying misconfigured DNS servers, flushing caches, and switching to reliable public DNS resolvers.

## Diagnosing DNS Failures

```cmd
REM Test if DNS is the problem (not connectivity)
ping 8.8.8.8        REM Works = basic IP connectivity is fine
ping google.com     REM If this fails with "could not find host", DNS is likely broken

REM Basic DNS test
nslookup google.com
REM Shows which DNS server is being used and the result
```

## Step 1: Check Configured DNS Servers

```cmd
REM Windows - show DNS servers
ipconfig /all | findstr "DNS Server"

REM Linux
cat /etc/resolv.conf
resolvectl status | grep "DNS Servers"

REM macOS
scutil --dns | grep nameserver
```

If the DNS server IP is wrong (e.g., 0.0.0.0, 169.254.x.x, or blank), that's likely the root cause.

## Step 2: Test DNS Server Directly

```bash
# Test specific DNS server

nslookup google.com 8.8.8.8      # Use Google DNS
nslookup google.com 1.1.1.1      # Use Cloudflare DNS
nslookup google.com 192.168.1.1  # Test local router DNS

# Linux dig
dig @8.8.8.8 google.com
dig @192.168.1.1 google.com +short

# Check response time
dig @8.8.8.8 google.com | grep "Query time"
```

## Step 3: Flush DNS Cache

```cmd
REM Windows
ipconfig /flushdns
REM Output: "Successfully flushed the DNS Resolver Cache"
```

```bash
# Linux (systemd-resolved)
sudo resolvectl flush-caches
sudo resolvectl statistics

# nscd (older systems)
sudo service nscd restart

# macOS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

## Step 4: Change DNS Server

```powershell
# Windows PowerShell - set Google DNS
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses 8.8.8.8, 8.8.4.4
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses 8.8.8.8, 8.8.4.4

# Or Cloudflare DNS
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses 1.1.1.1, 1.0.0.1

# Verify
Get-DnsClientServerAddress -InterfaceAlias "Ethernet"
```

```bash
# Linux - temporary test on systems that manage /etc/resolv.conf directly
sudo tee /etc/resolv.conf << 'EOF'
nameserver 8.8.8.8
nameserver 8.8.4.4
EOF

# Or use NetworkManager
nmcli con mod "Wired connection 1" ipv4.ignore-auto-dns yes ipv4.dns "8.8.8.8 8.8.4.4"
nmcli con up "Wired connection 1"
```

## Step 5: Check for DNS Hijacking or Split Horizon Issues

```bash
# Request DNSSEC records; on a validating resolver, look for the AD flag
dig google.com +dnssec

# Check if ISP is hijacking NXDOMAIN responses
nslookup nonexistent-domain-12345.com 8.8.8.8
# Should return NXDOMAIN / Non-existent domain, not an address

# Test from router vs direct
nslookup google.com 192.168.1.1    # Router DNS
nslookup google.com 8.8.8.8        # Direct DNS
# If results differ, router may be manipulating DNS
```

## Step 6: Check /etc/hosts for Conflicts

```bash
# Entries in /etc/hosts override DNS
cat /etc/hosts

# Windows
type C:\Windows\System32\drivers\etc\hosts

# Look for entries that may conflict with what you're trying to resolve
# Example of a problematic entry:
# 127.0.0.1   google.com   <- This would break google.com resolution
```

## Step 7: Verify DNS Service on Linux Server

```bash
# Check if local DNS server (dnsmasq/BIND) is running
systemctl status dnsmasq
systemctl status named

# Check if it's listening on port 53
ss -ulnp | grep :53
ss -tlnp | grep :53

# Test local resolver
dig @127.0.0.1 google.com

# Check logs
journalctl -u dnsmasq -n 50
```

## Conclusion

DNS failures are diagnosed by confirming IP connectivity works (`ping 8.8.8.8`) while name resolution fails (`ping google.com`). Fix by flushing caches (`ipconfig /flushdns` on Windows, `resolvectl flush-caches` on Linux), switching to reliable public DNS servers (8.8.8.8 or 1.1.1.1) via PowerShell or `nmcli`, and checking `/etc/hosts` for conflicting entries. Always test with `nslookup` specifying the DNS server explicitly to isolate whether the issue is the server choice or the network path.
