# How to Upgrade Ubuntu Server Using do-release-upgrade

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Upgrade, do-release-upgrade, Server Administration

Description: A detailed guide to using the do-release-upgrade tool to safely upgrade Ubuntu Server between releases, covering flags, common options, and troubleshooting upgrade failures.

---

`do-release-upgrade` is the official tool for upgrading between Ubuntu releases. It handles the complex orchestration of updating package sources, resolving dependency changes, and managing the upgrade process in a way that minimizes breakage. Understanding how it works and what options it accepts helps you use it confidently and troubleshoot when things go wrong.

## What do-release-upgrade Does

When you run `do-release-upgrade`, it performs these steps in order:

1. Downloads and runs the upgrade manager for your current release
2. Checks upgrade prerequisites (disk space, package integrity)
3. Fetches the release upgrade script for the target version
4. Backs up existing apt sources
5. Updates apt sources to point to the new release
6. Downloads all required packages
7. Performs the upgrade
8. Removes packages no longer supported
9. Prompts for a reboot

The tool is designed to be resumable - if interrupted, running it again will continue from where it left off in most cases.

## Prerequisites

Before running the upgrade tool:

```bash
# Ensure the package is installed and up to date
sudo apt install update-manager-core

# Update all current packages first
sudo apt update && sudo apt dist-upgrade -y

# Check the current release
lsb_release -a
```

## Basic Usage

```bash
# Upgrade to the next LTS release (from an LTS system)
sudo do-release-upgrade

# Run in non-interactive mode (fewer prompts - use carefully)
sudo do-release-upgrade --frontend=DistUpgradeViewNonInteractive
```

## Important Command-Line Options

### -d: Development Release

```bash
# Upgrade to the latest development release (not yet released)
sudo do-release-upgrade -d
```

This flag bypasses the normal release channel restriction and allows upgrading to a release still in development. This is for testing purposes or if you are running a server that tracks non-LTS releases and want to upgrade to a development version.

### -m: Release Type Mode

```bash
# Server upgrade (default on Ubuntu Server)
sudo do-release-upgrade -m server

# Desktop upgrade
sudo do-release-upgrade -m desktop
```

The mode affects which packages are recommended and which defaults are applied during the upgrade.

### --allow-third-party

```bash
# Allow upgrading with third-party PPAs enabled
sudo do-release-upgrade --allow-third-party
```

By default, `do-release-upgrade` disables third-party PPAs before upgrading. This flag leaves them enabled, which can cause conflicts. Generally, it is better to let the tool disable PPAs and re-enable them manually afterwards.

### Running with a Non-Standard SSH Port

If you changed SSH to a non-default port, `do-release-upgrade` opens a second SSH server on port 1022 as a backup in case the main SSH service restarts during the upgrade:

```bash
# The tool will tell you about the backup SSH port
# Check that your firewall allows it temporarily
sudo ufw allow 1022/tcp

# Run the upgrade
sudo do-release-upgrade

# After upgrade completes, remove the rule
sudo ufw delete allow 1022/tcp
```

If your firewall blocks port 1022 and SSH restarts during the upgrade, you will lose your connection. The upgrade may still complete, but you will need console access to reconnect.

## Using Screen or tmux for Long-Running Upgrades

SSH connections can be dropped during the upgrade, which at best is inconvenient and at worst can interrupt the process:

```bash
# Install tmux
sudo apt install tmux

# Start a persistent session
tmux new-session -s upgrade

# Run the upgrade inside the session
sudo do-release-upgrade

# If disconnected, reconnect via SSH and attach:
# tmux attach-session -t upgrade
```

Screen works the same way:

```bash
sudo apt install screen
screen -S upgrade
sudo do-release-upgrade
# Reattach with: screen -r upgrade
```

## Monitoring Download Progress

During the download phase, `do-release-upgrade` shows a progress bar. If you want more verbose output:

```bash
# The tool logs to a temporary directory
# Find the log during the upgrade
cat /tmp/dist-upgrade/apt.log

# Or watch the dpkg log
tail -f /var/log/dpkg.log
```

## Configuration Files During Upgrade

One of the most important decisions during the upgrade is what to do with modified configuration files. The tool presents diffs and asks:

```text
Configuration file '/etc/ssh/sshd_config'
 ==> Modified (by you or by a script) since installation.
 ==> Package distributor has shipped an updated version.
   What would you like to do about it ?  Your options are:
    Y or I  : install the package maintainer's version
    N or O  : keep your currently-installed version
      D     : show the differences between the versions
      Z     : start a shell to examine the situation
```

General guidance:
- **Critical custom configs** (sshd_config, nginx.conf, postgresql.conf): Keep your version (`N`)
- **Unchanged system files**: Accept the new version (`Y`)
- **Always view the diff** (`D`) before deciding - it shows exactly what changed

Configuration files you modified show up in dpkg as "locally modified." After the upgrade, review `/etc/apt/sources.list` and any service configs to ensure they are correct.

## Handling a Stalled or Failed Upgrade

### Resuming After Interruption

If the upgrade was interrupted:

```bash
# Try running again - the tool often recovers
sudo do-release-upgrade

# If apt is in a bad state
sudo dpkg --configure -a
sudo apt --fix-broken install
sudo do-release-upgrade
```

### Fixing Dependency Issues

```bash
# If the upgrade exits with dependency errors
sudo apt -f install
sudo dpkg --configure -a
sudo apt dist-upgrade

# Then try the upgrade tool again
sudo do-release-upgrade
```

### Packages That Cannot Be Upgraded

Sometimes packages are held or have no upgrade path:

```bash
# See what is preventing completion
sudo apt-get -s dist-upgrade 2>&1 | grep -E "held|kept back"

# Manually remove problem packages if they are not critical
sudo apt remove problem-package
sudo do-release-upgrade
```

## Non-Interactive Mode

For scripted environments where you cannot respond to prompts:

```bash
# Fully automated mode - accepts all defaults
sudo do-release-upgrade \
  --frontend=DistUpgradeViewNonInteractive \
  --quiet
```

In non-interactive mode, the tool:
- Keeps existing configuration files (the safer default)
- Does not ask about service restarts
- Automatically proceeds through all prompts

Use this only in environments where you have tested the upgrade process and know what to expect. An automated upgrade that silently fails or produces a misconfigured system can be worse than a failed interactive one.

## Checking Upgrade Availability

Before running the upgrade, check if a new release is available:

```bash
# Check for available upgrades
sudo do-release-upgrade --check-dist-upgrade-only

# Also useful
cat /etc/update-manager/release-upgrades
```

The release-upgrades file controls the upgrade channel:

```text
[DEFAULT]
# Options: never, normal (includes non-LTS), lts (LTS only)
Prompt=lts
```

For servers, `Prompt=lts` means `do-release-upgrade` will only offer LTS releases. Change to `normal` if you want to track non-LTS releases.

## Post-Upgrade Steps

After rebooting into the new release:

```bash
# Verify the upgrade
lsb_release -a

# Clean up the old release files
sudo apt autoremove --purge
sudo apt autoclean

# Check for services that failed to start
systemctl --failed

# Review what the upgrade changed in apt sources
cat /etc/apt/sources.list
ls /etc/apt/sources.list.d/

# Re-enable any PPAs that support the new release
# Check each PPA's documentation for the release codename
```

### Restoring Third-Party Repositories

```bash
# The upgrade tool backed up your sources.list.d files
ls /etc/apt/sources.list.d/*.distUpgrade

# Review and re-enable compatible ones
# Update the codename (e.g., jammy -> noble) in each file
sudo nano /etc/apt/sources.list.d/ppa-name.list
sudo apt update
```

## Upgrade Logs

All upgrade activity is logged:

```bash
# Main upgrade log
cat /var/log/dist-upgrade/main.log

# apt log from the upgrade
cat /var/log/dist-upgrade/apt.log

# dpkg log (all package operations)
grep "$(date +%Y-%m-%d)" /var/log/dpkg.log
```

These logs are invaluable for post-mortems when something breaks after an upgrade. The dpkg log in particular shows exactly which packages were installed, upgraded, or removed and in what order.

The `do-release-upgrade` tool is well-tested and reliable for the scenarios Canonical expects. It becomes less predictable when your system has heavy third-party customization, unusual package selections, or custom-compiled software. In those cases, more manual review of each step is warranted.
