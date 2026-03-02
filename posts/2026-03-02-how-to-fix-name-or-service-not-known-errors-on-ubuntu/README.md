# How to Fix 'Name or Service Not Known' Errors on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, DNS, Troubleshooting, System Administration

Description: Guide to diagnosing and fixing 'Name or service not known' DNS resolution errors on Ubuntu, covering /etc/resolv.conf, systemd-resolved, nsswitch.conf, and common misconfigurations.

---

The error "Name or service not known" means a DNS lookup failed - the system tried to resolve a hostname to an IP address and could not. This failure can come from several places: a missing or broken DNS resolver configuration, a malfunctioning DNS server, incorrect `/etc/nsswitch.conf` settings, or a networking problem that prevents DNS queries from reaching the server.

## Understanding the Resolution Chain

When an application calls `getaddrinfo("google.com")`, Linux checks these sources in order (as defined in `/etc/nsswitch.conf`):

1. `/etc/hosts` - local static hostname entries
2. DNS resolver - queries a DNS server

If both fail, you get "Name or service not known" (POSIX error code EAI_NONAME or EAI_AGAIN).

## Step 1: Verify Basic Connectivity

First, confirm the problem is DNS and not complete network failure:

```bash
# Test if you can reach a server by IP (bypasses DNS)
ping -c 3 8.8.8.8

# If this works, your network is up - the problem is DNS
# If this fails, fix networking first (separate issue)

# Test DNS resolution
host google.com
nslookup google.com
dig google.com
```

If `ping 8.8.8.8` works but `ping google.com` fails with "Name or service not known", DNS is the issue.

## Step 2: Check /etc/resolv.conf

The `resolv.conf` file tells the system which DNS servers to query:

```bash
# View the current content
cat /etc/resolv.conf

# A functional resolv.conf looks like:
# nameserver 8.8.8.8
# nameserver 8.8.4.4
# search yourdomain.com

# Check if the file is a symlink
ls -la /etc/resolv.conf
```

On modern Ubuntu, `/etc/resolv.conf` is typically a symlink to systemd-resolved's stub resolver:

```
/etc/resolv.conf -> ../run/systemd/resolve/stub-resolv.conf
```

If it points to nowhere or the target is missing:

```bash
# Check if the symlink target exists
ls -la /run/systemd/resolve/

# If systemd-resolved is running, recreate the symlink
sudo rm /etc/resolv.conf
sudo ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

## Step 3: Check systemd-resolved Status

On Ubuntu 18.04+, `systemd-resolved` manages DNS resolution:

```bash
# Check if systemd-resolved is running
sudo systemctl status systemd-resolved

# If it is not running, start it
sudo systemctl start systemd-resolved
sudo systemctl enable systemd-resolved

# View the current DNS configuration
resolvectl status

# Check which DNS servers are in use
resolvectl dns

# Test a lookup through resolvectl
resolvectl query google.com
```

If `resolvectl status` shows no DNS servers, or shows servers that are unreachable, that is your problem.

### Setting DNS Servers in systemd-resolved

```bash
# Set DNS servers globally
sudo resolvectl dns enp3s0 8.8.8.8 8.8.4.4

# Or set via Netplan (recommended for persistence)
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
network:
  version: 2
  ethernets:
    enp3s0:
      dhcp4: true
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4, 1.1.1.1]
        search: [yourdomain.com]
```

```bash
sudo netplan apply
```

## Step 4: Checking /etc/nsswitch.conf

The Name Service Switch configuration controls how names are resolved. A broken or unusual nsswitch.conf causes DNS failures:

```bash
cat /etc/nsswitch.conf | grep hosts
```

Normal output:

```
hosts:          files dns
```

This means: check `/etc/hosts` first, then DNS.

If the line reads:

```
hosts:          files
```

DNS lookups are disabled. Restore the normal configuration:

```bash
sudo nano /etc/nsswitch.conf
# Change: hosts: files
# To:     hosts: files dns
```

If `mdns4_minimal` or `resolve` are in the line:

```
hosts:          files mdns4_minimal [NOTFOUND=return] dns resolve [!UNAVAIL=return] mach
```

This is Ubuntu's default with Avahi. The `[NOTFOUND=return]` after `mdns4_minimal` can cause issues if mdns fails before DNS is tried. For servers, simplify to:

```
hosts:          files dns
```

## Step 5: Direct DNS Query Testing

Bypass all system resolution and query a DNS server directly:

```bash
# Query Google's DNS directly
dig @8.8.8.8 google.com

# Query your configured DNS server directly
dig @$(resolvectl status | grep 'DNS Servers' | awk '{print $NF}') google.com

# Test with a different DNS server
nslookup google.com 1.1.1.1

# Check DNSSEC validation
dig +dnssec google.com

# See detailed query path
dig +trace google.com
```

If `dig @8.8.8.8 google.com` works but `dig google.com` fails, the issue is your configured resolver, not DNS infrastructure.

## Step 6: Check /etc/hosts for Conflicts

Sometimes an entry in `/etc/hosts` interferes with DNS:

```bash
cat /etc/hosts

# Look for entries that might conflict with hostnames you are trying to resolve
# Example problem: if google.com is listed with wrong IP
grep google.com /etc/hosts

# A server whose own hostname is not in /etc/hosts can cause issues
hostname
grep $(hostname) /etc/hosts
```

Ensure `/etc/hosts` has at minimum:

```
127.0.0.1    localhost
127.0.1.1    hostname.yourdomain.com hostname
::1          localhost ip6-localhost ip6-loopback
```

## Step 7: Check DNS Port Accessibility

```bash
# Test if UDP port 53 (DNS) is reachable to your DNS server
nc -zuv 8.8.8.8 53
# Connection to 8.8.8.8 53 port [udp/domain] succeeded!

# Test TCP port 53
nc -zv 8.8.8.8 53

# If port 53 is blocked, check your firewall
sudo iptables -L OUTPUT -n -v | grep 53
sudo ufw status | grep 53
```

If UDP 53 is blocked by your firewall:

```bash
# Allow DNS outbound
sudo ufw allow out 53/udp
sudo ufw allow out 53/tcp
sudo ufw reload
```

## Step 8: The localhost DNS Stub Resolver

Ubuntu's default configuration routes all DNS through a local stub at `127.0.0.53`. If this stub is not working:

```bash
# Check if the stub resolver is listening
ss -lun | grep 53
# Should show: 127.0.0.53:53

# Test the stub directly
dig @127.0.0.53 google.com

# If the stub is not listening, restart systemd-resolved
sudo systemctl restart systemd-resolved

# After restart, check it is listening
ss -lun | grep 53
```

## Step 9: DHCP-Provided DNS Not Being Applied

On DHCP-configured systems, the DNS server comes from the DHCP lease. If DHCP does not provide DNS or provides a broken address:

```bash
# Check what DNS your DHCP lease provided
cat /run/systemd/resolve/resolv.conf

# Or check NetworkManager's connection info
nmcli connection show --active

# Force DHCP to renew and get fresh DNS servers
sudo dhclient -v enp3s0

# Or with NetworkManager
nmcli connection down enp3s0
nmcli connection up enp3s0
```

## Step 10: Dealing with /etc/resolv.conf Being Overwritten

A common frustration is fixing resolv.conf only for it to revert. Both NetworkManager and DHCP clients update it:

```bash
# Check what is writing to resolv.conf
sudo lsof /etc/resolv.conf

# Lock resolv.conf from being changed (not usually recommended for DHCP setups)
sudo chattr +i /etc/resolv.conf  # Immutable - nothing can change it

# Better approach: configure DNS in Netplan or NetworkManager permanently
```

For a static server, the cleanest approach is to configure DNS in Netplan with static nameservers so DHCP-provided DNS does not overwrite your settings:

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  ethernets:
    enp3s0:
      dhcp4: true
      dhcp4-overrides:
        # DHCP can configure routing but we control DNS
        use-dns: false
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

## Summary Diagnostic Script

When DNS is broken and you need answers fast:

```bash
# Quick DNS diagnostic
echo "=== resolv.conf ==="
cat /etc/resolv.conf

echo "=== systemd-resolved status ==="
systemctl is-active systemd-resolved

echo "=== resolvectl dns ==="
resolvectl dns 2>/dev/null || echo "resolvectl not available"

echo "=== nsswitch hosts line ==="
grep ^hosts /etc/nsswitch.conf

echo "=== stub resolver listening ==="
ss -lun | grep ':53' || echo "Nothing listening on 53"

echo "=== direct dig test ==="
dig @8.8.8.8 google.com +short +timeout=3 || echo "Direct DNS query failed"

echo "=== stub dig test ==="
dig @127.0.0.53 google.com +short +timeout=3 2>/dev/null || echo "Stub DNS query failed"
```

The output from this script identifies which layer the problem is at within 30 seconds, narrowing down whether you have a missing resolver, a misconfigured stub, a firewall block, or a broken DHCP-provided DNS address.
