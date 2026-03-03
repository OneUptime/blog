# How to Configure ClamAV Milter with Postfix on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, ClamAV, Postfix, Security

Description: Set up ClamAV with clamav-milter on Ubuntu to scan email attachments for viruses and malware in real time as Postfix receives messages.

---

Running a mail server without virus scanning is accepting unnecessary risk. ClamAV is a widely-used open-source antivirus engine that integrates with Postfix through the milter (mail filter) protocol. Every message that Postfix receives gets scanned before delivery, and infected messages are rejected before they reach users' mailboxes.

## How the Integration Works

When Postfix receives a message, it passes it to clamav-milter before accepting it. clamav-milter scans the message content and all attachments using the ClamAV engine. If a virus is detected, clamav-milter tells Postfix to reject the message with an informative error. Clean messages pass through and are delivered normally.

## Installing ClamAV

```bash
sudo apt update
sudo apt install -y clamav clamav-daemon clamav-milter

# Verify installation
clamscan --version
```

## Initial Virus Database Update

ClamAV requires up-to-date signature databases. The `freshclam` service handles automatic updates, but run an initial update before starting:

```bash
# Stop the daemon first (it holds the database lock)
sudo systemctl stop clamav-freshclam

# Run the initial update
sudo freshclam

# Start freshclam for ongoing updates
sudo systemctl start clamav-freshclam
sudo systemctl enable clamav-freshclam

# Verify the database was downloaded
ls -la /var/lib/clamav/
```

## Configuring the ClamAV Daemon

The ClamAV daemon (clamd) runs as a background service that handles scanning requests:

```bash
sudo nano /etc/clamav/clamd.conf
```

Key settings to review and configure:

```text
# Log file location
LogFile /var/log/clamav/clamav.log
LogFileMaxSize 100M
LogRotate yes
LogTime yes

# Maximum file size to scan (in bytes)
# 100MB is reasonable; larger files may indicate data transfer, not email
MaxFileSize 100M

# Maximum size of files to scan inside archives
MaxScanSize 400M

# Alert on encrypted archives (may contain viruses)
AlertEncrypted no

# Socket for clamd communication
LocalSocket /var/run/clamav/clamd.ctl
LocalSocketMode 666

# TCP socket (alternative to local socket)
# TCPSocket 3310
# TCPAddr 127.0.0.1

# Database directory
DatabaseDirectory /var/lib/clamav

# User to run as
User clamav
```

```bash
# Start the ClamAV daemon
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
sudo systemctl status clamav-daemon
```

## Configuring clamav-milter

The clamav-milter acts as the bridge between Postfix and the ClamAV scanning engine:

```bash
sudo nano /etc/clamav/clamav-milter.conf
```

Important configuration options:

```text
# Socket that Postfix connects to
MilterSocket /var/spool/postfix/clamav/clamav.sock
MilterSocketMode 666

# Socket for communicating with clamd
ClamdSocket unix:/var/run/clamav/clamd.ctl

# Action when virus is found
# Options: Accept, Reject, Defer, Blackhole
OnInfected Reject

# Action when error occurs (scanner unavailable, etc.)
OnFail Accept

# Customize the rejection message
RejectMsg "Virus/malware detected in your message. Message rejected."

# Add header to clean messages (useful for debugging)
AddHeader Add

# Log file
LogFile /var/log/clamav/clamav-milter.log
LogFileMaxSize 100M
LogTime yes
LogVerbose no

# Run as this user
User clamav
```

### Creating the Milter Socket Directory

Postfix runs in a chroot environment. The milter socket needs to be in a location accessible from within the Postfix chroot:

```bash
# Create the directory for the clamav socket inside Postfix's chroot
sudo mkdir -p /var/spool/postfix/clamav

# Set ownership so clamav can write the socket
sudo chown clamav:postfix /var/spool/postfix/clamav
sudo chmod 750 /var/spool/postfix/clamav
```

Update the clamav-milter configuration to use this path:

```bash
sudo nano /etc/clamav/clamav-milter.conf
```

Change the MilterSocket line:

```text
MilterSocket /var/spool/postfix/clamav/clamav.sock
```

```bash
# Start clamav-milter
sudo systemctl start clamav-milter
sudo systemctl enable clamav-milter
sudo systemctl status clamav-milter
```

Verify the socket was created:

```bash
ls -la /var/spool/postfix/clamav/
# Should show the clamav.sock file
```

## Configuring Postfix to Use the Milter

Edit the Postfix main configuration:

```bash
sudo nano /etc/postfix/main.cf
```

Add the clamav-milter to the smtpd_milters list:

```text
# If you only have clamav-milter:
smtpd_milters = unix:/clamav/clamav.sock
non_smtpd_milters = unix:/clamav/clamav.sock

# If you already have other milters (e.g., rspamd), add clamav after:
smtpd_milters = inet:localhost:11332, unix:/clamav/clamav.sock
non_smtpd_milters = inet:localhost:11332, unix:/clamav/clamav.sock

# Handle milter unavailability gracefully
milter_default_action = accept

# Protocol version
milter_protocol = 6
```

Note: The socket path in Postfix main.cf is relative to the Postfix chroot (`/var/spool/postfix`). The `unix:/clamav/clamav.sock` path corresponds to `/var/spool/postfix/clamav/clamav.sock` on the filesystem.

```bash
# Test Postfix configuration
sudo postfix check

# Restart Postfix
sudo systemctl restart postfix
```

## Testing the Setup

### Test with the EICAR Test String

EICAR is a standard harmless test file that all antivirus software recognizes as a "virus" for testing purposes:

```bash
# Test ClamAV directly with the EICAR test string
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > /tmp/eicar.txt
clamscan /tmp/eicar.txt
# Should output: FOUND
```

### Test via Email

Send a test message with the EICAR string through your mail server. You should receive a rejection:

```bash
# Send a test email from the command line
# (adjust the SMTP details for your setup)
swaks --to test@yourdomain.com \
  --from test@external.com \
  --server localhost \
  --data "Subject: Test
Content-Type: text/plain

X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H+H*"
```

The connection should be rejected with the virus rejection message.

### Checking Logs

```bash
# ClamAV daemon log
sudo tail -f /var/log/clamav/clamav.log

# clamav-milter log
sudo tail -f /var/log/clamav/clamav-milter.log

# Mail log (shows milter rejections)
sudo tail -f /var/log/mail.log
```

A virus detection entry in the mail log looks like:

```text
postfix/smtpd[1234]: NOQUEUE: milter-reject: CONNECT from...: 5.7.1 Virus/malware detected in your message. Message rejected.
```

## Keeping Signatures Updated

ClamAV's effectiveness depends on current signatures. Verify freshclam is running and updating regularly:

```bash
# Check freshclam service status
sudo systemctl status clamav-freshclam

# View freshclam log
sudo tail -20 /var/log/clamav/freshclam.log

# Check database ages
ls -la /var/lib/clamav/
```

### Custom Update Schedule

The default freshclam update frequency is reasonable, but you can customize it:

```bash
sudo nano /etc/clamav/freshclam.conf
```

```text
# Check for updates this many times per day (default is 12 = every 2 hours)
Checks 24

# Mirrors to use for updates
DatabaseMirror database.clamav.net

# Proxy settings if needed
# HTTPProxyServer proxy.example.com
# HTTPProxyPort 3128
```

## Adding Third-Party Signature Databases

The official ClamAV signatures can be supplemented with community signature sets:

```bash
# Install clamav-unofficial-sigs for additional signatures
sudo apt install -y clamav-unofficial-sigs

# Run the update script
sudo clamav-unofficial-sigs.sh

# The script downloads signatures from sources like:
# - Securiteinfo
# - Malware Patrol
# - MSRBL
```

## Scanning Existing Mail

Scan mailboxes for viruses in messages already delivered:

```bash
# Scan a specific user's mailbox
clamscan -r -l /var/log/clamav/mailbox-scan.log \
  /var/mail/alice

# Scan all mail in a Maildir format directory
clamscan -r --move=/var/quarantine \
  /home/alice/Maildir/

# Create the quarantine directory first
sudo mkdir -p /var/quarantine
```

## Performance Considerations

ClamAV scanning adds latency to mail delivery. For high-volume mail servers:

```bash
# Increase the number of clamd threads
sudo nano /etc/clamav/clamd.conf
```

```text
# Number of threads for scanning (default is 12)
# Increase for high-volume servers
MaxThreads 20

# Thread idle timeout
IdleTimeout 30
```

Also consider the MaxFileSize setting. Very large attachments take longer to scan. A reasonable limit for email is 25-50MB since most mail servers reject larger messages anyway.

ClamAV with Postfix milter integration is a solid baseline for email virus scanning. While no antivirus catches 100% of threats, having scanning in place stops the majority of malware distributed via email attachments.
