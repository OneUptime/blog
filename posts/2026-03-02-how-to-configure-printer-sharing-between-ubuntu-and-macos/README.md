# How to Configure Printer Sharing Between Ubuntu and macOS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MacOS, CUPS, Printer Sharing, Networking

Description: Set up printer sharing between Ubuntu and macOS using CUPS and Bonjour/AirPrint, allowing macOS clients to print to Ubuntu-connected printers and vice versa.

---

Sharing printers between Ubuntu and macOS is straightforward because both use CUPS and both support Bonjour (mDNS) for printer discovery. Ubuntu can share its connected printer to macOS via AirPrint, and macOS can share its printer back to Ubuntu. This post covers both directions.

## Direction 1: Ubuntu Shares a Printer to macOS

This is the more common scenario: a printer is physically connected to an Ubuntu machine or print server, and you want macOS clients on the same network to print to it.

### Installing and Configuring CUPS on Ubuntu

```bash
# Install CUPS and Avahi for Bonjour/mDNS support
sudo apt update
sudo apt install cups avahi-daemon -y

# Start and enable services
sudo systemctl enable cups avahi-daemon
sudo systemctl start cups avahi-daemon

# Add your user to the lpadmin group for CUPS administration
sudo usermod -aG lpadmin $USER
```

### Adding the Printer to Ubuntu

```bash
# List detected printers (USB printers should appear)
lpinfo -v

# Add a USB-connected printer
# Find the URI from lpinfo -v output, e.g., usb://HP/LaserJet
sudo lpadmin \
    -p OfficeHP \
    -v "usb://HP/LaserJet" \
    -m "drv:///hpijs.drv/hp-laserjet_1020.ppd" \
    -D "Office HP LaserJet" \
    -E

# Or use CUPS web interface at http://localhost:631
# to add the printer interactively

# Enable and accept jobs
sudo cupsenable OfficeHP
sudo cupsaccept OfficeHP
```

### Enabling Network Sharing from Ubuntu

```bash
# Edit CUPS configuration for network sharing
sudo nano /etc/cups/cupsd.conf
```

```text
# Listen on all interfaces (not just localhost)
Listen 0.0.0.0:631

# Enable Bonjour sharing (required for macOS discovery)
BrowseLocalProtocols dnssd

# Allow connections from your local network
<Location />
  Order allow,deny
  Allow localhost
  Allow 192.168.1.0/24
</Location>

<Location /admin>
  Order allow,deny
  Allow localhost
</Location>

<Location /printers>
  Order allow,deny
  Allow localhost
  Allow 192.168.1.0/24
</Location>
```

```bash
# Enable printer sharing via cupsd
sudo cupsctl --share-printers

# Mark the printer as shared
sudo lpadmin -p OfficeHP -o printer-is-shared=true

# Restart CUPS to apply all changes
sudo systemctl restart cups

# Verify the printer is being advertised via Bonjour
avahi-browse _ipp._tcp -t
# Should show your printer in the list
```

### Adding the Ubuntu Printer on macOS

macOS should auto-discover the printer:

1. System Settings > Printers & Scanners
2. Click the "+" button to add a printer
3. The Ubuntu-shared printer appears in the "Nearby Printers" list automatically
4. Select it and click "Add"

If it doesn't appear automatically:

```bash
# From macOS terminal, check if printer is discoverable
dns-sd -B _ipp._tcp .
# Should show your Ubuntu-shared printer

# Add manually via IP if needed
# System Settings > Printers & Scanners > + > IP tab
# Protocol: IPP
# Address: <ubuntu-machine-ip>
# Queue: /printers/OfficeHP
```

### Testing from macOS

```bash
# From macOS terminal, test printing
lp -d OfficeHP /path/to/document.pdf

# List available printers on macOS
lpstat -a

# Check job status
lpq -P OfficeHP
```

## Direction 2: macOS Shares a Printer to Ubuntu

When a printer is connected to a Mac and you want Ubuntu to print to it.

### Enable Printer Sharing on macOS

1. System Settings > General > Sharing
2. Enable "Printer Sharing"
3. Select the printer to share
4. Click the "+" under "Users" to choose who can print (or leave open for everyone)

macOS automatically advertises the shared printer via Bonjour.

### Discovering and Adding the Mac Printer on Ubuntu

```bash
# Discover the macOS-shared printer from Ubuntu
avahi-browse _ipp._tcp -r -t

# You should see output like:
# + eth0 IPv4 "HP LaserJet 1020" _ipp._tcp local
#   hostname = [MacBook-Pro.local]
#   address = [192.168.1.5]
#   port = [631]
#   txt = ["..."]

# Add the printer using its URI
# Replace the hostname and queue path as shown in the avahi-browse output
sudo lpadmin \
    -p MacHP \
    -v "ipp://MacBook-Pro.local/printers/HP-LaserJet-1020" \
    -m everywhere \
    -D "Mac HP LaserJet" \
    -E

sudo cupsenable MacHP
sudo cupsaccept MacHP

# Test print
lp -d MacHP /usr/share/cups/data/default-testpage.pdf
```

If mDNS resolution doesn't work:

```bash
# Try using the IP address directly
sudo lpadmin \
    -p MacHP \
    -v "ipp://192.168.1.5/printers/HP-LaserJet-1020" \
    -m everywhere \
    -D "Mac HP LaserJet" \
    -E
```

## Configuring Authentication

For shared printers with access controls:

### On Ubuntu (requiring authentication from macOS clients)

```bash
sudo nano /etc/cups/cupsd.conf
```

```text
<Location /printers/OfficeHP>
  Order allow,deny
  Allow localhost
  Allow 192.168.1.0/24
  AuthType Basic
  Require user @SYSTEM @lp
</Location>
```

```bash
# Create a CUPS user for macOS clients to authenticate
sudo lppasswd -a macuser
```

On macOS, when adding the printer, it will prompt for credentials.

### Guest Printing (No Authentication)

```bash
# For environments where anyone on the network can print
sudo cupsctl --remote-any

<Location /printers>
  Order allow,deny
  Allow all
</Location>
```

## Setting Up a Dedicated Ubuntu Print Server

For an office with multiple macOS clients and one Ubuntu print server:

```bash
#!/bin/bash
# /usr/local/bin/setup-print-server.sh
# Configure Ubuntu as an AirPrint/CUPS print server for macOS clients

# Install everything needed
sudo apt install cups avahi-daemon cups-browsed -y

# Configure CUPS for network sharing
sudo cupsctl --share-printers --remote-any

# Configure cupsd.conf
sudo tee /etc/cups/cupsd.conf << 'EOF'
LogLevel warn
MaxLogSize 0
ErrorLog /var/log/cups/error_log
AccessLog /var/log/cups/access_log
PageLog /var/log/cups/page_log

Listen *:631
Listen /run/cups/cups.sock

BrowseLocalProtocols dnssd

ServerAlias *

<Location />
  Order allow,deny
  Allow localhost
  Allow @LOCAL
</Location>

<Location /admin>
  Order allow,deny
  Allow localhost
</Location>

<Location /printers>
  Order allow,deny
  Allow @LOCAL
</Location>

<Policy default>
  <Limit Send-Document Send-URI Hold-Job Release-Job Restart-Job Purge-Jobs Set-Job-Attributes Create-Job-Subscription Renew-Subscription Cancel-Subscription Get-Notifications Reprocess-Job Cancel-Current-Job Suspend-Current-Job Resume-Job Cancel-My-Jobs Close-Job CUPS-Move-Job CUPS-Get-Document>
    Require user @OWNER @SYSTEM
    Order deny,allow
  </Limit>
  <Limit All>
    Order deny,allow
  </Limit>
</Policy>
EOF

sudo systemctl restart cups
echo "Print server configured. Add printers via http://localhost:631"
```

## Monitoring Print Jobs Across Ubuntu and macOS

```bash
# On Ubuntu, monitor all print jobs (from all clients)
sudo tail -f /var/log/cups/access_log

# Check jobs from specific client
grep "192.168.1.5" /var/log/cups/access_log | tail -20

# List all completed jobs
lpstat -W completed -p OfficeHP | head -20

# Get page count for billing/reporting
grep "Successful-OK" /var/log/cups/page_log | \
    awk '{print $1, $2, $7}' | \
    sort | \
    uniq -c
```

## Troubleshooting Cross-Platform Printing

```bash
# Ubuntu can't discover macOS printer
# Check Avahi is running on both machines
systemctl status avahi-daemon

# Check mDNS traffic isn't blocked
sudo tcpdump -i eth0 -n port 5353

# macOS can't discover Ubuntu printer
# Verify Ubuntu printer is being broadcast
sudo avahi-browse _ipp._tcp -t -v

# Test direct connectivity
ping ubuntu-machine-hostname.local  # From macOS terminal

# Check CUPS is accepting remote connections
curl -v http://ubuntu-ip:631/printers/

# Print jobs appear in queue but don't print
sudo tail -f /var/log/cups/error_log
sudo cancel -a  # Cancel stuck jobs
sudo cupsenable PrinterName  # Re-enable if disabled by error
```

CUPS with Bonjour/mDNS makes Ubuntu-macOS printer sharing nearly plug-and-play. The main friction points are firewalls blocking mDNS (port 5353 UDP) and IPP (port 631 TCP), and authentication requirements on shared printers. Once those are sorted, the two platforms work together seamlessly.
