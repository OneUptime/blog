# How to Set Up Samba File Server on Ubuntu for Windows Sharing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, File Sharing, Windows, SMB

Description: Set up a Samba file server on Ubuntu to share directories with Windows clients over SMB, with user authentication and proper permission configuration.

---

Samba is the standard way to share files between Linux and Windows systems. It implements the SMB (Server Message Block) protocol, which Windows uses for network file sharing. An Ubuntu Samba server looks exactly like a Windows file share to clients - it shows up in Windows Explorer, supports Windows ACLs, and works with standard Windows credential prompts.

## Installing Samba

```bash
sudo apt update
sudo apt install -y samba samba-common smbclient
```

Verify the installation:

```bash
smbd --version
samba --version
```

## Understanding Samba Configuration

All Samba configuration lives in `/etc/samba/smb.conf`. The file has two types of sections:

- **[global]** - server-wide settings
- **[sharename]** - individual share definitions

Start by backing up the default config:

```bash
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.backup
```

## Basic Samba Server Configuration

Replace the content of `/etc/samba/smb.conf`:

```bash
sudo nano /etc/samba/smb.conf
```

```ini
[global]
   # Windows workgroup name
   workgroup = WORKGROUP

   # Server description visible in Windows network browser
   server string = Ubuntu File Server

   # Server role
   server role = standalone server

   # Authentication mode
   # 'user' requires valid Samba user credentials
   # 'share' allows anonymous access to specific shares
   security = user

   # Map unknown users to guest
   map to guest = bad user

   # Log settings
   log file = /var/log/samba/log.%m
   max log size = 1000
   logging = file
   panic action = /usr/share/samba/panic-action %d

   # Use separate passwd file (tdb) for Samba users
   # This is separate from /etc/passwd
   passdb backend = tdbsam

   # DNS resolution
   dns proxy = no

   # Samba performance tuning
   socket options = TCP_NODELAY IPTOS_LOWDELAY

   # Prevent "print$" and "homes" shares from being auto-created
   load printers = no
   printing = bsd
   printcap name = /dev/null
   disable spoolss = yes

##
## Public share - read only, no authentication required
##
[Public]
   comment = Public Read-Only Share
   path = /srv/samba/public
   browsable = yes
   read only = yes
   guest ok = yes
   create mask = 0644
   directory mask = 0755

##
## Shared team directory - requires authentication
##
[TeamShare]
   comment = Team Shared Files
   path = /srv/samba/teamshare
   browsable = yes
   read only = no
   # Only users in the 'sambagroup' group can access
   valid users = @sambagroup
   write list = @sambagroup
   create mask = 0664
   directory mask = 0775
   force group = sambagroup

##
## Private home shares - each user accesses their own directory
##
[homes]
   comment = Home Directories
   browsable = no
   read only = no
   create mask = 0700
   directory mask = 0700
   valid users = %S
```

## Creating Share Directories

```bash
# Create the directory structure
sudo mkdir -p /srv/samba/public
sudo mkdir -p /srv/samba/teamshare

# Set permissions for public share (world-readable)
sudo chown nobody:nogroup /srv/samba/public
sudo chmod 755 /srv/samba/public

# Set up team share with a dedicated group
sudo groupadd sambagroup

# Set permissions for team share
sudo chown root:sambagroup /srv/samba/teamshare
sudo chmod 2775 /srv/samba/teamshare
# The setgid bit (2) ensures new files inherit the group
```

## Creating Samba Users

Samba maintains its own password database, separate from the system password in `/etc/shadow`. A user must exist in both:

```bash
# Create a system user (no login shell needed for share-only users)
sudo useradd -M -s /usr/sbin/nologin jsmith
sudo useradd -M -s /usr/sbin/nologin bwilliams

# Add users to the Samba group for the team share
sudo usermod -aG sambagroup jsmith
sudo usermod -aG sambagroup bwilliams

# Set Samba passwords (separate from Linux passwords)
sudo smbpasswd -a jsmith
sudo smbpasswd -a bwilliams

# Enable the Samba account (it starts disabled)
sudo smbpasswd -e jsmith
sudo smbpasswd -e bwilliams

# Verify Samba users
sudo pdbedit -L
```

## Validating the Configuration

Always test the configuration before restarting:

```bash
# Check smb.conf syntax
sudo testparm

# More verbose output
sudo testparm -v 2>/dev/null | head -50
```

Fix any errors reported before proceeding.

## Starting Samba Services

```bash
# Enable and start Samba
sudo systemctl enable smbd nmbd
sudo systemctl start smbd nmbd

# Check status
sudo systemctl status smbd
sudo systemctl status nmbd
```

`smbd` handles file sharing, and `nmbd` handles NetBIOS name resolution (needed for Windows network browsing).

## Firewall Configuration

```bash
# Allow Samba through the firewall
sudo ufw allow samba

# Or specifically:
sudo ufw allow 139/tcp   # NetBIOS session service
sudo ufw allow 445/tcp   # Direct SMB over TCP (modern clients use this)
sudo ufw allow 137/udp   # NetBIOS name service
sudo ufw allow 138/udp   # NetBIOS datagram service

# Restrict to a specific subnet for security
sudo ufw allow from 192.168.1.0/24 to any app Samba
```

## Testing from Linux

Test the shares locally with `smbclient`:

```bash
# List all shares (anonymous)
smbclient -L //localhost -N

# List shares as a user
smbclient -L //localhost -U jsmith

# Connect to a specific share
smbclient //localhost/TeamShare -U jsmith

# In the smbclient prompt:
smb: \> ls
smb: \> put localfile.txt
smb: \> quit
```

Test mounting the share:

```bash
sudo apt install -y cifs-utils

# Mount the team share
sudo mkdir -p /mnt/teamshare
sudo mount -t cifs //localhost/TeamShare /mnt/teamshare \
  -o username=jsmith,password=password,uid=1000,gid=1000

ls /mnt/teamshare

sudo umount /mnt/teamshare
```

## Connecting from Windows

From Windows Explorer or the Run dialog:

```
\\ubuntu-server.local\TeamShare
# or using IP:
\\192.168.1.50\TeamShare
```

Windows will prompt for credentials. Use the Samba username and password set with `smbpasswd`.

For persistent mapping via Windows Command Prompt:

```cmd
net use Z: \\ubuntu-server\TeamShare /user:jsmith password /persistent:yes
```

## Adding a New Share

To add a share without editing `smb.conf` by hand, use `net` command, or simply add a new section:

```bash
# Create directory
sudo mkdir -p /srv/samba/projects
sudo chown root:developers /srv/samba/projects
sudo chmod 2775 /srv/samba/projects

# Add to smb.conf
sudo tee -a /etc/samba/smb.conf << 'EOF'

[Projects]
   comment = Development Projects
   path = /srv/samba/projects
   browsable = yes
   read only = no
   valid users = @developers
   create mask = 0664
   directory mask = 0775
   force group = developers
EOF

# Reload without restart (for configuration changes)
sudo smbcontrol smbd reload-config
```

## Common Share Options Reference

| Option | Description |
|--------|-------------|
| `path` | Directory to share |
| `browsable = yes/no` | Visible in network browser |
| `read only = yes/no` | Allow writes |
| `guest ok = yes/no` | Allow anonymous access |
| `valid users` | Who can access (users/groups with @prefix) |
| `write list` | Who can write (subset of valid users) |
| `create mask` | Permission mask for new files |
| `directory mask` | Permission mask for new directories |
| `force user` | All files created as this user |
| `force group` | All files created with this group |
| `vfs objects` | Enable VFS modules (recycle, audit, etc.) |

## Monitoring Samba

```bash
# Show connected users and open files
sudo smbstatus

# Show detailed statistics
sudo smbstatus -S

# View Samba log for a specific client
sudo tail -f /var/log/samba/log.192.168.1.100
```

## Troubleshooting

**"NT_STATUS_LOGON_FAILURE"** - wrong username or password. Verify the user exists in Samba with `pdbedit -L` and reset the password with `smbpasswd`.

**"NT_STATUS_ACCESS_DENIED"** - user exists but has no access to this share. Check `valid users` and group membership.

**Share not visible in Windows** - ensure `browsable = yes` and `nmbd` is running. Try accessing by direct path `\\ip\sharename` to bypass browsing.

**Permission denied writing files** - check the Linux permissions on the share directory and that the Samba user's group matches the directory group.

With Samba running, your Ubuntu server provides file shares that Windows clients can access seamlessly, making it useful for mixed-OS environments, backup destinations, and departmental file servers.
