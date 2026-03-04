# How to Install and Configure CUPS Print Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CUPS, Print Server, Printing, System Administration, Linux

Description: Install and configure CUPS (Common UNIX Printing System) on RHEL to set up a centralized print server for managing local and network printers.

---

CUPS is the standard printing system on RHEL that manages print queues, processes print jobs, and communicates with printers. Setting up a CUPS print server allows you to share printers with multiple clients on your network.

## Install CUPS

```bash
# Install CUPS and related packages
sudo dnf install -y cups cups-filters

# For HP printers, also install HPLIP
sudo dnf install -y hplip
```

## Enable and Start CUPS

```bash
# Enable CUPS to start at boot
sudo systemctl enable cups

# Start the service
sudo systemctl start cups

# Verify it is running
sudo systemctl status cups
```

## Configure CUPS for Network Access

By default, CUPS only listens on localhost. To allow remote administration and printer sharing:

```bash
# Edit the CUPS configuration
sudo vi /etc/cups/cupsd.conf
```

Make the following changes:

```bash
# Listen on all interfaces instead of just localhost
Listen *:631

# Allow access from your local network
<Location />
  Order allow,deny
  Allow @LOCAL
</Location>

# Allow remote administration
<Location /admin>
  Order allow,deny
  Allow @LOCAL
</Location>

<Location /admin/conf>
  AuthType Default
  Require user @SYSTEM
  Order allow,deny
  Allow @LOCAL
</Location>
```

```bash
# Restart CUPS to apply the changes
sudo systemctl restart cups
```

## Open Firewall Ports

```bash
# Allow CUPS traffic through the firewall
sudo firewall-cmd --permanent --add-service=ipp
sudo firewall-cmd --permanent --add-port=631/tcp
sudo firewall-cmd --reload
```

## Access the CUPS Web Interface

Open a browser and navigate to `https://your-server-ip:631`. The web interface lets you add printers, manage queues, and view job history.

## Add a Printer via Command Line

```bash
# List detected printers
lpstat -p -d

# Add a local USB printer
sudo lpadmin -p "HP-LaserJet" \
  -E \
  -v "usb://HP/LaserJet%20Pro" \
  -m drv:///hp/hplip.drv/hp-laserjet_pro_m404-ps.ppd

# Add a network printer using its IP
sudo lpadmin -p "Office-Printer" \
  -E \
  -v "ipp://192.168.1.50/ipp/print" \
  -m everywhere

# Set a default printer
sudo lpadmin -d "Office-Printer"
```

## Test Printing

```bash
# Print a test page
lp -d Office-Printer /usr/share/cups/data/testprint

# Check the print queue
lpstat -o

# View detailed printer status
lpstat -t
```

## Enable Printer Sharing

```bash
# Share all printers on the network
sudo cupsctl --share-printers

# Share a specific printer
sudo lpadmin -p "Office-Printer" -o printer-is-shared=true

# Verify sharing is enabled
lpstat -v
```

CUPS provides a robust and flexible print management system that works with a wide range of printer hardware and supports both local and network printing on RHEL.
