# How to Scan for Rootkits with rkhunter and chkrootkit on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Rootkit Detection, rkhunter, chkrootkit

Description: Guide to installing and using rkhunter and chkrootkit on Ubuntu to detect rootkits, backdoors, and suspicious files, including configuration, interpreting results, and automating scans.

---

Rootkits are malware designed to hide their presence on a compromised system. They manipulate system tools and libraries so that standard commands like `ps`, `ls`, and `netstat` don't reveal malicious processes or files. Rootkit detection tools bypass these manipulations by using their own code to examine the system. `rkhunter` and `chkrootkit` are the two most widely used Linux rootkit scanners, and running both gives better coverage.

## Understanding What These Tools Detect

**rkhunter (Rootkit Hunter)**:
- Known rootkit signatures and files
- Suspicious file permissions and hidden files
- Changes to system binaries (checksums vs known-good values)
- Suspicious network interfaces and ports
- System configuration checks (SSH, cron, etc.)

**chkrootkit (Check Rootkit)**:
- Known rootkit infection signatures
- Suspicious LKM (Loadable Kernel Modules) activity
- Signs of network sniffers
- Tampering with system files
- Suspicious cron entries

## Installing rkhunter

```bash
sudo apt-get update
sudo apt-get install -y rkhunter

# Verify installation
rkhunter --version
```

## Configuring rkhunter

The configuration file is at `/etc/rkhunter.conf`:

```bash
sudo nano /etc/rkhunter.conf
```

Key settings to configure:

```bash
# Update configuration file (DO NOT edit rkhunter.conf directly in Ubuntu)
# Ubuntu uses /etc/rkhunter.conf.local for overrides

sudo tee /etc/rkhunter.conf.local << 'EOF'
# Update mirrors
UPDATE_MIRRORS=1
MIRRORS_MODE=0

# Rotate log file
ROTATE_MIRRORS=1

# Email alerts when issues are found
MAIL_CMD=mail -s "[rkhunter] Daily scan - $(hostname)"
MAIL_ON_WARNING=admin@example.com

# Allow specific suspect files (false positives)
# Add here after reviewing warnings
ALLOWHIDDENDIR=/dev/.udev
ALLOWHIDDENDIR=/dev/.static

# Allow specific hidden files
ALLOWHIDDENFILE=/dev/.blkid.tab
ALLOWHIDDENFILE=/dev/.blkid.tab.old

# Paths to check (rkhunter checks these for modifications)
SCRIPTWHITELIST=/usr/bin/lwp-request

# Allow these system startup files
ALLOWPROCDELFILE=/lib/udev/udevd
EOF
```

## Updating the rkhunter Database

Before running a scan, update rkhunter's database of known rootkits and download new signatures:

```bash
# Update rkhunter data files
sudo rkhunter --update

# Propupd: update the file properties database
# Run this AFTER a clean system install or after legitimate updates
sudo rkhunter --propupd

# This records the current checksums of system files as the baseline
```

**Important**: Run `--propupd` immediately after installing rkhunter on a clean system, and again after package updates. This creates the good-state baseline. Running it on a compromised system would whitelist the compromised binaries.

## Running rkhunter

```bash
# Full system scan with interactive output
sudo rkhunter --check

# Non-interactive scan (for automated runs)
sudo rkhunter --check --skip-keypress

# Show only warnings and errors (suppress OK messages)
sudo rkhunter --check --skip-keypress --report-warnings-only

# Specify log file location
sudo rkhunter --check --skip-keypress --logfile /var/log/rkhunter.log

# Run a specific test only
sudo rkhunter --check --tests apps  # only check application versions

# List available tests
sudo rkhunter --list tests
```

## Interpreting rkhunter Output

The output has several categories:

```text
[ Rootkit checks ]
  Checking for known rootkit files and directories       [ OK ]
  Checking for Suckit rootkit                            [ OK ]
  Checking for Adore rootkit                             [ OK ]

[ Applications checks ]
  Checking GnuPG                                         [ OK ]
  Checking OpenSSL                                       [ WARNING ]

[ System checks ]
  Checking hidden files and directories                  [ WARNING ]

[ Filesystem checks ]
  Checking /dev for suspicious file types                [ WARNING ]
```

**OK**: No issues found
**WARNING**: Potential issue - requires investigation
**NOT FOUND**: Test couldn't run (missing tool), not necessarily a problem

Common false positives:

```bash
# Review warnings in the log
sudo cat /var/log/rkhunter.log | grep -i warning

# Common false positives:
# /dev/.udev and /dev/.static - legitimate hidden directories
# Certain package manager files
# Application-specific files that look unusual to rkhunter
```

## Handling False Positives in rkhunter

After reviewing that a warning is a false positive, whitelist it:

```bash
sudo nano /etc/rkhunter.conf.local

# For hidden files that are legitimate
ALLOWHIDDENFILE=/dev/.blkid.tab

# For hidden directories
ALLOWHIDDENDIR=/dev/.udev

# For scripts in odd locations
SCRIPTWHITELIST=/path/to/legitimate/script

# Re-run to confirm the false positive is gone
sudo rkhunter --check --skip-keypress --report-warnings-only
```

## Installing chkrootkit

```bash
sudo apt-get install -y chkrootkit

chkrootkit --version
```

## Running chkrootkit

```bash
# Run all tests
sudo chkrootkit

# Run quietly (only show positives)
sudo chkrootkit -q

# Test a specific rootkit
sudo chkrootkit lkm  # check for LKM rootkits
sudo chkrootkit sniffer  # check for packet sniffers
sudo chkrootkit cron  # check cron for rootkit entries

# List all available tests
sudo chkrootkit -l

# Run against an alternate directory (for offline forensics)
sudo chkrootkit -r /mnt/suspect-system/
```

## Interpreting chkrootkit Output

```text
ROOTDIR is `/'
Checking `amd'...                                          not infected
Checking `basename'...                                     not infected
Checking `biff'...                                         not found
Checking `bindshell'...                                    not infected
Checking `lkm'...                                          chkproc: nothing detected
Checking `rexedcs'...                                      not found
Checking `sniffer'...                                      br0: PF_PACKET(/sbin/dhclient, 2915, )  PACKET SNIFFER
```

`not infected` or `nothing detected` are good.

**PACKET SNIFFER** warnings are often false positives when network services legitimately use packet capture (DHCP clients, monitoring tools). Investigate, but don't panic immediately.

```bash
# Investigate a PACKET SNIFFER warning
# Check which processes have network interfaces in promiscuous mode
ip link show | grep -i promisc

# Check processes using raw sockets
sudo ss -lp | grep PACKET
ls -la /proc/*/fd/* 2>/dev/null | grep socket
```

## Common chkrootkit False Positives

```bash
# "PACKET SNIFFER" - usually DHCP client or network monitoring tools
# Verify with: ip link show | grep promisc

# "bindshell: INFECTED" - often false positive on some systems
# Verify with: netstat -tlnp | grep 31337 (or whatever port was flagged)

# If you suspect false positive, test from a live CD to get clean readings
```

## Automated Scanning with Email Reports

Create a daily scan script:

```bash
sudo tee /usr/local/bin/rootkit-scan.sh << 'EOF'
#!/bin/bash
# rootkit-scan.sh - Daily rootkit scan with reporting

HOSTNAME=$(hostname)
DATE=$(date '+%Y-%m-%d %H:%M:%S')
EMAIL="admin@example.com"
RKHUNTER_LOG="/var/log/rkhunter.log"
CHKROOTKIT_LOG="/var/log/chkrootkit.log"

echo "=== Rootkit Scan Report: $HOSTNAME - $DATE ===" > /tmp/scan_report.txt
echo "" >> /tmp/scan_report.txt

# Run rkhunter
echo "--- rkhunter Results ---" >> /tmp/scan_report.txt
sudo rkhunter --check --skip-keypress --logfile "$RKHUNTER_LOG" 2>&1
RKHUNTER_WARNINGS=$(grep -c "Warning" "$RKHUNTER_LOG" 2>/dev/null || echo 0)
echo "rkhunter warnings: $RKHUNTER_WARNINGS" >> /tmp/scan_report.txt
grep "Warning" "$RKHUNTER_LOG" >> /tmp/scan_report.txt 2>/dev/null

echo "" >> /tmp/scan_report.txt
echo "--- chkrootkit Results ---" >> /tmp/scan_report.txt

# Run chkrootkit
sudo chkrootkit -q 2>&1 | tee "$CHKROOTKIT_LOG" | grep -v "^$" >> /tmp/scan_report.txt

INFECTED=$(grep -c "INFECTED" "$CHKROOTKIT_LOG" 2>/dev/null || echo 0)
echo "" >> /tmp/scan_report.txt
echo "chkrootkit infected count: $INFECTED" >> /tmp/scan_report.txt

# Send email if any warnings or infections found
if [ "$RKHUNTER_WARNINGS" -gt 0 ] || [ "$INFECTED" -gt 0 ]; then
    SUBJECT="[ALERT] Rootkit scan warnings on $HOSTNAME"
else
    SUBJECT="[OK] Rootkit scan clean on $HOSTNAME"
fi

mail -s "$SUBJECT" "$EMAIL" < /tmp/scan_report.txt
logger "Rootkit scan complete: rkhunter warnings=$RKHUNTER_WARNINGS, chkrootkit infected=$INFECTED"

rm -f /tmp/scan_report.txt
EOF

sudo chmod +x /usr/local/bin/rootkit-scan.sh

# Schedule daily scans at 4 AM
echo "0 4 * * * root /usr/local/bin/rootkit-scan.sh" | sudo tee /etc/cron.d/rootkit-scan
```

## Post-Update Procedure

After system updates, refresh rkhunter's property database to prevent false positives:

```bash
#!/bin/bash
# Run after apt-get upgrade

sudo apt-get update && sudo apt-get upgrade -y

# Update rkhunter database after legitimate changes
sudo rkhunter --propupd

echo "rkhunter database updated after system upgrade"
```

## What To Do If You Find Something

If a scan returns genuine infections:

1. **Don't panic, don't reboot** - Rebooting can destroy forensic evidence
2. **Isolate the system** - Disconnect from the network if possible
3. **Don't trust system tools** - Use tools from a clean live CD/USB for further analysis
4. **Collect evidence** before attempting cleanup:

```bash
# Collect volatile data (from a trusted tool on a USB stick)
# Memory dump
sudo avml /media/usb/memory.lime

# Network connections
ss -tlnup > /media/usb/netstat.txt

# Running processes
ps auxf > /media/usb/processes.txt

# Loaded kernel modules
lsmod > /media/usb/lsmod.txt
```

5. **Plan for reinstallation** - A rootkit compromise usually means rebuilding the system. Cleanup is rarely thorough enough to trust the system again.

Running both rkhunter and chkrootkit gives broader coverage, as each tool detects different signatures and patterns. Neither is foolproof - a sophisticated rootkit can evade both - but they catch the vast majority of known threats and provide an important layer of defense.
