# How to Auto-Login to Ubuntu Desktop Without Prompt

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Desktop, Auto-Login, GDM, LightDM

Description: Learn how to configure automatic login on Ubuntu desktop to skip the login prompt, covering GDM3, LightDM, and security considerations for different use cases.

---

Auto-login bypasses the graphical login screen and takes you directly to the desktop when the machine boots. This is useful for kiosks, shared workstations where everyone uses the same account, or home machines where disk encryption protects data and the login prompt adds no security value. Ubuntu supports auto-login through its display manager configuration.

## Security Considerations First

Before enabling auto-login, consider:

- **Who has physical access to this machine?** Auto-login is appropriate for machines you control physically or those in secure locations.
- **Is the disk encrypted?** If not, auto-login means anyone who boots the machine gets immediate access to all data.
- **Is this a server?** Auto-login is rarely appropriate for servers.
- **Shared multi-user machine?** Auto-login locks other users out of easy access to their own accounts.

For home workstations with full-disk encryption, auto-login is a reasonable convenience. For everything else, think carefully.

## Identifying Your Display Manager

The auto-login configuration depends on which display manager you are using:

```bash
# Check which display manager is active
cat /etc/X11/default-display-manager
# Common outputs:
# /usr/sbin/gdm3  (GDM3, Ubuntu default)
# /usr/sbin/lightdm  (LightDM)
# /usr/sbin/sddm  (SDDM, used by KDE)

# Also check via systemd
systemctl status display-manager
```

## Enabling Auto-Login with GDM3

GDM3 is the default display manager on Ubuntu 18.04 and later:

```bash
# Edit the GDM3 configuration file
sudo nano /etc/gdm3/custom.conf
```

The file should look like this with auto-login enabled:

```bash
sudo tee /etc/gdm3/custom.conf << 'EOF'
[daemon]
# Enable automatic login
AutomaticLoginEnable=true
AutomaticLogin=yourusername

# Optional: Timed login (login automatically after N seconds if no input)
# TimedLoginEnable=true
# TimedLogin=yourusername
# TimedLoginDelay=10

[security]
# Uncomment to disable Wayland (forces X11)
# WaylandEnable=false

[xdmcp]

[chooser]

[debug]
# Uncomment for GDM debug logging
# Enable=true
EOF

# Restart GDM3 to apply changes
sudo systemctl restart gdm3
```

Replace `yourusername` with the actual username you want to log in automatically.

```bash
# Verify the configuration
grep -E "AutomaticLogin" /etc/gdm3/custom.conf

# Check if the username exists
id yourusername
```

## Enabling Auto-Login with LightDM

LightDM is commonly used with Ubuntu MATE, Lubuntu, and Xubuntu:

```bash
# Edit the LightDM configuration
sudo nano /etc/lightdm/lightdm.conf
```

Or configure it directly:

```bash
sudo tee /etc/lightdm/lightdm.conf << 'EOF'
[Seat:*]
# Specify the greeter (login screen theme)
greeter-session=lightdm-gtk-greeter

# Auto-login configuration
autologin-user=yourusername
autologin-user-timeout=0

# Optional: auto-login session type
autologin-session=ubuntu  # or xfce, mate, gnome, etc.
EOF

# Restart LightDM
sudo systemctl restart lightdm
```

Alternatively, use the `lightdm-set-defaults` command if available:

```bash
sudo lightdm-set-defaults --autologin yourusername
sudo lightdm-set-defaults --session gnome
```

## Enabling Auto-Login with SDDM (KDE)

SDDM is the default display manager for Kubuntu:

```bash
# Edit SDDM configuration
sudo nano /etc/sddm.conf

# Or create a configuration snippet
sudo tee /etc/sddm.conf.d/autologin.conf << 'EOF'
[Autologin]
User=yourusername
Session=plasma
Relogin=false
EOF

# Restart SDDM
sudo systemctl restart sddm
```

## GNOME GUI Method

GNOME provides a graphical way to configure auto-login:

1. Open Settings > Users
2. Click Unlock (enter your admin password)
3. Find the user you want to auto-login
4. Toggle the "Automatic Login" switch to ON

This modifies `/etc/gdm3/custom.conf` automatically.

## Auto-Login with a Delay (Timed Login)

Timed login shows the login screen but automatically logs in after a timeout if no one interacts:

```bash
# GDM3 timed login
sudo tee -a /etc/gdm3/custom.conf << 'EOF'
[daemon]
AutomaticLoginEnable=false
TimedLoginEnable=true
TimedLogin=yourusername
TimedLoginDelay=30  # Seconds before auto-login
EOF

sudo systemctl restart gdm3
```

This is a good middle ground: someone at the machine can choose a different user or skip the auto-login, but unattended reboots still proceed automatically.

## Auto-Login to a Specific Desktop Session

If you have multiple desktop environments installed, specify which session to use:

```bash
# Check available sessions
ls /usr/share/xsessions/
# Common session names: gnome, gnome-xorg, plasma, xfce, mate, ubuntu

# GDM3 - set session in user's dmrc
tee /home/yourusername/.dmrc << 'EOF'
[Desktop]
Session=gnome-xorg
EOF
sudo chown yourusername:yourusername /home/yourusername/.dmrc

# LightDM - set in lightdm.conf
# autologin-session=xfce
```

## Auto-Login for Root (Discouraged)

Auto-login as root is strongly discouraged. If you absolutely need it (e.g., a dedicated single-purpose system):

```bash
# GDM3 - allowing root login (NOT recommended for most systems)
sudo nano /etc/gdm3/custom.conf
# Add under [daemon]:
# AllowRoot=true

# Only then will root auto-login work:
# AutomaticLoginEnable=true
# AutomaticLogin=root
```

A better approach is to auto-login as a dedicated non-root user and grant it the specific permissions it needs.

## Disabling Auto-Login

To turn off auto-login:

```bash
# GDM3
sudo sed -i 's/AutomaticLoginEnable=true/AutomaticLoginEnable=false/' /etc/gdm3/custom.conf
sudo systemctl restart gdm3

# LightDM
sudo sed -i '/autologin-user=/d' /etc/lightdm/lightdm.conf
sudo systemctl restart lightdm

# Or via GNOME Settings > Users > Toggle Automatic Login off
```

## Auto-Login with Full Disk Encryption

If your system uses LUKS full-disk encryption, the boot process requires entering the disk password before auto-login can happen. This is a reasonable security model:

1. Boot and enter LUKS passphrase to decrypt disk
2. Ubuntu auto-logs in to the desktop

The disk passphrase protects data at rest while auto-login provides convenience once the disk is unlocked:

```bash
# Check if LUKS encryption is active
sudo lsblk --fs
# LUKS partitions show as crypto_LUKS type

# Auto-login configuration is the same regardless of LUKS
# The LUKS prompt happens before the display manager starts
```

## Troubleshooting Auto-Login

```bash
# Auto-login not working - check GDM logs
sudo journalctl -u gdm3 -n 50

# Verify the username is spelled correctly
grep AutomaticLogin /etc/gdm3/custom.conf

# Check if user exists and has a home directory
id yourusername
ls -la /home/yourusername/

# Check if user is in the required groups
groups yourusername

# LightDM auto-login failing - check LightDM logs
sudo journalctl -u lightdm -n 50

# Check that the session specified exists
ls /usr/share/xsessions/ | grep "${SESSION_NAME}"

# Auto-login works but desktop fails to start
# Check for errors in session startup
cat ~/.xsession-errors | tail -50

# GDM auto-login loops back to login screen
# This often means the user's .profile or .bash_profile has an error
sudo -u yourusername bash --login -c "echo test"
```

## Kiosk Mode with Auto-Login

For kiosk deployments, combine auto-login with a restricted session:

```bash
# Create a kiosk user
sudo useradd -m -s /bin/bash kiosk
sudo passwd kiosk

# Configure auto-login
sudo tee /etc/gdm3/custom.conf << 'EOF'
[daemon]
AutomaticLoginEnable=true
AutomaticLogin=kiosk
EOF

# Restrict what the kiosk user can do
sudo tee /etc/sudoers.d/kiosk << 'EOF'
# Kiosk user cannot use sudo
kiosk ALL=(ALL) NOPASSWD: NOPASSWD
EOF

# Create a custom session that launches only the kiosk application
sudo tee /usr/share/xsessions/kiosk.desktop << 'EOF'
[Desktop Entry]
Name=Kiosk
Exec=/usr/local/bin/kiosk-session.sh
Type=Application
EOF

sudo tee /usr/local/bin/kiosk-session.sh << 'EOF'
#!/bin/bash
# Kiosk session: launch only Firefox in full screen
while true; do
    firefox --kiosk https://kiosk.example.com
done
EOF

sudo chmod +x /usr/local/bin/kiosk-session.sh

# Set the kiosk session as default for the kiosk user
sudo tee /home/kiosk/.dmrc << 'EOF'
[Desktop]
Session=kiosk
EOF
sudo chown kiosk:kiosk /home/kiosk/.dmrc
```

Auto-login configuration is straightforward but worth understanding which display manager you are working with. GDM3 is the default on mainstream Ubuntu, LightDM on Ubuntu MATE and flavors, and SDDM on Kubuntu. Each has its own configuration file path and format, but all implement the same basic concept.
