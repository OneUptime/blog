# How to Troubleshoot CUPS Printing Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CUPS, Printing, Troubleshooting, System Administration

Description: Diagnose and fix common CUPS printing problems on Ubuntu, covering stuck jobs, printer offline errors, permission issues, PPD problems, and network printer connectivity.

---

CUPS printing issues range from trivial (a stuck job) to genuinely tricky (driver mismatches or network authentication failures). The good news is that CUPS has comprehensive logging, and most problems leave clear clues in the logs. This guide covers the systematic approach to diagnosing CUPS issues and the most common fixes.

## Starting with the Basics

Before diving into logs and configuration, check the fundamentals:

```bash
# Is CUPS running?
sudo systemctl status cups

# If not, start it
sudo systemctl start cups

# Is the printer visible to CUPS?
lpstat -v

# Is the printer accepting jobs?
lpstat -p

# Look for error state
lpstat -p | grep -i "error\|disabled\|not accepting"

# Is there a default printer set?
lpstat -d

# Check the printer queue
lpq -P PrinterName
lpstat -o  # all jobs on all printers
```

## Checking CUPS Logs

CUPS logs are the primary diagnostic tool:

```bash
# Main error log - start here
sudo tail -50 /var/log/cups/error_log

# Watch errors in real time while reproducing the problem
sudo tail -f /var/log/cups/error_log

# Access log shows all requests to CUPS
sudo tail -50 /var/log/cups/access_log

# Page log shows completed print jobs
sudo tail -50 /var/log/cups/page_log

# Enable debug logging for detailed troubleshooting
sudo cupsctl --debug-logging
sudo tail -f /var/log/cups/error_log
# ... reproduce the problem ...
# Disable debug logging when done (generates a lot of output)
sudo cupsctl --no-debug-logging

# Check journald for CUPS messages
sudo journalctl -u cups -n 100 --no-pager
sudo journalctl -u cups -f  # Follow in real time
```

## Common Problem: Printer Shows as Offline

```bash
# Check if the printer is actually reachable
lpstat -v PrinterName
# Look at the URI - test connectivity to that URI

# For network printers, test connectivity
ping printer-hostname
# Or if only IP:
ping 192.168.1.50

# Test IPP connectivity
curl -v http://printer-hostname:631/ipp/print

# For USB printers, check if it's detected
lsusb | grep -i "HP\|Canon\|Epson\|Brother"

# Check USB printer permissions
ls -la /dev/usb/lp*

# Force re-enable an offline printer
sudo cupsenable PrinterName

# Check if CUPS is marking it as disabled due to errors
lpstat -p PrinterName
# Look for "disabled" status

# Clear error state and re-enable
sudo lpadmin -p PrinterName -u deny:none
sudo cupsenable PrinterName
sudo cupsaccept PrinterName
```

## Common Problem: Jobs Stuck in Queue

Stuck jobs are one of the most frequent CUPS issues:

```bash
# List all jobs
lpstat -o

# Cancel a specific job
cancel 123  # job ID from lpstat output

# Cancel all jobs for a specific printer
cancel -a PrinterName

# Cancel all jobs for all printers
cancel -a

# Force remove a stuck job (when cancel doesn't work)
# Jobs are stored in /var/spool/cups/
ls /var/spool/cups/
sudo rm /var/spool/cups/c0* /var/spool/cups/d0*  # Remove job files with caution
sudo systemctl restart cups

# If cups daemon is stuck
sudo systemctl stop cups
sudo systemctl start cups
```

## Common Problem: Permission Denied

```bash
# Check user is in appropriate groups
groups $USER

# Add user to lpadmin group for CUPS administration
sudo usermod -aG lpadmin $USER
# Log out and back in for group change to take effect

# Check printer permissions
lpstat -p PrinterName -l | grep -i "allow\|deny"

# Check cupsd.conf permissions
grep -A 10 "Location /printers" /etc/cups/cupsd.conf

# Fix common permission issue
sudo cupsctl --user-cancel-any

# Check CUPS web interface access
curl -v http://localhost:631/admin

# USB printer permission issue
ls -la /dev/usb/lp*
sudo usermod -aG lp $USER
# or
sudo chmod 666 /dev/usb/lp0  # Temporary fix - not recommended for production
```

## Common Problem: Wrong PPD or Driver

```bash
# Check which driver is currently assigned
lpoptions -p PrinterName -l

# List installed PPD files
lpinfo -m | grep -i "your-printer-model"

# Check if better driver is available
apt-cache search "printer-driver" | grep -i "hp\|canon\|epson"

# Install additional drivers
sudo apt install printer-driver-all -y  # All available drivers
sudo apt install hplip -y  # HP printers
sudo apt install printer-driver-gutenprint -y  # Many inkjet printers
sudo apt install printer-driver-cups-pdf -y  # PDF virtual printer

# Remove printer and re-add with correct driver
sudo lpadmin -x PrinterName

# Re-add with specific PPD
sudo lpadmin \
    -p PrinterName \
    -v "usb://HP/LaserJet" \
    -m "drv:///hpijs.drv/hp-laserjet.ppd" \
    -E

# Or find the PPD path and use it directly
find /usr/share/ppd/ -iname "*laserjet*"
sudo lpadmin -p PrinterName -v "usb://..." -P /path/to/driver.ppd -E
```

## Common Problem: Network Printer Authentication

```bash
# Check error log for authentication failures
sudo grep -i "auth\|unauthorized\|403" /var/log/cups/error_log | tail -20

# Test authentication manually
curl -u username:password -v http://printer-hostname/ipp/print

# For Windows-style (Kerberos/NTLM) print servers
sudo apt install libcups2 libcupsimage2 -y

# Test SMB printer connection
# First install smbclient
sudo apt install smbclient -y
smbclient -L //windows-server -U username

# Add SMB printer
sudo lpadmin \
    -p WindowsPrinter \
    -v "smb://domain;username:password@server/PrinterShare" \
    -m everywhere \
    -E
```

## Common Problem: CUPS Process Issues

```bash
# Check if CUPS is consuming excessive CPU or memory
ps aux | grep cups
top -p $(pgrep cupsd)

# CUPS stuck/crashed - full restart
sudo systemctl stop cups
sleep 2
sudo systemctl start cups

# Corrupted spool directory
sudo systemctl stop cups
sudo rm -rf /var/spool/cups/tmp/*
sudo ls /var/spool/cups/  # Verify only expected files remain
sudo systemctl start cups

# Check for socket issues
ls -la /run/cups/
sudo systemctl restart cups

# Verify CUPS is listening
ss -tlnp | grep 631
```

## Diagnosing Print Quality Issues

```bash
# Print a CUPS test page
lp -d PrinterName /usr/share/cups/data/default-testpage.pdf

# Print a color test page
lp -d PrinterName /usr/share/cups/data/testprint

# Check if issue is driver-related (try raw printing)
# Raw printing bypasses all filtering
lpadmin -p PrinterName -o raw  # Switch to raw mode
lp -d PrinterName file.ps  # Must be PostScript for raw mode
lpadmin -p PrinterName -m everywhere  # Switch back to normal

# Check for color profile issues
ls /usr/share/color/icc/
lpoptions -p PrinterName -l | grep -i "color\|icc\|profile"
```

## Debugging a Specific Print Job

```bash
# Submit a job and get verbose output
lp -d PrinterName -# 1 -o job-hold-until=indefinite document.pdf
JOBID=$(lpstat -o | tail -1 | awk '{print $1}')

# Get detailed job info
lpstat -l -o $JOBID

# Release the held job
lp-release $JOBID

# Or cancel and try again with more debugging
cancel $JOBID

# Enable debug logging before the next attempt
sudo cupsctl --debug-logging
lp -d PrinterName document.pdf
sudo tail -50 /var/log/cups/error_log
sudo cupsctl --no-debug-logging
```

## CUPS Configuration Validation

```bash
# Test cupsd.conf syntax before applying
sudo cupsd -t

# Check configuration file
cat /etc/cups/cupsd.conf | grep -v "^#\|^$"

# Verify printer PPD is valid
cupstestppd /etc/cups/ppd/PrinterName.ppd

# Fix PPD issues found by cupstestppd
# Common fixes: correct file encoding, ensure required fields present

# Rebuild printer from scratch
sudo lpadmin -x PrinterName  # Remove
# Re-add with correct settings
```

## Quick Diagnostic Script

```bash
#!/bin/bash
# /usr/local/bin/cups-diag.sh - Quick CUPS health check

echo "=== CUPS Diagnostic Report - $(date) ==="
echo ""

echo "CUPS Service Status:"
systemctl is-active cups

echo ""
echo "Printers:"
lpstat -p 2>/dev/null || echo "No printers configured"

echo ""
echo "Jobs in queue:"
lpstat -o 2>/dev/null || echo "No jobs"

echo ""
echo "Recent errors (last 10):"
grep -i "error" /var/log/cups/error_log 2>/dev/null | tail -10

echo ""
echo "CUPS version:"
cups-config --version

echo ""
echo "Available printers (lpinfo):"
lpinfo -v 2>/dev/null | head -10
```

Most CUPS problems resolve with a combination of log analysis and re-enabling the printer. For persistent issues, removing the printer and re-adding it fresh often works better than trying to fix the existing configuration.
