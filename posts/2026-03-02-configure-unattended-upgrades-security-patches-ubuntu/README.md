# How to Configure Unattended Upgrades for Security Patches on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, APT, Package Management, System Administration

Description: Learn how to configure Ubuntu's unattended-upgrades to automatically apply security patches, set up email notifications, control reboot behavior, and monitor automatic update activity.

---

Keeping servers patched against security vulnerabilities is a fundamental operational responsibility, but manually running `apt upgrade` on every machine is impractical at scale. Ubuntu ships with `unattended-upgrades`, a tool that applies security updates automatically while leaving you in control of what gets updated, when, and how the system handles situations that require a reboot.

## Installing unattended-upgrades

On most Ubuntu Server installs, `unattended-upgrades` is already installed. Verify and install if needed:

```bash
# Check if it's installed

dpkg -l unattended-upgrades

# Install if missing
sudo apt install unattended-upgrades

# Enable the automatic update infrastructure
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

The `dpkg-reconfigure` command asks whether to enable automatic updates and sets up the necessary APT periodic configuration used by the systemd timers.

## Understanding the Configuration Files

Configuration lives in two locations:

```bash
# The main unattended-upgrades config
/etc/apt/apt.conf.d/50unattended-upgrades

# The apt auto-upgrade frequency config
/etc/apt/apt.conf.d/20auto-upgrades
```

The auto-upgrades file controls when the system checks for and applies updates:

```bash
cat /etc/apt/apt.conf.d/20auto-upgrades
```

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
```

The values represent days. `"1"` means daily, `"0"` disables the function, `"7"` means weekly.

## Configuring What Gets Updated

The main configuration file controls which repositories are allowed to update automatically:

```bash
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

The key section is `Unattended-Upgrade::Allowed-Origins`:

```text
Unattended-Upgrade::Allowed-Origins {
    // Base release pocket, needed when security updates pull new dependencies
    "${distro_id}:${distro_codename}";

    // Apply Ubuntu security updates
    "${distro_id}:${distro_codename}-security";

    // Uncomment to also apply general stable release updates (more aggressive)
    // "${distro_id}:${distro_codename}-updates";

    // ESM Infrastructure updates for Ubuntu Pro subscribers
    // "UbuntuESM:${distro_codename}-infra-security";
    // "UbuntuESMApps:${distro_codename}-apps-security";
};
```

The `${distro_id}` and `${distro_codename}` are expanded at runtime. On Ubuntu 22.04 (Jammy), `${distro_id}` becomes `Ubuntu` and `${distro_codename}` becomes `jammy`.

For a production server, staying with the base release and `-security` pockets is the conservative and recommended approach. Enabling `-updates` means you'll get all bug fixes and improvements, which can occasionally cause unexpected behavior changes.

## Blocking Specific Packages from Auto-Update

Some packages you never want auto-updated - perhaps a database or web server you control manually:

```text
Unattended-Upgrade::Package-Blacklist {
    // Exact package names
    "postgresql-14";
    "nginx";
    "docker-ce";

    // Regex patterns
    "linux-.*";  // Block all kernel updates
};
```

Or the inverse - only allow specific packages to update:

```text
// Only packages matching these patterns will be updated
Unattended-Upgrade::Package-Whitelist {
    "openssl";
    "libssl.*";
    "openssh-.*";
};
```

## Configuring Email Notifications

Set up email alerts for automatic updates:

```text
# Install a mail transfer agent if not present
sudo apt install mailutils postfix

# Configure in 50unattended-upgrades:
Unattended-Upgrade::Mail "admin@example.com";

// Send email only when there's an error (reduces noise)
Unattended-Upgrade::MailReport "only-on-error";

// Or send whenever packages are upgraded or errors occur
Unattended-Upgrade::MailReport "on-change";
```

## Handling Automatic Reboots

Some security patches - particularly kernel updates or glibc updates - require a reboot to take effect. Configure how unattended-upgrades handles this:

```text
// Automatically reboot when required
Unattended-Upgrade::Automatic-Reboot "true";

// Reboot at a specific time to minimize disruption
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

// Only reboot if no users are logged in
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";
```

For production servers, it's common to enable automatic reboots but schedule them for a maintenance window. The `02:00` time means 2 AM in the server's local timezone.

A middle ground is to enable the flag but send notifications so you know a reboot happened:

```text
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "now";
Unattended-Upgrade::Mail "ops-team@example.com";
Unattended-Upgrade::MailReport "on-change";
```

## Checking If a Reboot Is Needed

Whether or not automatic reboots are enabled, you can check if a reboot is pending:

```bash
# File exists when a reboot is required
ls -la /var/run/reboot-required

# See which packages triggered the reboot requirement
cat /var/run/reboot-required.pkgs
```

## Running Unattended-Upgrades Manually

Test your configuration by running the upgrade process manually:

```bash
# Dry run - shows what would be upgraded without doing anything
sudo unattended-upgrade --dry-run

# Verbose dry run with more detail
sudo unattended-upgrade --dry-run -v

# Actually run the upgrade (useful for immediate patching)
sudo unattended-upgrade -v
```

## Monitoring Automatic Update Activity

Check what has been automatically updated:

```bash
# View the unattended-upgrades log
sudo cat /var/log/unattended-upgrades/unattended-upgrades.log

# Watch it in real time
sudo tail -f /var/log/unattended-upgrades/unattended-upgrades.log

# Check the dpkg log for all package changes
sudo tail -100 /var/log/dpkg.log

# Use journalctl
sudo journalctl -u unattended-upgrades --since "7 days ago"
```

The upgrade log shows each package updated, the old and new version, and whether a reboot was required.

## Systemd Timer Configuration

Unattended-upgrades uses systemd timers on modern Ubuntu:

```bash
# Check the timer status
systemctl status apt-daily.timer
systemctl status apt-daily-upgrade.timer

# View when upgrades last ran
systemctl status apt-daily-upgrade.service

# The timers can be listed
systemctl list-timers | grep apt
```

Two timers work together:
- `apt-daily.timer` - Fetches package lists and downloads upgrades
- `apt-daily-upgrade.timer` - Applies the downloaded upgrades

By default, `apt-daily.timer` is scheduled at 6 AM and 6 PM with a randomized delay, while `apt-daily-upgrade.timer` is scheduled at 6 AM with its own randomized delay. Both timers are persistent, so a missed scheduled run can be triggered after the next boot, still subject to the randomized delay.

## Adjusting Timing to Avoid Peak Hours

Customize when upgrades run:

```bash
# Override the upgrade timer
sudo systemctl edit apt-daily-upgrade.timer
```

Add a custom configuration:

```ini
[Timer]
# Clear the default calendar values
OnCalendar=

# Run at 3 AM daily
OnCalendar=*-*-* 03:00:00

# With a 30-minute random delay (prevents mirror hammering)
RandomizedDelaySec=1800
```

```bash
# Reload the timer
sudo systemctl daemon-reload
sudo systemctl restart apt-daily-upgrade.timer
```

## Complete Configuration Example

Here's a production-ready 50unattended-upgrades configuration:

```text
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
};

Unattended-Upgrade::Package-Blacklist {
    "postgresql-*";
    "nginx";
};

Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Mail "sysadmin@example.com";
Unattended-Upgrade::MailReport "on-change";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "false";
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-WithUsers "false";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
Unattended-Upgrade::SyslogEnable "true";
Unattended-Upgrade::SyslogFacility "daemon";
```

## Summary

Unattended-upgrades provides a well-tested, configurable mechanism for keeping Ubuntu systems patched without manual intervention. The default configuration - applying security updates from the `-security` pocket while allowing the base release pocket for required dependencies - is conservative and appropriate for most production systems. Adjust the package blacklist to protect packages you manage manually, configure notifications, and decide on your reboot policy based on your maintenance window constraints. Pair this with monitoring of the upgrade logs to stay aware of what's being changed automatically.
