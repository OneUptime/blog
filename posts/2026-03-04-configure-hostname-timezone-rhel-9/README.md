# How to Configure the System Hostname and Time Zone on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Hostname, Timezone, Linux, System Administration

Description: A detailed guide to setting and managing the system hostname and time zone on RHEL using hostnamectl and timedatectl, including the differences between static and transient hostnames.

---

The hostname and time zone are two of the first things I configure on any new server. They seem simple, but getting them wrong creates confusion that compounds over time. Imagine correlating logs across 50 servers when half of them report times in UTC and the other half in local time. Or trying to SSH into the right box when every hostname is still `localhost.localdomain`. This guide covers how to set these up correctly on RHEL.

## Understanding Hostname Types

RHEL actually maintains three separate hostnames:

| Type | Purpose | Persistence |
|------|---------|-------------|
| **Static** | Stored in `/etc/hostname`, used as the default | Survives reboot |
| **Transient** | Assigned dynamically by the kernel or DHCP | Lost on reboot |
| **Pretty** | Free-form UTF-8 name for display purposes | Survives reboot |

In most cases, you only care about the static hostname. The transient hostname defaults to the static one unless something (like DHCP) overrides it. The pretty hostname is optional and mostly useful for desktops.

```mermaid
flowchart TD
    A[hostnamectl set-hostname] --> B[Static Hostname]
    B --> C[/etc/hostname]
    B --> D[Transient Hostname - defaults to static]
    E[DHCP / cloud-init] --> D
    F[hostnamectl set-hostname --pretty] --> G[Pretty Hostname]
    G --> H[/etc/machine-info]
```

## Checking the Current Hostname

```bash
# Show all hostname information
hostnamectl

# Or just the static hostname
hostnamectl hostname

# Quick check using the hostname command
hostname

# Show the FQDN
hostname -f
```

The `hostnamectl` output includes the static hostname, icon name, chassis type, machine ID, boot ID, operating system info, kernel version, and architecture.

## Setting the Static Hostname

The static hostname should follow DNS naming conventions: lowercase letters, numbers, and hyphens. If you use a fully qualified domain name (FQDN), it should be a valid one.

```bash
# Set the static hostname
sudo hostnamectl set-hostname db01.prod.example.com

# Verify the change
hostnamectl hostname
```

This writes the hostname to `/etc/hostname`:

```bash
# Check the file directly
cat /etc/hostname
```

### Setting Individual Hostname Types

You can set each type independently if you need to:

```bash
# Set only the static hostname
sudo hostnamectl set-hostname db01.prod.example.com --static

# Set only the transient hostname
sudo hostnamectl set-hostname db01-temp --transient

# Set a pretty hostname (can include spaces and special characters)
sudo hostnamectl set-hostname "Production Database Server 01" --pretty
```

## Updating /etc/hosts

After changing the hostname, update `/etc/hosts` so the hostname resolves locally. This matters for services that do reverse DNS lookups on the loopback address.

```bash
# View the current hosts file
cat /etc/hosts
```

Edit `/etc/hosts` to include your new hostname:

```bash
127.0.0.1   localhost localhost.localdomain
::1         localhost localhost.localdomain
127.0.1.1   db01.prod.example.com db01
```

The third line maps the FQDN and short hostname to `127.0.1.1`. Some admins prefer to use the server's actual IP address here instead of a loopback address. Either approach works, but using the actual IP can be more reliable for services that need to determine the server's "real" hostname.

## Hostname Changes and Running Services

Changing the hostname doesn't automatically restart services that cached the old hostname at startup. If you change the hostname on a running system, you may need to restart services like:

```bash
# Services that commonly need a restart after hostname change
sudo systemctl restart rsyslog
sudo systemctl restart postfix    # if installed
```

For a clean hostname change on a production server, the safest approach is:

```bash
# Set the new hostname
sudo hostnamectl set-hostname db01.prod.example.com

# Update /etc/hosts
sudo vim /etc/hosts

# Reboot to ensure all services pick up the new name
sudo systemctl reboot
```

## Preventing DHCP from Overriding the Hostname

If your server gets its IP via DHCP, the DHCP client may overwrite the transient hostname. To prevent this, configure NetworkManager to ignore DHCP hostname offers:

```bash
# Check the current DHCP hostname setting
nmcli connection show "Wired connection 1" | grep dhcp-hostname

# Tell NetworkManager not to set the hostname from DHCP
sudo nmcli connection modify "Wired connection 1" \
  ipv4.dhcp-send-hostname no

# Apply the change
sudo nmcli connection up "Wired connection 1"
```

Or globally, create a NetworkManager configuration drop-in:

```bash
# Create a drop-in config to prevent DHCP hostname changes
sudo tee /etc/NetworkManager/conf.d/no-dhcp-hostname.conf <<'EOF'
[main]
hostname-mode=none
EOF

# Reload NetworkManager
sudo systemctl reload NetworkManager
```

## Configuring the Time Zone

### Checking the Current Time Zone

```bash
# Show full time and date information
timedatectl

# Just the timezone
timedatectl show --property=Timezone --value
```

The `timedatectl` output includes the local time, UTC time, RTC time, time zone, NTP sync status, and whether the RTC is set to UTC.

### Setting the Time Zone

```bash
# List all available time zones
timedatectl list-timezones

# Filter by region
timedatectl list-timezones | grep Europe
timedatectl list-timezones | grep America

# Set the time zone
sudo timedatectl set-timezone America/Chicago

# For servers, UTC is generally the best choice
sudo timedatectl set-timezone UTC
```

Under the hood, this creates a symlink from `/etc/localtime` to the appropriate zone file:

```bash
# Check the symlink
ls -la /etc/localtime
# lrwxrwxrwx 1 root root 25 ... /etc/localtime -> ../usr/share/zoneinfo/UTC
```

### Why UTC for Servers?

I strongly recommend UTC for all servers, for several practical reasons:

- **Log correlation is trivial.** All timestamps are in the same zone regardless of where the server physically sits.
- **No daylight saving time surprises.** UTC doesn't change. You'll never have a "missing" hour in your logs or a cron job that runs twice.
- **It's the standard.** Most monitoring, logging, and observability tools expect UTC timestamps.

If your application needs to display times in a specific timezone, handle the conversion in the application layer, not the OS.

## Setting the Time Manually

In most environments, NTP handles time automatically. But if you need to set the time manually (for example, in an air-gapped environment):

```bash
# Disable NTP sync first
sudo timedatectl set-ntp false

# Set the date and time manually
sudo timedatectl set-time "2026-03-04 14:30:00"

# Or set just the date
sudo timedatectl set-time "2026-03-04"

# Or just the time
sudo timedatectl set-time "14:30:00"
```

Remember to re-enable NTP when you connect to a network:

```bash
# Re-enable NTP synchronization
sudo timedatectl set-ntp true
```

## The Hardware Clock (RTC)

Your server has two clocks: the system clock (managed by the kernel) and the hardware clock (RTC, on the motherboard). They can drift apart over time.

```bash
# Check if the RTC is set to UTC (it should be)
timedatectl | grep "RTC in local TZ"

# Sync the RTC to the current system time
sudo hwclock --systohc

# Check the hardware clock directly
sudo hwclock --show
```

On RHEL, the RTC should be set to UTC. If it shows "RTC in local TZ: yes", fix it:

```bash
# Set the RTC to store UTC (not local time)
sudo timedatectl set-local-rtc 0
```

Setting the RTC to local time causes problems with daylight saving time and can confuse dual-boot setups. Always use UTC for the hardware clock.

## Practical Automation

If you're provisioning servers with a configuration management tool, here's what the hostname and timezone setup looks like as a simple shell script:

```bash
#!/bin/bash
# Quick bootstrap script for hostname and timezone

HOSTNAME="$1"
TIMEZONE="${2:-UTC}"

if [ -z "$HOSTNAME" ]; then
    echo "Usage: $0 <hostname> [timezone]"
    exit 1
fi

# Set hostname
hostnamectl set-hostname "$HOSTNAME"

# Update /etc/hosts
if ! grep -q "$HOSTNAME" /etc/hosts; then
    echo "127.0.1.1   $HOSTNAME ${HOSTNAME%%.*}" >> /etc/hosts
fi

# Set timezone
timedatectl set-timezone "$TIMEZONE"

# Enable NTP
timedatectl set-ntp true

echo "Hostname: $(hostnamectl hostname)"
echo "Timezone: $(timedatectl show --property=Timezone --value)"
echo "NTP active: $(timedatectl show --property=NTPSynchronized --value)"
```

## Wrapping Up

Hostname and timezone configuration on RHEL is handled by two clean tools: `hostnamectl` and `timedatectl`. Set a meaningful hostname, use UTC for servers, enable NTP, and update `/etc/hosts`. These are small steps that pay dividends when you're managing infrastructure at scale. Get them right on every server from day one, and you'll avoid a whole category of annoying problems down the road.
