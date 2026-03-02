# How to Remove Unnecessary Software for a Minimal Ubuntu Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Hardening, Package Management, System Administration

Description: Guide to auditing and removing unnecessary packages from Ubuntu to reduce attack surface, minimize patching burden, and achieve a minimal server footprint.

---

Every package installed on a server is a potential attack surface. Vulnerabilities in software you are not using still need to be patched, and if exploited, can give attackers a foothold. A minimal Ubuntu installation - containing only the software needed to run your workloads - is easier to secure, faster to patch, and produces less log noise.

This guide walks through identifying unnecessary packages, safely removing them, and establishing a baseline minimal installation.

## Understanding What You Have

Before removing anything, build a picture of what is installed and why:

```bash
# Count total installed packages
dpkg -l | grep '^ii' | wc -l

# List all installed packages sorted by size (largest first)
dpkg-query -W --showformat='${Installed-Size}\t${Package}\n' | \
  sort -rn | head -50

# List manually installed packages (not pulled in as dependencies)
apt-mark showmanual | sort

# Show packages that were automatically installed as dependencies
apt-mark showauto | sort | wc -l
```

The manually installed list is the most important - these represent deliberate choices. Everything else is a dependency of something on that list.

## Identifying Packages to Remove

### Packages Commonly Not Needed on Servers

Several categories of packages are commonly installed by default but rarely needed on headless servers:

**Desktop and GUI packages:**
```bash
# Check for GUI-related packages on a server
dpkg -l | grep -E 'x11|xorg|gnome|kde|xfce|wayland|display-manager' | grep '^ii'
```

**Bluetooth:**
```bash
# Bluetooth is almost never needed on servers
dpkg -l | grep -i bluetooth | grep '^ii'
```

**Print services:**
```bash
dpkg -l | grep -E 'cups|printer|print' | grep '^ii'
```

**Games:**
```bash
dpkg -l | grep -E 'games|gaming' | grep '^ii'
```

**Old/deprecated services:**
```bash
# Check for services with known security histories
dpkg -l | grep -E 'telnet|rsh|ftp|tftp|talk|rwho|finger|rexec' | grep '^ii'
```

## Removing Packages Safely

Always test removals in a non-production environment first. Use `--simulate` or `-s` to preview what would happen:

```bash
# Simulate removal without actually doing it
sudo apt-get remove --simulate telnet

# Show what additional packages would be removed as orphans
sudo apt-get autoremove --simulate
```

### Removing Individual Packages

```bash
# Remove a package (keeps config files)
sudo apt-get remove <package-name>

# Remove a package and its configuration files
sudo apt-get purge <package-name>

# Remove multiple packages at once
sudo apt-get purge telnet rsh-client ftp nis
```

### The Difference Between remove and purge

```bash
# 'remove' leaves config files (useful if you might reinstall)
sudo apt-get remove apache2

# 'purge' removes config files too (cleaner for decommissioning)
sudo apt-get purge apache2

# Remove orphaned dependencies left after removal
sudo apt-get autoremove --purge
```

## High-Priority Removals for Security

The following packages have elevated security risk and should be removed from servers that do not need them:

### Telnet and Legacy Remote Access

```bash
# Telnet transmits credentials in plaintext
sudo apt-get purge telnet telnetd telnetd-ssl
sudo apt-get purge rsh-client rsh-server
sudo apt-get purge talk talkd
sudo apt-get purge finger fingerd
```

### FTP

```bash
# Plain FTP transmits credentials in cleartext
sudo apt-get purge ftp lftp ftpd

# Check for vsftpd or proftpd if they're installed but not needed
sudo systemctl status vsftpd 2>/dev/null
sudo apt-get purge vsftpd 2>/dev/null
```

### NIS (Network Information Service)

```bash
# NIS is an outdated directory service with known weaknesses
sudo apt-get purge nis
```

### SNMP (if not in use)

```bash
# SNMP can expose system information; remove if not actively monitored via SNMP
sudo apt-get purge snmpd snmp
```

### Xinetd/Inetd

```bash
# These super-servers launch services on demand; rarely needed on modern systems
sudo apt-get purge xinetd inetutils-inetd openbsd-inetd
```

## Disabling Unnecessary Services Without Removing Packages

Sometimes you cannot remove a package (it may be a dependency), but you can disable its service:

```bash
# List all enabled services
systemctl list-unit-files --state=enabled

# Disable a service without removing the package
sudo systemctl stop avahi-daemon
sudo systemctl disable avahi-daemon
sudo systemctl mask avahi-daemon  # 'mask' prevents it from starting even as a dependency

# Services commonly safe to disable on servers:
# avahi-daemon    - mDNS/Bonjour for local network discovery
# bluetooth       - Bluetooth management
# ModemManager    - Mobile broadband modem management
# cups            - Print service

sudo systemctl mask avahi-daemon bluetooth ModemManager cups 2>/dev/null
```

## Removing Compilers

Compilers on production servers let attackers compile exploits locally. Remove them unless you specifically need them:

```bash
# Check what compilers are installed
dpkg -l | grep -E 'gcc|g\+\+|gfortran|clang|llvm|make|cmake' | grep '^ii'

# Remove compilers
sudo apt-get purge gcc g++ make cmake

# If build-essential was installed as a group
sudo apt-get purge build-essential

# Remove autoremovable packages this frees
sudo apt-get autoremove --purge
```

## Removing Package Management Tools

In some high-security environments, removing access to package managers (after initial setup) prevents attackers from easily installing additional tools:

```bash
# This is an advanced/optional step - be certain before doing it
# Restrict access to apt/dpkg by changing ownership
# (Do this only if you have another mechanism to update the system)

# Alternative: use apt-listchanges and unattended-upgrades for automated patching
# instead of removing the tools
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## Using deborphan to Find Orphaned Libraries

```bash
# Install deborphan to find unused library packages
sudo apt-get install deborphan

# Show orphaned libraries (libraries with no reverse dependencies)
deborphan

# Remove all orphaned libraries
sudo apt-get purge $(deborphan)

# Run multiple times until deborphan returns nothing
```

## Checking for Packages Installed Outside apt

Some software installs itself without going through apt:

```bash
# Check for binaries in unexpected locations
find /usr/local/bin /usr/local/sbin -type f -executable 2>/dev/null

# Check for services registered outside systemd
ls /etc/init.d/

# Check for cron jobs that install or run additional software
cat /etc/crontab
ls /etc/cron.d/
for user in $(cut -f1 -d: /etc/passwd); do
    crontab -u "$user" -l 2>/dev/null
done
```

## Maintaining a Minimal Package List

Document the packages that should be installed for your server role:

```bash
# Export the current list of manually installed packages
apt-mark showmanual > /etc/server-required-packages.txt

# This becomes your baseline. Any package not on this list
# that shows up manually installed is worth investigating.

# Script to check for unauthorized packages
diff <(apt-mark showmanual | sort) <(sort /etc/server-required-packages.txt)
```

## Post-Removal Verification

After removing packages, verify the system still works:

```bash
# Check that no services are broken
systemctl --failed

# Verify key services are still running
sudo systemctl status ssh
sudo systemctl status networking

# Check the system log for errors
sudo journalctl -p err -b

# Run a full apt check
sudo apt-get check

# Verify no broken dependencies
sudo dpkg --audit
```

## Automating Minimal Installation

For new servers, use a preseed file or cloud-init to start with a minimal base:

```yaml
# cloud-init user-data for minimal Ubuntu server
#cloud-config
packages_upgrade: true
packages:
  - ufw
  - unattended-upgrades
  - auditd
  - fail2ban

package_reconfig:
  - unattended-upgrades

# Remove packages not needed on this server role
runcmd:
  - apt-get purge -y telnet rsh-client nis avahi-daemon cups -y
  - apt-get autoremove --purge -y
  - systemctl mask bluetooth avahi-daemon
```

Regular audits of installed packages - even just quarterly - catch software that accumulated over time and is no longer needed. Each package removed is one fewer thing to patch, monitor, and worry about.
