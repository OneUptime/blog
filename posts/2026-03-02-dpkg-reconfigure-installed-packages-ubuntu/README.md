# How to Reconfigure Installed Packages with dpkg-reconfigure on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, dpkg, Package Management, System Administration, Configuration

Description: Learn how to use dpkg-reconfigure to re-run the post-installation configuration wizard for installed packages on Ubuntu, with practical examples for timezone, locale, and other commonly reconfigured packages.

---

When you install certain packages on Ubuntu, they run an interactive configuration wizard during installation that asks questions about your setup - timezone, locale, mail server type, default editor, and so on. If you made the wrong choice, need to change the configuration, or are scripting an automated setup, `dpkg-reconfigure` lets you re-run that wizard for any already-installed package.

## What dpkg-reconfigure Does

During package installation, Debian-format packages use a configuration system called `debconf` to ask users questions. The answers get stored in a database and the package's `postinst` script uses them to configure itself. `dpkg-reconfigure` re-runs this process for an already-installed package - it re-asks the questions and re-runs the configuration scripts with the new answers.

Not all packages use debconf, so not all packages respond meaningfully to `dpkg-reconfigure`. But for system packages that do, it's a clean way to change configuration without manually editing config files.

## Basic Usage

```bash
# Reconfigure a package interactively
sudo dpkg-reconfigure package-name

# Run with lower priority (shows more questions, not just high-priority ones)
sudo dpkg-reconfigure --priority=low package-name

# Run silently with current/default settings (non-interactive)
sudo dpkg-reconfigure --frontend=noninteractive package-name
```

## Common Packages to Reconfigure

### Timezone

Changing the system timezone is one of the most common uses:

```bash
# Open the interactive timezone selector
sudo dpkg-reconfigure tzdata

# It shows a two-step menu: first select a region, then a city
# The selection updates /etc/localtime and /etc/timezone

# Verify the change
date
cat /etc/timezone
```

Without `dpkg-reconfigure`, you'd need to manually update the symlink and timezone file. With it, you get a friendly menu.

### Locale

For systems set up with the wrong locale, or when adding language support:

```bash
# Reconfigure locale settings
sudo dpkg-reconfigure locales

# Shows a list of available locales to generate
# Then asks which one to set as default

# Verify the result
locale
cat /etc/default/locale
```

### Console Keyboard Layout

For changing the keyboard layout on console (non-GUI):

```bash
sudo dpkg-reconfigure keyboard-configuration

# Or for legacy console configuration
sudo dpkg-reconfigure console-setup
```

### OpenSSH Server

To reconfigure sshd without manually editing files:

```bash
sudo dpkg-reconfigure openssh-server
```

This regenerates host keys if needed and applies configuration choices.

### Postfix Mail Server

Postfix has a fairly involved configuration wizard:

```bash
sudo dpkg-reconfigure postfix

# You'll be asked about:
# - Mail server configuration type (Internet, Satellite, Local only, etc.)
# - System mail name (FQDN)
# - Other destinations to accept mail for
# - Whether to synchronize to other mail servers
# - Local networks
# - Use procmail for local delivery
```

This is much easier than manually editing `main.cf` for the core settings.

### Unattended Upgrades

For enabling or adjusting automatic upgrades:

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### Wireshark / Network Sniffing Tools

Some network tools ask whether non-root users can capture packets:

```bash
sudo dpkg-reconfigure wireshark-common
```

This allows or disallows non-root network capture.

## Non-Interactive Reconfiguration

For automation scripts, use the noninteractive frontend with pre-set answers:

```bash
# Set the timezone without interaction
sudo ln -sf /usr/share/zoneinfo/America/New_York /etc/localtime
sudo tee /etc/timezone <<< "America/New_York"
sudo dpkg-reconfigure --frontend=noninteractive tzdata

# Set locale without interaction
echo "LANG=en_US.UTF-8" | sudo tee /etc/default/locale
sudo dpkg-reconfigure --frontend=noninteractive locales
```

For packages where you want to pre-answer debconf questions before reconfiguring:

```bash
# Pre-seed answers using debconf-set-selections
echo "postfix postfix/main_mailer_type string 'Internet Site'" | \
    sudo debconf-set-selections

echo "postfix postfix/mailname string mail.example.com" | \
    sudo debconf-set-selections

# Now reconfigure with the pre-set answers
sudo dpkg-reconfigure --frontend=noninteractive postfix
```

## Viewing Current debconf Settings

```bash
# Install debconf-utils for these tools
sudo apt install debconf-utils

# Show all current debconf settings for a package
sudo debconf-show package-name

# Show postfix settings as an example
sudo debconf-show postfix

# Output:
#   postfix/main_mailer_type: Internet Site
# * postfix/mailname: mail.example.com
# (starred items have non-default values)
```

## Exporting and Importing debconf Settings

This is useful for cloning configurations across multiple machines:

```bash
# Export all debconf settings to a file
sudo debconf-get-selections > /tmp/debconf-settings.txt

# Export settings for a specific package
sudo debconf-get-selections | grep "^postfix" > /tmp/postfix-settings.txt

# Import settings on another machine
sudo debconf-set-selections < /tmp/debconf-settings.txt

# Then reconfigure to apply them
sudo dpkg-reconfigure --frontend=noninteractive postfix
```

This workflow is excellent for deploying consistent configurations across a fleet of servers.

## Different Frontend Types

The `--frontend` flag changes how questions are presented:

```bash
# Dialog (default) - text-based dialog boxes
sudo dpkg-reconfigure package-name

# Readline - simple text prompts (good for SSH sessions)
sudo dpkg-reconfigure --frontend=readline package-name

# Noninteractive - no questions, uses current/default values
sudo DEBIAN_FRONTEND=noninteractive dpkg-reconfigure package-name

# Editor - opens an editor for complex config
sudo dpkg-reconfigure --frontend=editor package-name
```

The `DEBIAN_FRONTEND=noninteractive` environment variable is also used by `apt install` to suppress prompts:

```bash
# Install without any prompts
sudo DEBIAN_FRONTEND=noninteractive apt install -y package-name
```

## Debugging Reconfiguration Issues

If `dpkg-reconfigure` doesn't seem to change anything:

```bash
# Run with --force to re-ask all questions regardless of cached answers
sudo dpkg-reconfigure --force package-name

# Run with low priority to see all questions (not just high-priority ones)
sudo dpkg-reconfigure --priority=low package-name

# Check debconf's database for the current values
sudo debconf-show package-name

# Clear cached debconf answers and start fresh
echo "package-name" | sudo xargs -I{} debconf-communicate {} <<< "PURGE"
sudo dpkg-reconfigure package-name
```

## When dpkg-reconfigure Isn't the Right Tool

Some package configuration happens entirely through configuration files that dpkg-reconfigure doesn't touch. For example:
- Most web server vhost configurations (nginx sites-available, apache2 sites-available)
- Application-level configuration (/etc/mysql/mysql.conf.d/, etc.)
- Custom service configurations

For these, direct file editing is the appropriate approach.

## Practical Example: Setting Up a Server Quickly

When provisioning a new Ubuntu server:

```bash
#!/bin/bash
# initial-server-config.sh

# Set timezone
echo "America/Chicago" > /etc/timezone
ln -sf /usr/share/zoneinfo/America/Chicago /etc/localtime
dpkg-reconfigure --frontend=noninteractive tzdata

# Set locale
echo "LANG=en_US.UTF-8" > /etc/default/locale
locale-gen en_US.UTF-8
dpkg-reconfigure --frontend=noninteractive locales

# Configure console keyboard (if needed)
dpkg-reconfigure --frontend=noninteractive keyboard-configuration

echo "Basic system configuration complete"
date
locale
```

## Summary

`dpkg-reconfigure` is the right tool when:
- You need to change configuration that was set during initial package installation
- You want to re-run a package's setup wizard
- You're scripting server provisioning and need to configure packages non-interactively

Combine it with `debconf-set-selections` for fully automated, pre-answered configuration and `debconf-get-selections` for exporting and cloning configurations between machines.
