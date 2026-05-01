# How to Enable IPv6 on Linux Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Network Configuration, Sysctl, System Administration

Description: A guide to enabling IPv6 on Linux systems at various levels - kernel parameters, network interfaces, and common troubleshooting steps.

## Checking If IPv6 Is Currently Enabled

```bash
# Check whether IPv6 is disabled by default for new interfaces

sysctl net.ipv6.conf.default.disable_ipv6
# 0 = IPv6 enabled by default for new interfaces
# 1 = IPv6 disabled by default for new interfaces

# Check whether IPv6 is disabled on a specific interface (e.g., eth0)
sysctl net.ipv6.conf.eth0.disable_ipv6
# 0 = IPv6 enabled on eth0
# 1 = IPv6 disabled on eth0

# Check for an IPv6 address (link-local should always be present if enabled)
ip -6 addr show | grep 'inet6'

# If no inet6 entries: IPv6 is disabled or not working

# Check if the IPv6 kernel module is loaded
lsmod | grep ipv6
# ipv6 should be listed (or built into the kernel)
```

## Method 1: Enable IPv6 with sysctl

If IPv6 was disabled via sysctl parameters, re-enable it:

```bash
# Enable IPv6 on all interfaces
sysctl -w net.ipv6.conf.all.disable_ipv6=0

# Enable IPv6 by default for new interfaces
sysctl -w net.ipv6.conf.default.disable_ipv6=0

# Enable on a specific interface (e.g., eth0)
sysctl -w net.ipv6.conf.eth0.disable_ipv6=0

# Make permanent by adding to sysctl.conf
echo 'net.ipv6.conf.all.disable_ipv6=0' >> /etc/sysctl.conf
echo 'net.ipv6.conf.default.disable_ipv6=0' >> /etc/sysctl.conf
sysctl -p
```

## Method 2: Enable IPv6 After Loading the Module

If IPv6 is compiled as a module, load it:

```bash
# Check if IPv6 module is loaded
lsmod | grep '^ipv6'

# Load the IPv6 module
modprobe ipv6

# Make it load at boot
echo 'ipv6' >> /etc/modules-load.d/ipv6.conf

# Verify IPv6 addresses appear (link-local should be generated)
ip -6 addr show
```

## Method 3: Remove Blacklist Entry

Sometimes IPv6 is blacklisted in modprobe configuration:

```bash
# Check for IPv6 blacklist
grep -r 'blacklist ipv6' /etc/modprobe.d/
grep -r 'install ipv6 /bin/true' /etc/modprobe.d/

# Remove the blacklist file if found
# Example: remove /etc/modprobe.d/ipv6.conf
rm /etc/modprobe.d/ipv6.conf

# Or edit the file and remove/comment the blacklist line
sed -i 's/^blacklist ipv6/#blacklist ipv6/' /etc/modprobe.d/disable-ipv6.conf

# Reboot or reload the module
reboot
```

## Method 4: Enable via GRUB (if disabled at kernel level)

If `ipv6.disable=1` was added to GRUB kernel parameters:

```bash
# Check current kernel command line
cat /proc/cmdline | grep ipv6

# If ipv6.disable=1 is present:
# Edit GRUB configuration
# On Debian/Ubuntu
vim /etc/default/grub

# Find the line: GRUB_CMDLINE_LINUX_DEFAULT="..."
# Remove 'ipv6.disable=1' from the line

# Update GRUB
update-grub

# Reboot to apply
reboot
```

## Verifying IPv6 Is Working After Enabling

```bash
# Step 1: Check link-local address is present
ip -6 addr show | grep 'fe80'
# Every enabled interface should have a fe80:: address

# Step 2: Check loopback has IPv6
ip -6 addr show lo | grep '::1'
# Should show: inet6 ::1/128 scope host

# Step 3: Test local IPv6 connectivity
ping -6 ::1
# Should succeed

# Step 4: Check for a default IPv6 route (if on a router-connected network)
ip -6 route show default
# Should show a default route, often learned from Router Advertisements

# Step 5: Test internet IPv6 connectivity
ping -6 2001:4860:4860::8888
curl -6 https://ipv6.google.com
```

## Enabling IPv6 on a Specific Interface

```bash
# If IPv6 is globally enabled but missing on one interface:
ip -6 link set eth1 up

# Check if IPv6 is disabled per-interface
sysctl net.ipv6.conf.eth1.disable_ipv6
# If 1, enable it:
sysctl -w net.ipv6.conf.eth1.disable_ipv6=0

# Trigger SLAAC (if a router is present sending RAs)
# IPv6 should auto-configure after the interface is up
ip -6 addr show eth1
```

## Summary

Enable IPv6 on Linux by setting `net.ipv6.conf.all.disable_ipv6=0` via sysctl, removing blacklist entries in `/etc/modprobe.d/`, and removing `ipv6.disable=1` from GRUB parameters if present. After enabling, verify that link-local addresses appear on interfaces with `ip -6 addr show`, test loopback with `ping -6 ::1`, and confirm internet IPv6 connectivity with `ping -6 2001:4860:4860::8888`.
