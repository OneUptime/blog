# How to Fix 'Could Not Resolve Host' DNS Resolution Failures on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Networking, Troubleshooting, Linux

Description: Diagnose and fix DNS resolution failures on RHEL by checking resolv.conf, NetworkManager settings, DNS server connectivity, and systemd-resolved configuration.

---

"Could not resolve host" means your system cannot translate hostnames to IP addresses. This blocks package installations, web requests, and most network operations.

## Step 1: Verify the Problem

```bash
# Test DNS resolution
host google.com
dig google.com
nslookup google.com

# Test if IP connectivity works (bypassing DNS)
ping -c 3 8.8.8.8

# If ping works but DNS does not, the issue is DNS-specific
```

## Step 2: Check /etc/resolv.conf

```bash
# View the current DNS configuration
cat /etc/resolv.conf

# You should see at least one nameserver entry:
# nameserver 8.8.8.8

# If the file is empty or has wrong entries, check NetworkManager
nmcli device show | grep DNS
```

## Step 3: Fix DNS via NetworkManager

```bash
# Set DNS servers for your connection
sudo nmcli connection modify ens192 ipv4.dns "8.8.8.8 8.8.4.4"

# Prevent DHCP from overwriting your DNS settings
sudo nmcli connection modify ens192 ipv4.ignore-auto-dns yes

# Apply the changes
sudo nmcli connection up ens192

# Verify resolv.conf was updated
cat /etc/resolv.conf
```

## Step 4: Test DNS Server Connectivity

```bash
# Check if you can reach the DNS server
ping -c 3 8.8.8.8

# Test DNS directly with dig specifying the server
dig @8.8.8.8 google.com

# If this works but normal resolution does not,
# the issue is in /etc/resolv.conf or nsswitch.conf
```

## Step 5: Check /etc/nsswitch.conf

```bash
# Verify the hosts resolution order
grep hosts /etc/nsswitch.conf

# Should look like:
# hosts:      files dns myhostname

# "files" checks /etc/hosts first, then "dns" uses resolv.conf
```

## Step 6: Check for Firewall Blocking DNS

```bash
# DNS uses UDP port 53 (and sometimes TCP 53)
# Check if outbound DNS is blocked
sudo firewall-cmd --list-all

# Allow DNS queries if blocked
sudo firewall-cmd --permanent --add-service=dns
sudo firewall-cmd --reload

# Or test with firewall temporarily disabled
sudo systemctl stop firewalld
dig google.com
sudo systemctl start firewalld
```

## Step 7: Restart Network Services

```bash
# Restart NetworkManager
sudo systemctl restart NetworkManager

# Flush DNS cache (if using systemd-resolved)
sudo resolvectl flush-caches

# Or restart systemd-resolved
sudo systemctl restart systemd-resolved
```

## Quick Fix

```bash
# If you need DNS working immediately, add it manually
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Then fix it properly through NetworkManager
sudo nmcli connection modify ens192 ipv4.dns "8.8.8.8"
sudo nmcli connection up ens192
```

Editing `/etc/resolv.conf` directly is a temporary fix. NetworkManager will overwrite it. Always configure DNS through `nmcli` for persistent changes.
