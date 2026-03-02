# How to Set Up Samba with macOS Integration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, macOS, File Sharing, SMB

Description: Configure Samba on Ubuntu for seamless macOS integration including Spotlight search support, Time Machine backup, and proper permissions for mixed Mac/Linux environments.

---

Getting Samba to work well with macOS requires a bit more than a basic SMB share configuration. macOS clients expect specific Samba settings for reliable connections, Spotlight indexing, and Time Machine support. This guide covers a Samba setup optimized for Mac clients while maintaining compatibility with Linux and Windows.

## Installing Samba

```bash
# Install Samba and related tools
sudo apt update
sudo apt install samba samba-common-bin -y

# Check that Samba is running
sudo systemctl status smbd nmbd
```

## Planning the Share Layout

A common setup:

- `/srv/shares/public` - shared access for all users
- `/srv/shares/homes` - per-user private shares
- `/srv/shares/timemachine` - Time Machine backup destination

```bash
# Create share directories
sudo mkdir -p /srv/shares/public
sudo mkdir -p /srv/shares/timemachine

# Set permissions for public share
sudo chown root:sambashare /srv/shares/public
sudo chmod 2775 /srv/shares/public

# Create Time Machine directory
sudo chown nobody:nogroup /srv/shares/timemachine
sudo chmod 1777 /srv/shares/timemachine

# Create the sambashare group if it does not exist
sudo groupadd sambashare
```

## Configuring Samba for macOS Compatibility

The default smb.conf needs adjustment for macOS clients. Open and edit it:

```bash
# Backup the original configuration
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.bak

sudo nano /etc/samba/smb.conf
```

Replace the contents with a macOS-optimized configuration:

```ini
[global]
    # Server identification
    workgroup = WORKGROUP
    server string = Ubuntu File Server
    netbios name = UBUNTUSERVER

    # Security settings
    security = user
    map to guest = never

    # macOS compatibility settings
    # Use SMB2 and SMB3 - avoid SMB1 (deprecated and insecure)
    server min protocol = SMB2
    server max protocol = SMB3

    # Support for macOS extended attributes and resource forks
    vfs objects = catia fruit streams_xattr
    fruit:metadata = stream
    fruit:model = MacSamba
    fruit:posix_rename = yes
    fruit:veto_appledouble = no
    fruit:wipe_intentionally_left_blank_rfork = yes
    fruit:delete_empty_adfiles = yes

    # macOS Spotlight search support
    spotlight = yes

    # mDNS service registration (macOS discovers server automatically)
    mdns name = mdns

    # Performance tuning
    socket options = TCP_NODELAY IPTOS_LOWDELAY SO_RCVBUF=131072 SO_SNDBUF=131072
    read raw = yes
    write raw = yes
    use sendfile = yes
    aio read size = 16384
    aio write size = 16384

    # Logging
    log file = /var/log/samba/log.%m
    max log size = 1000
    logging = file

    # Character encoding
    unix charset = UTF-8
    dos charset = CP932

[public]
    # Public share - read/write for authenticated users
    path = /srv/shares/public
    browseable = yes
    read only = no
    writable = yes
    guest ok = no
    valid users = @sambashare

    # macOS-specific settings for this share
    vfs objects = catia fruit streams_xattr
    fruit:aapl = yes
    create mask = 0664
    directory mask = 0775
    force group = sambashare

[homes]
    # Per-user home directories
    comment = Home Directories
    browseable = no
    valid users = %S
    writable = yes
    create mask = 0700
    directory mask = 0700

    # macOS compatibility
    vfs objects = catia fruit streams_xattr

[timemachine]
    # Time Machine backup destination for macOS
    path = /srv/shares/timemachine
    browseable = yes
    writable = yes
    valid users = @sambashare

    # Tell macOS this share supports Time Machine
    fruit:time machine = yes
    fruit:time machine max size = 500G

    # Required for Time Machine
    vfs objects = catia fruit streams_xattr
    kernel oplocks = no
    kernel share modes = no
    posix locking = no

    # macOS requires these settings
    force user = nobody
    force group = nogroup
    create mask = 0600
    directory mask = 0700
```

## Installing Required VFS Modules

The `fruit` and `catia` modules may need additional packages:

```bash
# The vfs modules are included in samba package on Ubuntu
# Verify they are available
ls /usr/lib/x86_64-linux-gnu/samba/vfs/ | grep -E "fruit|catia|streams"

# If missing, install
sudo apt install samba-vfs-modules -y
```

## Installing Avahi for mDNS (Auto-Discovery)

macOS uses Bonjour (mDNS) to discover network shares. Install Avahi to register the Samba server:

```bash
# Install Avahi daemon
sudo apt install avahi-daemon -y

# Create a Samba service file for Avahi
sudo nano /etc/avahi/services/samba.service
```

```xml
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
    <name replace-wildcards="yes">%h</name>
    <service>
        <type>_smb._tcp</type>
        <port>445</port>
    </service>
    <!-- Advertise Time Machine support -->
    <service>
        <type>_adisk._tcp</type>
        <port>9</port>
        <txt-record>sys=waMa=0,adVF=0x100</txt-record>
        <txt-record>dk0=adVN=timemachine,adVF=0x82</txt-record>
    </service>
</service-group>
```

```bash
# Restart Avahi
sudo systemctl restart avahi-daemon
sudo systemctl enable avahi-daemon
```

With Avahi running, your Ubuntu server appears automatically in macOS Finder's sidebar under "Network."

## Adding Samba Users

```bash
# Users must exist as system users first
sudo useradd -m -s /bin/bash alice
sudo usermod -a -G sambashare alice

# Set system password
sudo passwd alice

# Create Samba password (separate from system password)
sudo smbpasswd -a alice
sudo smbpasswd -e alice    # Enable the account

# Add bob similarly
sudo useradd -m -s /bin/bash bob
sudo usermod -a -G sambashare bob
sudo passwd bob
sudo smbpasswd -a bob
sudo smbpasswd -e bob
```

## Testing the Configuration

```bash
# Test smb.conf for syntax errors
sudo testparm

# Check that testparm shows all your shares
sudo testparm -s | grep -A 3 "\[public\]\|\[homes\]\|\[timemachine\]"

# Restart Samba
sudo systemctl restart smbd nmbd

# Verify Samba is listening
sudo ss -tlnp | grep smbd
sudo ss -ulnp | grep nmbd
```

## Firewall Configuration

```bash
# Allow Samba through UFW
sudo ufw allow samba

# Or manually:
sudo ufw allow 135/tcp     # RPC endpoint mapper
sudo ufw allow 137/udp     # NetBIOS name service
sudo ufw allow 138/udp     # NetBIOS datagram
sudo ufw allow 139/tcp     # NetBIOS session
sudo ufw allow 445/tcp     # SMB over TCP (most important)

sudo ufw reload
```

## Connecting from macOS

**Finder method:**

1. In Finder, press Cmd+K (Connect to Server)
2. Enter: `smb://UBUNTUSERVER.local` or `smb://192.168.1.100`
3. Enter credentials when prompted

**Terminal method on Mac:**

```bash
# Mount a Samba share from macOS Terminal
mount_smbfs //alice@ubuntuserver.local/public /Volumes/ubuntu_public

# Or list available shares
smbutil view //alice@ubuntuserver.local
```

## Setting Up Time Machine on macOS

1. Go to Apple menu > System Preferences > Time Machine
2. Click "Select Disk"
3. Your Ubuntu server should appear with the timemachine share
4. Select it and enter your credentials
5. Time Machine will start backing up automatically

### Time Machine User Isolation

For multiple Mac users backing up to the same server, create separate subdirectories:

```bash
# Create user-specific Time Machine directories
sudo mkdir -p /srv/shares/timemachine/alice_mac
sudo chown alice:alice /srv/shares/timemachine/alice_mac
sudo chmod 700 /srv/shares/timemachine/alice_mac
```

## Monitoring Samba Connections

```bash
# List active Samba connections
sudo smbstatus

# List locked files
sudo smbstatus -L

# Show share usage
sudo smbstatus -S

# Monitor Samba logs in real time
sudo tail -f /var/log/samba/log.smbd
```

## Handling macOS .DS_Store Files

macOS creates `.DS_Store` files in every directory it accesses. Configure Samba to handle them cleanly:

```bash
# Add to [global] section in smb.conf
veto files = /.DS_Store/
delete veto files = yes
```

Or use the fruit module's built-in handling (already configured above with `fruit:veto_appledouble`).

## Troubleshooting

**Server does not appear in Finder**: Confirm Avahi is running with `sudo systemctl status avahi-daemon`. Also check that mDNS port (5353 UDP) is not blocked.

**Time Machine reports "backup disk not available"**: Verify the `fruit:time machine = yes` setting is present and Samba was restarted after the change.

**Permission denied when writing**: Check that the user is in the `sambashare` group and has write permission to the share directory. Run `id alice` to confirm group membership.

**macOS reports "There was a problem connecting"**: Try connecting with an explicit IP instead of hostname: `smb://192.168.1.100/public`. This rules out DNS/mDNS issues.

**Slow transfer speeds**: The `SO_RCVBUF` and `SO_SNDBUF` socket options in the global section significantly affect throughput. Increase to 524288 if your network supports it.

Proper macOS-Samba integration requires attention to the `fruit` VFS module settings and Avahi service advertisement. Once configured correctly, macOS treats the Ubuntu server as naturally as it would an Apple Time Capsule or other Mac on the network.
