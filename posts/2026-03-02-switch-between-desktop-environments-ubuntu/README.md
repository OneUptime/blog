# How to Switch Between Desktop Environments on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Desktop, GNOME, KDE, Linux Desktop

Description: Learn how to install multiple desktop environments on Ubuntu and switch between them at login, including tips for managing display managers and avoiding conflicts.

---

Ubuntu makes it practical to have multiple desktop environments installed simultaneously. You might want GNOME for general use and XFCE for remote sessions, or you might be evaluating KDE Plasma before committing to a full switch. Switching between them is straightforward once you understand how display managers and session files work.

## How Desktop Session Switching Works

Each installed desktop environment places a `.desktop` file in `/usr/share/xsessions/`. When you log in, your display manager reads these files to populate the session selector. Choosing a different session from the list at login is all that is required to switch.

```bash
# See what desktop sessions are available
ls /usr/share/xsessions/

# Read a session file to understand it
cat /usr/share/xsessions/gnome.desktop
# Shows: Name, Exec command, TryExec, Comment

# Count available sessions
ls /usr/share/xsessions/*.desktop | wc -l
```

## Installing Additional Desktop Environments

### KDE Plasma

```bash
# Install KDE Plasma
sudo apt install -y kubuntu-desktop

# When prompted, choose your display manager preference
# For coexistence, SDDM (KDE's DM) or GDM3 (GNOME's DM) both work

# Minimal KDE installation without all KDE applications
sudo apt install -y kde-plasma-desktop
```

### XFCE

```bash
# Install XFCE desktop environment
sudo apt install -y xubuntu-desktop

# Minimal XFCE without Xubuntu-specific applications
sudo apt install -y xfce4 xfce4-goodies
```

### LXDE and LXQt

```bash
# LXDE (older, very lightweight)
sudo apt install -y lxde

# LXQt (newer Qt-based lightweight DE)
sudo apt install -y lxqt
```

### MATE

```bash
# Full Ubuntu MATE environment
sudo apt install -y ubuntu-mate-desktop

# Or minimal MATE
sudo apt install -y mate-desktop-environment
```

### Cinnamon

```bash
# Install Cinnamon (Linux Mint's default desktop)
sudo apt install -y cinnamon-desktop-environment
```

## Switching Sessions at the Login Screen

The method depends on your display manager:

### GDM3 (GNOME Default)

1. At the GDM login screen, click on your username
2. Before entering your password, click the gear icon that appears in the bottom-right corner
3. Select the desired desktop session
4. Enter your password and log in

The selection is remembered for future logins.

### SDDM (KDE Default)

1. At the SDDM login screen, look for a session dropdown (usually in the bottom-left corner)
2. Select the desired session
3. Enter credentials

### LightDM

1. At the LightDM login screen, look for a session selector button near the login area
2. Click it to see available sessions
3. Select the desired session

## Switching the Default Session from the Command Line

For a user, set the preferred session in `~/.dmrc`:

```bash
# Set GNOME as default session
tee ~/.dmrc << 'EOF'
[Desktop]
Session=gnome
EOF

# Set KDE as default
tee ~/.dmrc << 'EOF'
[Desktop]
Session=plasma
EOF

# Set XFCE as default
tee ~/.dmrc << 'EOF'
[Desktop]
Session=xfce
EOF

# Set MATE as default
tee ~/.dmrc << 'EOF'
[Desktop]
Session=mate
EOF
```

For system-wide defaults with LightDM:

```bash
sudo tee /etc/lightdm/lightdm.conf.d/50-defaults.conf << 'EOF'
[Seat:*]
# Default session for new users
user-session=gnome-xorg

# Auto-login configuration (optional)
# autologin-user=yourusername
# autologin-session=gnome
EOF
```

## Managing Display Managers

Only one display manager runs at a time, but you can change which one:

```bash
# Check which display manager is currently configured
cat /etc/X11/default-display-manager

# Switch display manager
sudo dpkg-reconfigure gdm3
# A dialog will ask you to select from installed display managers

# Or use systemctl to switch
sudo systemctl disable lightdm
sudo systemctl enable gdm3
sudo systemctl start gdm3

# Check which display manager is running
systemctl status display-manager
```

### Installing Multiple Display Managers

```bash
# Install all common display managers
sudo apt install -y gdm3 lightdm sddm

# Choose one at configuration time
sudo dpkg-reconfigure gdm3
```

## Checking the Current Session

Once logged in, you can verify which session you are running:

```bash
# Check current desktop session
echo $XDG_CURRENT_DESKTOP
echo $XDG_SESSION_TYPE
echo $DESKTOP_SESSION

# On Wayland vs X11
echo $WAYLAND_DISPLAY
echo $DISPLAY

# Session information
loginctl show-session $(loginctl | grep $(whoami) | awk '{print $1}') | grep -E "Desktop|Type|Remote"
```

## Avoiding Configuration Conflicts

When multiple desktop environments are installed, they can occasionally conflict in configuration:

```bash
# GNOME and KDE may both modify default applications
# Check current defaults
xdg-mime query default text/html
xdg-mime query default image/png
xdg-mime query default application/pdf

# Reset GNOME default applications
xdg-mime default firefox.desktop text/html
xdg-mime default org.gnome.eog.desktop image/png
xdg-mime default evince.desktop application/pdf

# KDE default applications can be set in:
# KDE System Settings > Applications > Default Applications
```

### Managing Autostart Conflicts

Different DEs may have conflicting autostart entries:

```bash
# View user autostart entries
ls ~/.config/autostart/

# View system autostart entries
ls /etc/xdg/autostart/

# Disable an autostart entry for your user
cp /etc/xdg/autostart/problematic-app.desktop ~/.config/autostart/
echo "X-GNOME-Autostart-enabled=false" >> ~/.config/autostart/problematic-app.desktop
```

## Performance Comparison

Different desktop environments use varying amounts of resources. On a system with 4GB RAM, approximate base memory usage after login:

- GNOME 44: ~800MB RAM
- KDE Plasma 5.27: ~600MB RAM
- Cinnamon: ~550MB RAM
- XFCE 4.18: ~350MB RAM
- MATE 1.26: ~350MB RAM
- LXQt: ~250MB RAM

Check current memory usage:

```bash
# See total memory used after login
free -h

# See memory per process
ps aux --sort=-%mem | head -20

# Or use a more detailed view
smem -r | head -20
```

## Clean Removal of a Desktop Environment

If you decide a desktop environment is not for you:

```bash
# Remove KDE Plasma and associated packages
sudo apt remove --purge kubuntu-desktop kde-plasma-desktop
sudo apt autoremove

# Remove XFCE
sudo apt remove --purge xubuntu-desktop xfce4
sudo apt autoremove

# Remove MATE
sudo apt remove --purge ubuntu-mate-desktop mate-desktop-environment
sudo apt autoremove

# Clean up leftover configuration
# Be careful - this removes all user config for that DE
# rm -rf ~/.config/xfce4  # Only if you want to wipe XFCE settings
```

## Using tmux or Screen for Remote Sessions

For remote work where you switch between graphical and terminal sessions, consider running a session manager:

```bash
# Start a graphical session on a specific display
DISPLAY=:1 startxfce4 &

# Or with Xvfb for a virtual framebuffer
sudo apt install -y xvfb
Xvfb :1 -screen 0 1920x1080x24 &
DISPLAY=:1 xfce4-session &
```

Having multiple desktop environments available is a convenient setup for testing, for accommodating different user preferences on a shared machine, or for matching the environment to the task. The key is understanding that the selection happens at login through the session file system, and that you can always reset to a clean state by clearing session-specific configuration directories in your home folder.
