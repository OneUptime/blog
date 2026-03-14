# How to Share a CUPS Printer with Windows and macOS Clients from RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CUPS, Printer Sharing, Windows, MacOS, Samba, Linux

Description: Share printers from a RHEL CUPS server with Windows and macOS clients using IPP, Bonjour/mDNS, and Samba for cross-platform printing.

---

A RHEL CUPS print server can share printers with Windows, macOS, and other Linux clients. macOS clients can use IPP or Bonjour (mDNS) discovery natively. Windows clients can connect via IPP or Samba.

## Enable Printer Sharing in CUPS

```bash
# Enable sharing in CUPS
sudo cupsctl --share-printers

# Share a specific printer
sudo lpadmin -p "Office-Printer" -o printer-is-shared=true

# Verify sharing is enabled in cupsd.conf
grep -E "Browsing|BrowseLocalProtocols|Share" /etc/cups/cupsd.conf
```

## Configure CUPS to Listen on the Network

```bash
# Edit cupsd.conf to allow network access
sudo vi /etc/cups/cupsd.conf

# Ensure these settings:
# Listen *:631
# Browsing On
# BrowseLocalProtocols dnssd

# Allow access from your network
# <Location />
#   Order allow,deny
#   Allow @LOCAL
# </Location>

# Restart CUPS
sudo systemctl restart cups
```

## Open Firewall Ports

```bash
# Allow IPP and mDNS through the firewall
sudo firewall-cmd --permanent --add-service=ipp
sudo firewall-cmd --permanent --add-service=mdns
sudo firewall-cmd --reload
```

## Share with macOS Clients

macOS discovers CUPS printers automatically via Bonjour (mDNS).

```bash
# Ensure avahi is running for Bonjour/mDNS discovery
sudo dnf install -y avahi
sudo systemctl enable --now avahi-daemon
```

On the macOS client:
1. Open System Preferences > Printers & Scanners
2. Click the "+" button to add a printer
3. The shared printer should appear automatically
4. Select it and click "Add"

## Share with Windows Clients via IPP

Windows 10 and later support IPP natively.

On the Windows client:
1. Go to Settings > Devices > Printers & Scanners
2. Click "Add a printer or scanner"
3. Click "The printer that I want isn't listed"
4. Select "Add a printer using a TCP/IP address or hostname"
5. Enter: `http://rhel-server-ip:631/printers/Office-Printer`

## Share with Windows Clients via Samba

For older Windows versions or environments that prefer SMB:

```bash
# Install Samba
sudo dnf install -y samba

# Edit the Samba configuration
sudo vi /etc/samba/smb.conf
```

Add the following section:

```ini
[printers]
   comment = All Printers
   path = /var/tmp
   printable = yes
   browseable = yes
   public = yes
   guest ok = yes
   printing = cups
   printcap name = cups

[print$]
   comment = Printer Drivers
   path = /var/lib/samba/drivers
   browseable = yes
   read only = yes
   guest ok = no
```

```bash
# Enable and start Samba
sudo systemctl enable --now smb

# Open Samba firewall ports
sudo firewall-cmd --permanent --add-service=samba
sudo firewall-cmd --reload

# Set SELinux boolean for Samba printing
sudo setsebool -P samba_enable_home_dirs on
```

## Test from Clients

```bash
# From a Linux client, print to the shared printer
lp -h rhel-server-ip -d Office-Printer /tmp/testfile.txt

# Verify the job was received on the server
lpstat -o
```

## Troubleshooting

```bash
# Check CUPS logs for connection issues
sudo tail -f /var/log/cups/error_log

# Verify the printer is visible via mDNS
avahi-browse -rt _ipp._tcp

# Test IPP access from a remote machine
curl -I http://rhel-server-ip:631/printers/Office-Printer
```

With IPP for macOS and modern Windows, and Samba for legacy Windows, your RHEL CUPS server can serve printers to all clients on the network.
