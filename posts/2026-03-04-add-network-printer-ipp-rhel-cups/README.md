# How to Add a Network Printer Using IPP on RHEL with CUPS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CUPS, IPP, Network Printer, Printing, Linux

Description: Add a network printer to RHEL using the Internet Printing Protocol (IPP) with CUPS, supporting driverless printing and automatic configuration.

---

The Internet Printing Protocol (IPP) is the modern standard for network printing. Most network printers and print servers support IPP, and CUPS on RHEL can communicate with them directly. IPP Everywhere enables driverless printing, meaning no manufacturer-specific drivers are needed.

## Prerequisites

```bash
# Ensure CUPS is installed and running
sudo dnf install -y cups
sudo systemctl enable --now cups

# Install avahi for automatic printer discovery
sudo dnf install -y avahi nss-mdns
sudo systemctl enable --now avahi-daemon
```

## Discover Network Printers

```bash
# Browse for IPP printers on the network using avahi
avahi-browse -rt _ipp._tcp

# Or use CUPS built-in discovery
lpinfo -v | grep ipp

# You should see URIs like:
# ipp://printer.local:631/ipp/print
# ipp://192.168.1.50/ipp/print
```

## Add a Printer Using IPP Everywhere (Driverless)

```bash
# Add the printer using the "everywhere" driver
# This uses IPP Everywhere for driverless printing
sudo lpadmin -p "Network-Printer" \
  -E \
  -v "ipp://192.168.1.50/ipp/print" \
  -m everywhere

# Set it as the default printer
sudo lpadmin -d "Network-Printer"

# Verify the printer was added
lpstat -v
```

## Add a Printer Using a Specific IPP URI

Some printers expose different print paths:

```bash
# Common IPP URI formats:
# HP printers:      ipp://printer-ip/ipp/print
# Canon printers:   ipp://printer-ip/ipp/print
# Epson printers:   ipp://printer-ip/ipp/print
# Ricoh printers:   ipp://printer-ip/printer

# Add with the specific URI
sudo lpadmin -p "Ricoh-Copier" \
  -E \
  -v "ipp://192.168.1.100/printer" \
  -m everywhere
```

## Query Printer Capabilities

```bash
# Get the printer attributes via IPP
ipptool -tv ipp://192.168.1.50/ipp/print get-printer-attributes.test 2>/dev/null | head -30

# Check supported media sizes and types
lpoptions -p Network-Printer -l
```

## Configure Print Options

```bash
# Set default options for the printer
sudo lpadmin -p "Network-Printer" \
  -o media=A4 \
  -o sides=two-sided-long-edge \
  -o print-quality=4

# View current default options
lpoptions -p "Network-Printer" -l
```

## Test Printing

```bash
# Print a test page
lp -d "Network-Printer" /usr/share/cups/data/testprint

# Print a specific file with options
lp -d "Network-Printer" -o media=Letter -o sides=one-sided document.pdf

# Check the print queue
lpstat -p "Network-Printer" -o
```

## Add via the CUPS Web Interface

1. Open `https://localhost:631` in a browser
2. Click "Administration" then "Add Printer"
3. Select "Internet Printing Protocol (ipp)" under "Other Network Printers"
4. Enter the printer URI: `ipp://192.168.1.50/ipp/print`
5. Set the name and location
6. Select "IPP Everywhere" as the model
7. Click "Add Printer"

## Troubleshooting

```bash
# Test IPP connectivity
ipptool -tv ipp://192.168.1.50/ipp/print get-printer-attributes.test

# Check CUPS error logs
sudo tail -f /var/log/cups/error_log

# Verify the printer is reachable
ping 192.168.1.50

# Check if the IPP port is open
nc -zv 192.168.1.50 631
```

IPP with CUPS provides a straightforward, driverless approach to network printing on RHEL that works with most modern network printers.
