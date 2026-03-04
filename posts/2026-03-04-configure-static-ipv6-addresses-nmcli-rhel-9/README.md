# How to Configure Static IPv6 Addresses with nmcli on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IPv6, nmcli, Networking, Linux

Description: A hands-on guide to assigning static IPv6 addresses to network interfaces on RHEL 9 using nmcli, covering address configuration, gateway setup, DNS settings, and verification.

---

If your infrastructure is moving toward IPv6 (and honestly, it should be), knowing how to set static addresses from the command line is one of those skills you'll use constantly. NetworkManager's nmcli tool makes this straightforward on RHEL 9, and once you get the hang of it, you'll prefer it over editing config files by hand.

## Prerequisites

Before you start, make sure you have:

- A RHEL 9 system with root or sudo access
- NetworkManager running (it is by default on RHEL 9)
- An IPv6 address block assigned to your network
- Basic familiarity with IPv6 notation

## Understanding IPv6 Address Format

IPv6 addresses are 128 bits long, written as eight groups of four hexadecimal digits separated by colons. For example: `2001:db8:1::10/64`. The `/64` is the prefix length, which is the most common subnet size you'll work with.

## Checking Your Current Configuration

First, take a look at what you're working with. List your connections and check the current IPv6 settings.

```bash
# List all NetworkManager connections
nmcli connection show

# Show IPv6 details for a specific connection
nmcli connection show "ens192" | grep ipv6
```

You should see output showing the current IPv6 method, which is likely set to `auto` (SLAAC) by default.

## Setting a Static IPv6 Address

Here is the core of it. You need to change the IPv6 method from `auto` to `manual` and then assign your address.

```bash
# Switch IPv6 method to manual (static)
sudo nmcli connection modify "ens192" ipv6.method manual

# Assign the static IPv6 address with prefix length
sudo nmcli connection modify "ens192" ipv6.addresses "2001:db8:1::10/64"

# Set the default gateway
sudo nmcli connection modify "ens192" ipv6.gateway "2001:db8:1::1"

# Configure DNS servers
sudo nmcli connection modify "ens192" ipv6.dns "2001:4860:4860::8888,2001:4860:4860::8844"
```

## Adding Multiple IPv6 Addresses

You can stack multiple IPv6 addresses on the same interface. This is common when you need an address for different services.

```bash
# Add a second IPv6 address (use + to append instead of replace)
sudo nmcli connection modify "ens192" +ipv6.addresses "2001:db8:1::20/64"

# Add a third address for a specific service
sudo nmcli connection modify "ens192" +ipv6.addresses "2001:db8:1::30/64"
```

The `+` prefix is important here. Without it, you'd overwrite the existing addresses instead of adding to them.

## Applying the Changes

Changes don't take effect until you bring the connection back up.

```bash
# Reactivate the connection to apply changes
sudo nmcli connection up "ens192"
```

## Verifying the Configuration

Always verify after making changes. Don't just assume it worked.

```bash
# Check the IPv6 addresses on the interface
ip -6 addr show dev ens192

# Verify the routing table includes your gateway
ip -6 route show

# Test connectivity to the gateway
ping6 -c 4 2001:db8:1::1

# Test external connectivity
ping6 -c 4 2600::
```

## Understanding the Generated Configuration File

Behind the scenes, nmcli writes to a keyfile in `/etc/NetworkManager/system-connections/`. You can inspect it to confirm.

```bash
# View the generated connection file
sudo cat /etc/NetworkManager/system-connections/ens192.nmconnection
```

The relevant section will look something like this:

```ini
[ipv6]
method=manual
address1=2001:db8:1::10/64,2001:db8:1::1
dns=2001:4860:4860::8888;2001:4860:4860::8844;
```

## Configuring IPv6 with a Link-Local Address Only

Sometimes you need an interface with just a link-local address and nothing else. This is useful for management interfaces.

```bash
# Set the method to link-local only
sudo nmcli connection modify "ens224" ipv6.method link-local

# Apply the change
sudo nmcli connection up "ens224"
```

## Setting IPv6 Privacy Extensions

If you want privacy extensions (temporary addresses) on top of your static config, you can configure that too.

```bash
# Enable IPv6 privacy extensions
sudo nmcli connection modify "ens192" ipv6.ip6-privacy 2

# Value 0 = disabled, 1 = prefer public, 2 = prefer temporary
```

## Troubleshooting Common Issues

**Address not appearing after connection up:**

```bash
# Check NetworkManager logs for errors
journalctl -u NetworkManager --since "5 minutes ago" | grep ipv6
```

**Duplicate Address Detection (DAD) failures:**

```bash
# Check for DAD failures
ip -6 addr show dev ens192 | grep tentative

# If the address shows as tentative, someone else may be using it
# You can also check the kernel log
dmesg | grep -i "duplicate"
```

**Gateway unreachable:**

```bash
# Verify the gateway is in the same subnet as your address
ip -6 route show dev ens192

# Check if the interface is actually up
nmcli device status
```

## Quick Reference: Common nmcli IPv6 Commands

Here is a summary table of the commands you will use most often:

| Task | Command |
|------|---------|
| Set static IPv6 | `nmcli con mod "conn" ipv6.method manual ipv6.addresses "addr/prefix"` |
| Set gateway | `nmcli con mod "conn" ipv6.gateway "gw-addr"` |
| Set DNS | `nmcli con mod "conn" ipv6.dns "dns-addr"` |
| Add address | `nmcli con mod "conn" +ipv6.addresses "addr/prefix"` |
| Remove address | `nmcli con mod "conn" -ipv6.addresses "addr/prefix"` |
| Apply changes | `nmcli con up "conn"` |

## Persisting Across Reboots

One of the nice things about using nmcli is that all changes are persistent by default. The configuration is written to disk immediately when you run `nmcli connection modify`. You don't need to do anything extra to make it survive a reboot.

To confirm persistence, simply reboot and check:

```bash
# After reboot, verify your address is still there
ip -6 addr show dev ens192
```

## Wrapping Up

Static IPv6 configuration with nmcli on RHEL 9 is clean and predictable. The workflow is always the same: modify the connection, bring it up, verify. Once you've done it a few times, it becomes second nature. The key things to remember are using `manual` for the method, always specifying the prefix length with your address, and using the `+` prefix when you need to add addresses without replacing existing ones.
