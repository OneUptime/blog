# How to Fix 'Name or Service Not Known' DNS Resolution Failure on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Troubleshooting, NetworkManager, Name Resolution

Description: Fix DNS resolution failures on RHEL that produce 'Name or service not known' errors by checking resolv.conf, DNS servers, and systemd-resolved.

---

The "Name or service not known" error means your system cannot resolve hostnames to IP addresses. This is a DNS resolution failure, not a network connectivity issue.

## Step 1: Verify DNS Is the Problem

```bash
# Test if you can reach external IPs (bypasses DNS)
ping -c 3 8.8.8.8

# If this works but hostname resolution fails, DNS is the issue
ping -c 3 google.com
# ping: google.com: Name or service not known
```

## Step 2: Check DNS Configuration

```bash
# View the current DNS configuration
cat /etc/resolv.conf

# Check if resolv.conf is managed by NetworkManager
ls -la /etc/resolv.conf
# If it is a symlink, NetworkManager or systemd-resolved manages it

# Check what DNS servers NetworkManager is using
nmcli device show | grep DNS
```

## Step 3: Test DNS Servers Directly

```bash
# Test a specific DNS server
dig @8.8.8.8 google.com

# Test your configured DNS server
dig @$(grep nameserver /etc/resolv.conf | head -1 | awk '{print $2}') google.com

# If the configured server fails but 8.8.8.8 works,
# the configured DNS server is the problem
```

## Step 4: Fix DNS Configuration

```bash
# Set DNS servers through NetworkManager (preferred method)
sudo nmcli connection modify ens192 ipv4.dns "8.8.8.8 8.8.4.4"

# If using DHCP, you can add DNS servers without overriding DHCP ones
sudo nmcli connection modify ens192 +ipv4.dns "8.8.8.8"

# Apply the changes
sudo nmcli connection up ens192

# Verify the new configuration
cat /etc/resolv.conf
```

## Step 5: Check nsswitch.conf

```bash
# Verify the name resolution order
grep hosts /etc/nsswitch.conf
# Should include: files dns
# Example: hosts: files dns myhostname

# If dns is missing, add it
sudo vi /etc/nsswitch.conf
# hosts: files dns myhostname
```

## Step 6: Flush DNS Cache

```bash
# If using systemd-resolved
sudo systemd-resolve --flush-caches

# If using nscd
sudo systemctl restart nscd

# If using SSSD
sudo sss_cache -E
```

## Step 7: Check for Firewall Blocking DNS

```bash
# DNS uses port 53 (UDP and TCP)
# Verify outbound DNS is not blocked
sudo firewall-cmd --list-all | grep dns

# Test DNS connectivity
nc -zvu 8.8.8.8 53
```

The most common fix is setting correct DNS servers through NetworkManager. Avoid manually editing `/etc/resolv.conf` on RHEL since NetworkManager will overwrite it.
