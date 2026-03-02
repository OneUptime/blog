# How to Disable IPv6 on Ubuntu When Not Needed

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, IPv6, Hardening, System Administration

Description: Step-by-step guide to disabling IPv6 on Ubuntu systems where it is not needed, covering kernel parameters, Netplan, GRUB, and verifying the change is persistent.

---

IPv6 is enabled by default on Ubuntu and will remain so for good reason - the internet is gradually migrating to it. However, on isolated backend servers, internal infrastructure, or environments where IPv6 is not routed, having it enabled adds unnecessary attack surface and can cause confusing network behavior: applications that prefer IPv6 may attempt connections that silently fail, DNS lookups may return AAAA records that are unreachable, and some security tools need explicit configuration to monitor both protocol stacks.

Disabling IPv6 when it genuinely is not used simplifies the network stack and eliminates one class of potential issues.

## Before Disabling IPv6

Check whether your system is actually using IPv6:

```bash
# View current IPv6 addresses
ip -6 addr show

# Check for active IPv6 routes
ip -6 route show

# Look for IPv6 connections
ss -6 -tuln

# Check if any services are listening on IPv6 addresses (shown as :::port)
ss -tuln | grep ':::'
```

If you have no IPv6 addresses other than link-local (fe80::) and no services are using it, it is safe to disable. If you have a global IPv6 address (2xxx:: or fc00::) that is in use, disabling will affect connectivity.

## Method 1: sysctl (Temporary, for Testing)

Before making permanent changes, test the effect by disabling IPv6 at runtime:

```bash
# Disable IPv6 on all interfaces
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1

# Disable IPv6 on new interfaces by default
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1

# Disable on the loopback interface
sudo sysctl -w net.ipv6.conf.lo.disable_ipv6=1

# Verify the change
ip -6 addr show
# Should show no IPv6 addresses (lo may still show ::1 briefly)

# Also check
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Should output: 1
```

To restore IPv6:

```bash
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.lo.disable_ipv6=0
```

## Method 2: sysctl.conf (Persistent)

Make the change persistent by writing to the sysctl configuration:

```bash
# Create a dedicated configuration file for clarity
sudo tee /etc/sysctl.d/99-disable-ipv6.conf <<EOF
# Disable IPv6 - not used in this environment
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
net.ipv6.conf.lo.disable_ipv6 = 1
EOF

# Apply immediately without rebooting
sudo sysctl --system

# Verify
sysctl net.ipv6.conf.all.disable_ipv6
```

This method is the recommended approach for most cases. The change persists across reboots, applies to all network interfaces, and is easy to revert by removing the file.

## Method 3: GRUB Kernel Parameters

An alternative is to pass a kernel boot parameter. This affects IPv6 at the kernel level, preventing it from loading at all:

```bash
sudo nano /etc/default/grub
```

Find the `GRUB_CMDLINE_LINUX_DEFAULT` line and add `ipv6.disable=1`:

```
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash ipv6.disable=1"
```

Update GRUB:

```bash
sudo update-grub

# The change takes effect on next boot
sudo reboot
```

After rebooting, verify:

```bash
# Should show ipv6.disable=1 in the kernel command line
cat /proc/cmdline

# IPv6 addresses should be absent
ip -6 addr show
```

This method is more thorough but also harder to reverse because it requires editing GRUB and rebooting.

## Configuring Netplan After Disabling IPv6

If you use Netplan for network configuration, explicitly disabling IPv6 there prevents it from being configured even if the kernel later has it re-enabled:

```bash
# View your current Netplan configuration
cat /etc/netplan/00-installer-config.yaml
```

Edit the network configuration:

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: false          # Disable DHCPv6
      accept-ra: false       # Do not accept Router Advertisements
      link-local:
        - ipv4              # Only configure link-local for IPv4, not IPv6
```

Apply the Netplan configuration:

```bash
sudo netplan apply
```

## Disabling IPv6 for Specific Interfaces Only

If you want to keep IPv6 on external interfaces but disable it on internal/management interfaces:

```bash
# Disable only on a specific interface (eth1)
sudo tee /etc/sysctl.d/99-disable-ipv6-eth1.conf <<EOF
net.ipv6.conf.eth1.disable_ipv6 = 1
EOF

sudo sysctl --system
```

## Post-Disable Cleanup

After disabling IPv6, some services need updating to remove IPv6 listeners:

### SSH

Check if SSH has IPv6 addresses:

```bash
ss -tuln | grep sshd | grep ':::'
```

If you want to restrict SSH to IPv4 explicitly:

```bash
# /etc/ssh/sshd_config
AddressFamily inet   # inet = IPv4 only, inet6 = IPv6 only, any = both
```

```bash
sudo systemctl reload sshd
```

### /etc/hosts

Clean up IPv6 localhost entry if desired:

```bash
# View current entries
grep '::1' /etc/hosts

# The ::1 localhost entry is harmless with IPv6 disabled
# but can be commented out for cleanliness
sudo sed -i 's/^::1/#::1/' /etc/hosts
```

### Application Configuration

Check if any applications are configured to listen on `[::]` (all IPv6 interfaces):

```bash
# Find services listening on IPv6
ss -tuln | grep ':::'

# Check Nginx/Apache configuration for IPv6 listeners
grep -r 'listen.*:80\|listen.*\[::\]' /etc/nginx/ /etc/apache2/ 2>/dev/null
```

## Verifying IPv6 is Fully Disabled

A thorough verification:

```bash
# No IPv6 addresses on any interface (except possibly fe80 addresses briefly)
ip -6 addr show

# No IPv6 routes
ip -6 route show

# No IPv6 services listening
ss -6 -tuln

# sysctl values confirm disabled
sysctl -a 2>/dev/null | grep disable_ipv6

# Test that IPv6 DNS resolution fails gracefully
dig AAAA google.com  # Should still work but your machine won't use AAAA results
ping6 ::1            # Should fail
```

## Reverting the Change

To re-enable IPv6 if needed:

```bash
# Remove the sysctl file
sudo rm /etc/sysctl.d/99-disable-ipv6.conf

# Apply the change
sudo sysctl --system

# IPv6 addresses will be configured at next network restart or reboot
sudo netplan apply  # or: sudo systemctl restart networking
```

If GRUB was modified, revert the kernel parameter and run `sudo update-grub` before rebooting.

## When Not to Disable IPv6

There are cases where disabling IPv6 causes more problems than it solves:

- Systems that are directly internet-facing where IPv6 routing is in use
- Dual-stack environments where applications rely on IPv6 DNS names
- Systems running Kubernetes - Kubernetes has its own IPv6 dual-stack handling that should be configured correctly rather than disabled at the OS level
- Environments where the application deployment team may not know the OS has IPv6 disabled, causing confusing application failures

When in doubt, prefer to configure IPv6 properly (block external IPv6 at the firewall, configure correct AAAA records) rather than disabling it entirely at the kernel level.
