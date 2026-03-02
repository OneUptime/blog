# How to Configure CUPS for Duplex Printing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CUPS, Printing, Duplex, System Administration

Description: Configure CUPS on Ubuntu to enable duplex (double-sided) printing by default, set duplex options per-printer, and troubleshoot common duplex printing issues.

---

CUPS (Common Unix Printing System) is the printing backend for Ubuntu. While most modern printers support duplex (double-sided) printing, it isn't always enabled by default. Configuring duplex as the default saves paper and is often an organizational requirement. This post covers enabling duplex printing through CUPS, both via the web interface and command line.

## Checking Your Printer's Duplex Capabilities

Not all printers support duplex printing, and those that do may support different modes:

```bash
# Install CUPS if not present
sudo apt update
sudo apt install cups -y

# Start CUPS
sudo systemctl enable cups
sudo systemctl start cups

# List installed printers and their details
lpstat -v
lpstat -p -d

# Check printer capabilities using lpoptions
lpoptions -p PrinterName -l

# Look for duplex-related options in the output
lpoptions -p PrinterName -l | grep -i "dup\|sided\|back"
```

The duplex option names vary by printer driver:
- `Duplex` - Most PostScript printers
- `KM-Duplex` - Some Konica Minolta models
- `HPOption_DuplexUnit` - Some HP printers
- `OutputBin-Duplex` - Some other models

## Checking Available Duplex Options

```bash
# Get detailed info about a specific printer
lpinfo -l -m | grep -i duplex
lpoptions -l -p MyPrinter | grep -i duplex

# Example output:
# Duplex/Two-Sided Printing: *None DuplexNoTumble DuplexTumble

# The asterisk (*) shows the current default
# None = single-sided
# DuplexNoTumble = long-edge flip (standard for portrait documents)
# DuplexTumble = short-edge flip (for landscape or flipbook style)
```

## Setting Duplex via the CUPS Web Interface

The CUPS web interface is the easiest way to configure printer defaults:

```bash
# Ensure CUPS web interface is accessible
# By default it's only accessible from localhost
sudo nano /etc/cups/cupsd.conf
```

```
# Allow access from local network (optional)
Listen *:631

<Location />
  Order allow,deny
  Allow localhost
  Allow 192.168.1.0/24
</Location>

<Location /admin>
  Order allow,deny
  Allow localhost
</Location>
```

```bash
sudo systemctl restart cups
```

Navigate to `http://localhost:631` in a browser:

1. Click "Printers"
2. Click your printer name
3. Click "Set Default Options" from the Administration dropdown
4. Find "Two-Sided Printing" or "Duplex" in the options
5. Select "Long-Edge (Standard)" for typical duplex
6. Click "Set Default Options"

## Setting Duplex via Command Line

The command-line approach is better for automation and scripting:

```bash
# Set duplex as the default for a printer
# Long-edge flip (standard duplex for portrait documents)
lpadmin -p MyPrinter -o Duplex=DuplexNoTumble

# Short-edge flip (for landscape orientation or calendar-style)
lpadmin -p MyPrinter -o Duplex=DuplexTumble

# Disable duplex (single-sided)
lpadmin -p MyPrinter -o Duplex=None

# Verify the change was applied
lpoptions -p MyPrinter | grep Duplex
```

For user-level defaults (applies only to your user, doesn't require root):

```bash
# Set personal default (stored in ~/.cups/lpoptions)
lpoptions -p MyPrinter -o Duplex=DuplexNoTumble

# Show current user defaults
lpoptions -p MyPrinter

# Reset to printer default
lpoptions -p MyPrinter -r Duplex
```

## Printing with Duplex Options from the Command Line

Override duplex settings per print job without changing defaults:

```bash
# Print a file duplex (overrides default for this job)
lp -d MyPrinter -o Duplex=DuplexNoTumble document.pdf

# Print single-sided even if duplex is the default
lp -d MyPrinter -o Duplex=None report.pdf

# Print duplex with specific paper size
lp -d MyPrinter \
    -o Duplex=DuplexNoTumble \
    -o media=A4 \
    -o landscape \
    document.pdf

# Print multiple copies duplex
lp -d MyPrinter \
    -o Duplex=DuplexNoTumble \
    -n 3 \
    document.pdf

# Print a range of pages duplex
lp -d MyPrinter \
    -o Duplex=DuplexNoTumble \
    -o page-ranges=1-10 \
    document.pdf
```

## Configuring Duplex in PPD Files

The PPD (PostScript Printer Description) file defines printer capabilities. For permanent defaults:

```bash
# Find the PPD file for your printer
lpstat -p -d
# Note the printer name, e.g., "HP_LaserJet"

ls /etc/cups/ppd/
# Should show HP_LaserJet.ppd (or similar)

# Make a backup before editing
sudo cp /etc/cups/ppd/MyPrinter.ppd /etc/cups/ppd/MyPrinter.ppd.bak

# Edit the PPD to change the default
sudo nano /etc/cups/ppd/MyPrinter.ppd
```

Find the duplex section in the PPD file:

```
*OpenUI *Duplex/Two-Sided Printing: PickOne
*DefaultDuplex: None
*Duplex None/Off: "<</Duplex false>>setpagedevice"
*Duplex DuplexNoTumble/Long-Edge: "<</Duplex true /Tumble false>>setpagedevice"
*Duplex DuplexTumble/Short-Edge: "<</Duplex true /Tumble true>>setpagedevice"
*CloseUI: *Duplex
```

Change `*DefaultDuplex: None` to `*DefaultDuplex: DuplexNoTumble` and restart CUPS:

```bash
sudo systemctl restart cups
```

## Setting Duplex for All New Printers

To ensure all newly added printers get duplex enabled automatically, create a CUPS policy:

```bash
# This script runs when new printers are added
sudo tee /etc/cups/interfaces/auto-duplex.sh << 'SCRIPT'
#!/bin/bash
# Set duplex default when a printer is added via event

PRINTER="$1"

# Wait a moment for the printer to be fully initialized
sleep 2

# Check if the printer supports duplex
if lpoptions -p "$PRINTER" -l 2>/dev/null | grep -qi "duplex"; then
    lpadmin -p "$PRINTER" -o Duplex=DuplexNoTumble
    echo "Duplex enabled for: $PRINTER"
fi
SCRIPT
sudo chmod +x /etc/cups/interfaces/auto-duplex.sh
```

## Verifying Duplex Is Working

```bash
# Print a test page and check for duplex
lp -d MyPrinter -o Duplex=DuplexNoTumble /usr/share/cups/data/default-testpage.pdf

# Or generate a multi-page PDF for testing
# Install ghostscript if needed
sudo apt install ghostscript -y

# Create a 4-page test document
gs -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -sOutputFile=test4page.pdf \
   -c "/Helvetica 24 selectfont" \
   -c "1 1 translate" \
   -c "(Page 1) show showpage" \
   -c "(Page 2) show showpage" \
   -c "(Page 3) show showpage" \
   -c "(Page 4) show showpage"

# Print the test document duplex
lp -d MyPrinter -o Duplex=DuplexNoTumble test4page.pdf
```

## Troubleshooting Duplex Issues

```bash
# Check CUPS logs for print job errors
sudo tail -f /var/log/cups/error_log

# Check job status
lpstat -W completed
lpstat -W not-completed

# Get detailed job information
lpq -l -P MyPrinter

# If duplex option isn't listed in lpoptions -l, the driver may not support it
# Try reinstalling the printer with a different PPD
# Check available PPDs
lpinfo -m | grep -i "$(lshw -C printer 2>/dev/null | grep product | head -1 | awk '{print $2}')"

# Manually check if printer supports duplex (via SNMP or IPP)
ipptool -tv ipp://printer-ip/ipp/print get-printer-attributes.test | grep -i duplex
```

## Application-Specific Duplex Configuration

Some applications override CUPS defaults with their own settings:

```bash
# LibreOffice command-line printing with duplex
libreoffice --headless --printer-name MyPrinter \
    --print-to-file --outdir /tmp \
    document.odt

# For consistent results, configure defaults in CUPS rather than per-application

# Firefox command-line printing (requires xvfb for headless)
# Set CUPS defaults and Firefox will use them

# GNOME print dialog respects CUPS defaults
# Check GNOME printer settings
gsettings list-recursively | grep print
```

## Setting Duplex in a Multi-User Environment

For a shared workstation or print server where you want all users to default to duplex:

```bash
# Set system-wide default via CUPS (affects all users)
sudo lpadmin -p MyPrinter -o Duplex=DuplexNoTumble

# Verify system-wide default
lpoptions -d  # shows system default printer and options

# Individual users can override with their own lpoptions
# User settings in ~/.cups/lpoptions override system defaults
```

Defaulting to duplex printing is one of those small configuration changes that adds up significantly over time, both in paper costs and environmental impact. A few minutes of configuration can save reams of paper per year across a team.
