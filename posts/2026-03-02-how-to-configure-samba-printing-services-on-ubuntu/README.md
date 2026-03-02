# How to Configure Samba Printing Services on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, Printing, CUPS, Windows

Description: Configure Samba printing services on Ubuntu to share printers with Windows clients using CUPS as the backend and automatic driver distribution.

---

Samba's printing integration allows Ubuntu to act as a print server for Windows clients. The setup combines CUPS (Common Unix Printing System) for the actual print processing with Samba for the Windows-compatible sharing. Windows clients can connect to printers shared from Ubuntu just like they would connect to a Windows print server, including automatic driver installation.

## Architecture Overview

The print path for a Windows client connecting to a Samba print server:

1. Windows client sends a print job to Samba via SMB
2. Samba passes the job to CUPS using the CUPS printing backend
3. CUPS processes the job and sends it to the physical printer
4. Print status is relayed back to Samba and the Windows client

## Installing Required Packages

```bash
sudo apt update
sudo apt install -y samba cups cups-client printer-driver-all \
  foomatic-db foomatic-db-engine
```

The `foomatic-db` packages provide driver data for a wide range of printers. For specific printer brands you may need additional packages:

```bash
# HP printers
sudo apt install -y hplip

# Brother printers (download from Brother's website)
# sudo dpkg -i brscan4-0.4.11-1.amd64.deb

# For PostScript printers (most office printers)
sudo apt install -y ghostscript
```

## Step 1: Set Up CUPS

### Configure CUPS for Network Access

By default, CUPS only accepts connections from localhost:

```bash
sudo nano /etc/cups/cupsd.conf
```

Find and modify these sections:

```
# Listen for connections (add network interface)
Listen localhost:631
Listen 192.168.1.10:631

# Allow access from your network to the admin interface
<Location />
  Order allow,deny
  Allow localhost
  Allow from 192.168.1.0/24
</Location>

<Location /admin>
  Order allow,deny
  Allow localhost
  Allow from 192.168.1.0/24
</Location>

<Location /admin/conf>
  AuthType Default
  Require user @SYSTEM
  Order allow,deny
  Allow localhost
  Allow from 192.168.1.0/24
</Location>
```

```bash
sudo systemctl enable cups
sudo systemctl restart cups
```

### Add a Printer to CUPS

**Via Web Interface** - navigate to `http://server-ip:631/admin`, click "Add Printer".

**Via Command Line:**

```bash
# For a network printer (IPP protocol - most modern printers)
sudo lpadmin -p "OfficeHP" \
  -E \
  -v "ipp://192.168.1.200/ipp/print" \
  -m "drv:///hpijs.drv/hp-laserjet_1020.ppd" \
  -D "Office HP LaserJet 1020" \
  -L "Main Office"

# For a USB printer
# CUPS detects USB printers automatically - check:
sudo lpinfo -v | grep usb

# For a printer using raw passthrough (driver on Windows side)
sudo lpadmin -p "RawPrinter" \
  -E \
  -v "usb://Brother/DCP-7065DN?serial=E75059W0F170490" \
  -m raw \
  -D "Brother DCP-7065DN"
```

Verify the printer is added:

```bash
lpstat -a
# OfficeHP accepting requests since ...

# Test print
echo "Test page" | lpr -P OfficeHP
```

## Step 2: Configure Samba for Printing

```bash
sudo nano /etc/samba/smb.conf
```

```ini
[global]
   workgroup = WORKGROUP
   server string = Ubuntu Print Server
   server role = standalone server
   security = user

   # Enable printing
   load printers = yes
   printing = cups
   printcap name = cups

   # Where Windows printer drivers are stored
   # Windows clients auto-download drivers from here
   [print$]
```

Add the printer shares:

```ini
##
## All printers - exposes all CUPS printers
##
[printers]
   comment = All Printers
   path = /var/spool/samba
   browsable = no
   guest ok = no
   read only = yes
   printable = yes
   valid users = @printusers
   printer admin = @printadmin

##
## Printer driver share - Windows downloads drivers from here
##
[print$]
   comment = Printer Drivers
   path = /var/lib/samba/printers
   browsable = yes
   read only = yes
   guest ok = no

   # Only administrators can add/update drivers
   write list = @printadmin, root

##
## Specific named printer share
##
[OfficeHP]
   comment = Main Office HP Printer
   path = /var/spool/samba
   printable = yes
   printer name = OfficeHP
   browsable = yes
   guest ok = no
   valid users = @staff
   use client driver = yes
```

## Step 3: Create the Print Spool Directory

```bash
sudo mkdir -p /var/spool/samba
sudo chmod 1777 /var/spool/samba
sudo chown root:root /var/spool/samba

# Driver directory
sudo mkdir -p /var/lib/samba/printers/{W32X86,x64,WIN40,IA64,x2_85e3ef5a-577a-4dab-8de2-fa5176ef0c85}
sudo chown -R root:printadmin /var/lib/samba/printers
sudo chmod -R 0775 /var/lib/samba/printers
```

## Step 4: Set Up User Groups and Samba Users

```bash
# Create groups
sudo groupadd printusers
sudo groupadd printadmin

# Add users
sudo useradd -M -s /usr/sbin/nologin printuser1
sudo usermod -aG printusers printuser1

sudo useradd -M -s /usr/sbin/nologin printmgr
sudo usermod -aG printadmin printmgr

# Create Samba passwords
sudo smbpasswd -a printuser1
sudo smbpasswd -e printuser1
sudo smbpasswd -a printmgr
sudo smbpasswd -e printmgr
```

## Step 5: Upload Windows Printer Drivers

For Windows clients to receive automatic driver installation, upload the drivers to the `[print$]` share.

**From a Windows machine** (easiest method):

1. On Windows, open "Print Management" (run `printmanagement.msc`)
2. Or use `rpcclient` or the Windows "Add Printer Wizard" connected to the Samba server

**Via rpcclient from Ubuntu** (for command-line driver upload):

```bash
# Install rpcclient
sudo apt install -y smbclient

# First, get the Windows drivers from the manufacturer
# Then use Windows to connect and upload, or:
# Map the print$ share from Windows and copy drivers there

# Verify drivers are accessible
smbclient //localhost/print$ -U printmgr
smb: \> ls
```

**The practical approach** - use a Windows machine to add the printer via the Samba server and let Windows upload the driver automatically:

1. On Windows, go to `\\ubuntu-print-server\` in Explorer
2. Double-click `OfficeHP`
3. Windows will prompt for driver installation
4. Install the driver - it gets uploaded to `[print$]` automatically

## Step 6: Reload and Test Samba

```bash
# Check configuration syntax
sudo testparm

# Reload Samba
sudo systemctl restart smbd
sudo systemctl restart nmbd

# Verify printers are listed via Samba
smbclient -L //localhost -N

# Test printing via SMB
smbclient //localhost/OfficeHP -U printuser1
smb: \> print /etc/hostname
```

## Step 7: Firewall and AppArmor

```bash
# Allow Samba ports
sudo ufw allow samba

# Allow CUPS admin from local network
sudo ufw allow from 192.168.1.0/24 to any port 631
```

Check if AppArmor is blocking CUPS or Samba:

```bash
sudo dmesg | grep apparmor | grep -E "cups|smbd"

# If AppArmor is causing issues, check profiles
sudo aa-status | grep -E "cups|smbd"
```

## Connecting from Windows

From a Windows client (DNS must resolve the Ubuntu server):

```cmd
# Browse to the print server
\\ubuntu-print-server\

# Or add the printer directly
\\ubuntu-print-server\OfficeHP
```

When connecting, Windows will download the driver from `[print$]` if uploaded. Otherwise it prompts for a local driver.

## Managing Print Queues

```bash
# View current print queue for all printers
lpq -a

# View queue for a specific printer
lpq -P OfficeHP

# Cancel all jobs for a printer
cancel -a OfficeHP

# Cancel a specific job
cancel OfficeHP-5

# Pause a printer
sudo cupsdisable OfficeHP

# Resume
sudo cupsenable OfficeHP
```

## Monitoring and Logs

```bash
# CUPS access log
sudo tail -f /var/log/cups/access_log

# CUPS error log
sudo tail -f /var/log/cups/error_log

# Samba log for a specific client
sudo tail -f /var/log/samba/log.192.168.1.100

# Check for printing-related errors
sudo journalctl -u cups -n 50
sudo journalctl -u smbd -n 50
```

## Troubleshooting

**Windows shows "Driver not found"** - drivers have not been uploaded to `[print$]`. Add the printer using Windows' printer wizard first, which uploads the driver, then subsequent clients download it automatically.

**"Access Denied" when printing** - check the user is in `printusers` group and has a Samba password set with `smbpasswd`.

**Jobs stuck in queue** - check CUPS: `lpstat -a` shows if the printer is accepting jobs. Run `sudo cupsenable OfficeHP` if paused.

**CUPS can't find the printer** - verify the network printer is accessible: `ping 192.168.1.200` and test with `ipp://printer-ip/ipp/print` in a browser.

With Samba printing configured, Windows users across your network can print to Ubuntu-managed printers without installing individual printer connections on each workstation.
