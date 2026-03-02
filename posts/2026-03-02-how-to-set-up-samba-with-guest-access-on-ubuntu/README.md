# How to Set Up Samba with Guest Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, File Sharing, Networking, SMB

Description: Configure Samba on Ubuntu to allow guest (unauthenticated) access to shares, with appropriate permission controls and security considerations.

---

Guest access in Samba lets clients connect to shares without providing a username or password. This is useful for read-only public shares on a trusted internal network, for example a media share accessible to all devices on a home network. It requires careful configuration to avoid exposing writable shares unintentionally.

## Understanding Guest Access in Samba

When a Samba client connects as a guest, Samba maps the connection to a system user - by default this is `nobody`. The permissions on the shared directory must allow that system user to read (and optionally write) the files. Samba does not create a separate "guest" system user; it reuses an existing unprivileged user.

Guest access got more restricted in newer Samba versions due to security concerns. Some client configurations also need adjustment to allow unauthenticated connections.

## Installing Samba

```bash
# Install Samba if not already present
sudo apt update
sudo apt install samba -y

# Verify the installation
smbd --version
```

## Backing Up the Default Configuration

```bash
# Back up the original smb.conf before modifying
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.bak
```

## Configuring Global Guest Settings

Open `/etc/samba/smb.conf` and adjust the `[global]` section:

```bash
sudo nano /etc/samba/smb.conf
```

```ini
[global]
   workgroup = WORKGROUP
   server string = Ubuntu File Server
   server role = standalone server

   # Map unknown users to the guest account
   map to guest = bad user

   # The guest account maps to this system user
   guest account = nobody

   # Log settings
   log file = /var/log/samba/log.%m
   max log size = 1000
   logging = file

   # Minimum SMB protocol version (avoid SMBv1)
   min protocol = SMB2
```

The `map to guest = bad user` directive tells Samba to automatically treat connections from users who do not exist in Samba's user database as guests. This is the recommended setting for guest access.

## Creating the Shared Directory

```bash
# Create a directory for the guest share
sudo mkdir -p /srv/samba/public

# Set ownership to nobody (the guest account)
sudo chown nobody:nogroup /srv/samba/public

# For read-only guest access
sudo chmod 755 /srv/samba/public

# For read-write guest access (use with caution)
sudo chmod 777 /srv/samba/public
```

If you want to be more careful with permissions, create a dedicated group:

```bash
# Create a group for shared access
sudo groupadd sambashare

# Set the directory group ownership
sudo chgrp sambashare /srv/samba/public

# Allow group members to read and write
sudo chmod 775 /srv/samba/public
```

## Defining the Guest Share

Add a share definition to `/etc/samba/smb.conf`:

```ini
[public]
   comment = Public Guest Share
   path = /srv/samba/public

   # Allow guest access without authentication
   guest ok = yes

   # Only guest connections (no authenticated users)
   guest only = yes

   # Allow browsing the share
   browseable = yes

   # Read-only - change to yes for writable
   read only = yes

   # Force all files to be created with these permissions
   force create mode = 0664
   force directory mode = 0775
```

For a writable guest share, change `read only = no` and ensure directory permissions support writes:

```ini
[public-writable]
   comment = Writable Guest Share
   path = /srv/samba/public
   guest ok = yes
   guest only = yes
   browseable = yes
   read only = no
   # All files created by guests belong to nobody
   force user = nobody
   force group = nogroup
   create mask = 0664
   directory mask = 0775
```

## Testing the Configuration

Validate the Samba configuration before restarting:

```bash
# Test smb.conf syntax
testparm

# Look for any errors in the output
# Loaded services and share definitions should appear
```

## Restarting Samba Services

```bash
# Restart both Samba daemons
sudo systemctl restart smbd nmbd

# Enable them to start at boot
sudo systemctl enable smbd nmbd

# Check service status
sudo systemctl status smbd
```

## Configuring the Firewall

Allow Samba traffic through the firewall:

```bash
# Allow Samba ports
sudo ufw allow samba

# Verify the rule was added
sudo ufw status
```

## Connecting as a Guest

### From Windows

In File Explorer's address bar:

```
\\192.168.1.50\public
```

Windows may show a credential dialog. Click "Connect without a credential" or just press Cancel/OK without entering credentials, depending on the Windows version. If Windows prompts for credentials repeatedly, this indicates the client or server is not configured to allow guest access properly.

On Windows 10/11, guest access via SMB2/3 may be blocked by default. Enable it via Group Policy or a registry change:

```
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\LanmanWorkstation\Parameters
EnableInsecureGuestLogons = 1 (DWORD)
```

Or via PowerShell as Administrator:

```powershell
# Enable insecure guest logons (required for SMB guest access on Windows 10/11)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanWorkstation\Parameters" `
  -Name EnableInsecureGuestLogons -Value 1 -Type DWord
```

### From Linux

```bash
# Connect without credentials
smbclient //192.168.1.50/public -N

# Mount without credentials
sudo mount -t cifs //192.168.1.50/public /mnt/public -o guest,uid=$(id -u)
```

### From macOS

In Finder, `Cmd+K` and enter:

```
smb://192.168.1.50/public
```

Choose "Guest" when prompted for the connection type.

## Security Considerations

Guest access is appropriate only on trusted networks. On a network where any device can connect, a writable guest share effectively allows anyone to upload arbitrary files to your server.

Practical guidelines:
- Use read-only guest shares whenever possible.
- Place guest shares on a separate filesystem or partition to prevent guests from filling system storage.
- Monitor guest share usage with Samba audit logging.
- Consider isolating the Samba server on a separate VLAN if it must serve untrusted clients.
- Do not put sensitive data in directories accessible to guest.

```bash
# Check who is connected to the Samba server
sudo smbstatus

# See current connections and open files
sudo smbstatus --shares
```

## Adding Authenticated Shares Alongside Guest Shares

A common pattern is having both a public guest share and a private authenticated share on the same server:

```ini
[public]
   comment = Public Read-Only Share
   path = /srv/samba/public
   guest ok = yes
   read only = yes
   browseable = yes

[private]
   comment = Private Authenticated Share
   path = /srv/samba/private
   guest ok = no
   valid users = @smbgroup
   read only = no
   browseable = yes
```

```bash
# Create the private directory
sudo mkdir -p /srv/samba/private
sudo chgrp smbgroup /srv/samba/private
sudo chmod 770 /srv/samba/private

# Add a user to the smbgroup
sudo usermod -aG smbgroup username
sudo smbpasswd -a username
```

With `map to guest = bad user`, users not in Samba's database connect as guests and get the public share, while authenticated users can access both.
