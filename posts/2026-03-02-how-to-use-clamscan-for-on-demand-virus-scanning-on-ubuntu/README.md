# How to Use ClamScan for On-Demand Virus Scanning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, ClamAV, Antivirus, System Administration

Description: Learn how to use ClamScan on Ubuntu to perform on-demand virus scanning of files and directories, schedule automated scans, and integrate antivirus checks into your workflow.

---

ClamAV is the standard open-source antivirus engine for Linux. While Linux servers are less frequently targeted by traditional viruses than Windows systems, ClamAV is essential for servers that handle file uploads, serve as mail relays, or operate in environments with compliance requirements. `clamscan` is the command-line scanner that uses ClamAV's virus definition database to check files and directories for malware. This guide covers installation, scanning techniques, automation, and practical integration patterns.

## Installing ClamAV on Ubuntu

```bash
# Update package lists and install ClamAV
sudo apt-get update
sudo apt-get install -y clamav clamav-daemon

# Stop clamav-freshclam service temporarily to update manually
sudo systemctl stop clamav-freshclam

# Update virus definitions (this may take a few minutes on first run)
sudo freshclam

# Start the freshclam service to keep definitions updated automatically
sudo systemctl start clamav-freshclam
sudo systemctl enable clamav-freshclam

# Verify installation
clamscan --version
```

The `clamav-daemon` package installs `clamd`, a background daemon that's faster for high-volume scanning because it keeps the virus database loaded in memory.

## Understanding the Two Scanning Modes

ClamAV provides two tools for scanning:

- **clamscan** - Standalone scanner that loads the database on every run. Slower to start but no daemon required. Good for infrequent scans.
- **clamdscan** - Client for the `clamd` daemon. The database stays loaded in memory, making scans much faster. Better for frequent or automated scanning.

## Basic Scanning with clamscan

```bash
# Scan a single file
clamscan /home/ubuntu/uploads/document.pdf

# Scan a directory (non-recursive)
clamscan /home/ubuntu/uploads/

# Scan a directory recursively (most common use case)
clamscan -r /home/ubuntu/uploads/

# Scan and show only infected files (suppress clean file output)
clamscan -r --infected /home/ubuntu/uploads/

# Scan and remove infected files automatically (use with caution)
clamscan -r --remove /tmp/suspicious-files/
```

## Useful clamscan Options

```bash
# Verbose output with file names as they're scanned
clamscan -r --verbose /home/ubuntu/

# Scan only specific file extensions
clamscan -r --include="*.php" --include="*.js" /var/www/html/

# Exclude directories from scan
clamscan -r \
  --exclude-dir="^/proc" \
  --exclude-dir="^/sys" \
  --exclude-dir="^/dev" \
  /

# Limit file size scanned (skip files larger than 100MB)
clamscan -r --max-filesize=100M /home/ubuntu/

# Scan archives (zip, tar, etc.) - enabled by default
clamscan -r --scan-archive=yes /uploads/

# Output results to a log file
clamscan -r --log=/var/log/clamav/scan.log /home/ubuntu/uploads/

# Show summary only (no per-file output)
clamscan -r --quiet /home/ubuntu/ && echo "Clean" || echo "Threats found"
```

## Using clamdscan for Faster Scanning

First, ensure clamd is running:

```bash
# Start and enable the clamd daemon
sudo systemctl enable --now clamav-daemon

# Verify daemon is running
sudo systemctl status clamav-daemon
```

Then use clamdscan which communicates with the running daemon:

```bash
# Scan with clamdscan (much faster than clamscan)
clamdscan /home/ubuntu/uploads/

# Recursive scan
clamdscan -r /home/ubuntu/uploads/

# Show only infected files
clamdscan -r --infected /home/ubuntu/uploads/

# Multi-threaded scanning using all available CPUs
clamdscan -r --multiscan /home/ubuntu/uploads/

# Scan a file passed via stdin (useful for pipes)
cat suspicious.file | clamdscan --stdin
```

## Scanning File Uploads Automatically

For web applications that accept file uploads, scanning uploads before processing them is a common security requirement.

### Bash Wrapper Script for Upload Scanning

```bash
#!/bin/bash
# /usr/local/bin/scan-upload.sh
# Scans an uploaded file and moves it to safe or quarantine directory
# Usage: scan-upload.sh <filepath>

UPLOAD_FILE="$1"
SAFE_DIR="/var/www/uploads/safe"
QUARANTINE_DIR="/var/www/uploads/quarantine"
LOG_FILE="/var/log/clamav/upload-scans.log"

mkdir -p "$SAFE_DIR" "$QUARANTINE_DIR"

if [[ -z "$UPLOAD_FILE" || ! -f "$UPLOAD_FILE" ]]; then
    echo "Usage: $0 <filepath>" >&2
    exit 1
fi

FILENAME=$(basename "$UPLOAD_FILE")
TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)

# Run scan (use clamdscan for speed if daemon is available)
if systemctl is-active --quiet clamav-daemon; then
    SCAN_RESULT=$(clamdscan --infected --no-summary "$UPLOAD_FILE" 2>&1)
    SCAN_EXIT=$?
else
    SCAN_RESULT=$(clamscan --infected --no-summary "$UPLOAD_FILE" 2>&1)
    SCAN_EXIT=$?
fi

if [[ $SCAN_EXIT -eq 0 ]]; then
    # File is clean - move to safe directory
    mv "$UPLOAD_FILE" "$SAFE_DIR/$FILENAME"
    echo "$TIMESTAMP CLEAN: $FILENAME moved to safe directory" >> "$LOG_FILE"
    echo "CLEAN"
    exit 0
elif [[ $SCAN_EXIT -eq 1 ]]; then
    # Virus found - quarantine the file
    mv "$UPLOAD_FILE" "$QUARANTINE_DIR/${FILENAME}.quarantine"
    echo "$TIMESTAMP INFECTED: $FILENAME quarantined. Details: $SCAN_RESULT" >> "$LOG_FILE"
    echo "INFECTED: $SCAN_RESULT"
    exit 1
else
    # Scan error
    echo "$TIMESTAMP ERROR: Scan failed for $FILENAME. Exit: $SCAN_EXIT" >> "$LOG_FILE"
    echo "ERROR: Scan failed"
    exit 2
fi
```

### PHP Integration Example

```php
<?php
// upload-handler.php - Scan uploaded files before processing

function scanUploadedFile(string $filePath): bool {
    $scanScript = '/usr/local/bin/scan-upload.sh';

    // Call the scan script
    $output = [];
    $exitCode = 0;
    exec(escapeshellcmd("$scanScript " . escapeshellarg($filePath)), $output, $exitCode);

    if ($exitCode === 0) {
        return true;  // File is clean
    }

    // Log the infected file detection
    error_log("ClamAV: Infected file detected: " . implode("\n", $output));
    return false;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['upload'])) {
    $tmpFile = $_FILES['upload']['tmp_name'];

    if (!scanUploadedFile($tmpFile)) {
        http_response_code(422);
        echo json_encode(['error' => 'File failed security scan']);
        exit;
    }

    // Process the clean file
    $destination = '/var/www/uploads/safe/' . basename($_FILES['upload']['name']);
    move_uploaded_file($tmpFile, $destination);
    echo json_encode(['success' => true]);
}
```

## Scheduling Automated Scans

Regular full-system or directory scans help catch threats that bypass real-time detection.

```bash
# Create a comprehensive scan script
sudo tee /usr/local/bin/scheduled-scan.sh << 'EOF'
#!/bin/bash
# Scheduled ClamAV scan with reporting

SCAN_DIRS="/home /var/www /tmp /var/tmp"
LOG_DIR="/var/log/clamav"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/scan-$DATE.log"
QUARANTINE_DIR="/var/quarantine"

mkdir -p "$LOG_DIR" "$QUARANTINE_DIR"

echo "=== ClamAV Scan Started: $(date) ===" >> "$LOG_FILE"

# Run scan and move infected files to quarantine
clamscan \
    --recursive \
    --infected \
    --remove=no \
    --move="$QUARANTINE_DIR" \
    --exclude-dir="^/proc" \
    --exclude-dir="^/sys" \
    --exclude-dir="^/dev" \
    --exclude-dir="^/run" \
    --log="$LOG_FILE" \
    $SCAN_DIRS

SCAN_EXIT=$?

echo "=== ClamAV Scan Completed: $(date) ===" >> "$LOG_FILE"
echo "Exit code: $SCAN_EXIT" >> "$LOG_FILE"

# Send alert email if threats found
if [[ $SCAN_EXIT -eq 1 ]]; then
    SUMMARY=$(tail -20 "$LOG_FILE")
    echo -e "Subject: ALERT: Malware detected on $(hostname)\n\n$SUMMARY" | \
        sendmail admin@example.com
fi

# Retain logs for 30 days
find "$LOG_DIR" -name "scan-*.log" -mtime +30 -delete
EOF

sudo chmod +x /usr/local/bin/scheduled-scan.sh

# Schedule daily scan at 3 AM
sudo crontab -e
# Add:
# 0 3 * * * /usr/local/bin/scheduled-scan.sh
```

## Keeping Virus Definitions Current

Freshclam manages virus definition updates. Verify it's configured correctly:

```bash
# View freshclam configuration
cat /etc/clamav/freshclam.conf

# Check when definitions were last updated
sudo stat /var/lib/clamav/main.cvd
sudo stat /var/lib/clamav/daily.cvd

# Manually trigger an update
sudo freshclam

# Check freshclam service status and logs
sudo systemctl status clamav-freshclam
sudo journalctl -u clamav-freshclam --since "24 hours ago"
```

Default freshclam configuration updates virus signatures up to 24 times per day. For most servers, this is sufficient.

## Interpreting Scan Results

```bash
# Example output from a scan with threats
# /tmp/eicar-test.txt: Eicar-Signature FOUND
# /home/ubuntu/suspicious.php: PHP.ShellExec FOUND
#
# ----------- SCAN SUMMARY -----------
# Infected files: 2
# Time: 45.123 sec (0 m 45 s)
# Start Date: 2026:03:02 14:30:00
# End Date:   2026:03:02 14:30:45

# Exit codes:
# 0 = No threats found (clean)
# 1 = Threats found
# 2 = Scan error (permissions, missing files, etc.)
```

You can test your ClamAV setup with the EICAR test file, which is a harmless file that ClamAV recognizes as a test virus:

```bash
# Download and scan the EICAR test signature
curl -LO https://www.eicar.org/download/eicar.com.txt
clamscan eicar.com.txt
# Should report: eicar.com.txt: Eicar-Signature FOUND
rm eicar.com.txt
```

ClamScan is a solid first line of defense for Linux file servers and upload handlers. Combined with scheduled scans, freshclam for up-to-date definitions, and quarantine workflows, it addresses the most common virus scanning requirements in compliance-sensitive environments.
