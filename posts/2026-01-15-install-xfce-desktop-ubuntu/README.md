# How to Install XFCE Desktop on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, XFCE, Desktop, Lightweight, GUI, Tutorial

Description: Complete guide to installing XFCE lightweight desktop environment on Ubuntu.

---

XFCE is one of the most popular lightweight desktop environments for Linux systems. Known for its speed, low resource consumption, and classic desktop paradigm, XFCE provides an excellent alternative to heavier desktop environments like GNOME or KDE. This comprehensive guide walks you through installing and configuring XFCE on Ubuntu.

## What is XFCE?

XFCE (pronounced as four individual letters: X-F-C-E) is a free and open-source desktop environment for Unix-like operating systems. Originally started in 1996, XFCE aims to be fast and lightweight while still being visually appealing and user-friendly.

### Key Features of XFCE

- **Lightweight**: Minimal resource usage compared to GNOME and KDE
- **Fast**: Quick boot times and responsive interface
- **Modular**: Each component can be used independently
- **Stable**: Mature codebase with infrequent major changes
- **Customizable**: Extensive theming and configuration options
- **Traditional Desktop**: Familiar taskbar, icons, and window management

### Benefits of Using XFCE

1. **Low Memory Footprint**: XFCE typically uses 300-400MB of RAM at idle, compared to 800MB+ for GNOME
2. **CPU Efficiency**: Minimal background processes mean more resources for your applications
3. **Older Hardware Support**: Breathes new life into aging computers
4. **Battery Life**: Lower resource usage translates to better battery performance on laptops
5. **Simplicity**: Straightforward interface without unnecessary complexity
6. **Flexibility**: Works well on both old and new hardware

## Prerequisites

Before installing XFCE, ensure you have:

- Ubuntu 20.04 LTS, 22.04 LTS, 24.04 LTS, or newer
- Sudo privileges
- Active internet connection
- At least 5GB of free disk space (for full Xubuntu desktop)

```bash
# Check your Ubuntu version
lsb_release -a

# Example output:
# Distributor ID: Ubuntu
# Description:    Ubuntu 24.04.1 LTS
# Release:        24.04
# Codename:       noble

# Verify available disk space
df -h /

# Example output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1       50G   15G   33G  31% /
```

## Installation Options

Ubuntu offers several ways to install XFCE. Choose the option that best fits your needs.

### Option 1: Minimal XFCE Installation (xfce4)

This installs only the core XFCE desktop components without additional applications.

```bash
# Update package lists to ensure we get the latest versions
sudo apt update

# Install the core XFCE desktop environment
# This includes: xfce4-panel, xfce4-session, xfwm4, xfdesktop4, thunar
sudo apt install xfce4 -y

# The -y flag automatically answers "yes" to installation prompts
# Approximate download size: ~50MB
# Installed size: ~150MB
```

**What's included in xfce4:**
- `xfwm4`: Window manager
- `xfce4-panel`: Desktop panel/taskbar
- `xfce4-session`: Session manager
- `xfdesktop4`: Desktop manager (icons, wallpaper)
- `thunar`: File manager
- `xfce4-settings`: Settings manager
- `xfce4-appfinder`: Application finder

### Option 2: Full Xubuntu Desktop (xubuntu-desktop)

This installs the complete Xubuntu experience with all applications and configurations.

```bash
# Update package lists
sudo apt update

# Install the complete Xubuntu desktop environment
# This includes XFCE plus Xubuntu-specific themes, applications, and configurations
sudo apt install xubuntu-desktop -y

# Approximate download size: ~500MB
# Installed size: ~1.5GB
```

**Additional packages in xubuntu-desktop:**
- LibreOffice suite
- Firefox web browser
- Thunderbird email client
- Parole media player
- Ristretto image viewer
- Mousepad text editor
- GIMP image editor
- Xubuntu themes and wallpapers
- Additional XFCE plugins

### Option 3: Xubuntu Core (Minimal Xubuntu)

A middle-ground option with essential Xubuntu applications but without heavy office suites.

```bash
# Update package lists
sudo apt update

# Install Xubuntu core packages
sudo apt install xubuntu-core -y

# Approximate download size: ~200MB
# Installed size: ~600MB
```

### Comparison of Installation Options

| Feature | xfce4 | xubuntu-core | xubuntu-desktop |
|---------|-------|--------------|-----------------|
| Download Size | ~50MB | ~200MB | ~500MB |
| Installed Size | ~150MB | ~600MB | ~1.5GB |
| Core XFCE | Yes | Yes | Yes |
| Xubuntu Themes | No | Yes | Yes |
| Basic Apps | Minimal | Yes | Yes |
| Office Suite | No | No | Yes |
| Media Apps | No | Basic | Full |

## Display Manager Setup (LightDM)

The display manager handles the graphical login screen. LightDM is the recommended display manager for XFCE.

### Installing LightDM

```bash
# Install LightDM display manager
# LightDM is lightweight and works perfectly with XFCE
sudo apt install lightdm lightdm-gtk-greeter -y

# During installation, you may be prompted to select a display manager
# Use arrow keys to select 'lightdm' and press Enter
```

### Configuring LightDM

```bash
# Set LightDM as the default display manager
sudo dpkg-reconfigure lightdm

# A dialog will appear - select 'lightdm' and press Enter
```

### Customizing LightDM Greeter

```bash
# Edit the LightDM GTK greeter configuration
sudo nano /etc/lightdm/lightdm-gtk-greeter.conf
```

Add or modify these settings:

```ini
# /etc/lightdm/lightdm-gtk-greeter.conf
# LightDM GTK Greeter Configuration

[greeter]
# Set a custom background image
background=/usr/share/backgrounds/xfce/xfce-shapes.svg

# Choose a GTK theme for the login screen
theme-name=Greybird

# Set the icon theme
icon-theme-name=elementary-xfce-dark

# Set the font
font-name=Sans 11

# Show the clock on the login screen
clock-format=%A, %B %d %Y - %H:%M

# Position of the login window (center, left, or right)
position=50%,center

# Enable user list or require username typing
# Set to false for security (users must type username)
show-user-list=true

# Default user to show (optional)
# default-user=your-username
```

### Enabling Autologin (Optional)

```bash
# Edit the main LightDM configuration
sudo nano /etc/lightdm/lightdm.conf
```

Add these lines:

```ini
# /etc/lightdm/lightdm.conf
# Enable automatic login (not recommended for shared computers)

[Seat:*]
# Replace 'your-username' with your actual username
autologin-user=your-username

# Delay in seconds before auto-login (0 for immediate)
autologin-user-timeout=0
```

### Switching Between Display Managers

```bash
# If you have multiple display managers installed, switch between them
sudo dpkg-reconfigure gdm3    # If GDM is installed
sudo dpkg-reconfigure lightdm # Switch back to LightDM

# Check which display manager is currently active
cat /etc/X11/default-display-manager

# Example output:
# /usr/sbin/lightdm
```

## Starting XFCE Desktop

After installation, you need to either log out or reboot to access XFCE.

```bash
# Option 1: Reboot the system (recommended after fresh install)
sudo reboot

# Option 2: Log out and select XFCE from the session menu
# Click on the gear icon at the login screen
# Select "Xfce Session" or "Xubuntu Session"

# Option 3: Start XFCE manually from command line (if not using display manager)
startxfce4
```

## Panel Configuration

The XFCE panel is highly customizable. Here's how to configure it to your liking.

### Understanding the Default Panel Layout

XFCE typically comes with two panels:
- **Panel 1 (Top)**: Contains the application menu, window buttons, and system tray
- **Panel 2 (Bottom)**: Often a dock-style launcher (may vary by configuration)

### Accessing Panel Preferences

```bash
# Open panel preferences from command line
xfce4-panel --preferences

# Or right-click on any panel and select "Panel" > "Panel Preferences"
```

### Creating a New Panel

1. Right-click on an existing panel
2. Select "Panel" > "Panel Preferences"
3. Click the "+" button to add a new panel
4. Configure position, size, and appearance

### Adding Items to Panels

```bash
# Common panel items you can add:

# Application Menu - Main menu for launching applications
# Window Buttons - Shows open windows (like a taskbar)
# Workspace Switcher - Switch between virtual desktops
# System Tray - Shows notification area icons
# Clock - Digital or analog clock
# Action Buttons - Logout, shutdown, restart buttons
# Launcher - Quick launch icons for applications
# Directory Menu - Quick access to folders
# CPU Graph - Shows CPU usage
# Battery Monitor - Shows laptop battery status
```

### Panel Configuration File

Panel settings are stored in XML format:

```bash
# View your panel configuration
cat ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml

# Backup your panel configuration
cp -r ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml \
      ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml.backup
```

### Example Panel Layout Configuration

```xml
<!-- Example panel item configuration snippet -->
<!-- Located in ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml -->

<!-- This shows a typical top panel with common items -->
<property name="plugin-ids" type="array">
  <!-- Application Menu (Whisker Menu is recommended) -->
  <value type="int" value="1"/>
  <!-- Window Buttons -->
  <value type="int" value="2"/>
  <!-- Separator (expands to fill space) -->
  <value type="int" value="3"/>
  <!-- System Tray -->
  <value type="int" value="4"/>
  <!-- Clock -->
  <value type="int" value="5"/>
  <!-- Action Buttons -->
  <value type="int" value="6"/>
</property>
```

### Installing Additional Panel Plugins

```bash
# Install useful panel plugins
sudo apt install xfce4-goodies -y

# This installs many plugins including:
# - xfce4-battery-plugin: Battery monitor
# - xfce4-clipman-plugin: Clipboard manager
# - xfce4-cpufreq-plugin: CPU frequency monitor
# - xfce4-cpugraph-plugin: CPU usage graph
# - xfce4-datetime-plugin: Date and time display
# - xfce4-diskperf-plugin: Disk performance monitor
# - xfce4-eyes-plugin: Fun eyes that follow the cursor
# - xfce4-fsguard-plugin: Filesystem usage monitor
# - xfce4-genmon-plugin: Generic monitor (run custom scripts)
# - xfce4-mailwatch-plugin: Mail notification
# - xfce4-mount-plugin: Mount/unmount devices
# - xfce4-netload-plugin: Network load monitor
# - xfce4-notes-plugin: Sticky notes
# - xfce4-places-plugin: Quick access to places
# - xfce4-pulseaudio-plugin: PulseAudio volume control
# - xfce4-screenshooter-plugin: Screenshot tool
# - xfce4-sensors-plugin: Hardware sensors monitor
# - xfce4-smartbookmark-plugin: Bookmark searches
# - xfce4-systemload-plugin: System load monitor
# - xfce4-timer-plugin: Timer/alarm
# - xfce4-verve-plugin: Command line in panel
# - xfce4-wavelan-plugin: Wireless network monitor
# - xfce4-weather-plugin: Weather display
# - xfce4-whiskermenu-plugin: Advanced application menu
# - xfce4-xkb-plugin: Keyboard layout switcher
```

### Installing Whisker Menu (Recommended)

```bash
# Whisker Menu is a more modern application menu for XFCE
sudo apt install xfce4-whiskermenu-plugin -y

# After installation:
# 1. Right-click on panel > Panel > Add New Items
# 2. Search for "Whisker Menu" and add it
# 3. Right-click on the old Applications Menu and remove it
```

## Window Manager Settings (xfwm4)

The XFCE window manager (xfwm4) controls window decorations, behavior, and effects.

### Accessing Window Manager Settings

```bash
# Open window manager settings from command line
xfwm4-settings

# Or go to: Settings > Window Manager
```

### Window Manager Tweaks

```bash
# Open window manager tweaks for advanced options
xfwm4-tweaks-settings

# Or go to: Settings > Window Manager Tweaks
```

### Key Window Manager Settings

**Style Tab:**
- Window title font and alignment
- Button layout (close, maximize, minimize positions)
- Theme selection

**Keyboard Tab:**
- Window management keyboard shortcuts
- Custom key bindings

**Focus Tab:**
- Focus follows mouse
- Focus stealing prevention
- Window raising behavior

**Advanced Tab:**
- Window snapping
- Wrap windows on screen edge
- Double-click title bar action

### Configuring Window Snapping

```bash
# Edit xfwm4 settings via xfconf-query
# Enable window snapping to screen edges
xfconf-query -c xfwm4 -p /general/snap_to_border -s true

# Set snap distance in pixels
xfconf-query -c xfwm4 -p /general/snap_width -s 10

# Enable tiling (snap to half screen)
xfconf-query -c xfwm4 -p /general/tile_on_move -s true
```

### Window Manager Configuration File

```bash
# View all xfwm4 settings
xfconf-query -c xfwm4 -l -v

# Configuration is stored in:
# ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml

# Backup window manager settings
cp ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml \
   ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml.backup
```

### Enabling Compositing (Desktop Effects)

```bash
# Enable the built-in compositor for effects
xfconf-query -c xfwm4 -p /general/use_compositing -s true

# Configure compositor settings
# Show shadows under windows
xfconf-query -c xfwm4 -p /general/show_dock_shadow -s true
xfconf-query -c xfwm4 -p /general/show_frame_shadow -s true

# Enable window opacity during move/resize
xfconf-query -c xfwm4 -p /general/move_opacity -s 90
xfconf-query -c xfwm4 -p /general/resize_opacity -s 90

# Set frame opacity (for transparent titlebars)
xfconf-query -c xfwm4 -p /general/frame_opacity -s 100
```

### Disabling Compositing (For Better Performance)

```bash
# Disable compositor if you experience performance issues
xfconf-query -c xfwm4 -p /general/use_compositing -s false

# Or toggle via keyboard: Alt+F2, then type:
# xfwm4 --replace --compositor=off
```

## Appearance Customization

XFCE offers extensive appearance customization options.

### Accessing Appearance Settings

```bash
# Open appearance settings
xfce4-appearance-settings

# Or go to: Settings > Appearance
```

### Installing Additional Themes

```bash
# Install popular GTK themes
sudo apt install arc-theme -y           # Modern flat theme
sudo apt install numix-gtk-theme -y     # Material design theme
sudo apt install adapta-gtk-theme -y    # Material design theme
sudo apt install materia-gtk-theme -y   # Material design theme
sudo apt install greybird-gtk-theme -y  # Default Xubuntu theme

# Install popular icon themes
sudo apt install papirus-icon-theme -y  # Modern icon theme
sudo apt install numix-icon-theme -y    # Numix icons
sudo apt install elementary-xfce-icon-theme -y  # Elementary icons
sudo apt install moka-icon-theme -y     # Moka icons

# Install cursor themes
sudo apt install breeze-cursor-theme -y
sudo apt install dmz-cursor-theme -y
```

### Applying Themes

```bash
# Set GTK theme via command line
xfconf-query -c xsettings -p /Net/ThemeName -s "Arc-Dark"

# Set icon theme
xfconf-query -c xsettings -p /Net/IconThemeName -s "Papirus-Dark"

# Set cursor theme
xfconf-query -c xsettings -p /Gtk/CursorThemeName -s "breeze_cursors"

# Set window manager theme
xfconf-query -c xfwm4 -p /general/theme -s "Arc-Dark"
```

### Installing Custom Themes from Archives

```bash
# Create directories for custom themes if they don't exist
mkdir -p ~/.themes      # For GTK and window manager themes
mkdir -p ~/.icons       # For icon and cursor themes
mkdir -p ~/.fonts       # For custom fonts

# Download and extract a theme (example)
# 1. Download theme archive from sites like gnome-look.org
# 2. Extract to appropriate directory:

# For GTK themes:
# Extract to ~/.themes/ThemeName/

# For icon themes:
# Extract to ~/.icons/IconThemeName/

# For cursor themes:
# Extract to ~/.icons/CursorThemeName/

# After extracting, themes appear in Settings > Appearance
```

### Font Configuration

```bash
# Set default font
xfconf-query -c xsettings -p /Gtk/FontName -s "Noto Sans 10"

# Set monospace font (for terminals)
xfconf-query -c xsettings -p /Gtk/MonospaceFontName -s "Noto Sans Mono 10"

# Enable font anti-aliasing
xfconf-query -c xsettings -p /Xft/Antialias -s 1

# Set font hinting
xfconf-query -c xsettings -p /Xft/Hinting -s 1
xfconf-query -c xsettings -p /Xft/HintStyle -s "hintslight"

# Set subpixel rendering (for LCD monitors)
xfconf-query -c xsettings -p /Xft/RGBA -s "rgb"
```

### Desktop Background

```bash
# Set desktop wallpaper via command line
xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitor0/workspace0/last-image \
    -s "/usr/share/backgrounds/xfce/xfce-shapes.svg"

# Set solid color background
xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitor0/workspace0/image-style -s 0
xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitor0/workspace0/color-style -s 0
xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitor0/workspace0/rgba1 \
    -t double -s 0.2 -t double -s 0.2 -t double -s 0.3 -t double -s 1.0

# Or use the GUI:
# Right-click desktop > Desktop Settings
```

## Essential XFCE Applications

XFCE comes with a suite of lightweight applications designed to work seamlessly with the desktop.

### Core XFCE Applications

```bash
# Install all XFCE applications and utilities
sudo apt install xfce4-goodies -y

# Individual applications:

# Thunar - File Manager (included in xfce4)
# Fast and lightweight file manager with plugin support
sudo apt install thunar -y

# Thunar Archive Plugin - Extract/create archives in Thunar
sudo apt install thunar-archive-plugin -y

# Thunar Media Tags Plugin - Edit media file tags
sudo apt install thunar-media-tags-plugin -y

# Thunar Volume Manager - Auto-mount removable media
sudo apt install thunar-volman -y

# Mousepad - Text Editor
# Simple and fast text editor
sudo apt install mousepad -y

# Ristretto - Image Viewer
# Lightweight image viewer
sudo apt install ristretto -y

# Parole - Media Player
# Simple media player using GStreamer
sudo apt install parole -y

# xfce4-terminal - Terminal Emulator
# Full-featured terminal with tabs and profiles
sudo apt install xfce4-terminal -y

# xfce4-screenshooter - Screenshot Tool
# Take screenshots with various options
sudo apt install xfce4-screenshooter -y

# xfce4-taskmanager - Task Manager
# Monitor system processes
sudo apt install xfce4-taskmanager -y

# Catfish - File Search
# Fast file search utility
sudo apt install catfish -y

# xfburn - CD/DVD Burner
# Burn CDs and DVDs
sudo apt install xfburn -y

# Orage - Calendar
# Simple calendar application
sudo apt install orage -y

# xfce4-dict - Dictionary
# Look up words and definitions
sudo apt install xfce4-dict -y

# xfce4-notifyd - Notification Daemon
# Desktop notifications
sudo apt install xfce4-notifyd -y
```

### Configuring Thunar File Manager

```bash
# Open Thunar preferences
thunar --preferences

# Enable thumbnails in Thunar:
# Edit > Preferences > Display > Show thumbnails

# Add custom actions:
# Edit > Configure custom actions

# Example: Open terminal here
# Name: Open Terminal Here
# Command: xfce4-terminal --working-directory=%f
# Appearance: Directories

# Enable side pane:
# View > Side Pane > Shortcuts / Tree
```

### Terminal Emulator Configuration

```bash
# Open xfce4-terminal preferences
xfce4-terminal --preferences

# Or edit configuration directly:
nano ~/.config/xfce4/terminal/terminalrc
```

Example terminal configuration:

```ini
# ~/.config/xfce4/terminal/terminalrc
# XFCE4 Terminal Configuration

[Configuration]
# Font settings
FontName=Monospace 11
FontAllowBold=TRUE

# Color scheme
ColorForeground=#f8f8f2
ColorBackground=#282a36
ColorCursor=#f8f8f2

# Transparency (requires compositor)
BackgroundMode=TERMINAL_BACKGROUND_TRANSPARENT
BackgroundDarkness=0.90

# Scrolling
ScrollingLines=10000
ScrollingBar=TERMINAL_SCROLLBAR_RIGHT

# Behavior
MiscAlwaysShowTabs=FALSE
MiscBell=FALSE
MiscBellUrgent=FALSE
MiscCursorBlinks=TRUE
MiscCursorShape=TERMINAL_CURSOR_SHAPE_BLOCK
```

## Keyboard Shortcuts

XFCE supports extensive keyboard shortcuts for efficient navigation.

### Accessing Keyboard Settings

```bash
# Open keyboard settings
xfce4-keyboard-settings

# Or go to: Settings > Keyboard
```

### Default XFCE Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+F1` | Open application menu |
| `Alt+F2` | Open application finder (run dialog) |
| `Alt+F3` | Open application finder (category view) |
| `Alt+F4` | Close window |
| `Alt+F5` | Maximize window horizontally |
| `Alt+F6` | Maximize window vertically |
| `Alt+F7` | Maximize window |
| `Alt+F8` | Stick window (visible on all workspaces) |
| `Alt+F9` | Minimize window |
| `Alt+F10` | Maximize/restore window |
| `Alt+F11` | Toggle fullscreen |
| `Alt+F12` | Show window menu |
| `Super+D` | Show desktop |
| `Super+L` | Lock screen |
| `Ctrl+Alt+Delete` | Lock screen |
| `Ctrl+Alt+Left/Right` | Switch workspace |
| `Alt+Tab` | Cycle windows |
| `Alt+Shift+Tab` | Cycle windows (reverse) |
| `Print` | Take screenshot |

### Adding Custom Keyboard Shortcuts

```bash
# Open keyboard settings to Application Shortcuts tab
xfce4-keyboard-settings

# Or add shortcuts via command line using xfconf-query
# Example: Add shortcut for terminal (Super+T)

# First, find the next available custom command slot
xfconf-query -c xfce4-keyboard-shortcuts -l | grep custom

# Add a new shortcut
xfconf-query -c xfce4-keyboard-shortcuts -n \
    -p "/commands/custom/<Super>t" \
    -t string -s "xfce4-terminal"

# More examples:
# File manager (Super+E)
xfconf-query -c xfce4-keyboard-shortcuts -n \
    -p "/commands/custom/<Super>e" \
    -t string -s "thunar"

# Web browser (Super+B)
xfconf-query -c xfce4-keyboard-shortcuts -n \
    -p "/commands/custom/<Super>b" \
    -t string -s "firefox"

# Screenshot (Print key with flameshot)
xfconf-query -c xfce4-keyboard-shortcuts -n \
    -p "/commands/custom/Print" \
    -t string -s "xfce4-screenshooter"
```

### Window Tiling Shortcuts

```bash
# Add window tiling shortcuts
# Tile window to left half (Super+Left)
xfconf-query -c xfce4-keyboard-shortcuts -n \
    -p "/xfwm4/custom/<Super>Left" \
    -t string -s "tile_left_key"

# Tile window to right half (Super+Right)
xfconf-query -c xfce4-keyboard-shortcuts -n \
    -p "/xfwm4/custom/<Super>Right" \
    -t string -s "tile_right_key"

# Tile window to top half (Super+Up)
xfconf-query -c xfce4-keyboard-shortcuts -n \
    -p "/xfwm4/custom/<Super>Up" \
    -t string -s "tile_up_key"

# Tile window to bottom half (Super+Down)
xfconf-query -c xfce4-keyboard-shortcuts -n \
    -p "/xfwm4/custom/<Super>Down" \
    -t string -s "tile_down_key"
```

### Listing All Keyboard Shortcuts

```bash
# List all configured keyboard shortcuts
xfconf-query -c xfce4-keyboard-shortcuts -l -v

# Export shortcuts to file for backup
xfconf-query -c xfce4-keyboard-shortcuts -l -v > ~/xfce-shortcuts-backup.txt
```

## Performance Optimization

XFCE is already lightweight, but you can optimize it further for maximum performance.

### Disable Compositor

```bash
# The compositor adds visual effects but uses resources
# Disable for better performance on older hardware

# Via command line:
xfconf-query -c xfwm4 -p /general/use_compositing -s false

# Or: Settings > Window Manager Tweaks > Compositor > Uncheck "Enable display compositing"
```

### Reduce Desktop Icons

```bash
# Disable desktop icons entirely for minimal resource usage
xfconf-query -c xfce4-desktop -p /desktop-icons/style -s 0

# Or just hide specific icons:
# Settings > Desktop > Icons > Appearance
```

### Optimize Thunar

```bash
# Disable thumbnail generation (saves memory and CPU)
xfconf-query -c thunar -p /misc-show-thumbnails -s "THUNAR_THUMBNAIL_MODE_NEVER"

# Or set to only show thumbnails for local files:
xfconf-query -c thunar -p /misc-show-thumbnails -s "THUNAR_THUMBNAIL_MODE_LOCAL_ONLY"
```

### Disable Animations

```bash
# Disable box move animation
xfconf-query -c xfwm4 -p /general/box_move -s false

# Disable box resize animation
xfconf-query -c xfwm4 -p /general/box_resize -s false
```

### Reduce Panel Items

```bash
# Remove unnecessary panel plugins to reduce memory usage
# Right-click panel > Panel > Panel Preferences
# Remove plugins you don't need (weather, sensors, etc.)
```

### Autostart Management

```bash
# Review and disable unnecessary startup applications
xfce4-session-settings

# Or manually manage autostart entries:
ls ~/.config/autostart/

# To disable an autostart entry, add this line to the .desktop file:
# Hidden=true

# Or delete the file entirely:
# rm ~/.config/autostart/unwanted-app.desktop
```

### Use Lightweight Alternatives

```bash
# Replace heavy applications with lighter alternatives

# Web browser: Use lightweight browsers
sudo apt install midori -y        # Ultra-lightweight browser
sudo apt install falkon -y        # Qt-based lightweight browser

# Office: Use lighter office suites or online alternatives
sudo apt install abiword -y       # Lightweight word processor
sudo apt install gnumeric -y      # Lightweight spreadsheet

# PDF viewer: Use lightweight viewer
sudo apt install mupdf -y         # Very fast PDF viewer
sudo apt install zathura -y       # Keyboard-driven PDF viewer

# Image viewer: Use faster alternatives
sudo apt install feh -y           # Minimal image viewer
sudo apt install sxiv -y          # Simple X Image Viewer
```

### Memory Optimization Script

```bash
#!/bin/bash
# ~/scripts/xfce-optimize.sh
# Script to apply performance optimizations to XFCE

echo "Applying XFCE performance optimizations..."

# Disable compositor
xfconf-query -c xfwm4 -p /general/use_compositing -s false

# Disable desktop icons
xfconf-query -c xfce4-desktop -p /desktop-icons/style -s 0

# Disable thumbnails in Thunar
xfconf-query -c thunar -p /misc-show-thumbnails -s "THUNAR_THUMBNAIL_MODE_NEVER"

# Disable animations
xfconf-query -c xfwm4 -p /general/box_move -s false
xfconf-query -c xfwm4 -p /general/box_resize -s false

# Reduce font hinting (slightly faster rendering)
xfconf-query -c xsettings -p /Xft/HintStyle -s "hintnone"

echo "Optimizations applied. Log out and back in for full effect."
```

Make the script executable:

```bash
chmod +x ~/scripts/xfce-optimize.sh
```

## Resource Usage Comparison

Here's how XFCE compares to other desktop environments in terms of resource usage.

### Memory Usage Comparison (Idle System)

| Desktop Environment | RAM Usage (Approx.) | Notes |
|--------------------|---------------------|-------|
| XFCE (minimal) | 250-350 MB | Core xfce4 only |
| XFCE (full) | 350-500 MB | With Xubuntu-desktop |
| LXDE/LXQt | 200-300 MB | Slightly lighter |
| MATE | 350-450 MB | Similar to XFCE |
| Cinnamon | 500-700 MB | More features |
| KDE Plasma | 500-800 MB | Feature-rich |
| GNOME | 800-1200 MB | Heaviest of major DEs |

### Measuring Your System's Usage

```bash
# Check current memory usage
free -h

# Example output:
#               total        used        free      shared  buff/cache   available
# Mem:           15Gi       1.2Gi        10Gi       256Mi       3.8Gi        13Gi
# Swap:         2.0Gi          0B       2.0Gi

# Check memory usage by process (sorted by memory)
ps aux --sort=-%mem | head -20

# Check XFCE-specific processes
ps aux | grep -E "xfce|xfwm|thunar|panel" | grep -v grep

# Monitor system resources in real-time
xfce4-taskmanager

# Or use htop for detailed view
htop
```

### Disk Usage Comparison

```bash
# Check disk usage of XFCE packages
dpkg-query -W -f='${Installed-Size}\t${Package}\n' | grep -E "xfce|xubuntu" | sort -n

# Check total size of XFCE installation
apt-cache show xfce4 | grep "Installed-Size"
apt-cache show xubuntu-desktop | grep "Installed-Size"
```

### Boot Time Comparison

```bash
# Check boot time with systemd-analyze
systemd-analyze

# Example output:
# Startup finished in 3.5s (kernel) + 8.2s (userspace) = 11.7s

# Detailed breakdown
systemd-analyze blame | head -20

# Boot time visualization (creates SVG)
systemd-analyze plot > boot-analysis.svg
```

## Troubleshooting Common Issues

### XFCE Not Appearing in Login Screen

```bash
# Verify XFCE is installed
dpkg -l | grep xfce4

# Check if xfce4-session is available
which xfce4-session

# Reinstall xfce4-session if missing
sudo apt install xfce4-session --reinstall

# Create xsession desktop file if missing
sudo nano /usr/share/xsessions/xfce.desktop
```

Content for xfce.desktop:

```ini
[Desktop Entry]
Name=Xfce Session
Comment=Use this session to run Xfce as your desktop environment
Exec=startxfce4
TryExec=startxfce4
Icon=xfce4-logo
Type=Application
DesktopNames=XFCE
```

### Panel Not Showing

```bash
# Reset panel configuration
xfce4-panel --quit
pkill xfconfd
rm -rf ~/.config/xfce4/panel
rm -rf ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml

# Restart panel
xfce4-panel &

# Or log out and back in
```

### Black Screen After Login

```bash
# If you get a black screen, try these steps:

# 1. Switch to another TTY
# Press Ctrl+Alt+F3

# 2. Log in with your username and password

# 3. Remove potentially corrupted config
mv ~/.config/xfce4 ~/.config/xfce4.backup

# 4. Reboot
sudo reboot

# 5. After reboot, XFCE will create fresh configuration
```

### Display Manager Issues

```bash
# If LightDM won't start, check its status
sudo systemctl status lightdm

# View LightDM logs
sudo journalctl -u lightdm

# Reconfigure LightDM
sudo dpkg-reconfigure lightdm

# Restart LightDM service
sudo systemctl restart lightdm

# If all else fails, use GDM temporarily
sudo apt install gdm3
sudo dpkg-reconfigure gdm3
```

### Compositor Causing Issues

```bash
# Disable compositor if experiencing visual glitches
xfconf-query -c xfwm4 -p /general/use_compositing -s false

# If xfconf-query fails, edit directly
nano ~/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml

# Find and change:
# <property name="use_compositing" type="bool" value="true"/>
# To:
# <property name="use_compositing" type="bool" value="false"/>
```

### Audio Not Working

```bash
# Install PulseAudio and panel plugin
sudo apt install pulseaudio pavucontrol xfce4-pulseaudio-plugin -y

# Start PulseAudio
pulseaudio --start

# Add PulseAudio plugin to panel
# Right-click panel > Panel > Add New Items > PulseAudio Plugin

# Open PulseAudio Volume Control to verify
pavucontrol
```

### Screen Resolution Issues

```bash
# Check available resolutions
xrandr

# Set a specific resolution
xrandr --output HDMI-1 --mode 1920x1080

# Make resolution persistent by adding to autostart
nano ~/.config/autostart/screen-resolution.desktop
```

Content:

```ini
[Desktop Entry]
Type=Application
Name=Screen Resolution
Exec=xrandr --output HDMI-1 --mode 1920x1080
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
```

### Reset XFCE to Default Settings

```bash
# Backup current configuration
mv ~/.config/xfce4 ~/.config/xfce4.backup
mv ~/.cache/sessions ~/.cache/sessions.backup

# Log out and back in for fresh configuration
# Or restart the session:
pkill -u $USER
```

### Fix Broken Dependencies

```bash
# Fix broken package dependencies
sudo apt --fix-broken install

# Reconfigure all packages
sudo dpkg --configure -a

# Reinstall XFCE if severely broken
sudo apt install --reinstall xfce4 xfce4-session xfwm4 xfce4-panel xfdesktop4
```

## Advanced Configuration

### Multiple Monitor Setup

```bash
# Use xfce4-display-settings for GUI configuration
xfce4-display-settings

# Or configure via xrandr
# List connected displays
xrandr --listmonitors

# Configure dual monitors (example: laptop + external)
xrandr --output eDP-1 --primary --mode 1920x1080 --pos 0x0 \
       --output HDMI-1 --mode 1920x1080 --pos 1920x0

# Save configuration to autostart
echo "xrandr --output eDP-1 --primary --mode 1920x1080 --pos 0x0 --output HDMI-1 --mode 1920x1080 --pos 1920x0" > ~/.config/autostart/monitor-setup.sh
chmod +x ~/.config/autostart/monitor-setup.sh
```

### Session and Startup Configuration

```bash
# Configure session and startup applications
xfce4-session-settings

# Add custom startup scripts
nano ~/.config/autostart/my-script.desktop
```

Example autostart entry:

```ini
[Desktop Entry]
Type=Application
Name=My Custom Script
Exec=/home/user/scripts/startup.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
```

### Power Management

```bash
# Install XFCE power manager
sudo apt install xfce4-power-manager -y

# Configure power settings
xfce4-power-manager-settings

# Key settings:
# - Screen brightness
# - Display sleep timeout
# - System suspend behavior
# - Laptop lid close action
# - Battery critical action
```

### Workspace Configuration

```bash
# Configure workspaces (virtual desktops)
xfce4-workspaces-settings

# Set number of workspaces via command line
xfconf-query -c xfwm4 -p /general/workspace_count -s 4

# Set workspace names
xfconf-query -c xfwm4 -p /general/workspace_names \
    -a -t string -s "Main" -t string -s "Code" -t string -s "Web" -t string -s "Media"
```

## Uninstalling XFCE

If you decide to remove XFCE, here's how to do it cleanly.

### Remove XFCE Completely

```bash
# Remove xfce4 core
sudo apt remove --purge xfce4 xfce4-* -y

# Remove Xubuntu-specific packages (if installed)
sudo apt remove --purge xubuntu-desktop xubuntu-core -y

# Remove orphaned dependencies
sudo apt autoremove --purge -y

# Remove configuration files
rm -rf ~/.config/xfce4
rm -rf ~/.cache/xfce4

# Remove LightDM if not needed
sudo apt remove --purge lightdm lightdm-gtk-greeter -y

# Reinstall your preferred display manager
sudo apt install gdm3 -y  # For GNOME
sudo dpkg-reconfigure gdm3
```

## Conclusion

XFCE provides an excellent balance of performance, features, and usability. Whether you're reviving an older computer or simply prefer a lightweight, no-nonsense desktop environment, XFCE delivers a reliable and customizable experience.

Key takeaways:
- XFCE uses significantly less RAM than GNOME or KDE
- The modular design lets you customize your setup extensively
- Panel plugins extend functionality without bloat
- The traditional desktop paradigm feels familiar and intuitive
- Performance optimizations can make XFCE run on very modest hardware

With XFCE, you get a desktop environment that stays out of your way and lets you focus on your actual work.

---

**Monitoring Your Ubuntu Systems with OneUptime**

After setting up your Ubuntu desktop with XFCE, consider implementing proper monitoring for your systems and services. [OneUptime](https://oneuptime.com) provides comprehensive infrastructure monitoring that helps you:

- Monitor server uptime and performance metrics
- Track CPU, memory, and disk usage in real-time
- Set up alerts for system resource thresholds
- Monitor your applications and services
- Create status pages for your infrastructure
- Receive instant notifications when issues arise

Whether you're running XFCE on a personal workstation or managing multiple Ubuntu servers, OneUptime ensures you're always aware of your systems' health and performance. Start monitoring your infrastructure today at [https://oneuptime.com](https://oneuptime.com).
