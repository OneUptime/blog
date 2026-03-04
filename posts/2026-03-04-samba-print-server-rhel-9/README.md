# How to Set Up Samba as a Print Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Samba, Print Server, Linux

Description: Configure Samba as a print server on RHEL to share CUPS printers with Windows clients over the SMB protocol.

---

## Samba Print Serving

Samba can act as a print server, making CUPS-managed printers available to Windows clients. Windows clients see the shared printers in their network neighborhood and can print to them using standard Windows printing. Samba handles the protocol translation between SMB and CUPS.

## Prerequisites

- RHEL with root access
- CUPS installed and configured with at least one printer
- Samba installed

## Step 1 - Install Required Packages

```bash
# Install Samba and CUPS
sudo dnf install -y samba samba-client cups cups-filters
```

## Step 2 - Configure CUPS

Make sure CUPS is running and has at least one printer configured:

```bash
# Enable and start CUPS
sudo systemctl enable --now cups

# List configured printers
lpstat -a

# If no printers are configured, access the CUPS web interface
# https://localhost:631
```

## Step 3 - Configure Samba for Printing

Edit /etc/samba/smb.conf to include print sharing:

```ini
[global]
    workgroup = WORKGROUP
    security = user

    # Printing configuration
    printing = cups
    printcap name = cups
    load printers = yes
    cups options = raw

[printers]
    comment = All Printers
    path = /var/spool/samba
    browseable = no
    guest ok = yes
    writable = no
    printable = yes

[print$]
    comment = Printer Drivers
    path = /var/lib/samba/drivers
    browseable = yes
    read only = yes
    write list = @samba_admins
```

## Step 4 - Create the Spool Directory

```bash
# Create and set permissions on the spool directory
sudo mkdir -p /var/spool/samba
sudo chmod 1777 /var/spool/samba

# Create the drivers directory
sudo mkdir -p /var/lib/samba/drivers
```

## Step 5 - Configure SELinux

```bash
# Set SELinux contexts
sudo setsebool -P samba_enable_home_dirs on

# Allow Samba to act as a print server
sudo semanage fcontext -a -t samba_share_t "/var/spool/samba(/.*)?"
sudo restorecon -Rv /var/spool/samba

sudo semanage fcontext -a -t samba_share_t "/var/lib/samba/drivers(/.*)?"
sudo restorecon -Rv /var/lib/samba/drivers
```

## Step 6 - Configure the Firewall

```bash
# Open Samba ports
sudo firewall-cmd --permanent --add-service=samba
sudo firewall-cmd --reload
```

## Step 7 - Restart Services

```bash
# Restart Samba
sudo systemctl restart smb nmb

# Verify configuration
testparm
```

## Step 8 - Connect from Windows

1. Open Control Panel, then Devices and Printers
2. Click "Add a printer"
3. Choose "The printer that I want isn't listed"
4. Select "Select a shared printer by name"
5. Enter `\\rhel-server\printer-name`
6. Install the driver when prompted

## Print Architecture

```mermaid
graph LR
    Win[Windows Client] -->|SMB Print Job| Samba[Samba smbd]
    Samba -->|CUPS API| CUPS[CUPS Service]
    CUPS -->|Print| Printer[Network Printer]
```

## Uploading Printer Drivers

For automatic driver installation on Windows clients:

```bash
# On the Samba server, create driver directories
sudo mkdir -p /var/lib/samba/drivers/{W32X86,x64,WIN40}

# Set permissions
sudo chown -R root:samba_admins /var/lib/samba/drivers
sudo chmod -R 2775 /var/lib/samba/drivers
```

Then upload drivers from a Windows machine using the Print Management console or the `rpcclient` tool.

## Using Raw Printing

Raw printing passes the print job directly from the Windows client to the printer without CUPS processing. This works well when clients have their own drivers:

```ini
[global]
    cups options = raw
```

## Troubleshooting

```bash
# Check if CUPS can see the printer
lpstat -a

# Print a test page from the command line
echo "Test print" | lpr -P printer_name

# Check Samba printer shares
smbclient -L //localhost -U% | grep -i print

# View CUPS error log
sudo tail -f /var/log/cups/error_log

# View Samba log
sudo tail -f /var/log/samba/log.smbd
```

## Restricting Printer Access

```ini
[printers]
    path = /var/spool/samba
    printable = yes

    # Only allow specific users to print
    valid users = @print_users

    # Or restrict by IP
    hosts allow = 192.168.1.0/24
```

## Wrap-Up

Samba print serving on RHEL bridges Linux CUPS printers and Windows clients. The setup involves configuring both CUPS and Samba, creating the spool and driver directories, and handling SELinux contexts. For modern environments, direct IP printing (where Windows prints directly to the printer) is often simpler, but Samba print serving remains useful for centralized print management and accounting.
