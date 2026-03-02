# How to Set Up CUPS with IPP Everywhere on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CUPS, IPP Everywhere, Printing, Networking

Description: Configure CUPS with IPP Everywhere on Ubuntu for driverless printing to modern printers, including AirPrint, Mopria, and network printer discovery without vendor drivers.

---

IPP Everywhere is a printing standard that enables driverless printing to modern printers. Any printer that supports IPP Everywhere can be used from Ubuntu without installing vendor-specific drivers. The printer advertises its capabilities via mDNS/Bonjour, CUPS discovers it automatically, and Ubuntu generates a generic PostScript or PDF job that the printer understands natively. This is the same protocol behind AirPrint (Apple) and Mopria (Android/Windows).

## Understanding IPP Everywhere

IPP Everywhere works by:

1. The printer advertises itself via mDNS (Bonjour/Avahi) on the local network
2. CUPS discovers the advertisement and can query the printer's capabilities via IPP
3. A "driverless" PPD is generated from the printer's capability response
4. Jobs are sent directly to the printer in PDF or raster format

Printers manufactured after 2012 commonly support IPP Everywhere. Look for "AirPrint", "Mopria", "IPP Everywhere", or "Wi-Fi Direct Print" in the printer specs.

## Installing CUPS with IPP Everywhere Support

```bash
# Install CUPS and IPP Everywhere support
sudo apt update
sudo apt install cups cups-ipp-utils printer-driver-cups-pdf avahi-daemon -y

# IPP Everywhere support is also in
sudo apt install cups-common cups-client -y

# Start and enable required services
sudo systemctl enable cups avahi-daemon
sudo systemctl start cups avahi-daemon

# Verify CUPS is running
sudo systemctl status cups

# Check that avahi (mDNS) is running - needed for printer discovery
sudo systemctl status avahi-daemon
```

## Discovering IPP Everywhere Printers

```bash
# Scan for IPP printers on the network
# dns-sd (avahi-discover) shows all advertised services
sudo apt install avahi-utils -y
avahi-browse -a | grep -i "print\|pdl\|ipp"

# Or use CUPS' built-in discovery
lpinfo -v | grep dnssd

# More detailed discovery
ipptool -tv ipp://printer-hostname/ipp/print get-printer-attributes.test

# Discover using avahi-browse specifically for printers
avahi-browse _ipp._tcp --resolve -t
avahi-browse _ipps._tcp --resolve -t  # secure IPP
```

The discovery output shows printer names, IP addresses, and URIs like `ipp://printer-name.local/ipp/print`.

## Adding an IPP Everywhere Printer

### Via Command Line

```bash
# Add the printer using its IPP URI
# Replace printer-hostname with the actual hostname or IP
sudo lpadmin \
    -p MyPrinter \
    -v "ipp://printer-hostname.local/ipp/print" \
    -E \
    -m driverless \
    -D "My Network Printer" \
    -L "Conference Room"

# Or use the full device URI format
sudo lpadmin \
    -p OfficePrinter \
    -v "dnssd://Office%20Printer._ipp._tcp.local/ipp/print" \
    -E \
    -m everywhere

# Set as default printer
sudo lpadmin -d OfficePrinter

# Enable and accept jobs
sudo cupsenable OfficePrinter
sudo cupsaccept OfficePrinter

# Verify the printer was added
lpstat -p OfficePrinter -l
```

### Via CUPS Web Interface

```bash
# Ensure web interface is accessible
# Edit /etc/cups/cupsd.conf to allow your network
sudo nano /etc/cups/cupsd.conf
```

```
# Allow access from your IP range
<Location /admin>
  Order allow,deny
  Allow localhost
  Allow 192.168.1.0/24
</Location>
```

Then navigate to `http://localhost:631`:
1. Administration > Add Printer
2. Select your printer from "Discovered Network Printers"
3. Continue through the wizard - CUPS will auto-detect IPP Everywhere support
4. Set name, description, location
5. Click "Add Printer"

## Verifying IPP Everywhere Capabilities

```bash
# Check what capabilities the printer reports
ipptool -tv ipp://printer-hostname.local/ipp/print \
    /usr/share/cups/ipptool/get-printer-attributes.test

# Check for IPP Everywhere compliance
ipptool -tv ipp://printer-hostname.local/ipp/print \
    /usr/share/cups/ipptool/ipp-everywhere.test

# View generated PPD
lpoptions -p MyPrinter -l

# Check supported formats
lpoptions -p MyPrinter -l | grep -i "document-format\|mime\|pdf"
```

## Printing via IPP Everywhere

```bash
# Print a PDF file
lp -d MyPrinter document.pdf

# Print with specific options (CUPS queries available options from the printer)
lp -d MyPrinter -o media=A4 document.pdf
lp -d MyPrinter -o sides=two-sided-long-edge document.pdf
lp -d MyPrinter -o outputorder=reverse document.pdf

# Print from command line with quality setting
lp -d MyPrinter -o print-quality=5 photo.jpg  # 5=best, 3=normal, 4=high

# Check printer job queue
lpstat -p MyPrinter
lpq -P MyPrinter
```

## Configuring CUPS for AirPrint Sharing

You can share Ubuntu printers to Apple devices using CUPS' built-in AirPrint support:

```bash
# Edit CUPS configuration to enable Bonjour sharing
sudo nano /etc/cups/cupsd.conf
```

```
# Enable Bonjour printer discovery
BrowseLocalProtocols dnssd

# Share printers on the network
ServerAlias *
Listen 0.0.0.0:631

<Location />
  Order allow,deny
  Allow localhost
  Allow 192.168.1.0/24
</Location>

<Location /printers>
  Order allow,deny
  Allow localhost
  Allow 192.168.1.0/24
</Location>
```

```bash
# Enable printer sharing in CUPS
sudo cupsctl --share-printers

# Enable Bonjour/mDNS broadcasting
sudo cupsctl --remote-any

# Mark specific printers as shared
sudo lpadmin -p MyPrinter -o printer-is-shared=true

# Restart CUPS to apply changes
sudo systemctl restart cups

# Verify the printer is being broadcast
avahi-browse _ipp._tcp -t | grep MyPrinter
```

Apple devices on the same network will see the printer automatically in AirPrint dialogs.

## Setting Default Print Options for IPP Everywhere

```bash
# Set default paper size
lpadmin -p MyPrinter -o media-default=iso_a4_210x297mm
# or
lpadmin -p MyPrinter -o media-default=na_letter_8.5x11in

# Set default duplex
lpadmin -p MyPrinter -o sides-default=two-sided-long-edge

# Set default quality
lpadmin -p MyPrinter -o print-quality-default=5

# Set default color mode
lpadmin -p MyPrinter -o print-color-mode-default=monochrome

# View all current defaults
lpoptions -p MyPrinter
```

## Troubleshooting IPP Everywhere

```bash
# Check CUPS error log
sudo tail -f /var/log/cups/error_log

# Test connectivity to the printer
curl -s ipp://printer-hostname.local/ipp/print -v 2>&1 | head -30

# Check mDNS resolution
avahi-resolve-host-name printer-hostname.local

# If avahi resolution fails, try IP directly
lpadmin -p TestPrinter -v "ipp://192.168.1.50/ipp/print" -E -m everywhere

# Check firewall isn't blocking mDNS
sudo ufw status | grep 5353
sudo ufw allow 5353/udp  # Allow mDNS if blocked

# Check IPP port
sudo ufw allow 631/tcp  # Allow IPP if connecting to a remote CUPS server

# Debug a print job
lp -d MyPrinter -o job-hold-until=indefinite document.pdf
lpstat -l -o  # Shows detailed job info
lpmove [job-id] MyPrinter

# Get debug output from CUPS
sudo cupsctl --debug-logging
sudo tail -f /var/log/cups/error_log
# Disable debug logging when done
sudo cupsctl --no-debug-logging
```

## Multiple Printer Setup

```bash
#!/bin/bash
# Setup script for adding multiple IPP Everywhere printers

declare -A PRINTERS=(
    ["MainOffice"]="ipp://main-printer.local/ipp/print"
    ["Conference"]="ipp://conf-printer.local/ipp/print"
    ["Reception"]="ipp://reception-printer.local/ipp/print"
)

for NAME in "${!PRINTERS[@]}"; do
    URI="${PRINTERS[$NAME]}"
    echo "Adding printer: $NAME ($URI)"

    sudo lpadmin \
        -p "$NAME" \
        -v "$URI" \
        -E \
        -m everywhere \
        -D "$NAME Printer"

    # Set duplex and A4 as defaults
    sudo lpadmin -p "$NAME" \
        -o sides-default=two-sided-long-edge \
        -o media-default=iso_a4_210x297mm

    sudo cupsenable "$NAME"
    sudo cupsaccept "$NAME"
done

echo "All printers configured."
lpstat -p
```

IPP Everywhere eliminates the printer driver maintenance burden that plagued earlier Linux printing. When a new printer arrives in the office, you add it by URI and it just works - no driver download, no PPD editing, no vendor packages to maintain.
