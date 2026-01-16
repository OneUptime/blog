# How to Set Up ClamAV Antivirus on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, ClamAV, Antivirus, Security, Malware, Tutorial

Description: Complete guide to installing and configuring ClamAV antivirus on Ubuntu for malware protection.

---

Linux systems are generally considered more secure than other operating systems, but they are not immune to malware. Whether you are running a mail server, file server, or simply want an extra layer of protection, ClamAV provides a robust open-source antivirus solution. This comprehensive guide walks you through setting up ClamAV on Ubuntu, from basic installation to advanced configuration.

## Understanding ClamAV Components

Before diving into installation, it is essential to understand the key components of ClamAV:

- **clamscan**: Command-line scanner for on-demand file scanning
- **clamd**: ClamAV daemon that runs in the background for faster scanning
- **clamdscan**: Client for clamd daemon, faster than clamscan for multiple scans
- **freshclam**: Virus database updater that keeps definitions current
- **clamonacc**: On-access scanner that monitors file operations in real-time
- **clamav-milter**: Mail filter interface for integrating with mail servers

Each component serves a specific purpose, and depending on your needs, you may use some or all of them.

## Installing ClamAV and ClamAV Daemon

### Step 1: Update System Packages

Start by updating your system packages to ensure you have the latest security patches:

```bash
# Update package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install ClamAV Packages

Install ClamAV along with the daemon and freshclam:

```bash
# Install ClamAV antivirus and related packages
# clamav: Core antivirus engine
# clamav-daemon: Background service for faster scanning
# clamav-freshclam: Automatic virus definition updater
sudo apt install clamav clamav-daemon clamav-freshclam -y
```

### Step 3: Verify Installation

Confirm the installation was successful:

```bash
# Check ClamAV version
clamscan --version

# Check daemon status
sudo systemctl status clamav-daemon

# Check freshclam status
sudo systemctl status clamav-freshclam
```

## Updating Virus Definitions (freshclam)

Virus definitions are the heart of any antivirus solution. ClamAV uses freshclam to keep definitions up to date.

### Manual Database Update

If you need to update definitions immediately:

```bash
# Stop freshclam service before manual update
sudo systemctl stop clamav-freshclam

# Run freshclam manually to download latest definitions
# This downloads main.cvd, daily.cvd, and bytecode.cvd
sudo freshclam

# Start freshclam service again
sudo systemctl start clamav-freshclam
```

### Configure freshclam

Edit the freshclam configuration file to customize update behavior:

```bash
# Open freshclam configuration file
sudo nano /etc/clamav/freshclam.conf
```

Here is a well-commented configuration example:

```conf
# /etc/clamav/freshclam.conf
# ClamAV virus database update configuration

# Database mirror to use for updates
# Uses round-robin DNS for load balancing
DatabaseMirror database.clamav.net

# Number of update checks per day (24 = once per hour)
# Recommended: 12 (every 2 hours) for balanced protection
Checks 12

# Log file location for freshclam updates
UpdateLogFile /var/log/clamav/freshclam.log

# Maximum log file size before rotation (default: 1MB)
LogFileMaxSize 2M

# Enable verbose logging for troubleshooting
LogVerbose yes

# Include timestamp in log entries
LogTime yes

# Run as clamav user for security
DatabaseOwner clamav

# Enable DNS-based database version check
# Reduces bandwidth by checking version before download
DNSDatabaseInfo current.cvd.clamav.net

# Timeout for database downloads (seconds)
ConnectTimeout 30
ReceiveTimeout 60

# Number of retries if download fails
MaxAttempts 5

# Notify clamd when database is updated
NotifyClamd /etc/clamav/clamd.conf

# SafeBrowsing database for phishing protection (optional)
# Uncomment to enable Google Safe Browsing database
# SafeBrowsing yes
```

### Set Up Automatic Updates

Enable and start the freshclam service for automatic updates:

```bash
# Enable freshclam to start on boot
sudo systemctl enable clamav-freshclam

# Start freshclam service
sudo systemctl start clamav-freshclam

# Verify service is running
sudo systemctl status clamav-freshclam
```

## Manual Scanning with clamscan

The clamscan utility is perfect for on-demand scanning of files and directories.

### Basic Scanning Examples

```bash
# Scan a single file
clamscan /path/to/file

# Scan a directory (non-recursive)
clamscan /path/to/directory

# Scan a directory recursively (including subdirectories)
clamscan -r /path/to/directory

# Scan and only show infected files
clamscan -r -i /path/to/directory

# Scan with verbose output
clamscan -r -v /path/to/directory
```

### Advanced Scanning Options

```bash
# Scan entire system excluding specific directories
# --exclude-dir: Skip directories matching pattern
# --log: Write results to log file
# --infected: Only print infected files
# --remove: Automatically remove infected files (use with caution!)
sudo clamscan -r \
    --exclude-dir="^/sys" \
    --exclude-dir="^/proc" \
    --exclude-dir="^/dev" \
    --exclude-dir="^/run" \
    --log=/var/log/clamav/scan.log \
    --infected \
    /

# Scan with size limits to improve performance
# --max-filesize: Skip files larger than specified size
# --max-scansize: Maximum data scanned per file
clamscan -r \
    --max-filesize=100M \
    --max-scansize=100M \
    /home

# Scan and move infected files to quarantine
clamscan -r \
    --move=/var/clamav/quarantine \
    --log=/var/log/clamav/scan.log \
    /home
```

### Using clamdscan for Faster Scanning

When the ClamAV daemon is running, use clamdscan for significantly faster scanning:

```bash
# Scan using the daemon (much faster for multiple scans)
clamdscan /path/to/directory

# Recursive scan with daemon
clamdscan -r /path/to/directory

# Multi-threaded scanning (uses multiple daemon workers)
clamdscan --multiscan /path/to/directory
```

## On-Access Scanning with clamonacc

On-access scanning monitors file system activity in real-time, scanning files as they are accessed, created, or modified.

### Prerequisites

Install the on-access scanning module:

```bash
# Install clamonacc (may be included with clamav-daemon)
sudo apt install clamav-daemon -y

# Check if clamonacc is available
which clamonacc
```

### Configure On-Access Scanning

First, configure clamd to support on-access scanning by editing `/etc/clamav/clamd.conf`:

```bash
sudo nano /etc/clamav/clamd.conf
```

Add or modify these settings:

```conf
# Enable on-access scanning
OnAccessIncludePath /home
OnAccessIncludePath /var/www
OnAccessIncludePath /tmp

# Exclude paths from on-access scanning
OnAccessExcludePath /var/log
OnAccessExcludePath /proc
OnAccessExcludePath /sys

# Exclude specific users from on-access scanning
OnAccessExcludeUname clamav
OnAccessExcludeUname root

# Maximum file size for on-access scanning (bytes)
OnAccessMaxFileSize 25M

# Enable prevention mode (block access to infected files)
# Set to no for detection-only mode
OnAccessPrevention yes

# Extra scanning on file modification
OnAccessExtraScanning yes

# Disable DDD (prevents scanning all files on directory access)
OnAccessDisableDDD yes
```

### Start On-Access Scanning

```bash
# Restart clamd to apply changes
sudo systemctl restart clamav-daemon

# Start clamonacc (requires root privileges)
sudo clamonacc

# Or run clamonacc in the background
sudo clamonacc --move=/var/clamav/quarantine --log=/var/log/clamav/clamonacc.log &
```

### Create Systemd Service for clamonacc

Create a systemd service file for automatic startup:

```bash
sudo nano /etc/systemd/system/clamonacc.service
```

Add the following content:

```ini
[Unit]
# ClamAV On-Access Scanner Service
Description=ClamAV On-Access Scanner
Requires=clamav-daemon.service
After=clamav-daemon.service syslog.target network.target

[Service]
# Run as root to access all files
Type=simple
User=root
ExecStartPre=/bin/bash -c 'while [ ! -S /var/run/clamav/clamd.ctl ]; do sleep 1; done'
ExecStart=/usr/bin/clamonacc -F --log=/var/log/clamav/clamonacc.log --move=/var/clamav/quarantine
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable clamonacc to start on boot
sudo systemctl enable clamonacc

# Start clamonacc service
sudo systemctl start clamonacc

# Check status
sudo systemctl status clamonacc
```

## Configuring clamd.conf

The main ClamAV daemon configuration file controls how clamd operates. Here is a comprehensive configuration:

```bash
sudo nano /etc/clamav/clamd.conf
```

Complete well-commented configuration:

```conf
# /etc/clamav/clamd.conf
# ClamAV Daemon Configuration File

# ========================================
# Basic Settings
# ========================================

# Path to the local socket clamd will listen on
LocalSocket /var/run/clamav/clamd.ctl

# Socket permissions (owner/group/mode)
LocalSocketGroup clamav
LocalSocketMode 666

# Remove stale socket file on startup
FixStaleSocket true

# Run as clamav user for security
User clamav

# ========================================
# Logging Configuration
# ========================================

# Log file location
LogFile /var/log/clamav/clamav.log

# Maximum log file size (0 = unlimited)
LogFileMaxSize 5M

# Add timestamp to log messages
LogTime yes

# Enable verbose logging for troubleshooting
LogVerbose no

# Log clean files (usually disabled to reduce noise)
LogClean no

# Use system logger in addition to log file
LogSyslog yes

# Syslog facility to use
LogFacility LOG_DAEMON

# ========================================
# Database Settings
# ========================================

# Path to virus database directory
DatabaseDirectory /var/lib/clamav

# Enable automatic database reloading when updated
SelfCheck 600

# ========================================
# Scanning Settings
# ========================================

# Maximum file size to scan (0 = unlimited)
MaxScanSize 100M

# Maximum size of single file to scan
MaxFileSize 25M

# Maximum recursion depth for archives
MaxRecursion 16

# Maximum files in archive to scan
MaxFiles 10000

# Maximum scan time per file (milliseconds, 0 = unlimited)
MaxScanTime 120000

# ========================================
# Archive Scanning
# ========================================

# Scan inside archive files
ScanArchive yes

# Maximum depth for nested archives
ArchiveBlockEncrypted no

# Alert on encrypted archives (may contain hidden malware)
AlertEncrypted no

# Alert on encrypted documents (Office, PDF)
AlertEncryptedDoc no

# ========================================
# File Type Scanning
# ========================================

# Scan PE (Windows executable) files
ScanPE yes

# Scan ELF (Linux executable) files
ScanELF yes

# Scan OLE2 (Microsoft Office) documents
ScanOLE2 yes

# Scan PDF documents
ScanPDF yes

# Scan SWF (Flash) files
ScanSWF yes

# Scan HTML files
ScanHTML yes

# Scan XML-based documents
ScanXMLDOCS yes

# Scan mail files
ScanMail yes

# Automatically detect file types
DetectPUA yes

# Include potentially unwanted applications
IncludePUA Spy
IncludePUA Scanner
IncludePUA RAT

# ========================================
# Heuristic Detection
# ========================================

# Enable algorithmic detection
AlgorithmicDetection yes

# Heuristic scan precedence (enable for faster scanning)
HeuristicScanPrecedence yes

# Structured data detection (SSN, Credit Cards)
StructuredDataDetection yes

# ========================================
# Performance Tuning
# ========================================

# Number of threads for scanning
MaxThreads 12

# Queue length for pending scan requests
MaxQueue 100

# Idle timeout for client connections (seconds)
IdleTimeout 30

# Read timeout for client connections (seconds)
ReadTimeout 180

# Send timeout (seconds)
SendBufTimeout 200

# Maximum number of connection queue length
MaxConnectionQueueLength 200

# ========================================
# On-Access Scanning Settings
# ========================================

# Directories to monitor for on-access scanning
OnAccessIncludePath /home
OnAccessIncludePath /var/www
OnAccessIncludePath /tmp
OnAccessIncludePath /var/mail

# Directories to exclude from on-access scanning
OnAccessExcludePath /var/log
OnAccessExcludePath /var/lib/clamav
OnAccessExcludePath /proc
OnAccessExcludePath /sys
OnAccessExcludePath /dev

# Users to exclude from on-access scanning
OnAccessExcludeUname clamav

# Maximum file size for on-access scanning
OnAccessMaxFileSize 25M

# Prevention mode (block access to infected files)
OnAccessPrevention yes

# Extra scanning on file modification
OnAccessExtraScanning yes

# Disable Directory Data Dependency
OnAccessDisableDDD yes

# ========================================
# Network Settings (Optional)
# ========================================

# TCP port to listen on (uncomment to enable network access)
# TCPSocket 3310

# Address to bind to (0.0.0.0 for all interfaces)
# TCPAddr 127.0.0.1

# ========================================
# Bytecode Settings
# ========================================

# Enable bytecode interpreter
Bytecode yes

# Bytecode security level (TrustSigned is recommended)
BytecodeSecurity TrustSigned

# Bytecode execution timeout (milliseconds)
BytecodeTimeout 60000
```

After editing, restart the daemon:

```bash
# Test configuration for syntax errors
clamconf

# Restart ClamAV daemon to apply changes
sudo systemctl restart clamav-daemon

# Verify daemon is running
sudo systemctl status clamav-daemon
```

## Automated Scheduled Scans

Setting up automated scans ensures your system is regularly checked for malware.

### Create Scan Script

Create a comprehensive scan script:

```bash
sudo nano /usr/local/bin/clamav-scan.sh
```

Add the following content:

```bash
#!/bin/bash
# =============================================================================
# ClamAV Automated Scan Script
# Purpose: Perform scheduled malware scans with logging and notifications
# =============================================================================

# -----------------------------------------------------------------------------
# Configuration Variables
# -----------------------------------------------------------------------------

# Directories to scan (space-separated)
SCAN_DIRS="/home /var/www /tmp /var/mail"

# Directories to exclude (pipe-separated regex patterns)
EXCLUDE_DIRS="^/proc|^/sys|^/dev|^/run|^/var/lib/clamav"

# Log file location
LOG_FILE="/var/log/clamav/scheduled-scan-$(date +%Y%m%d).log"

# Summary log for monitoring
SUMMARY_LOG="/var/log/clamav/scan-summary.log"

# Quarantine directory
QUARANTINE_DIR="/var/clamav/quarantine"

# Email for notifications (leave empty to disable)
NOTIFY_EMAIL="admin@example.com"

# Maximum file size to scan (skip larger files)
MAX_FILE_SIZE="100M"

# -----------------------------------------------------------------------------
# Pre-Scan Setup
# -----------------------------------------------------------------------------

# Create quarantine directory if it doesn't exist
mkdir -p "$QUARANTINE_DIR"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Record scan start time
START_TIME=$(date +%s)
START_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "========================================" >> "$LOG_FILE"
echo "ClamAV Scan Started: $START_DATE" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# -----------------------------------------------------------------------------
# Perform Scan
# -----------------------------------------------------------------------------

# Run ClamAV scan with optimized settings
# --recursive: Scan subdirectories
# --infected: Only log infected files
# --exclude-dir: Skip specified directories
# --move: Quarantine infected files
# --max-filesize: Skip files larger than specified
SCAN_RESULT=$(clamscan --recursive \
    --infected \
    --exclude-dir="$EXCLUDE_DIRS" \
    --move="$QUARANTINE_DIR" \
    --max-filesize="$MAX_FILE_SIZE" \
    --log="$LOG_FILE" \
    $SCAN_DIRS 2>&1)

# Capture exit code
EXIT_CODE=$?

# -----------------------------------------------------------------------------
# Post-Scan Processing
# -----------------------------------------------------------------------------

# Record scan end time
END_TIME=$(date +%s)
END_DATE=$(date '+%Y-%m-%d %H:%M:%S')
DURATION=$((END_TIME - START_TIME))

# Extract statistics from scan results
SCANNED=$(echo "$SCAN_RESULT" | grep "Scanned files:" | awk '{print $3}')
INFECTED=$(echo "$SCAN_RESULT" | grep "Infected files:" | awk '{print $3}')
DATA_SCANNED=$(echo "$SCAN_RESULT" | grep "Data scanned:" | awk '{print $3, $4}')

# Log summary
echo "" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo "Scan Completed: $END_DATE" >> "$LOG_FILE"
echo "Duration: $DURATION seconds" >> "$LOG_FILE"
echo "Files Scanned: $SCANNED" >> "$LOG_FILE"
echo "Infected Files: $INFECTED" >> "$LOG_FILE"
echo "Data Scanned: $DATA_SCANNED" >> "$LOG_FILE"
echo "Exit Code: $EXIT_CODE" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Append to summary log for monitoring
echo "$END_DATE | Scanned: $SCANNED | Infected: $INFECTED | Duration: ${DURATION}s | Exit: $EXIT_CODE" >> "$SUMMARY_LOG"

# -----------------------------------------------------------------------------
# Send Notification if Infections Found
# -----------------------------------------------------------------------------

if [ "$INFECTED" -gt 0 ] && [ -n "$NOTIFY_EMAIL" ]; then
    # Prepare email body
    EMAIL_BODY="ClamAV Security Alert

Scan Date: $END_DATE
Host: $(hostname)

INFECTIONS DETECTED: $INFECTED

Infected files have been moved to: $QUARANTINE_DIR

Statistics:
- Files Scanned: $SCANNED
- Data Scanned: $DATA_SCANNED
- Scan Duration: $DURATION seconds

Please review the quarantine directory and log file:
$LOG_FILE

--
ClamAV Automated Scanner"

    # Send email notification
    echo "$EMAIL_BODY" | mail -s "[ALERT] ClamAV: $INFECTED infection(s) found on $(hostname)" "$NOTIFY_EMAIL"

    echo "Email notification sent to $NOTIFY_EMAIL" >> "$LOG_FILE"
fi

# -----------------------------------------------------------------------------
# Cleanup Old Logs (Keep Last 30 Days)
# -----------------------------------------------------------------------------

find /var/log/clamav -name "scheduled-scan-*.log" -mtime +30 -delete 2>/dev/null

# Exit with scan result code
exit $EXIT_CODE
```

Make the script executable:

```bash
sudo chmod +x /usr/local/bin/clamav-scan.sh
```

### Schedule Scans with Cron

Edit the root crontab to schedule automatic scans:

```bash
sudo crontab -e
```

Add scheduling entries:

```cron
# =============================================================================
# ClamAV Scheduled Scan Jobs
# =============================================================================

# Daily scan at 2:00 AM
0 2 * * * /usr/local/bin/clamav-scan.sh >> /var/log/clamav/cron.log 2>&1

# Weekly full system scan on Sunday at 3:00 AM
0 3 * * 0 clamscan -r --exclude-dir="^/proc" --exclude-dir="^/sys" --exclude-dir="^/dev" -l /var/log/clamav/weekly-scan.log /

# Check for virus definition updates every 2 hours
0 */2 * * * /usr/bin/freshclam --quiet
```

### Using Systemd Timers (Alternative to Cron)

Create a systemd timer for more control:

```bash
# Create service file
sudo nano /etc/systemd/system/clamav-scan.service
```

```ini
[Unit]
Description=ClamAV Scheduled Scan
After=network.target clamav-daemon.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/clamav-scan.sh
Nice=19
IOSchedulingClass=idle
```

Create the timer:

```bash
sudo nano /etc/systemd/system/clamav-scan.timer
```

```ini
[Unit]
Description=Run ClamAV scan daily

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=1800

[Install]
WantedBy=timers.target
```

Enable and start the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable clamav-scan.timer
sudo systemctl start clamav-scan.timer

# Verify timer is active
sudo systemctl list-timers clamav-scan.timer
```

## Email Scanning Integration

ClamAV can integrate with mail servers to scan incoming and outgoing emails.

### Install clamav-milter for Postfix

```bash
# Install the milter interface
sudo apt install clamav-milter -y
```

### Configure clamav-milter

Edit the milter configuration:

```bash
sudo nano /etc/clamav/clamav-milter.conf
```

Well-commented configuration:

```conf
# /etc/clamav/clamav-milter.conf
# Mail Filter Configuration for ClamAV

# ===========================================
# Socket Configuration
# ===========================================

# Milter socket for Postfix communication
MilterSocket /var/run/clamav/clamav-milter.ctl

# Socket ownership and permissions
MilterSocketGroup postfix
MilterSocketMode 660

# Fix stale socket on startup
FixStaleSocket true

# User to run as
User clamav

# ===========================================
# ClamAV Daemon Connection
# ===========================================

# Path to clamd socket
ClamdSocket unix:/var/run/clamav/clamd.ctl

# ===========================================
# Logging
# ===========================================

# Log file location
LogFile /var/log/clamav/clamav-milter.log

# Maximum log file size
LogFileMaxSize 5M

# Include timestamps
LogTime yes

# Verbose logging
LogVerbose no

# Log clean messages (disable in production)
LogClean no

# Use syslog
LogSyslog yes

# Syslog facility
LogFacility LOG_MAIL

# ===========================================
# Actions on Detection
# ===========================================

# Action on infected message: Accept, Reject, Defer, Blackhole, Quarantine
OnInfected Reject

# Action on scan failure
OnFail Defer

# Add header to scanned messages
AddHeader Add

# Header format for clean messages
VirusAction /usr/local/bin/virus-action.sh

# ===========================================
# Performance Settings
# ===========================================

# Maximum number of children processes
MaxFileSize 25M

# Timeout for communication with clamd
ReadTimeout 120

# ===========================================
# Whitelist/Blacklist
# ===========================================

# Whitelist specific addresses (uncomment to use)
# Whitelist /etc/clamav/whitelist.txt

# Skip scanning for authenticated users
# SkipAuthenticated yes
```

### Configure Postfix to Use clamav-milter

Edit Postfix main configuration:

```bash
sudo nano /etc/postfix/main.cf
```

Add these lines:

```conf
# ClamAV Milter Configuration
milter_default_action = accept
milter_protocol = 6
smtpd_milters = unix:/var/run/clamav/clamav-milter.ctl
non_smtpd_milters = $smtpd_milters
```

Restart services:

```bash
# Restart clamav-milter
sudo systemctl restart clamav-milter

# Restart Postfix
sudo systemctl restart postfix

# Verify milter is running
sudo systemctl status clamav-milter
```

### Alternative: Amavis Integration

For more advanced mail scanning, consider Amavis:

```bash
# Install Amavis with ClamAV support
sudo apt install amavisd-new -y

# Enable ClamAV in Amavis
sudo nano /etc/amavis/conf.d/15-content_filter_mode
```

Uncomment the virus scanning lines:

```perl
@bypass_virus_checks_maps = (
   \%bypass_virus_checks, \@bypass_virus_checks_acl, \$bypass_virus_checks_re);
```

## Quarantine Configuration

Proper quarantine management is essential for handling detected malware.

### Create Quarantine Structure

```bash
# Create quarantine directory structure
sudo mkdir -p /var/clamav/quarantine/{infected,suspicious,archive}

# Set proper ownership
sudo chown -R clamav:clamav /var/clamav/quarantine

# Set secure permissions (only clamav user can access)
sudo chmod -R 750 /var/clamav/quarantine
```

### Quarantine Management Script

Create a script to manage quarantined files:

```bash
sudo nano /usr/local/bin/clamav-quarantine-manager.sh
```

```bash
#!/bin/bash
# =============================================================================
# ClamAV Quarantine Manager
# Purpose: Manage quarantined files with logging and reporting
# =============================================================================

QUARANTINE_DIR="/var/clamav/quarantine"
ARCHIVE_DIR="$QUARANTINE_DIR/archive"
LOG_FILE="/var/log/clamav/quarantine.log"
RETENTION_DAYS=30

# Create archive directory if needed
mkdir -p "$ARCHIVE_DIR"

log_action() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# -----------------------------------------------------------------------------
# List Quarantined Files
# -----------------------------------------------------------------------------
list_quarantine() {
    echo "=== Quarantined Files ==="
    echo ""

    if [ -d "$QUARANTINE_DIR" ]; then
        find "$QUARANTINE_DIR" -type f -not -path "$ARCHIVE_DIR/*" -exec ls -lh {} \;
        echo ""
        echo "Total files: $(find "$QUARANTINE_DIR" -type f -not -path "$ARCHIVE_DIR/*" | wc -l)"
        echo "Total size: $(du -sh "$QUARANTINE_DIR" 2>/dev/null | cut -f1)"
    else
        echo "Quarantine directory does not exist."
    fi
}

# -----------------------------------------------------------------------------
# Analyze Quarantined File
# -----------------------------------------------------------------------------
analyze_file() {
    local file="$1"

    if [ ! -f "$file" ]; then
        echo "File not found: $file"
        return 1
    fi

    echo "=== File Analysis ==="
    echo "File: $file"
    echo "Size: $(ls -lh "$file" | awk '{print $5}')"
    echo "Type: $(file "$file")"
    echo "SHA256: $(sha256sum "$file" | awk '{print $1}')"
    echo ""
    echo "=== ClamAV Scan Result ==="
    clamscan "$file"

    log_action "Analyzed file: $file"
}

# -----------------------------------------------------------------------------
# Delete Old Quarantined Files
# -----------------------------------------------------------------------------
cleanup_quarantine() {
    echo "Cleaning up files older than $RETENTION_DAYS days..."

    # Find and archive old files
    find "$QUARANTINE_DIR" -type f -not -path "$ARCHIVE_DIR/*" -mtime +$RETENTION_DAYS | while read file; do
        # Create compressed archive
        gzip -c "$file" > "$ARCHIVE_DIR/$(basename "$file").$(date +%Y%m%d).gz"
        rm "$file"
        log_action "Archived and removed: $file"
    done

    # Remove very old archives (older than 90 days)
    find "$ARCHIVE_DIR" -type f -mtime +90 -delete

    echo "Cleanup complete."
    log_action "Quarantine cleanup completed"
}

# -----------------------------------------------------------------------------
# Generate Quarantine Report
# -----------------------------------------------------------------------------
generate_report() {
    echo "=== Quarantine Report ==="
    echo "Generated: $(date)"
    echo ""
    echo "Active Quarantine:"
    echo "  Files: $(find "$QUARANTINE_DIR" -type f -not -path "$ARCHIVE_DIR/*" | wc -l)"
    echo "  Size: $(du -sh "$QUARANTINE_DIR" 2>/dev/null | cut -f1)"
    echo ""
    echo "Archived:"
    echo "  Files: $(find "$ARCHIVE_DIR" -type f | wc -l)"
    echo "  Size: $(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)"
    echo ""
    echo "Recent Additions (Last 7 days):"
    find "$QUARANTINE_DIR" -type f -not -path "$ARCHIVE_DIR/*" -mtime -7 -exec ls -lh {} \;

    log_action "Report generated"
}

# -----------------------------------------------------------------------------
# Main Menu
# -----------------------------------------------------------------------------
case "$1" in
    list)
        list_quarantine
        ;;
    analyze)
        analyze_file "$2"
        ;;
    cleanup)
        cleanup_quarantine
        ;;
    report)
        generate_report
        ;;
    *)
        echo "Usage: $0 {list|analyze <file>|cleanup|report}"
        echo ""
        echo "Commands:"
        echo "  list              List all quarantined files"
        echo "  analyze <file>    Analyze a specific quarantined file"
        echo "  cleanup           Remove files older than $RETENTION_DAYS days"
        echo "  report            Generate quarantine report"
        exit 1
        ;;
esac
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/clamav-quarantine-manager.sh
```

## Performance Tuning

Optimize ClamAV for your system's resources and scanning requirements.

### Memory Optimization

For systems with limited memory:

```conf
# /etc/clamav/clamd.conf - Low Memory Settings

# Reduce maximum scan size
MaxScanSize 50M
MaxFileSize 10M

# Limit concurrent threads
MaxThreads 2

# Reduce queue size
MaxQueue 50

# Shorter timeouts
IdleTimeout 15
ReadTimeout 60
```

For systems with abundant memory:

```conf
# /etc/clamav/clamd.conf - High Performance Settings

# Increase scan limits
MaxScanSize 500M
MaxFileSize 100M

# More concurrent threads
MaxThreads 20

# Larger queue
MaxQueue 200

# Preload database into memory
ConcurrentDatabaseReload yes
```

### I/O Optimization

```bash
# Create RAM disk for temporary scan files
sudo mkdir -p /tmp/clamav-temp
sudo mount -t tmpfs -o size=256M tmpfs /tmp/clamav-temp

# Add to /etc/fstab for persistence
echo "tmpfs /tmp/clamav-temp tmpfs size=256M,mode=0750,uid=clamav,gid=clamav 0 0" | sudo tee -a /etc/fstab
```

Configure ClamAV to use the RAM disk:

```conf
# /etc/clamav/clamd.conf
TemporaryDirectory /tmp/clamav-temp
```

### Exclude Unnecessary Files

Create an exclusion file for better performance:

```bash
sudo nano /etc/clamav/scan-exclusions.conf
```

```conf
# Directories to exclude from scanning
# System directories
^/proc
^/sys
^/dev
^/run
^/snap

# Large data directories (if trusted)
^/var/lib/mysql
^/var/lib/postgresql
^/var/lib/docker/overlay2

# Backup directories
^/backup
^/mnt/backup

# ClamAV's own database
^/var/lib/clamav

# Log directories (optional, may want to scan)
# ^/var/log
```

## Monitoring and Alerting

Implement comprehensive monitoring for your ClamAV installation.

### Create Monitoring Script

```bash
sudo nano /usr/local/bin/clamav-monitor.sh
```

```bash
#!/bin/bash
# =============================================================================
# ClamAV Health Monitor
# Purpose: Monitor ClamAV services and database status
# =============================================================================

# Configuration
ALERT_EMAIL="admin@example.com"
LOG_FILE="/var/log/clamav/monitor.log"
STATUS_FILE="/var/run/clamav/health-status"

# Exit codes
EXIT_OK=0
EXIT_WARNING=1
EXIT_CRITICAL=2

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local message="$2"

    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log_message "Alert sent: $subject"
    fi
}

# -----------------------------------------------------------------------------
# Check ClamAV Daemon Status
# -----------------------------------------------------------------------------
check_daemon() {
    if systemctl is-active --quiet clamav-daemon; then
        echo "OK: ClamAV daemon is running"
        return $EXIT_OK
    else
        echo "CRITICAL: ClamAV daemon is not running"
        send_alert "[CRITICAL] ClamAV daemon down on $(hostname)" \
            "The ClamAV daemon (clamd) is not running on $(hostname). Please investigate immediately."
        return $EXIT_CRITICAL
    fi
}

# -----------------------------------------------------------------------------
# Check Freshclam Status
# -----------------------------------------------------------------------------
check_freshclam() {
    if systemctl is-active --quiet clamav-freshclam; then
        echo "OK: Freshclam service is running"
        return $EXIT_OK
    else
        echo "WARNING: Freshclam service is not running"
        send_alert "[WARNING] Freshclam service down on $(hostname)" \
            "The Freshclam update service is not running. Virus definitions may become outdated."
        return $EXIT_WARNING
    fi
}

# -----------------------------------------------------------------------------
# Check Database Age
# -----------------------------------------------------------------------------
check_database_age() {
    local db_file="/var/lib/clamav/daily.cvd"
    local max_age_hours=48

    if [ ! -f "$db_file" ]; then
        db_file="/var/lib/clamav/daily.cld"
    fi

    if [ ! -f "$db_file" ]; then
        echo "CRITICAL: Virus database not found"
        return $EXIT_CRITICAL
    fi

    local db_age=$(( ($(date +%s) - $(stat -c %Y "$db_file")) / 3600 ))

    if [ $db_age -gt $max_age_hours ]; then
        echo "WARNING: Virus database is $db_age hours old (max: $max_age_hours)"
        send_alert "[WARNING] ClamAV database outdated on $(hostname)" \
            "Virus definitions are $db_age hours old. Please check freshclam service."
        return $EXIT_WARNING
    else
        echo "OK: Virus database is $db_age hours old"
        return $EXIT_OK
    fi
}

# -----------------------------------------------------------------------------
# Check Socket Accessibility
# -----------------------------------------------------------------------------
check_socket() {
    local socket="/var/run/clamav/clamd.ctl"

    if [ -S "$socket" ]; then
        # Try to connect
        if echo "PING" | nc -U "$socket" | grep -q "PONG"; then
            echo "OK: ClamAV socket is responsive"
            return $EXIT_OK
        else
            echo "WARNING: ClamAV socket exists but not responsive"
            return $EXIT_WARNING
        fi
    else
        echo "CRITICAL: ClamAV socket not found"
        return $EXIT_CRITICAL
    fi
}

# -----------------------------------------------------------------------------
# Check Quarantine Size
# -----------------------------------------------------------------------------
check_quarantine() {
    local quarantine_dir="/var/clamav/quarantine"
    local max_size_mb=1000

    if [ -d "$quarantine_dir" ]; then
        local size_mb=$(du -sm "$quarantine_dir" | cut -f1)
        local file_count=$(find "$quarantine_dir" -type f | wc -l)

        if [ $size_mb -gt $max_size_mb ]; then
            echo "WARNING: Quarantine size is ${size_mb}MB ($file_count files)"
            return $EXIT_WARNING
        else
            echo "OK: Quarantine size is ${size_mb}MB ($file_count files)"
            return $EXIT_OK
        fi
    else
        echo "OK: Quarantine directory not configured"
        return $EXIT_OK
    fi
}

# -----------------------------------------------------------------------------
# Check Recent Scan Results
# -----------------------------------------------------------------------------
check_recent_scans() {
    local summary_log="/var/log/clamav/scan-summary.log"

    if [ -f "$summary_log" ]; then
        local last_scan=$(tail -1 "$summary_log")
        local last_infected=$(echo "$last_scan" | grep -oP 'Infected: \K[0-9]+')

        if [ -n "$last_infected" ] && [ "$last_infected" -gt 0 ]; then
            echo "WARNING: Last scan found $last_infected infection(s)"
            return $EXIT_WARNING
        else
            echo "OK: Last scan clean"
            return $EXIT_OK
        fi
    else
        echo "OK: No scan history available"
        return $EXIT_OK
    fi
}

# -----------------------------------------------------------------------------
# Main Monitoring Loop
# -----------------------------------------------------------------------------

echo "============================================"
echo "ClamAV Health Check - $(date)"
echo "============================================"
echo ""

overall_status=$EXIT_OK

# Run all checks
for check in check_daemon check_freshclam check_database_age check_socket check_quarantine check_recent_scans; do
    result=$($check)
    exit_code=$?
    echo "$result"

    if [ $exit_code -gt $overall_status ]; then
        overall_status=$exit_code
    fi
done

echo ""
echo "============================================"
case $overall_status in
    $EXIT_OK)
        echo "Overall Status: OK"
        ;;
    $EXIT_WARNING)
        echo "Overall Status: WARNING"
        ;;
    $EXIT_CRITICAL)
        echo "Overall Status: CRITICAL"
        ;;
esac
echo "============================================"

# Write status file for external monitoring
echo "$overall_status" > "$STATUS_FILE"

log_message "Health check completed with status: $overall_status"

exit $overall_status
```

Make executable and schedule:

```bash
sudo chmod +x /usr/local/bin/clamav-monitor.sh

# Add to crontab for regular monitoring
echo "*/15 * * * * /usr/local/bin/clamav-monitor.sh >> /var/log/clamav/monitor.log 2>&1" | sudo tee -a /etc/cron.d/clamav-monitor
```

### Prometheus Metrics Exporter

For systems using Prometheus monitoring:

```bash
sudo nano /usr/local/bin/clamav-prometheus-exporter.sh
```

```bash
#!/bin/bash
# ClamAV Prometheus Metrics Exporter

METRICS_FILE="/var/lib/prometheus/node-exporter/clamav.prom"

# Get metrics
daemon_running=$(systemctl is-active --quiet clamav-daemon && echo 1 || echo 0)
freshclam_running=$(systemctl is-active --quiet clamav-freshclam && echo 1 || echo 0)

db_file="/var/lib/clamav/daily.cvd"
[ ! -f "$db_file" ] && db_file="/var/lib/clamav/daily.cld"
db_age_hours=$(( ($(date +%s) - $(stat -c %Y "$db_file" 2>/dev/null || echo $(date +%s))) / 3600 ))

quarantine_files=$(find /var/clamav/quarantine -type f 2>/dev/null | wc -l)
quarantine_size=$(du -sb /var/clamav/quarantine 2>/dev/null | cut -f1 || echo 0)

# Write metrics
cat > "$METRICS_FILE" << EOF
# HELP clamav_daemon_running ClamAV daemon status (1=running, 0=stopped)
# TYPE clamav_daemon_running gauge
clamav_daemon_running $daemon_running

# HELP clamav_freshclam_running Freshclam service status (1=running, 0=stopped)
# TYPE clamav_freshclam_running gauge
clamav_freshclam_running $freshclam_running

# HELP clamav_database_age_hours Age of virus database in hours
# TYPE clamav_database_age_hours gauge
clamav_database_age_hours $db_age_hours

# HELP clamav_quarantine_files Number of files in quarantine
# TYPE clamav_quarantine_files gauge
clamav_quarantine_files $quarantine_files

# HELP clamav_quarantine_size_bytes Size of quarantine directory in bytes
# TYPE clamav_quarantine_size_bytes gauge
clamav_quarantine_size_bytes $quarantine_size
EOF
```

## Troubleshooting Common Issues

### Database Update Failures

```bash
# Check freshclam logs
sudo tail -f /var/log/clamav/freshclam.log

# Manual database download
sudo systemctl stop clamav-freshclam
sudo freshclam --verbose

# If mirrors are blocked, use alternate
sudo nano /etc/clamav/freshclam.conf
# Add: DatabaseMirror db.us.clamav.net
```

### Daemon Won't Start

```bash
# Check for configuration errors
clamconf

# Check system logs
sudo journalctl -u clamav-daemon -f

# Verify socket permissions
ls -la /var/run/clamav/

# Recreate socket directory
sudo mkdir -p /var/run/clamav
sudo chown clamav:clamav /var/run/clamav
```

### High Memory Usage

```bash
# Reduce memory footprint
sudo nano /etc/clamav/clamd.conf

# Set conservative limits
MaxScanSize 50M
MaxFileSize 25M
MaxRecursion 10
MaxThreads 2
```

### Scan Performance Issues

```bash
# Use clamdscan instead of clamscan for better performance
clamdscan -m /path/to/scan

# Exclude large/trusted directories
clamscan -r --exclude-dir="^/var/lib/docker" /

# Increase nice level for background scans
nice -n 19 clamscan -r /home
```

## Best Practices Summary

1. **Keep definitions updated**: Ensure freshclam runs at least every 4 hours
2. **Use the daemon**: clamdscan is significantly faster than clamscan for regular scans
3. **Configure exclusions**: Skip known-safe directories to improve performance
4. **Monitor quarantine**: Regularly review and clean up quarantined files
5. **Enable logging**: Maintain detailed logs for security auditing
6. **Test your setup**: Periodically verify ClamAV catches test files (EICAR)
7. **Automate scans**: Schedule regular full-system scans during off-peak hours
8. **Monitor service health**: Set up alerts for daemon failures or outdated databases

## Monitoring ClamAV with OneUptime

While ClamAV provides robust malware protection, monitoring its health and performance is equally important. OneUptime offers comprehensive monitoring solutions that can help you keep track of your ClamAV installation:

- **Service Monitoring**: Monitor the ClamAV daemon and freshclam service uptime to ensure they are always running
- **Log Monitoring**: Analyze ClamAV logs to detect patterns, identify threats, and track scanning activity
- **Custom Metrics**: Track virus database age, quarantine size, and scan statistics using custom dashboards
- **Alerting**: Receive instant notifications via email, Slack, or SMS when ClamAV services fail or when infections are detected
- **Incident Management**: Automatically create incidents when security threats are detected, with full audit trails

By combining ClamAV's malware protection with OneUptime's monitoring capabilities, you can ensure your Ubuntu systems remain secure and any issues are detected and resolved quickly.

Visit [OneUptime](https://oneuptime.com) to learn more about setting up comprehensive monitoring for your security infrastructure.

---

With ClamAV properly configured on your Ubuntu system, you have a powerful defense against malware. Regular maintenance, including keeping virus definitions updated and reviewing scan logs, will help maintain a secure environment. Remember that antivirus is just one layer of a comprehensive security strategy that should also include firewalls, intrusion detection, and regular security audits.
