# How to Configure Rootkit Detection with rkhunter on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, rkhunter, Rootkit, Security, Malware Detection, Tutorial

Description: Complete guide to installing and configuring rkhunter for rootkit detection on Ubuntu.

---

## Introduction

In the ever-evolving landscape of cybersecurity threats, rootkits remain one of the most dangerous and stealthy forms of malware. These malicious programs are designed to hide their presence while providing attackers with persistent, privileged access to compromised systems. For Ubuntu server administrators and security professionals, having robust rootkit detection capabilities is essential for maintaining system integrity.

This comprehensive guide walks you through configuring rkhunter (Rootkit Hunter), one of the most trusted open-source tools for detecting rootkits, backdoors, and local exploits on Unix-based systems.

## Understanding Rootkits and rkhunter

### What Are Rootkits?

Rootkits are sophisticated malware designed to:

- **Hide malicious processes**: Conceal running malware from system monitoring tools
- **Maintain persistent access**: Allow attackers to return to compromised systems
- **Evade detection**: Modify system binaries and kernel modules to avoid security scans
- **Escalate privileges**: Provide root-level access to unauthorized users

Rootkits can operate at various levels:

1. **User-mode rootkits**: Replace or modify application binaries
2. **Kernel-mode rootkits**: Modify the operating system kernel
3. **Bootkit**: Infect the Master Boot Record (MBR) or boot loader
4. **Firmware rootkits**: Hide in device firmware

### What Is rkhunter?

Rootkit Hunter (rkhunter) is a Unix-based security monitoring and analysis tool that scans for:

- Known rootkits and their signatures
- Suspicious file properties and permissions
- Hidden files and processes
- Backdoors and local exploits
- Modified system binaries
- Suspicious kernel modules

rkhunter uses a signature-based approach combined with heuristic analysis to identify potential threats, making it an essential component of any Linux security toolkit.

## Installing rkhunter

### Prerequisites

Before installing rkhunter, ensure your system is up to date:

```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y
```

### Installation Methods

#### Method 1: Install from Ubuntu Repository (Recommended)

The simplest method is installing from the official Ubuntu repositories:

```bash
# Install rkhunter from repositories
sudo apt install rkhunter -y
```

#### Method 2: Install from Source (Latest Version)

For the most recent version with the latest signatures:

```bash
# Install required dependencies
sudo apt install -y wget perl binutils file

# Download the latest rkhunter release
cd /tmp
wget https://sourceforge.net/projects/rkhunter/files/latest/download -O rkhunter.tar.gz

# Extract the archive
tar -xzf rkhunter.tar.gz

# Navigate to the extracted directory
cd rkhunter-*

# Run the installer
sudo ./installer.sh --install
```

### Verify Installation

Confirm rkhunter is installed correctly:

```bash
# Check rkhunter version
rkhunter --version

# Display help information
rkhunter --help
```

Expected output:

```
Rootkit Hunter version 1.4.6
```

## Updating rkhunter Database

Keeping rkhunter's database current is crucial for detecting the latest threats.

### Update Signature Database

```bash
# Update rkhunter's malware signature database
sudo rkhunter --update

# Check for rkhunter program updates
sudo rkhunter --versioncheck
```

### Update File Properties Database

After system updates or legitimate software installations, update the file properties database:

```bash
# Update the file properties database
# This creates a baseline of known-good file hashes
sudo rkhunter --propupd
```

**Important**: Always run `--propupd` after:
- Installing new software packages
- Updating system packages
- Making legitimate configuration changes

### Automated Database Updates

Create a script for automated updates:

```bash
#!/bin/bash
# /usr/local/bin/rkhunter-update.sh
# Script to update rkhunter databases

# Log file location
LOGFILE="/var/log/rkhunter-update.log"

# Record timestamp
echo "=== rkhunter update: $(date) ===" >> "$LOGFILE"

# Update signature database
/usr/bin/rkhunter --update >> "$LOGFILE" 2>&1

# Check for version updates
/usr/bin/rkhunter --versioncheck >> "$LOGFILE" 2>&1

# Update file properties after system updates
# Uncomment the line below if you want automatic propupd
# /usr/bin/rkhunter --propupd >> "$LOGFILE" 2>&1

echo "Update completed" >> "$LOGFILE"
```

Make the script executable:

```bash
sudo chmod +x /usr/local/bin/rkhunter-update.sh
```

## Running Scans Manually

### Basic Scan

Run a complete system scan:

```bash
# Run a full system scan
sudo rkhunter --check
```

### Scan Options

rkhunter provides various scanning options for different use cases:

```bash
# Run scan without requiring user interaction (press Enter)
sudo rkhunter --check --skip-keypress

# Run scan with verbose output
sudo rkhunter --check --verbose-logging

# Run only specific tests
sudo rkhunter --check --enable all --disable none

# Run scan and generate report
sudo rkhunter --check --report-warnings-only

# Check specific areas only
sudo rkhunter --check --enable rootkits
sudo rkhunter --check --enable trojans
sudo rkhunter --check --enable network
```

### Quick Scan for Specific Threats

```bash
# Scan for rootkits only
sudo rkhunter --check --enable rootkits --disable all

# Scan network ports only
sudo rkhunter --check --enable network --disable all

# Scan for known backdoor ports
sudo rkhunter --check --enable ports --disable all
```

## Understanding Scan Results

### Reading the Output

rkhunter output is color-coded for easy interpretation:

- **Green [OK]**: Check passed, no issues detected
- **Yellow [Warning]**: Potential issue requiring investigation
- **Red [Warning]**: Serious issue that needs immediate attention

### Sample Scan Output

```
Checking for rootkits...

  Performing check of known rootkit files and directories
    55808 Trojan - Variant A                             [ Not found ]
    ADM Worm                                             [ Not found ]
    AjaKit Rootkit                                       [ Not found ]
    Adore Rootkit                                        [ Not found ]
    ...

  Performing additional rootkit checks
    Suckit Rookit additional checks                      [ OK ]
    Checking for possible rootkit files and directories  [ None found ]
    Checking for possible rootkit strings                [ None found ]

  Performing malware checks
    Checking running processes for suspicious files      [ None found ]
    Checking for hidden processes                        [ None found ]
    Checking for hidden files in /dev                    [ None found ]

  Performing Linux specific checks
    Checking loaded kernel modules                       [ OK ]
    Checking kernel module names                         [ OK ]
```

### Interpreting Warnings

When rkhunter reports warnings, investigate them carefully:

```bash
# View the detailed log file
sudo cat /var/log/rkhunter.log

# Search for specific warnings
sudo grep -i "warning" /var/log/rkhunter.log

# View only warning entries
sudo grep "\[ Warning \]" /var/log/rkhunter.log
```

### Common False Positives

Some warnings may be false positives caused by:

1. **Legitimate system changes**: Package updates modifying binaries
2. **Custom configurations**: Non-standard but valid system settings
3. **Development tools**: Debugging utilities flagged as suspicious
4. **Virtualization software**: Container tools using kernel features

## Configuration Options (rkhunter.conf)

The main configuration file is located at `/etc/rkhunter.conf`. Understanding and customizing this file is essential for optimal detection.

### Main Configuration File

```bash
# Open the configuration file for editing
sudo nano /etc/rkhunter.conf
```

### Key Configuration Options

Here is a comprehensive breakdown of important configuration options:

```bash
# /etc/rkhunter.conf
# Rootkit Hunter Configuration File
# Comprehensive configuration with detailed explanations

#
# MIRRORS AND UPDATES
#

# Enable automatic mirror updates
# Set to 1 to allow rkhunter to automatically select mirrors
# Set to 0 to use only the mirrors you specify
MIRRORS_MODE=1

# Update mirrors file when running --update
UPDATE_MIRRORS=1

# Web command to use for downloads
# Options: curl, wget, links, lynx, GET, or full path to command
WEB_CMD=wget

#
# LANGUAGE AND LOCALE
#

# Set the default language for output
# Available: en (English), de (German), zh (Chinese), etc.
LANGUAGE=en

#
# LOGGING CONFIGURATION
#

# Enable logging (highly recommended)
# Logs provide detailed audit trail and debugging information
LOGFILE=/var/log/rkhunter.log

# Append to existing log file instead of overwriting
# Set to 1 to keep historical data
APPEND_LOG=0

# Copy the logfile on each run
# Useful for maintaining backup logs
COPY_LOG_ON_ERROR=0

# Enable verbose logging for detailed output
# Set to 1 for troubleshooting
USE_SYSLOG=authpriv.warning

# Syslog facility to use
SYSLOG_PRIORITY=LOG_WARNING

#
# EMAIL NOTIFICATION SETTINGS
#

# Email address to send warnings to
# Separate multiple addresses with spaces
MAIL-ON-WARNING=admin@example.com security@example.com

# Mail command to use for sending notifications
# Common options: mail, sendmail, mutt
MAIL_CMD=mail -s "[rkhunter] Warnings found on ${HOST_NAME}"

#
# SCAN BEHAVIOR
#

# Auto-update file properties database after system updates
# Requires PKGMGR to be set correctly
AUTO_X_DETECT=1

# Enable or disable specific test categories
ENABLE_TESTS=ALL

# Disable specific tests (space-separated list)
# Common tests to disable for reducing false positives:
# DISABLE_TESTS=suspscan hidden_ports hidden_procs deleted_files
DISABLE_TESTS=suspscan

#
# WHITELISTING
#

# Whitelist known safe script files
# These files will not trigger script warnings
SCRIPTWHITELIST=/usr/bin/egrep
SCRIPTWHITELIST=/usr/bin/fgrep
SCRIPTWHITELIST=/usr/bin/which
SCRIPTWHITELIST=/usr/bin/ldd
SCRIPTWHITELIST=/usr/bin/lwp-request
SCRIPTWHITELIST=/usr/sbin/adduser
SCRIPTWHITELIST=/usr/sbin/prelink

# Whitelist shared library preload configuration
# Prevents warnings about LD_PRELOAD usage
SHARED_LIB_WHITELIST=/lib/x86_64-linux-gnu/libkeyutils.so.1

# Whitelist specific hidden directories
# Only add directories you know are legitimate
ALLOWHIDDENDIR=/dev/.udev
ALLOWHIDDENDIR=/dev/.static
ALLOWHIDDENDIR=/dev/.initramfs

# Whitelist hidden files
ALLOWHIDDENFILE=/dev/.blkid.tab
ALLOWHIDDENFILE=/dev/.blkid.tab.old
ALLOWHIDDENFILE=/dev/.udev/db/*

# Allow specific processes to use deleted files
ALLOWPROCDELFILE=/usr/sbin/mysqld
ALLOWPROCDELFILE=/usr/sbin/apache2

# Whitelist device files that might trigger warnings
ALLOWDEVFILE=/dev/shm/pulse-shm-*
ALLOWDEVFILE=/dev/md/md-device-map

#
# SYSTEM COMMANDS CONFIGURATION
#

# Specify package manager for file verification
# Options: RPM, DPKG, BSD, SOLARIS, NONE
# Ubuntu uses DPKG
PKGMGR=DPKG

# Enable hash function for file integrity checks
# Options: SHA256, SHA512, SHA1, MD5
HASH_CMD=SHA256

# Alternative hash command (if primary unavailable)
HASH_FLD_IDX=4

#
# ROOTKIT DETECTION SETTINGS
#

# Check for known bad applications
SCANROOTKITMODE=THOROUGH

# Check for suspicious files in /dev directory
WARN_ON_OS_CHANGE=1

# Upload rootkit samples (for security research)
UPDT_ON_OS_CHANGE=0

# Check for strings in suspicious files
SUSPSCAN_DIRS=/tmp /var/tmp

# Maximum size (in bytes) for suspicious file scanning
SUSPSCAN_MAXSIZE=1024000

# Temporary directory for scans
TMPDIR=/var/lib/rkhunter/tmp

# Database directory
DBDIR=/var/lib/rkhunter/db

# Script directory
SCRIPTDIR=/usr/share/rkhunter/scripts

# Install directory
INSTALLDIR=/usr

#
# NETWORK CHECKS
#

# Ports that should not be in LISTEN state
# Add ports that should never be listening on your system
PORT_WHITELIST=

# Whitelist specific IP addresses
PORT_PATH_WHITELIST=/usr/sbin/sshd
PORT_PATH_WHITELIST=/usr/sbin/apache2

# Network interface whitelist
IFACE_WHITELIST=lo

#
# USER AND GROUP CHECKS
#

# UID values that should not be used (0 = root only)
UID0_ACCOUNTS=root

# Accounts that can have passwordless entries
PWDLESS_ACCOUNTS=

# System accounts that should not have login shells
SYSLOG_CONFIG_FILE=/etc/rsyslog.conf

#
# OPERATING SYSTEM SPECIFIC
#

# Allow SSH root login (set based on your security policy)
ALLOW_SSH_ROOT_USER=no

# Allow SSH protocol version 1 (deprecated, insecure)
ALLOW_SSH_PROT_V1=0

# OS name for version checking
OS_VERSION_FILE=/etc/os-release

#
# IMMUTABLE FILES CHECK
#

# Check for files with immutable attribute
IMMUTABLE_SET=0

# Check for files with immutable attribute that should not be immutable
IMMUTABLES_FILE=/etc/rkhunter.immutable

#
# APPLICATION VERSION CHECKS
#

# Check versions of common applications for known vulnerabilities
APP_WHITELIST=

# GnuPG application check
GPGKEY=
```

### Create Local Configuration File

For custom settings that persist across package updates:

```bash
# Create local configuration file
sudo nano /etc/rkhunter.conf.local
```

Add your custom settings:

```bash
# /etc/rkhunter.conf.local
# Local rkhunter configuration overrides
# This file persists across package updates

# Custom email notification
MAIL-ON-WARNING=security@yourcompany.com

# Additional whitelisted scripts for your environment
SCRIPTWHITELIST=/opt/myapp/bin/custom-script.sh

# Custom hidden directories for your applications
ALLOWHIDDENDIR=/opt/myapp/.config

# Disable specific tests that generate false positives in your environment
DISABLE_TESTS=suspscan apps
```

## Whitelisting False Positives

False positives can overwhelm administrators and lead to alert fatigue. Proper whitelisting is essential.

### Identifying False Positives

First, confirm the warning is truly a false positive:

```bash
# Check if the flagged file belongs to an installed package
dpkg -S /path/to/suspicious/file

# Verify file hash against package database
debsums -c

# Compare file with original package version
debsums packagename
```

### Whitelisting Scripts

```bash
# Add to /etc/rkhunter.conf or /etc/rkhunter.conf.local
# Whitelist legitimate script files

# System scripts
SCRIPTWHITELIST=/usr/bin/egrep
SCRIPTWHITELIST=/usr/bin/fgrep
SCRIPTWHITELIST=/usr/bin/which
SCRIPTWHITELIST=/usr/bin/ldd

# Custom application scripts
SCRIPTWHITELIST=/opt/myapp/bin/start.sh
SCRIPTWHITELIST=/home/deploy/scripts/backup.sh
```

### Whitelisting Hidden Files and Directories

```bash
# Whitelist legitimate hidden directories
ALLOWHIDDENDIR=/dev/.udev
ALLOWHIDDENDIR=/dev/.static
ALLOWHIDDENDIR=/dev/.initramfs
ALLOWHIDDENDIR=/etc/.java

# Whitelist legitimate hidden files
ALLOWHIDDENFILE=/dev/.blkid.tab
ALLOWHIDDENFILE=/etc/.pwd.lock
ALLOWHIDDENFILE=/etc/.updated
```

### Whitelisting Processes with Deleted Files

When processes hold deleted files (common after updates):

```bash
# Allow specific processes to use deleted files
# Common after package updates
ALLOWPROCDELFILE=/usr/sbin/mysqld
ALLOWPROCDELFILE=/usr/sbin/apache2
ALLOWPROCDELFILE=/usr/lib/systemd/systemd
ALLOWPROCDELFILE=/usr/sbin/sshd
```

### Whitelisting Network Ports

```bash
# Whitelist legitimate listening ports by path
PORT_PATH_WHITELIST=/usr/sbin/sshd
PORT_PATH_WHITELIST=/usr/sbin/apache2
PORT_PATH_WHITELIST=/usr/sbin/nginx
PORT_PATH_WHITELIST=/usr/bin/docker-proxy
```

### After Adding Whitelists

Always update the properties database after making configuration changes:

```bash
# Update file properties database
sudo rkhunter --propupd

# Verify configuration syntax
sudo rkhunter --config-check

# Run a test scan
sudo rkhunter --check --skip-keypress
```

## Automated Daily Scans

### Setting Up Cron Jobs

Create automated daily scans using cron:

```bash
# Edit root's crontab
sudo crontab -e
```

Add the following entries:

```bash
# /etc/cron.d/rkhunter
# Automated rkhunter scanning schedule

# Update rkhunter database daily at 2:00 AM
0 2 * * * /usr/bin/rkhunter --update --nocolors > /dev/null 2>&1

# Run daily scan at 3:00 AM (after database update)
0 3 * * * /usr/bin/rkhunter --check --skip-keypress --report-warnings-only --nocolors

# Update file properties weekly on Sunday at 4:00 AM
# Only if you have automated package updates
0 4 * * 0 /usr/bin/rkhunter --propupd --nocolors > /dev/null 2>&1
```

### Creating a Comprehensive Scan Script

```bash
#!/bin/bash
# /usr/local/bin/rkhunter-daily-scan.sh
# Comprehensive daily rkhunter security scan script

#############################################
# Configuration Variables
#############################################

# Email settings
ADMIN_EMAIL="admin@example.com"
HOSTNAME=$(hostname -f)

# Log files
SCAN_LOG="/var/log/rkhunter-daily.log"
SUMMARY_LOG="/var/log/rkhunter-summary.log"

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

#############################################
# Functions
#############################################

log_message() {
    echo "[$TIMESTAMP] $1" >> "$SCAN_LOG"
}

send_alert() {
    local subject="$1"
    local body="$2"
    echo "$body" | mail -s "$subject" "$ADMIN_EMAIL"
}

#############################################
# Main Script
#############################################

# Start logging
log_message "Starting rkhunter daily scan"

# Update the database first
log_message "Updating rkhunter database"
/usr/bin/rkhunter --update >> "$SCAN_LOG" 2>&1

# Run the scan
log_message "Running security scan"
/usr/bin/rkhunter --check \
    --skip-keypress \
    --report-warnings-only \
    --append-log \
    --nocolors >> "$SCAN_LOG" 2>&1

SCAN_EXIT_CODE=$?

# Check for warnings
WARNING_COUNT=$(grep -c "\[ Warning \]" /var/log/rkhunter.log 2>/dev/null || echo "0")

# Generate summary
{
    echo "=== rkhunter Daily Scan Summary ==="
    echo "Host: $HOSTNAME"
    echo "Date: $TIMESTAMP"
    echo "Exit Code: $SCAN_EXIT_CODE"
    echo "Warnings Found: $WARNING_COUNT"
    echo ""

    if [ "$WARNING_COUNT" -gt 0 ]; then
        echo "=== Warnings ==="
        grep "\[ Warning \]" /var/log/rkhunter.log
    fi
} > "$SUMMARY_LOG"

# Send email if warnings found
if [ "$WARNING_COUNT" -gt 0 ]; then
    log_message "Warnings detected - sending alert email"
    send_alert "[SECURITY ALERT] rkhunter warnings on $HOSTNAME" "$(cat $SUMMARY_LOG)"
fi

# Log completion
log_message "Daily scan completed. Warnings: $WARNING_COUNT"

exit $SCAN_EXIT_CODE
```

Make the script executable and schedule it:

```bash
# Make script executable
sudo chmod +x /usr/local/bin/rkhunter-daily-scan.sh

# Add to crontab
echo "0 3 * * * /usr/local/bin/rkhunter-daily-scan.sh" | sudo tee -a /etc/crontab
```

### Using Systemd Timers (Alternative to Cron)

Create a systemd service:

```bash
# /etc/systemd/system/rkhunter-scan.service
[Unit]
Description=rkhunter Security Scan
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/rkhunter-daily-scan.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Create a systemd timer:

```bash
# /etc/systemd/system/rkhunter-scan.timer
[Unit]
Description=Run rkhunter security scan daily

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true
RandomizedDelaySec=1800

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable and start the timer
sudo systemctl enable rkhunter-scan.timer
sudo systemctl start rkhunter-scan.timer

# Check timer status
sudo systemctl list-timers rkhunter-scan.timer
```

## Email Notifications

### Basic Email Configuration

Configure email notifications in rkhunter.conf:

```bash
# Email notification settings in /etc/rkhunter.conf

# Primary notification email
MAIL-ON-WARNING=security@yourcompany.com

# Mail command (adjust based on your mail system)
# For mailutils:
MAIL_CMD=mail -s "[rkhunter] Warnings found on ${HOST_NAME}"

# For postfix/sendmail:
# MAIL_CMD=sendmail -t

# For mutt:
# MAIL_CMD=mutt -s "[rkhunter] Warnings found on ${HOST_NAME}"
```

### Installing Mail Utilities

```bash
# Install mailutils for basic email functionality
sudo apt install mailutils -y

# Or install a full MTA for more control
sudo apt install postfix -y
```

### Advanced Email Script with HTML Formatting

```bash
#!/bin/bash
# /usr/local/bin/rkhunter-email-report.sh
# Generate and send HTML-formatted rkhunter reports

#############################################
# Configuration
#############################################

ADMIN_EMAIL="security@yourcompany.com"
HOSTNAME=$(hostname -f)
DATE=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="/var/log/rkhunter.log"
TEMP_HTML="/tmp/rkhunter-report.html"

#############################################
# Generate HTML Report
#############################################

generate_html_report() {
    cat > "$TEMP_HTML" << EOF
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .warning { color: #ff6600; font-weight: bold; }
        .ok { color: #00aa00; }
        .info { color: #0066cc; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>rkhunter Security Scan Report</h1>
    <table>
        <tr><th>Property</th><th>Value</th></tr>
        <tr><td>Hostname</td><td>$HOSTNAME</td></tr>
        <tr><td>Scan Date</td><td>$DATE</td></tr>
        <tr><td>rkhunter Version</td><td>$(rkhunter --version 2>/dev/null | head -1)</td></tr>
    </table>

    <h2>Scan Results</h2>
    <pre>
$(grep -E "\[(Warning|OK|Not found)\]" "$LOG_FILE" | tail -100)
    </pre>

    <h2>Warnings Summary</h2>
    <pre class="warning">
$(grep "\[ Warning \]" "$LOG_FILE" 2>/dev/null || echo "No warnings found")
    </pre>

    <hr>
    <p><small>Generated by rkhunter automated scan system</small></p>
</body>
</html>
EOF
}

#############################################
# Send Email
#############################################

send_email() {
    local subject="[rkhunter] Security Scan Report - $HOSTNAME - $DATE"

    # Check if warnings exist
    if grep -q "\[ Warning \]" "$LOG_FILE"; then
        subject="[ALERT] $subject - WARNINGS FOUND"
    fi

    # Send using mail command with HTML content type
    (
        echo "To: $ADMIN_EMAIL"
        echo "Subject: $subject"
        echo "Content-Type: text/html"
        echo "MIME-Version: 1.0"
        echo ""
        cat "$TEMP_HTML"
    ) | sendmail -t

    # Cleanup
    rm -f "$TEMP_HTML"
}

#############################################
# Main
#############################################

generate_html_report
send_email

echo "Report sent to $ADMIN_EMAIL"
```

### Testing Email Configuration

```bash
# Test email delivery
echo "Test email from rkhunter on $(hostname)" | mail -s "rkhunter Test" admin@example.com

# Manually trigger a report
sudo /usr/local/bin/rkhunter-email-report.sh
```

## Integration with Other Tools

### Integrating with AIDE (Advanced Intrusion Detection Environment)

AIDE provides file integrity monitoring that complements rkhunter:

```bash
# Install AIDE
sudo apt install aide -y

# Initialize AIDE database
sudo aideinit

# Create a combined security scan script
cat > /usr/local/bin/security-scan.sh << 'EOF'
#!/bin/bash
# Combined security scanning with rkhunter and AIDE

echo "=== Starting Security Scan: $(date) ==="

# Run rkhunter
echo "Running rkhunter scan..."
sudo rkhunter --check --skip-keypress --report-warnings-only

# Run AIDE check
echo "Running AIDE integrity check..."
sudo aide --check

echo "=== Security Scan Complete: $(date) ==="
EOF

chmod +x /usr/local/bin/security-scan.sh
```

### Integrating with Lynis (Security Auditing)

```bash
# Install Lynis
sudo apt install lynis -y

# Create comprehensive security audit script
cat > /usr/local/bin/full-security-audit.sh << 'EOF'
#!/bin/bash
# Comprehensive security audit combining multiple tools

REPORT_DIR="/var/log/security-audit"
DATE=$(date '+%Y%m%d')

mkdir -p "$REPORT_DIR"

# rkhunter scan
echo "Running rkhunter..."
sudo rkhunter --check --skip-keypress --report-warnings-only > "$REPORT_DIR/rkhunter-$DATE.log" 2>&1

# Lynis audit
echo "Running Lynis security audit..."
sudo lynis audit system --no-colors > "$REPORT_DIR/lynis-$DATE.log" 2>&1

# Generate summary
echo "=== Security Audit Summary ===" > "$REPORT_DIR/summary-$DATE.txt"
echo "Date: $(date)" >> "$REPORT_DIR/summary-$DATE.txt"
echo "" >> "$REPORT_DIR/summary-$DATE.txt"
echo "rkhunter Warnings:" >> "$REPORT_DIR/summary-$DATE.txt"
grep -c "\[ Warning \]" "$REPORT_DIR/rkhunter-$DATE.log" >> "$REPORT_DIR/summary-$DATE.txt"
echo "" >> "$REPORT_DIR/summary-$DATE.txt"
echo "Lynis Hardening Index:" >> "$REPORT_DIR/summary-$DATE.txt"
grep "Hardening index" "$REPORT_DIR/lynis-$DATE.log" >> "$REPORT_DIR/summary-$DATE.txt"

echo "Audit complete. Reports saved to $REPORT_DIR"
EOF

chmod +x /usr/local/bin/full-security-audit.sh
```

### Integrating with OSSEC (Host-based Intrusion Detection)

```bash
# Install OSSEC
wget https://github.com/ossec/ossec-hids/archive/refs/tags/3.7.0.tar.gz
tar -xzf 3.7.0.tar.gz
cd ossec-hids-3.7.0
sudo ./install.sh

# Configure OSSEC to monitor rkhunter logs
# Add to /var/ossec/etc/ossec.conf:
# <localfile>
#   <log_format>syslog</log_format>
#   <location>/var/log/rkhunter.log</location>
# </localfile>
```

### Integrating with Fail2Ban

Create a Fail2Ban filter for rkhunter alerts:

```bash
# /etc/fail2ban/filter.d/rkhunter.conf
[Definition]
failregex = rkhunter.*Warning.*<HOST>
ignoreregex =
```

## Complementing with chkrootkit

Using both rkhunter and chkrootkit provides defense in depth with different detection methods.

### Installing chkrootkit

```bash
# Install chkrootkit
sudo apt install chkrootkit -y
```

### Running chkrootkit

```bash
# Run a basic scan
sudo chkrootkit

# Run in quiet mode (warnings only)
sudo chkrootkit -q

# Run specific tests
sudo chkrootkit -x
```

### Combined Scanning Script

```bash
#!/bin/bash
# /usr/local/bin/rootkit-scan.sh
# Combined rootkit scanning with rkhunter and chkrootkit

#############################################
# Configuration
#############################################

LOG_DIR="/var/log/rootkit-scans"
DATE=$(date '+%Y%m%d-%H%M%S')
ADMIN_EMAIL="security@example.com"
HOSTNAME=$(hostname -f)

#############################################
# Setup
#############################################

mkdir -p "$LOG_DIR"

#############################################
# Run Scans
#############################################

echo "=== Rootkit Scan Started: $(date) ==="

# Run rkhunter
echo "Running rkhunter..."
sudo rkhunter --check \
    --skip-keypress \
    --report-warnings-only \
    --nocolors \
    --logfile "$LOG_DIR/rkhunter-$DATE.log"

RKHUNTER_WARNINGS=$(grep -c "\[ Warning \]" "$LOG_DIR/rkhunter-$DATE.log" 2>/dev/null || echo "0")

# Run chkrootkit
echo "Running chkrootkit..."
sudo chkrootkit > "$LOG_DIR/chkrootkit-$DATE.log" 2>&1

CHKROOTKIT_INFECTED=$(grep -c "INFECTED" "$LOG_DIR/chkrootkit-$DATE.log" 2>/dev/null || echo "0")

#############################################
# Generate Report
#############################################

REPORT="$LOG_DIR/combined-report-$DATE.txt"

{
    echo "============================================"
    echo "Combined Rootkit Scan Report"
    echo "============================================"
    echo "Host: $HOSTNAME"
    echo "Date: $(date)"
    echo ""
    echo "============================================"
    echo "Summary"
    echo "============================================"
    echo "rkhunter Warnings: $RKHUNTER_WARNINGS"
    echo "chkrootkit Infections: $CHKROOTKIT_INFECTED"
    echo ""

    if [ "$RKHUNTER_WARNINGS" -gt 0 ]; then
        echo "============================================"
        echo "rkhunter Warnings Detail"
        echo "============================================"
        grep "\[ Warning \]" "$LOG_DIR/rkhunter-$DATE.log"
        echo ""
    fi

    if [ "$CHKROOTKIT_INFECTED" -gt 0 ]; then
        echo "============================================"
        echo "chkrootkit Infections Detail"
        echo "============================================"
        grep "INFECTED" "$LOG_DIR/chkrootkit-$DATE.log"
        echo ""
    fi

    echo "============================================"
    echo "Full logs available at: $LOG_DIR"
    echo "============================================"
} > "$REPORT"

#############################################
# Send Alert if Issues Found
#############################################

TOTAL_ISSUES=$((RKHUNTER_WARNINGS + CHKROOTKIT_INFECTED))

if [ "$TOTAL_ISSUES" -gt 0 ]; then
    echo "ALERT: $TOTAL_ISSUES issues found! Sending notification..."
    cat "$REPORT" | mail -s "[SECURITY ALERT] Rootkit scan found $TOTAL_ISSUES issues on $HOSTNAME" "$ADMIN_EMAIL"
else
    echo "No issues found."
fi

echo "=== Rootkit Scan Completed: $(date) ==="
echo "Report saved to: $REPORT"
```

### Differences Between rkhunter and chkrootkit

| Feature | rkhunter | chkrootkit |
|---------|----------|------------|
| Detection Method | Signature + Heuristic | Signature-based |
| Configuration | Extensive config file | Minimal configuration |
| False Positive Handling | Detailed whitelisting | Limited |
| Logging | Comprehensive | Basic |
| Update Mechanism | Built-in database update | Package updates only |
| Speed | Thorough (slower) | Fast |
| Best For | Detailed analysis | Quick checks |

## Incident Response Steps

When rkhunter or chkrootkit detects a potential threat, follow these incident response procedures.

### Immediate Response Checklist

```bash
#!/bin/bash
# /usr/local/bin/incident-response.sh
# Incident response script for rootkit detection

#############################################
# INCIDENT RESPONSE PROCEDURES
#############################################

# Step 1: Document the alert
# Record all warning details before taking action

echo "=== Incident Response Initiated ==="
echo "Date: $(date)"
echo "Hostname: $(hostname -f)"
echo "Alert Source: rkhunter/chkrootkit"
echo ""

# Step 2: Isolate if necessary (manual decision)
echo "DECISION POINT: Should this system be isolated from the network?"
echo "If yes, disconnect network cables or disable network interfaces:"
echo "  sudo ip link set eth0 down"
echo ""

# Step 3: Preserve evidence
EVIDENCE_DIR="/root/incident-evidence-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EVIDENCE_DIR"

# Capture system state
echo "Capturing system state..."

# Running processes
ps auxwww > "$EVIDENCE_DIR/processes.txt"

# Network connections
ss -tulpn > "$EVIDENCE_DIR/network-connections.txt"
netstat -anp > "$EVIDENCE_DIR/netstat.txt"

# Open files
lsof > "$EVIDENCE_DIR/open-files.txt"

# Loaded kernel modules
lsmod > "$EVIDENCE_DIR/kernel-modules.txt"

# User accounts
cat /etc/passwd > "$EVIDENCE_DIR/passwd.txt"
cat /etc/shadow > "$EVIDENCE_DIR/shadow.txt"
lastlog > "$EVIDENCE_DIR/lastlog.txt"
last > "$EVIDENCE_DIR/last.txt"

# Scheduled tasks
crontab -l > "$EVIDENCE_DIR/root-crontab.txt" 2>/dev/null
for user in $(cut -f1 -d: /etc/passwd); do
    crontab -u "$user" -l > "$EVIDENCE_DIR/crontab-$user.txt" 2>/dev/null
done
cat /etc/crontab > "$EVIDENCE_DIR/etc-crontab.txt"
ls -la /etc/cron.* > "$EVIDENCE_DIR/cron-directories.txt"

# Copy rkhunter logs
cp /var/log/rkhunter.log "$EVIDENCE_DIR/"

# System logs
cp /var/log/auth.log "$EVIDENCE_DIR/"
cp /var/log/syslog "$EVIDENCE_DIR/"

# Create tarball
tar -czf "$EVIDENCE_DIR.tar.gz" "$EVIDENCE_DIR"
echo "Evidence preserved to: $EVIDENCE_DIR.tar.gz"
```

### Investigation Procedures

```bash
# Step 4: Investigate the warnings

# Check the specific warnings from rkhunter
sudo grep "\[ Warning \]" /var/log/rkhunter.log

# For each warning, investigate:

# 4a. Check if file belongs to a package
dpkg -S /path/to/suspicious/file

# 4b. Verify file integrity
debsums -c

# 4c. Check file timestamps
stat /path/to/suspicious/file

# 4d. Check file contents (carefully)
file /path/to/suspicious/file
strings /path/to/suspicious/file | head -50

# 4e. Check for hidden processes
ps aux | grep -v grep | sort

# 4f. Check network connections
ss -tulpn
netstat -anp

# 4g. Check for unusual users or privileges
awk -F: '($3 == "0") {print}' /etc/passwd

# 4h. Check for unauthorized SSH keys
find /home -name "authorized_keys" -exec ls -la {} \; -exec cat {} \;
ls -la /root/.ssh/

# 4i. Check startup scripts
systemctl list-unit-files --type=service --state=enabled
ls -la /etc/init.d/
```

### Remediation Steps

```bash
# Step 5: Remediation (after confirming true positive)

# 5a. Remove malicious files (if identified)
# CAUTION: Only remove files you have confirmed as malicious
# sudo rm -f /path/to/malicious/file

# 5b. Kill malicious processes
# sudo kill -9 <PID>

# 5c. Remove unauthorized users
# sudo userdel -r suspicioususer

# 5d. Remove unauthorized SSH keys
# sudo rm /home/user/.ssh/authorized_keys

# 5e. Reinstall affected packages
# sudo apt install --reinstall packagename

# 5f. If kernel-level compromise suspected:
# - Boot from live USB
# - Mount and examine filesystem offline
# - Consider full system rebuild
```

### Post-Incident Actions

```bash
# Step 6: Post-incident recovery

# 6a. Update all packages
sudo apt update && sudo apt upgrade -y

# 6b. Update rkhunter database
sudo rkhunter --update
sudo rkhunter --propupd

# 6c. Run full security audit
sudo rkhunter --check
sudo chkrootkit
sudo lynis audit system

# 6d. Review and strengthen security
# - Update firewall rules
# - Review user accounts and permissions
# - Enable additional logging
# - Implement additional monitoring

# 6e. Document lessons learned
# - What was the attack vector?
# - How was it detected?
# - What could prevent future incidents?
```

### Creating an Incident Response Runbook

```bash
# /usr/local/share/incident-response-runbook.txt

ROOTKIT DETECTION INCIDENT RESPONSE RUNBOOK
============================================

1. INITIAL ASSESSMENT (0-15 minutes)
   [ ] Review rkhunter/chkrootkit alert details
   [ ] Determine severity level (Low/Medium/High/Critical)
   [ ] Notify security team and management
   [ ] Document initial findings

2. CONTAINMENT (15-30 minutes)
   [ ] Decide on network isolation (if critical)
   [ ] Disable compromised user accounts
   [ ] Block suspicious network connections
   [ ] Preserve evidence before making changes

3. EVIDENCE COLLECTION (30-60 minutes)
   [ ] Run incident-response.sh script
   [ ] Capture memory dump if possible
   [ ] Document timeline of events
   [ ] Secure evidence with checksums

4. INVESTIGATION (1-4 hours)
   [ ] Analyze rkhunter warnings in detail
   [ ] Verify each finding (true/false positive)
   [ ] Identify attack vector and scope
   [ ] Determine data exposure impact

5. ERADICATION (2-8 hours)
   [ ] Remove malicious software
   [ ] Close attack vectors
   [ ] Patch vulnerabilities
   [ ] Reset compromised credentials

6. RECOVERY (4-24 hours)
   [ ] Restore from known-good backups if needed
   [ ] Rebuild system if severely compromised
   [ ] Verify system integrity
   [ ] Monitor closely for re-infection

7. POST-INCIDENT (1-7 days)
   [ ] Complete incident report
   [ ] Update security procedures
   [ ] Implement additional controls
   [ ] Conduct team debrief

CONTACTS:
- Security Team: security@example.com
- IT Manager: it-manager@example.com
- Incident Hotline: +1-XXX-XXX-XXXX
```

## Best Practices Summary

### Regular Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Update signatures | Daily | `rkhunter --update` |
| Run scan | Daily | `rkhunter --check` |
| Update file properties | After updates | `rkhunter --propupd` |
| Review logs | Weekly | Review `/var/log/rkhunter.log` |
| Full security audit | Monthly | Combined rkhunter + Lynis |
| Test incident response | Quarterly | Run IR drill |

### Security Hardening Recommendations

1. **Keep systems updated**: Regular patching reduces vulnerability exposure
2. **Use defense in depth**: Combine multiple detection tools
3. **Monitor continuously**: Automated scans with alerting
4. **Maintain baselines**: Regular `--propupd` after legitimate changes
5. **Test your detection**: Periodically verify tools are working
6. **Document everything**: Maintain runbooks and procedures
7. **Train your team**: Ensure responders know the procedures

## Monitoring with OneUptime

While rkhunter provides excellent rootkit detection capabilities on individual servers, comprehensive infrastructure monitoring requires a centralized solution. [OneUptime](https://oneuptime.com) offers enterprise-grade monitoring that complements your security tools.

### Why Integrate with OneUptime?

- **Centralized Alerting**: Aggregate security alerts from multiple servers into a single dashboard
- **Incident Management**: Built-in incident workflows that integrate with your IR procedures
- **Status Pages**: Keep stakeholders informed during security incidents
- **On-Call Scheduling**: Ensure the right team members are notified when threats are detected
- **Custom Monitors**: Create monitors that check rkhunter scan results and alert on findings

### Integration Approach

You can integrate rkhunter alerts with OneUptime by:

1. Configuring rkhunter to send alerts to OneUptime's webhook endpoint
2. Creating custom monitors that parse rkhunter log files
3. Using OneUptime's API to programmatically create incidents when rootkits are detected

OneUptime provides the visibility and coordination capabilities that transform individual security tools into a comprehensive security monitoring solution. Combined with rkhunter's detection capabilities, you can build a robust security posture for your Ubuntu infrastructure.

---

## Conclusion

Configuring rkhunter for rootkit detection on Ubuntu is an essential step in securing your Linux systems. By following this guide, you have:

- Installed and configured rkhunter with optimal settings
- Set up automated daily scans with email notifications
- Learned to interpret scan results and handle false positives
- Integrated complementary tools like chkrootkit for defense in depth
- Established incident response procedures for when threats are detected

Remember that rootkit detection is just one component of a comprehensive security strategy. Regular system updates, proper access controls, network segmentation, and continuous monitoring all work together to protect your infrastructure from threats.

Stay vigilant, keep your tools updated, and regularly review your security posture to maintain a strong defense against evolving threats.
