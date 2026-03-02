# How to Set Up ClamAV Mail Scanning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ClamAV, Email, Anti-Virus, Postfix

Description: Install and configure ClamAV antivirus scanning for email on Ubuntu using clamav-milter with Postfix to detect and quarantine infected attachments.

---

ClamAV is an open-source antivirus engine designed for scanning email, files, and web content. Integrating it with Postfix lets you scan inbound email for viruses, ransomware, and malware before it reaches user mailboxes. The `clamav-milter` package provides the Postfix integration without writing custom scripts.

## Installing ClamAV

```bash
# Install ClamAV and the Postfix milter integration
sudo apt update
sudo apt install -y clamav clamav-daemon clamav-milter

# Verify installation
clamscan --version
```

## Initial Signature Database Update

ClamAV requires a current signature database. The `freshclam` service handles automatic updates.

```bash
# Stop ClamAV daemon before the first update
sudo systemctl stop clamav-daemon

# Run freshclam manually to download signatures
sudo freshclam

# Check what was downloaded
ls -lh /var/lib/clamav/

# Start the daemon after database is ready
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon

# Verify it is running
sudo systemctl status clamav-daemon
```

## Configuring the ClamAV Daemon

The daemon configuration file is `/etc/clamav/clamd.conf`:

```bash
# Key settings to review and adjust
sudo grep -v "^#\|^$" /etc/clamav/clamd.conf | head -30
```

Common tuning options:

```bash
# Edit the config file
sudo nano /etc/clamav/clamd.conf
```

```
# /etc/clamav/clamd.conf key settings

# Unix socket for the milter to connect to
LocalSocket /var/run/clamav/clamd.ctl

# Maximum file size to scan (in bytes, default 25MB)
MaxFileSize 25M

# Maximum scan size (across nested archives)
MaxScanSize 100M

# Maximum recursion depth for archives
MaxRecursion 16

# Scan archives (zip, tar, etc.)
ScanArchive yes

# Scan email content (MIME, base64, etc.)
ScanMail yes

# Scan PDF files
ScanPDF yes

# Log infected files
LogViruses yes

# Syslog integration
LogSyslog yes
LogFacility LOG_MAIL
```

## Configuring freshclam for Automatic Updates

```bash
sudo nano /etc/clamav/freshclam.conf
```

```
# /etc/clamav/freshclam.conf key settings

# Check for updates 12 times per day (every 2 hours)
Checks 12

# Database mirrors - the official ones are fine
DatabaseMirror database.clamav.net

# Log updates
LogVerbose no
LogSyslog yes

# Notify clamd after updating
NotifyClamd /etc/clamav/clamd.conf
```

```bash
sudo systemctl enable clamav-freshclam
sudo systemctl restart clamav-freshclam
```

## Configuring clamav-milter

The milter connects Postfix to ClamAV. Configure it to decide what to do with infected mail:

```bash
sudo nano /etc/clamav/clamav-milter.conf
```

```
# /etc/clamav/clamav-milter.conf

# Socket for Postfix to connect to
MilterSocket /run/clamav/clamav-milter.ctl
MilterSocketMode 660

# Who the socket is owned by (postfix needs access)
User clamav

# What to do with infected messages:
# Reject - return a 5xx error to the sender
# Quarantine - accept but move to a quarantine folder
# Accept - accept but add a header (for testing)
OnInfected Reject

# What to do with messages that fail scanning (corrupted, too large)
OnFail Defer

# Add a header to clean mail (useful for monitoring)
AddHeader Replace

# ClamAV daemon socket
ClamdSocket unix:/var/run/clamav/clamd.ctl

# Log detections
LogInfected Basic
LogClean Off

# Report sender/recipient info when logging
ReportHostname yes
```

```bash
# Add clamav user to postfix group so the milter socket is accessible
sudo adduser clamav postfix

sudo systemctl restart clamav-milter
sudo systemctl enable clamav-milter

# Verify the milter socket was created
ls -la /run/clamav/clamav-milter.ctl
```

## Integrating clamav-milter with Postfix

```bash
# Add the ClamAV milter to Postfix
# If you have other milters (OpenDKIM, OpenDMARC), add clamav-milter to the list

# Check existing milter configuration
postconf smtpd_milters

# Add clamav-milter to the milters
sudo postconf -e "smtpd_milters = local:/run/clamav/clamav-milter.ctl"
sudo postconf -e "non_smtpd_milters = local:/run/clamav/clamav-milter.ctl"
sudo postconf -e "milter_default_action = accept"

# If combining with OpenDKIM:
# sudo postconf -e "smtpd_milters = local:/run/opendkim/opendkim.sock, local:/run/clamav/clamav-milter.ctl"

sudo systemctl reload postfix
```

## Testing ClamAV Mail Scanning

```bash
# ClamAV ships with EICAR test virus - a harmless file for testing AV systems
# This is the EICAR standard test string
EICAR='X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

# Test ClamAV detection directly
echo "$EICAR" > /tmp/eicar.txt
clamscan /tmp/eicar.txt

# Expected output:
# /tmp/eicar.txt: Eicar-Signature FOUND

# Test via email - send a message with the EICAR string as an attachment
# Using swaks for testing
sudo apt install -y swaks

# This should be rejected by clamav-milter
swaks --to localuser@example.com \
    --from test@external.com \
    --attach /tmp/eicar.txt \
    --server 127.0.0.1

# Check the mail log for the rejection
sudo tail -f /var/log/mail.log | grep -i clamav

# You should see something like:
# clamav-milter: REJECT: Eicar-Signature FROM: <test@external.com> ...
```

## Setting Up a Quarantine Instead of Rejecting

Some administrators prefer to quarantine suspicious mail rather than reject it, so nothing is lost even if there are false positives:

```bash
# Change the milter configuration to quarantine instead of reject
sudo sed -i 's/OnInfected Reject/OnInfected Quarantine/' /etc/clamav/clamav-milter.conf

# Create a quarantine mailbox
# With Postfix local delivery, add a user for quarantine
sudo useradd -m -s /sbin/nologin virus-quarantine

# Add a Postfix transport for quarantined mail
# In /etc/postfix/transport:
echo "virus-quarantine@localhost  local:virus-quarantine" | \
    sudo tee -a /etc/postfix/transport

sudo postmap /etc/postfix/transport
sudo postconf -e "transport_maps = hash:/etc/postfix/transport"

sudo systemctl restart clamav-milter postfix
```

## Monitoring and Reporting

```bash
# View ClamAV detection logs
sudo grep "FOUND" /var/log/syslog | grep clamav | tail -50

# Count detections in the last 24 hours
sudo journalctl -u clamav-milter --since "24 hours ago" | grep -c "REJECT\|FOUND"

# View freshclam update history
sudo journalctl -u clamav-freshclam --since "7 days ago" | tail -30

# Check database age (important - signatures should be current)
sudo freshclam --version

# Show database information
sudo sigtool --info /var/lib/clamav/main.cvd
sudo sigtool --info /var/lib/clamav/daily.cvd
```

## Adding Custom Signatures

For blocking specific file types or patterns beyond the official signatures:

```bash
# Create a local signature database directory
sudo mkdir -p /var/lib/clamav/custom

# Example: block executable attachments by hash
# First, get the SHA256 hash of a known malware file
# sha256sum /path/to/malware.exe > malware.sha256

# Add to a custom database file (HDB format for hashes)
# echo "HASHVALUE:FILESIZE:MalwareName" >> /var/lib/clamav/custom/local.hdb

# Reload ClamAV to use new signatures
sudo systemctl reload clamav-daemon
```

## Performance Tuning

ClamAV can be resource-intensive on busy servers:

```bash
# Increase the number of scanner threads for high-volume servers
sudo nano /etc/clamav/clamd.conf
# MaxThreads 20  (default is usually 12)

# Limit memory usage
# MaxScanSize 50M  (balance between thoroughness and resource use)

# Exclude low-risk large files from scanning
# ExcludePath ^/var/lib/  (don't scan databases)

# For very high volume, consider a dedicated ClamAV server
# and point multiple mail servers to it via TCP socket

sudo systemctl restart clamav-daemon
```

## Troubleshooting

```bash
# If the milter socket doesn't exist:
ls -la /run/clamav/

# If Postfix can't connect to the milter:
sudo journalctl -u clamav-milter -f

# Test direct connection to clamd
echo PING | sudo nc -q1 -U /var/run/clamav/clamd.ctl

# If clamd is not responding:
sudo systemctl restart clamav-daemon

# Check if the database was downloaded successfully
ls -lh /var/lib/clamav/*.cvd /var/lib/clamav/*.cld 2>/dev/null

# If freshclam fails due to network issues:
sudo freshclam --verbose
```

ClamAV is not perfect - its detection rate for zero-day threats is lower than commercial solutions - but it catches known malware reliably and is an important layer in a defense-in-depth mail security strategy. Combined with greylisting, SPF, DKIM, and DMARC, it significantly reduces the risk of malware delivered through your mail server.
