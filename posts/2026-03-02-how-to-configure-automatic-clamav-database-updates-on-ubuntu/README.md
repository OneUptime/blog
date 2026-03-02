# How to Configure Automatic ClamAV Database Updates on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, ClamAV, Antivirus, Linux

Description: Learn how to configure automatic ClamAV antivirus database updates on Ubuntu using freshclam, systemd timers, and cron to keep virus signatures current.

---

ClamAV is one of the most widely used open-source antivirus engines on Linux. It handles everything from mail gateway scanning to on-demand file checks. But the engine is only as useful as its virus database - an outdated signature database means new threats go undetected. Keeping it current is not optional.

Ubuntu ships with a daemon called `freshclam` that handles database updates. When configured correctly, it runs in the background and pulls new definitions from ClamAV's mirror network on a schedule you control. This guide walks through setting that up properly, troubleshooting common failures, and validating that updates are actually happening.

## Installing ClamAV

If you haven't installed ClamAV yet, start here:

```bash
# Update package lists
sudo apt update

# Install ClamAV and the freshclam daemon
sudo apt install -y clamav clamav-daemon

# Stop the daemon temporarily while we configure it
sudo systemctl stop clamav-freshclam
```

After installation, check which version you have:

```bash
clamscan --version
```

## Understanding freshclam

`freshclam` is the database update utility. It connects to ClamAV's official mirrors, downloads updated `.cvd` and `.cld` database files, and places them in `/var/lib/clamav/`. The main configuration file lives at `/etc/clamav/freshclam.conf`.

```bash
# View the current freshclam configuration
sudo cat /etc/clamav/freshclam.conf
```

Key configuration directives to understand:

- `DatabaseDirectory` - where virus definition files are stored
- `UpdateLogFile` - path to the update log
- `DatabaseMirror` - which mirrors to use for updates
- `Checks` - how many times per day to check for updates
- `NotifyClamd` - whether to notify the scanning daemon after updates

## Configuring freshclam.conf

Open the configuration file with a text editor:

```bash
sudo nano /etc/clamav/freshclam.conf
```

A solid baseline configuration looks like this:

```
# Log freshclam activity
UpdateLogFile /var/log/clamav/freshclam.log

# Check for updates 12 times per day (every 2 hours)
Checks 12

# Use official database mirrors
DatabaseMirror db.local.clamav.net
DatabaseMirror database.clamav.net

# Notify the clamd daemon when updates are downloaded
NotifyClamd /etc/clamav/clamd.conf

# Compress verbose log output
LogVerbose false

# Time out after 30 seconds if mirror is unresponsive
ConnectTimeout 30

# Receive mirror response timeout
ReceiveTimeout 60
```

The `Checks` value controls how many update attempts per day. ClamAV mirrors handle up to 50 checks per day from a single IP, so staying at 12-24 is safe. Going higher risks getting rate-limited.

## Starting and Enabling the freshclam Service

With the configuration in place, enable and start the service:

```bash
# Enable freshclam to start at boot
sudo systemctl enable clamav-freshclam

# Start the service
sudo systemctl start clamav-freshclam

# Verify it's running
sudo systemctl status clamav-freshclam
```

Expected output shows the service as active and running. If it failed, check the journal:

```bash
sudo journalctl -u clamav-freshclam -n 50
```

## Running a Manual Update

To trigger an immediate database update without waiting for the scheduled check:

```bash
# Stop the service first (freshclam can't run two instances)
sudo systemctl stop clamav-freshclam

# Run update manually with verbose output
sudo freshclam --verbose

# Start the service again
sudo systemctl start clamav-freshclam
```

You'll see output like this during a successful update:

```
ClamAV update process started at Mon Mar  2 10:00:00 2026
daily.cvd is up to date (version: 27385, sigs: 2073738)
main.cvd is up to date (version: 62, sigs: 6647427)
bytecode.cvd is up to date (version: 334, sigs: 91)
```

If the databases are already current, freshclam will report "up to date" without downloading anything.

## Setting Up a Cron Job as an Alternative

Some administrators prefer cron over the systemd service, especially in environments where the scanning daemon isn't running continuously. To use cron instead:

```bash
# Disable the systemd service
sudo systemctl disable --now clamav-freshclam

# Open root's crontab
sudo crontab -e
```

Add an entry to update every 4 hours:

```cron
# Update ClamAV database every 4 hours
0 */4 * * * /usr/bin/freshclam --quiet 2>/dev/null
```

The `--quiet` flag suppresses output when the database is already current. Errors still get logged to the update log file.

## Using a systemd Timer Instead of Cron

If you prefer systemd timers for better logging and control, create a dedicated timer unit:

```bash
# Create a service unit for the one-shot update
sudo nano /etc/systemd/system/clamav-update.service
```

```ini
[Unit]
Description=ClamAV virus database update
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/freshclam --quiet
User=clamav
```

```bash
# Create the timer unit
sudo nano /etc/systemd/system/clamav-update.timer
```

```ini
[Unit]
Description=Run ClamAV database update every 3 hours

[Timer]
# Run 5 minutes after boot
OnBootSec=5min
# Then every 3 hours
OnUnitActiveSec=3h
# Add randomness to avoid hitting mirrors at the same second as everyone else
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Reload systemd and enable the timer
sudo systemctl daemon-reload
sudo systemctl enable --now clamav-update.timer

# Check timer status
sudo systemctl list-timers clamav-update.timer
```

The `RandomizedDelaySec=300` adds up to 5 minutes of random delay, which is good practice when many servers might update simultaneously.

## Verifying Database Updates Are Working

Check the database file timestamps to confirm updates are happening:

```bash
# List database files with timestamps
ls -la /var/lib/clamav/

# Check the last successful update time
stat /var/lib/clamav/daily.cvd 2>/dev/null || stat /var/lib/clamav/daily.cld 2>/dev/null
```

Review the freshclam log:

```bash
# View the last 50 lines of the update log
sudo tail -50 /var/log/clamav/freshclam.log
```

A healthy log shows successful downloads or "up to date" messages. Watch for these error patterns:

- `ERROR: Can't connect to port 80` - network or DNS issue
- `ERROR: getaddrinfo() for host` - DNS resolution failing
- `WARNING: Invalid DNS reply` - DNS-based update check failing (usually harmless, falls back to HTTP)
- `ERROR: 403 Forbidden` - IP may be rate-limited by ClamAV mirrors

## Handling Rate Limiting

If your server is flagged for excessive update attempts, you'll see 403 errors in the log. Reduce the `Checks` value and wait a few hours. You can also specify a local mirror:

```bash
# In freshclam.conf, add a private mirror or use a regional one
DatabaseMirror db.us.clamav.net
```

For environments with many Ubuntu servers, consider running a local ClamAV mirror using `cvdupdate` and pointing all clients to it.

## Monitoring with OneUptime

Keeping ClamAV databases current is a security-critical task. You can use [OneUptime](https://oneuptime.com) to monitor the freshclam service status and alert when it's not running or when database files haven't been updated recently. Setting up a heartbeat monitor that your update script pings after each successful run gives you immediate visibility into failures before they become security gaps.

## Confirming Everything Works

After setting up automatic updates, do a final verification:

```bash
# Check service is active
systemctl is-active clamav-freshclam

# Confirm database version
clamscan --version

# Run a test scan on a known safe file
echo "This is a test" > /tmp/test.txt
clamscan /tmp/test.txt
rm /tmp/test.txt
```

A properly configured freshclam setup with `Checks 12` means your virus definitions are never more than 2 hours old. For most environments that's a reasonable balance between currency and mirror load. If you're running a mail gateway or high-security system, bump it to 24 checks per day - that's still within ClamAV's acceptable use policy.
