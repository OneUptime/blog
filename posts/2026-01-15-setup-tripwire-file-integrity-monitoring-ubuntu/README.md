# How to Set Up Tripwire for File Integrity Monitoring on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Tripwire, File Integrity, Security, FIM, Tutorial

Description: Complete guide to setting up Tripwire file integrity monitoring on Ubuntu for security compliance.

---

File integrity monitoring (FIM) is a critical security practice that helps detect unauthorized changes to system files, configuration files, and other important data. Tripwire is one of the most established and trusted open-source tools for implementing FIM on Linux systems. This comprehensive guide walks you through setting up Tripwire on Ubuntu to protect your server from unauthorized modifications.

## Table of Contents

1. [Understanding File Integrity Monitoring](#understanding-file-integrity-monitoring)
2. [Installing Tripwire](#installing-tripwire)
3. [Initial Configuration](#initial-configuration)
4. [Creating the Policy File](#creating-the-policy-file)
5. [Initializing the Database](#initializing-the-database)
6. [Running Integrity Checks](#running-integrity-checks)
7. [Updating the Policy](#updating-the-policy)
8. [Updating the Database After Changes](#updating-the-database-after-changes)
9. [Email Notifications](#email-notifications)
10. [Automated Scanning with Cron](#automated-scanning-with-cron)
11. [Report Analysis](#report-analysis)
12. [Custom Rules](#custom-rules)
13. [Troubleshooting](#troubleshooting)

## Understanding File Integrity Monitoring

File Integrity Monitoring (FIM) is a security technique that validates the integrity of operating system and application files by comparing their current state against a known, trusted baseline. When changes are detected, FIM systems generate alerts, allowing security teams to investigate potential security incidents.

### Why File Integrity Monitoring Matters

- **Detect Unauthorized Changes**: Identify when attackers modify system files, install rootkits, or tamper with configurations
- **Compliance Requirements**: Meet regulatory standards like PCI-DSS, HIPAA, SOX, and NIST that mandate FIM
- **Change Management**: Track legitimate changes and ensure they align with change control policies
- **Forensic Analysis**: Provide detailed audit trails for security investigations
- **Early Threat Detection**: Catch malware and intrusions before they cause significant damage

### How Tripwire Works

Tripwire operates by:

1. **Creating a Baseline**: Generating cryptographic hashes of files and storing them in a secure database
2. **Regular Scanning**: Periodically comparing current file states against the baseline
3. **Reporting Changes**: Alerting administrators when modifications, additions, or deletions are detected
4. **Policy-Based Monitoring**: Using configurable rules to determine which files to monitor and what attributes to track

## Installing Tripwire

Before installing Tripwire, update your system packages to ensure you have the latest security patches.

```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y

# Install Tripwire
sudo apt install tripwire -y
```

During installation, you will be prompted to configure Tripwire. Answer the prompts as follows:

```
# Configuration prompts during installation:

# 1. "Create site key during installation?"
#    Select: Yes
#    This creates the site-wide encryption key used to protect configuration files

# 2. "Create local key during installation?"
#    Select: Yes
#    This creates the local encryption key used to protect the database

# 3. "Rebuild Tripwire configuration file?"
#    Select: Yes
#    This generates the initial configuration

# 4. "Rebuild Tripwire policy file?"
#    Select: Yes
#    This creates the initial policy
```

You will be prompted to create two passphrases:

- **Site Passphrase**: Protects the policy and configuration files (use a strong, unique passphrase)
- **Local Passphrase**: Protects the Tripwire database (use a different strong passphrase)

**Important**: Store these passphrases securely. You will need them for any policy or database updates.

## Initial Configuration

Tripwire's main configuration file is `/etc/tripwire/twcfg.txt`. Let's examine and customize it.

```bash
# View the current configuration
sudo cat /etc/tripwire/twcfg.txt
```

Here is a well-commented configuration file example:

```conf
# /etc/tripwire/twcfg.txt
# Tripwire Configuration File
# This file defines paths and settings for Tripwire operation

ROOT          =/usr/sbin
# ROOT: Base directory for Tripwire executables
# Default location where tripwire binaries are installed

POLFILE       =/etc/tripwire/tw.pol
# POLFILE: Path to the compiled policy file
# This encrypted file defines what files to monitor

DBFILE        =/var/lib/tripwire/$(HOSTNAME).twd
# DBFILE: Path to the Tripwire database
# Contains baseline hashes of monitored files
# $(HOSTNAME) is replaced with your server's hostname

REPORTFILE    =/var/lib/tripwire/report/$(HOSTNAME)-$(DATE).twr
# REPORTFILE: Path for integrity check reports
# $(DATE) creates timestamped reports for historical tracking

SITEKEYFILE   =/etc/tripwire/site.key
# SITEKEYFILE: Path to the site-wide encryption key
# Used to sign policy and configuration files

LOCALKEYFILE  =/etc/tripwire/$(HOSTNAME)-local.key
# LOCALKEYFILE: Path to the local encryption key
# Used to sign the database file

EDITOR        =/usr/bin/vim
# EDITOR: Default text editor for interactive mode
# Change to your preferred editor (nano, vi, etc.)

LATEPROMPTING =false
# LATEPROMPTING: When true, delays passphrase prompts
# Set to false for immediate prompting (more secure)

LOOSEDIRECTORYCHECKING =false
# LOOSEDIRECTORYCHECKING: When true, ignores directory changes
# Set to false for strict monitoring (recommended)

MAILNOVIOLATIONS =true
# MAILNOVIOLATIONS: Send email even when no violations found
# Useful for confirming that scans are running

EMAILREPORTLEVEL =3
# EMAILREPORTLEVEL: Detail level in email reports (0-4)
# 0 = single line, 4 = full details
# Level 3 provides good balance of detail and readability

REPORTLEVEL   =3
# REPORTLEVEL: Detail level in console/file reports (0-4)
# Matches EMAILREPORTLEVEL for consistency

MAILMETHOD    =SENDMAIL
# MAILMETHOD: How to send email notifications
# Options: SENDMAIL or SMTP

SYSLOGREPORTING =true
# SYSLOGREPORTING: Log events to syslog
# Enables integration with centralized logging

MAILPROGRAM   =/usr/sbin/sendmail -oi -t
# MAILPROGRAM: Path to mail transfer agent
# Used when MAILMETHOD=SENDMAIL
```

After modifying the configuration, you need to regenerate the encrypted configuration file:

```bash
# Create the encrypted configuration file
sudo twadmin --create-cfgfile --cfgfile /etc/tripwire/tw.cfg \
    --site-keyfile /etc/tripwire/site.key /etc/tripwire/twcfg.txt

# You will be prompted for the site passphrase
```

## Creating the Policy File

The policy file defines which files and directories Tripwire monitors and what changes to report. The default policy at `/etc/tripwire/twpol.txt` is comprehensive but often needs customization for your specific environment.

### Understanding Policy Syntax

```conf
# Policy File Structure and Syntax Guide
# ======================================

# Property Masks - Define which file attributes to monitor
# --------------------------------------------------------
# p = permissions (read, write, execute)
# i = inode number
# n = number of hard links
# u = user ID (owner)
# g = group ID
# t = file type
# s = file size
# d = device ID of disk containing file
# b = number of blocks allocated
# m = modification timestamp
# a = access timestamp
# c = inode creation/change timestamp
# C = CRC-32 hash
# H = Haval hash
# M = MD5 hash
# S = SHA hash

# Predefined Variables (Property Mask Combinations)
# -------------------------------------------------
# SEC_CRIT      = $(IgnoreNone)-SHa     # Critical files - monitor everything
# SEC_SUID      = $(IgnoreNone)-SHa     # SUID/SGID files
# SEC_BIN       = $(ReadOnly)           # Binary executables
# SEC_CONFIG    = $(Dynamic)            # Configuration files
# SEC_LOG       = $(Growing)            # Log files (size grows)
# SEC_INVARIANT = +tpug                 # Static attributes only

# IgnoreNone = +pinugtsdrbamcCMSH       # Track all properties
# IgnoreAll  = -pinugtsdrbamcCMSH       # Ignore all properties
# ReadOnly   = +pinugtsdbmCM-rlacSH     # Read-only files
# Dynamic    = +pinugtd-srlbamcCMSH     # Files that change often
# Growing    = +pinugtdl-srbamcCMSH     # Files that only grow

# Rule Syntax
# -----------
# (rulename = "Description", severity = level)
# {
#     /path/to/file -> $(property_mask);
#     /path/to/directory -> $(property_mask) (recurse = true);
# }

# Severity Levels: 0 (low) to 1000000 (critical)
# Higher severity = more important alerts
```

### Creating a Custom Policy File

Here is a comprehensive custom policy file optimized for Ubuntu servers:

```conf
# /etc/tripwire/twpol.txt
# Custom Tripwire Policy for Ubuntu Server
# ========================================

# Global Variable Definitions
# ---------------------------

# Define hostname variable for portable policies
@@section GLOBAL
TWROOT=/usr/sbin;
TWBIN=/usr/sbin;
TWPOL=/etc/tripwire;
TWDB=/var/lib/tripwire;
TWSKEY=/etc/tripwire;
TWLKEY=/etc/tripwire;
TWREPORT=/var/lib/tripwire/report;
HOSTNAME=;

@@section FS
SEC_CRIT      = $(IgnoreNone)-SHa ;  # Critical system files
SEC_SUID      = $(IgnoreNone)-SHa ;  # SUID/SGID executables
SEC_BIN       = $(ReadOnly) ;         # Binary files
SEC_CONFIG    = $(Dynamic) ;          # Configuration files
SEC_LOG       = $(Growing) ;          # Log files
SEC_INVARIANT = +tpug ;               # Immutable attributes
SIG_LOW       = 33 ;                  # Low severity
SIG_MED       = 66 ;                  # Medium severity
SIG_HI        = 100 ;                 # High severity

# ============================================
# Critical System Boot Files
# ============================================
# These files are essential for system boot
# Any unauthorized changes could prevent boot
# or indicate rootkit installation

(
  rulename = "Critical Boot Files",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /boot                    -> $(SEC_CRIT) (recurse = true) ;
  /boot/grub               -> $(SEC_CRIT) (recurse = true) ;
  /boot/grub/grub.cfg      -> $(SEC_CRIT) ;
  /vmlinuz                 -> $(SEC_CRIT) ;
  /initrd.img              -> $(SEC_CRIT) ;
}

# ============================================
# System Binary Directories
# ============================================
# Core system executables that should rarely change
# Modifications may indicate malware or rootkits

(
  rulename = "System Binaries",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /bin                     -> $(SEC_BIN) (recurse = true) ;
  /sbin                    -> $(SEC_BIN) (recurse = true) ;
  /usr/bin                 -> $(SEC_BIN) (recurse = true) ;
  /usr/sbin                -> $(SEC_BIN) (recurse = true) ;
  /usr/local/bin           -> $(SEC_BIN) (recurse = true) ;
  /usr/local/sbin          -> $(SEC_BIN) (recurse = true) ;
}

# ============================================
# System Libraries
# ============================================
# Shared libraries used by system programs
# Unauthorized changes could compromise all programs

(
  rulename = "System Libraries",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /lib                     -> $(SEC_BIN) (recurse = true) ;
  /lib64                   -> $(SEC_BIN) (recurse = true) ;
  /usr/lib                 -> $(SEC_BIN) (recurse = true) ;
  /usr/lib64               -> $(SEC_BIN) (recurse = true) ;
}

# ============================================
# Critical Configuration Files
# ============================================
# System configuration that controls behavior
# Monitor for unauthorized privilege escalation

(
  rulename = "Critical Configuration",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /etc/passwd              -> $(SEC_CONFIG) ;
  /etc/shadow              -> $(SEC_CONFIG) ;
  /etc/group               -> $(SEC_CONFIG) ;
  /etc/gshadow             -> $(SEC_CONFIG) ;
  /etc/sudoers             -> $(SEC_CONFIG) ;
  /etc/sudoers.d           -> $(SEC_CONFIG) (recurse = true) ;
  /etc/login.defs          -> $(SEC_CONFIG) ;
  /etc/securetty           -> $(SEC_CONFIG) ;
  /etc/security            -> $(SEC_CONFIG) (recurse = true) ;
}

# ============================================
# SSH Configuration
# ============================================
# SSH is a primary attack vector
# Monitor for backdoor configurations

(
  rulename = "SSH Configuration",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /etc/ssh                 -> $(SEC_CONFIG) (recurse = true) ;
  /root/.ssh               -> $(SEC_CONFIG) (recurse = true) ;
}

# ============================================
# PAM Configuration
# ============================================
# Pluggable Authentication Modules
# Controls system authentication

(
  rulename = "PAM Configuration",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /etc/pam.d               -> $(SEC_CONFIG) (recurse = true) ;
  /etc/pam.conf            -> $(SEC_CONFIG) ;
}

# ============================================
# Network Configuration
# ============================================
# Network settings that could be exploited
# for man-in-the-middle attacks

(
  rulename = "Network Configuration",
  severity = $(SIG_MED),
  emailto = root@localhost
)
{
  /etc/hosts               -> $(SEC_CONFIG) ;
  /etc/hosts.allow         -> $(SEC_CONFIG) ;
  /etc/hosts.deny          -> $(SEC_CONFIG) ;
  /etc/hostname            -> $(SEC_CONFIG) ;
  /etc/network             -> $(SEC_CONFIG) (recurse = true) ;
  /etc/netplan             -> $(SEC_CONFIG) (recurse = true) ;
  /etc/resolv.conf         -> $(SEC_CONFIG) ;
  /etc/nsswitch.conf       -> $(SEC_CONFIG) ;
}

# ============================================
# Firewall Configuration
# ============================================
# Firewall rules protect network access
# Changes could expose services

(
  rulename = "Firewall Configuration",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /etc/iptables            -> $(SEC_CONFIG) (recurse = true) ;
  /etc/ufw                 -> $(SEC_CONFIG) (recurse = true) ;
  /etc/nftables.conf       -> $(SEC_CONFIG) ;
}

# ============================================
# Cron and Scheduled Tasks
# ============================================
# Scheduled tasks are common persistence mechanisms
# for attackers

(
  rulename = "Cron Configuration",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /etc/crontab             -> $(SEC_CONFIG) ;
  /etc/cron.d              -> $(SEC_CONFIG) (recurse = true) ;
  /etc/cron.daily          -> $(SEC_CONFIG) (recurse = true) ;
  /etc/cron.hourly         -> $(SEC_CONFIG) (recurse = true) ;
  /etc/cron.weekly         -> $(SEC_CONFIG) (recurse = true) ;
  /etc/cron.monthly        -> $(SEC_CONFIG) (recurse = true) ;
  /var/spool/cron          -> $(SEC_CONFIG) (recurse = true) ;
}

# ============================================
# Systemd Configuration
# ============================================
# System service definitions
# Monitor for malicious services

(
  rulename = "Systemd Configuration",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /etc/systemd             -> $(SEC_CONFIG) (recurse = true) ;
  /lib/systemd             -> $(SEC_BIN) (recurse = true) ;
  /usr/lib/systemd         -> $(SEC_BIN) (recurse = true) ;
}

# ============================================
# Kernel Modules
# ============================================
# Loadable kernel modules could be rootkits
# Critical to monitor for changes

(
  rulename = "Kernel Modules",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /etc/modules             -> $(SEC_CONFIG) ;
  /etc/modules-load.d      -> $(SEC_CONFIG) (recurse = true) ;
  /etc/modprobe.d          -> $(SEC_CONFIG) (recurse = true) ;
  /lib/modules             -> $(SEC_BIN) (recurse = true) ;
}

# ============================================
# SUID/SGID Files
# ============================================
# Files with elevated privileges
# Prime targets for exploitation

(
  rulename = "SUID SGID Files",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /usr/bin/sudo            -> $(SEC_SUID) ;
  /usr/bin/su              -> $(SEC_SUID) ;
  /usr/bin/passwd          -> $(SEC_SUID) ;
  /usr/bin/chsh            -> $(SEC_SUID) ;
  /usr/bin/chfn            -> $(SEC_SUID) ;
  /usr/bin/newgrp          -> $(SEC_SUID) ;
  /usr/bin/gpasswd         -> $(SEC_SUID) ;
  /bin/mount               -> $(SEC_SUID) ;
  /bin/umount              -> $(SEC_SUID) ;
  /bin/ping                -> $(SEC_SUID) ;
}

# ============================================
# Web Server Configuration (if applicable)
# ============================================
# Common web server config directories
# Uncomment if running Apache or Nginx

(
  rulename = "Web Server Configuration",
  severity = $(SIG_MED),
  emailto = root@localhost
)
{
  # Apache configuration
  !/etc/apache2            -> $(SEC_CONFIG) (recurse = true) ;

  # Nginx configuration
  !/etc/nginx              -> $(SEC_CONFIG) (recurse = true) ;
}

# ============================================
# Application Configuration
# ============================================
# General application configurations
# Medium severity as these change more often

(
  rulename = "Application Configuration",
  severity = $(SIG_MED),
  emailto = root@localhost
)
{
  /etc/apt                 -> $(SEC_CONFIG) (recurse = true) ;
  /etc/default             -> $(SEC_CONFIG) (recurse = true) ;
  /etc/environment         -> $(SEC_CONFIG) ;
  /etc/profile             -> $(SEC_CONFIG) ;
  /etc/profile.d           -> $(SEC_CONFIG) (recurse = true) ;
  /etc/bash.bashrc         -> $(SEC_CONFIG) ;
  /etc/shells              -> $(SEC_CONFIG) ;
}

# ============================================
# Log Files
# ============================================
# System logs should only grow
# Shrinking logs may indicate tampering

(
  rulename = "Log Files",
  severity = $(SIG_LOW),
  emailto = root@localhost
)
{
  /var/log/auth.log        -> $(SEC_LOG) ;
  /var/log/syslog          -> $(SEC_LOG) ;
  /var/log/kern.log        -> $(SEC_LOG) ;
  /var/log/messages        -> $(SEC_LOG) ;
  /var/log/secure          -> $(SEC_LOG) ;
  /var/log/faillog         -> $(SEC_LOG) ;
  /var/log/lastlog         -> $(SEC_LOG) ;
  /var/log/wtmp            -> $(SEC_LOG) ;
  /var/log/btmp            -> $(SEC_LOG) ;
}

# ============================================
# Tripwire Files (Self-Protection)
# ============================================
# Monitor Tripwire's own files
# Prevents attackers from disabling monitoring

(
  rulename = "Tripwire Binaries",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /usr/sbin/tripwire       -> $(SEC_BIN) ;
  /usr/sbin/twadmin        -> $(SEC_BIN) ;
  /usr/sbin/twprint        -> $(SEC_BIN) ;
  /usr/sbin/siggen         -> $(SEC_BIN) ;
}

(
  rulename = "Tripwire Data Files",
  severity = $(SIG_HI),
  emailto = root@localhost
)
{
  /etc/tripwire/tw.cfg     -> $(SEC_CRIT) ;
  /etc/tripwire/tw.pol     -> $(SEC_CRIT) ;
  /etc/tripwire/site.key   -> $(SEC_CRIT) ;
  # Local key varies by hostname, adjust as needed
}

# ============================================
# Exclusions
# ============================================
# Files and directories to ignore
# These change frequently or are unimportant

(
  rulename = "Exclusions",
  severity = 0
)
{
  # Temporary files
  !/tmp ;
  !/var/tmp ;

  # Runtime data
  !/var/run ;
  !/run ;
  !/var/lock ;

  # Package manager cache
  !/var/cache/apt ;

  # Mail spool
  !/var/spool/mail ;

  # Tripwire reports (we create these)
  !/var/lib/tripwire/report ;
}
```

### Compiling the Policy File

After creating or modifying the policy file, compile it:

```bash
# Compile the policy file
sudo twadmin --create-polfile --cfgfile /etc/tripwire/tw.cfg \
    --site-keyfile /etc/tripwire/site.key /etc/tripwire/twpol.txt

# Enter the site passphrase when prompted
```

**Security Best Practice**: After compiling, remove or secure the plaintext policy file:

```bash
# Option 1: Remove the plaintext policy (recommended for production)
sudo rm /etc/tripwire/twpol.txt

# Option 2: Move to a secure location
sudo mv /etc/tripwire/twpol.txt /root/tripwire-policy-backup.txt
sudo chmod 600 /root/tripwire-policy-backup.txt
```

## Initializing the Database

The database stores the baseline state of all monitored files. Initialize it after configuring the policy:

```bash
# Initialize the Tripwire database
sudo tripwire --init

# Enter the local passphrase when prompted
```

This process may take several minutes depending on the number of files being monitored. You will see output indicating which files are being processed.

### Handling Initialization Errors

If you see errors about missing files during initialization:

```bash
# Common error example:
### Warning: File system error.
### Filename: /boot/grub/grub.cfg
### No such file or directory

# This means the policy references files that don't exist
# Edit the policy to remove or comment out these entries
```

To fix missing file errors:

```bash
# 1. Extract the current policy to a text file
sudo twadmin --print-polfile > /tmp/twpol.txt

# 2. Edit the file to comment out missing paths
sudo vim /tmp/twpol.txt
# Add ! before paths that don't exist: !/path/that/doesnt/exist

# 3. Recompile the policy
sudo twadmin --create-polfile --cfgfile /etc/tripwire/tw.cfg \
    --site-keyfile /etc/tripwire/site.key /tmp/twpol.txt

# 4. Re-initialize the database
sudo tripwire --init
```

## Running Integrity Checks

Once the database is initialized, you can run integrity checks to detect changes:

```bash
# Run a basic integrity check
sudo tripwire --check

# Run a check and save report to a specific file
sudo tripwire --check --twrfile /var/lib/tripwire/report/manual-check.twr

# Run a check on specific files or directories only
sudo tripwire --check /etc/passwd /etc/shadow

# Run a check using a specific policy rule
sudo tripwire --check --rule-name "Critical Configuration"
```

### Understanding Check Output

The check output shows:

```
Parsing policy file: /etc/tripwire/tw.pol
*** Processing Unix File System ***
Performing integrity check...

===============================================================
Object Summary:
===============================================================
---------------------------------------------------------------
# Section: Unix File System
---------------------------------------------------------------

Rule Name       Severity Level  Added  Removed  Modified
---------       --------------  -----  -------  --------
Critical Boot         100         0       0        0
System Binaries       100         0       0        0
SSH Configuration     100         0       0        2
Critical Config       100         1       0        1

Total objects scanned: 45230
Total violations found: 4
```

## Updating the Policy

As your system evolves, you will need to update the policy. Here's the process:

```bash
# Step 1: Export the current policy to a text file
sudo twadmin --print-polfile > /tmp/twpol.txt

# Step 2: Edit the policy
sudo vim /tmp/twpol.txt

# Step 3: Compile the new policy
sudo twadmin --create-polfile --cfgfile /etc/tripwire/tw.cfg \
    --site-keyfile /etc/tripwire/site.key /tmp/twpol.txt

# Step 4: Re-initialize the database with new policy
sudo tripwire --init

# Step 5: Clean up
sudo rm /tmp/twpol.txt
```

### Adding New Rules

To add a new rule for monitoring application files:

```conf
# Example: Adding monitoring for a custom application
(
  rulename = "Custom Application",
  severity = $(SIG_MED),
  emailto = admin@example.com
)
{
  # Application binaries
  /opt/myapp/bin           -> $(SEC_BIN) (recurse = true) ;

  # Application configuration
  /opt/myapp/config        -> $(SEC_CONFIG) (recurse = true) ;

  # Application libraries
  /opt/myapp/lib           -> $(SEC_BIN) (recurse = true) ;
}
```

## Updating the Database After Changes

After legitimate system changes (updates, configuration modifications), update the database to accept the new state:

```bash
# Method 1: Interactive update using the latest report
sudo tripwire --update --twrfile /var/lib/tripwire/report/$(hostname)-$(date +%Y%m%d).twr

# Method 2: Run check and update in one command
sudo tripwire --check --interactive

# Method 3: Accept all changes (use with caution)
# First, run a check
sudo tripwire --check --twrfile /tmp/check.twr

# Then update accepting the report
sudo tripwire --update --accept-all --twrfile /tmp/check.twr
```

### Interactive Update Process

When running an interactive update:

1. Tripwire opens the report in your configured editor
2. Review each changed file in the report
3. Add an 'x' before each entry you want to accept:
   ```
   [x] "/etc/passwd"
   [ ] "/etc/ssh/sshd_config"  # Don't accept this unexpected change
   ```
4. Save and close the editor
5. Enter your local passphrase to update the database

### Best Practices for Database Updates

```bash
# Create a script for safe database updates
#!/bin/bash
# /usr/local/sbin/tripwire-update.sh

# Run integrity check first
echo "Running integrity check..."
REPORT="/var/lib/tripwire/report/pre-update-$(date +%Y%m%d-%H%M%S).twr"
sudo tripwire --check --twrfile "$REPORT"

# Display violations
echo ""
echo "Review the following violations:"
sudo twprint --print-report --twrfile "$REPORT" | grep -A5 "Rule Name"

# Prompt for confirmation
read -p "Update database with these changes? (y/N) " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
    sudo tripwire --update --twrfile "$REPORT"
    echo "Database updated successfully"
else
    echo "Update cancelled"
fi
```

## Email Notifications

Configure Tripwire to send email alerts when violations are detected.

### Setting Up Email

First, ensure your system can send emails:

```bash
# Install mailutils for email capability
sudo apt install mailutils -y

# Test email functionality
echo "Test email from Tripwire server" | mail -s "Tripwire Test" admin@example.com
```

### Configuring Tripwire Email Settings

Update the configuration file `/etc/tripwire/twcfg.txt`:

```conf
# Email Configuration Section
# ---------------------------

MAILMETHOD    =SENDMAIL
# Use local MTA (sendmail, postfix, etc.)

MAILPROGRAM   =/usr/sbin/sendmail -oi -t
# Path to your mail program

SMTPHOST      =smtp.example.com
# Alternative: Use SMTP directly (uncomment and set MAILMETHOD=SMTP)

SMTPPORT      =25
# SMTP port (25, 587, or 465 for SSL)

EMAILREPORTLEVEL =3
# How much detail in email reports:
# 0 = Single line summary
# 1 = Minimal details
# 2 = Include added/removed files
# 3 = Include property changes
# 4 = Full report with all details

MAILNOVIOLATIONS =false
# Set to true to receive email even when no violations found
# Useful for confirming scans are running

GLOBALEMAIL   =security-team@example.com
# Default email recipient for all rules
# Individual rules can override with emailto directive
```

### Per-Rule Email Configuration

In your policy file, specify different recipients per rule:

```conf
# Critical alerts go to security team
(
  rulename = "Critical System Files",
  severity = 100,
  emailto = security@example.com
)
{
  /etc/passwd -> $(SEC_CONFIG) ;
}

# Less critical alerts go to sysadmin
(
  rulename = "Log Files",
  severity = 33,
  emailto = sysadmin@example.com
)
{
  /var/log -> $(SEC_LOG) (recurse = true) ;
}
```

### Testing Email Notifications

```bash
# Run a check with email notification
sudo tripwire --check --email-report

# Force an email report even with no violations
sudo tripwire --check --email-report --no-tty-output
```

## Automated Scanning with Cron

Set up automated integrity checks using cron for continuous monitoring.

### Creating the Cron Script

```bash
#!/bin/bash
# /usr/local/sbin/tripwire-check.sh
# Automated Tripwire integrity check script

# Configuration
MAILTO="security@example.com"
HOSTNAME=$(hostname)
DATE=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="/var/lib/tripwire/report"
REPORT_FILE="${REPORT_DIR}/${HOSTNAME}-${DATE}.twr"
LOG_FILE="/var/log/tripwire/check.log"

# Ensure log directory exists
mkdir -p /var/log/tripwire
mkdir -p "$REPORT_DIR"

# Log start time
echo "=== Tripwire Check Started: $(date) ===" >> "$LOG_FILE"

# Run the integrity check
/usr/sbin/tripwire --check \
    --twrfile "$REPORT_FILE" \
    --email-report \
    --email-report-level 3 \
    >> "$LOG_FILE" 2>&1

# Capture exit code
EXIT_CODE=$?

# Log completion
echo "Check completed with exit code: $EXIT_CODE" >> "$LOG_FILE"
echo "Report saved to: $REPORT_FILE" >> "$LOG_FILE"
echo "=== Tripwire Check Finished: $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Exit with Tripwire's exit code
exit $EXIT_CODE
```

Set the script permissions:

```bash
# Make script executable
sudo chmod 700 /usr/local/sbin/tripwire-check.sh

# Ensure only root can modify
sudo chown root:root /usr/local/sbin/tripwire-check.sh
```

### Setting Up the Cron Job

```bash
# Edit root's crontab
sudo crontab -e

# Add the following entries:

# Run daily integrity check at 3:00 AM
0 3 * * * /usr/local/sbin/tripwire-check.sh

# Run weekly full report on Sunday at 6:00 AM
0 6 * * 0 /usr/sbin/tripwire --check --email-report --email-report-level 4

# Clean up old reports (keep 30 days)
0 4 * * * find /var/lib/tripwire/report -name "*.twr" -mtime +30 -delete
```

### Alternative: Using Systemd Timer

For systems using systemd, create a timer unit:

```ini
# /etc/systemd/system/tripwire-check.service
[Unit]
Description=Tripwire File Integrity Check
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/tripwire-check.sh
User=root
```

```ini
# /etc/systemd/system/tripwire-check.timer
[Unit]
Description=Run Tripwire integrity check daily

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable and start the timer
sudo systemctl enable tripwire-check.timer
sudo systemctl start tripwire-check.timer

# Verify timer status
sudo systemctl list-timers tripwire-check.timer
```

## Report Analysis

Understanding Tripwire reports is essential for effective security monitoring.

### Viewing Reports

```bash
# List available reports
ls -la /var/lib/tripwire/report/

# View a report in human-readable format
sudo twprint --print-report --twrfile /var/lib/tripwire/report/hostname-20240115.twr

# View report with specific detail level
sudo twprint --print-report --report-level 4 --twrfile /var/lib/tripwire/report/hostname-20240115.twr
```

### Report Structure

A typical report contains:

```
Tripwire(R) 2.4.3.7 Integrity Check Report

Report generated by:          root
Report created on:            Wed Jan 15 03:00:01 2025
Database last updated on:     Mon Jan 13 10:30:15 2025

===============================================================
Report Summary:
===============================================================

Host name:                    webserver01
Host IP address:              192.168.1.100
Host ID:                      None
Policy file used:             /etc/tripwire/tw.pol
Configuration file used:      /etc/tripwire/tw.cfg
Database file used:           /var/lib/tripwire/webserver01.twd
Command line used:            tripwire --check

===============================================================
Rule Summary:
===============================================================

---------------------------------------------------------------
Section: Unix File System
---------------------------------------------------------------

  Rule Name            Severity Level    Added   Removed   Modified
  ---------            --------------    -----   -------   --------
  Critical Boot Files       100            0        0          0
  System Binaries           100            0        0          0
  SSH Configuration         100            0        0          1
* Critical Config           100            1        0          2

Total objects scanned:  45230
Total violations found: 4

* = Rule has violations

===============================================================
Object Detail:
===============================================================

---------------------------------------------------------------
Rule Name: Critical Config (/etc)
Severity Level: 100
---------------------------------------------------------------

Modified Objects: 2

Modified object name:  /etc/passwd
  Property:            Expected                    Observed
  -------------        -----------                 --------
  Size:                2546                        2612
  Modify Time:         Mon Jan 13 10:30:15 2025   Wed Jan 15 02:45:30 2025
  MD5:                 A1B2C3D4...                 X9Y8Z7W6...

Modified object name:  /etc/group
  Property:            Expected                    Observed
  -------------        -----------                 --------
  Size:                1024                        1056
  Modify Time:         Mon Jan 13 10:30:15 2025   Wed Jan 15 02:45:30 2025
  MD5:                 E5F6G7H8...                 M3N4O5P6...

Added Objects: 1

Added object name:     /etc/myapp.conf

===============================================================
```

### Analyzing Violations

Create a script to summarize violations:

```bash
#!/bin/bash
# /usr/local/sbin/tripwire-summary.sh
# Generate a summary of recent Tripwire violations

REPORT_DIR="/var/lib/tripwire/report"
DAYS=${1:-7}

echo "=== Tripwire Violation Summary (Last $DAYS days) ==="
echo ""

# Find recent reports
for report in $(find "$REPORT_DIR" -name "*.twr" -mtime -$DAYS -type f | sort); do
    echo "Report: $(basename $report)"
    echo "Date: $(stat -c %y "$report" | cut -d. -f1)"

    # Extract violation count
    VIOLATIONS=$(sudo twprint --print-report --twrfile "$report" 2>/dev/null | \
        grep "Total violations found:" | awk '{print $4}')

    echo "Violations: ${VIOLATIONS:-0}"

    # List violated rules
    sudo twprint --print-report --twrfile "$report" 2>/dev/null | \
        grep "^\*" | sed 's/^\* /  - /'

    echo ""
done
```

## Custom Rules

Create custom monitoring rules for specific security requirements.

### Monitoring Web Application Files

```conf
# Custom rule for web application monitoring
# Add to your policy file

# Define a custom property mask for web files
# Monitor content changes but allow access time updates
WEB_CONTENT = +pinugtsdbmCM-rlacSH ;

(
  rulename = "Web Application Files",
  severity = 75,
  emailto = webteam@example.com
)
{
  # Document root
  /var/www/html            -> $(WEB_CONTENT) (recurse = true) ;

  # Application directory
  /var/www/myapp           -> $(WEB_CONTENT) (recurse = true) ;

  # Exclude uploaded content (changes frequently)
  !/var/www/myapp/uploads ;
  !/var/www/myapp/cache ;
  !/var/www/myapp/tmp ;
}
```

### Monitoring Database Files

```conf
# Custom rule for database monitoring
(
  rulename = "Database Files",
  severity = 90,
  emailto = dba@example.com
)
{
  # MySQL/MariaDB configuration
  /etc/mysql               -> $(SEC_CONFIG) (recurse = true) ;

  # PostgreSQL configuration
  /etc/postgresql          -> $(SEC_CONFIG) (recurse = true) ;

  # Database binaries
  /usr/bin/mysql           -> $(SEC_BIN) ;
  /usr/bin/psql            -> $(SEC_BIN) ;
}
```

### Monitoring Container Environments

```conf
# Custom rule for Docker environments
(
  rulename = "Docker Configuration",
  severity = 85,
  emailto = devops@example.com
)
{
  # Docker daemon configuration
  /etc/docker              -> $(SEC_CONFIG) (recurse = true) ;

  # Docker socket (monitor permissions)
  /var/run/docker.sock     -> +pugtsm ;

  # Docker binaries
  /usr/bin/docker          -> $(SEC_BIN) ;
  /usr/bin/containerd      -> $(SEC_BIN) ;

  # Exclude container data (too dynamic)
  !/var/lib/docker ;
}
```

### Monitoring Compliance-Specific Files

```conf
# PCI-DSS Compliance Monitoring
# Covers critical security controls

(
  rulename = "PCI-DSS Critical Files",
  severity = 100,
  emailto = compliance@example.com
)
{
  # Requirement 2: System passwords and parameters
  /etc/passwd              -> $(SEC_CONFIG) ;
  /etc/shadow              -> $(SEC_CONFIG) ;

  # Requirement 7: Access control
  /etc/sudoers             -> $(SEC_CONFIG) ;
  /etc/security            -> $(SEC_CONFIG) (recurse = true) ;

  # Requirement 8: Authentication
  /etc/pam.d               -> $(SEC_CONFIG) (recurse = true) ;
  /etc/ssh/sshd_config     -> $(SEC_CONFIG) ;

  # Requirement 10: Logging
  /etc/rsyslog.conf        -> $(SEC_CONFIG) ;
  /etc/rsyslog.d           -> $(SEC_CONFIG) (recurse = true) ;

  # Requirement 11: Security testing
  /etc/tripwire            -> $(SEC_CONFIG) (recurse = true) ;
}
```

## Troubleshooting

Common issues and their solutions when working with Tripwire.

### Issue: Policy File Errors

```bash
# Error: "### Error: File could not be opened"
# The policy references files that don't exist

# Solution: Find missing files in policy
sudo tripwire --check 2>&1 | grep "File system error" | sort -u

# Fix by commenting out missing paths in policy
# Prefix paths with ! to exclude them
```

### Issue: Database Initialization Fails

```bash
# Error: "### Error: File could not be opened"
# Solution 1: Check file permissions
sudo ls -la /etc/tripwire/
sudo ls -la /var/lib/tripwire/

# Solution 2: Regenerate keys if corrupted
sudo twadmin --generate-keys --site-keyfile /etc/tripwire/site.key
sudo twadmin --generate-keys --local-keyfile /etc/tripwire/$(hostname)-local.key

# Solution 3: Verify configuration file
sudo twadmin --print-cfgfile
```

### Issue: Wrong Passphrase

```bash
# Error: "### Error: Incorrect passphrase"
# You've entered the wrong passphrase

# Note: There is NO password recovery!
# If lost, you must regenerate keys and reinitialize

# Regenerate site key
sudo twadmin --generate-keys --site-keyfile /etc/tripwire/site.key

# Regenerate local key
sudo twadmin --generate-keys --local-keyfile /etc/tripwire/$(hostname)-local.key

# Recompile configuration
sudo twadmin --create-cfgfile --cfgfile /etc/tripwire/tw.cfg \
    --site-keyfile /etc/tripwire/site.key /etc/tripwire/twcfg.txt

# Recompile policy
sudo twadmin --create-polfile --cfgfile /etc/tripwire/tw.cfg \
    --site-keyfile /etc/tripwire/site.key /etc/tripwire/twpol.txt

# Reinitialize database
sudo tripwire --init
```

### Issue: Too Many False Positives

```bash
# Problem: Legitimate changes trigger constant alerts

# Solution 1: Update database after known changes
sudo tripwire --check --interactive

# Solution 2: Adjust policy to exclude volatile files
# Add exclusions to policy:
!/var/log/lastlog ;
!/var/cache ;

# Solution 3: Use appropriate property masks
# For log files that only grow:
/var/log/syslog -> $(Growing) ;

# Solution 4: Lower severity for noisy rules
(
  rulename = "Temporary Files",
  severity = 10  # Low severity
)
```

### Issue: Check Takes Too Long

```bash
# Problem: Integrity check runs for hours

# Solution 1: Reduce scope of monitoring
# Focus on critical directories only

# Solution 2: Exclude large directories
!/var/lib/docker ;
!/home/*/Downloads ;

# Solution 3: Use less intensive property masks
# Instead of SEC_CRIT (checks everything):
/large/directory -> +pug ;  # Only check permissions, user, group

# Solution 4: Run checks during low-usage periods
# Schedule via cron at night
```

### Issue: Email Notifications Not Working

```bash
# Test email separately
echo "Test" | mail -s "Test" admin@example.com

# Check mail logs
sudo tail -f /var/log/mail.log

# Verify Tripwire email settings
sudo twadmin --print-cfgfile | grep -i mail

# Common fixes:
# 1. Install mail utilities
sudo apt install mailutils postfix -y

# 2. Configure postfix as satellite system
sudo dpkg-reconfigure postfix

# 3. Test Tripwire email specifically
sudo tripwire --check --email-report
```

### Diagnostic Commands

```bash
# View current configuration
sudo twadmin --print-cfgfile

# View current policy (human-readable)
sudo twadmin --print-polfile

# View database information
sudo twadmin --print-dbfile --local-keyfile /etc/tripwire/$(hostname)-local.key

# Test policy syntax without compiling
sudo twadmin --check-polfile /etc/tripwire/twpol.txt

# Verify Tripwire installation
tripwire --version
which tripwire twadmin twprint siggen
```

### Log Analysis

```bash
# View Tripwire-related syslog entries
sudo grep -i tripwire /var/log/syslog

# Monitor Tripwire activity in real-time
sudo tail -f /var/log/syslog | grep -i tripwire

# Create dedicated Tripwire log
# Add to /etc/rsyslog.d/tripwire.conf:
# if $programname == 'tripwire' then /var/log/tripwire.log
# & stop
```

## Security Best Practices

### Protecting Tripwire Files

```bash
# Store keys on removable media (most secure)
sudo cp /etc/tripwire/site.key /mnt/usb/tripwire/
sudo cp /etc/tripwire/$(hostname)-local.key /mnt/usb/tripwire/

# Set restrictive permissions
sudo chmod 600 /etc/tripwire/*.key
sudo chmod 600 /var/lib/tripwire/*.twd
sudo chown root:root /etc/tripwire/*

# Make key files immutable (requires reboot to change)
sudo chattr +i /etc/tripwire/site.key
sudo chattr +i /etc/tripwire/$(hostname)-local.key
```

### Regular Maintenance Schedule

```bash
# Weekly: Review reports and update database for legitimate changes
# Monthly: Review and update policy as system evolves
# Quarterly: Regenerate passphrases for enhanced security
# Annually: Full policy audit and optimization
```

### Integration with Security Stack

```bash
# Send Tripwire alerts to SIEM
# Configure rsyslog to forward Tripwire logs
# /etc/rsyslog.d/50-tripwire.conf

# Forward to SIEM server
if $programname contains 'tripwire' then @siem.example.com:514

# Format as JSON for better parsing
template(name="TripwireJSON" type="string"
    string="{\"timestamp\":\"%timestamp:::date-rfc3339%\",\"host\":\"%hostname%\",\"program\":\"tripwire\",\"message\":\"%msg%\"}\n")
```

## Conclusion

Tripwire provides robust file integrity monitoring that is essential for maintaining security and compliance on Ubuntu systems. By following this guide, you have learned how to:

- Install and configure Tripwire with secure settings
- Create comprehensive policies tailored to your environment
- Initialize and maintain the baseline database
- Run automated integrity checks with email notifications
- Analyze reports and respond to security events
- Troubleshoot common issues

File integrity monitoring is a fundamental security control that helps detect breaches, ensure compliance, and maintain system integrity. Regular monitoring and prompt investigation of alerts are key to maximizing the security benefits of Tripwire.

## Enhance Your Monitoring with OneUptime

While Tripwire provides excellent file integrity monitoring at the system level, comprehensive infrastructure monitoring requires visibility across your entire stack. [OneUptime](https://oneuptime.com) complements your Tripwire deployment by providing:

- **Real-time Infrastructure Monitoring**: Monitor servers, services, and applications from a unified dashboard
- **Intelligent Alerting**: Receive alerts via email, SMS, Slack, and other channels with smart escalation policies
- **Incident Management**: Track and resolve security incidents with built-in workflow automation
- **Status Pages**: Keep stakeholders informed during security events with public or private status pages
- **Log Management**: Centralize and analyze logs from Tripwire and other security tools
- **Compliance Reporting**: Generate reports for audits and compliance requirements

Integrate your Tripwire alerts with OneUptime to create a comprehensive security monitoring solution that provides complete visibility into your infrastructure's health and security posture. Visit [oneuptime.com](https://oneuptime.com) to start your free trial today.
