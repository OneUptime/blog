# How to Install Flatpak on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Flatpak, Package Management, Applications, Tutorial

Description: Set up Flatpak on Ubuntu for accessing a vast library of sandboxed applications from Flathub.

---

Flatpak is a universal package format similar to Snap but with a focus on desktop applications. It provides sandboxing, runs across distributions, and offers access to the Flathub repository with thousands of applications.

## Prerequisites

- Ubuntu 18.04 or later
- Root or sudo access

## Install Flatpak

```bash
# Update packages
sudo apt update

# Install Flatpak
sudo apt install flatpak -y

# Verify installation
flatpak --version
```

## Add Flathub Repository

Flathub is the main repository for Flatpak applications:

```bash
# Add Flathub
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Restart required for some systems
sudo reboot
```

## Install GNOME Software Plugin (Optional)

For GUI installation support:

```bash
# For Ubuntu GNOME
sudo apt install gnome-software-plugin-flatpak -y

# For KDE
sudo apt install plasma-discover-backend-flatpak -y
```

## Basic Commands

### Search Applications

```bash
# Search Flathub
flatpak search application-name

# Example
flatpak search spotify
```

### Install Applications

```bash
# Install from Flathub
flatpak install flathub org.application.Name

# Examples
flatpak install flathub com.spotify.Client
flatpak install flathub org.gimp.GIMP
flatpak install flathub com.visualstudio.code

# Install without prompts
flatpak install -y flathub com.spotify.Client
```

### List Installed Applications

```bash
# List all installed
flatpak list

# List only applications (not runtimes)
flatpak list --app

# Detailed list
flatpak list --columns=name,application,version,branch,installation
```

### Run Applications

```bash
# Run installed app
flatpak run org.application.Name

# Example
flatpak run com.spotify.Client
```

### Update Applications

```bash
# Update all
flatpak update

# Update specific app
flatpak update org.application.Name
```

### Remove Applications

```bash
# Remove application
flatpak uninstall org.application.Name

# Remove with data
flatpak uninstall --delete-data org.application.Name

# Remove unused runtimes
flatpak uninstall --unused
```

## Managing Repositories

### List Repositories

```bash
flatpak remotes
```

### Add Repository

```bash
# Add custom repository
flatpak remote-add --if-not-exists repo-name https://example.com/repo

# Add user-level repository
flatpak remote-add --user repo-name https://example.com/repo
```

### Remove Repository

```bash
flatpak remote-delete repo-name
```

## Permissions Management

### View Permissions

```bash
# Show app permissions
flatpak info --show-permissions org.application.Name

# Or use Flatseal (GUI tool)
flatpak install flathub com.github.tchx84.Flatseal
```

### Override Permissions

```bash
# Grant filesystem access
flatpak override --user --filesystem=/path/to/folder org.application.Name

# Grant device access
flatpak override --user --device=all org.application.Name

# Reset overrides
flatpak override --user --reset org.application.Name
```

### Common Permission Overrides

```bash
# Access home directory
flatpak override --user --filesystem=home org.application.Name

# Access USB drives
flatpak override --user --filesystem=/media org.application.Name
flatpak override --user --filesystem=/run/media org.application.Name

# Network access
flatpak override --user --share=network org.application.Name
```

## User vs System Installation

```bash
# System-wide install (default)
sudo flatpak install flathub org.application.Name

# User-only install
flatpak install --user flathub org.application.Name

# List user installations
flatpak list --user

# List system installations
flatpak list --system
```

## Popular Flatpak Applications

```bash
# Browsers
flatpak install flathub org.mozilla.firefox
flatpak install flathub com.google.Chrome

# Communication
flatpak install flathub com.slack.Slack
flatpak install flathub com.discordapp.Discord
flatpak install flathub org.telegram.desktop

# Development
flatpak install flathub com.visualstudio.code
flatpak install flathub com.getpostman.Postman
flatpak install flathub com.sublimetext.three

# Media
flatpak install flathub com.spotify.Client
flatpak install flathub org.videolan.VLC
flatpak install flathub org.gimp.GIMP
flatpak install flathub com.obsproject.Studio

# Office
flatpak install flathub org.libreoffice.LibreOffice
flatpak install flathub md.obsidian.Obsidian
```

## Disk Space Management

### Check Disk Usage

```bash
# View Flatpak disk usage
du -sh ~/.local/share/flatpak
du -sh /var/lib/flatpak

# List by size
flatpak list --columns=name,size
```

### Clean Up

```bash
# Remove unused runtimes
flatpak uninstall --unused

# Clear cache
rm -rf ~/.cache/flatpak
```

## Troubleshooting

### Application Won't Start

```bash
# Run from terminal to see errors
flatpak run org.application.Name

# Check logs
journalctl --user -b | grep flatpak
```

### Permission Denied

```bash
# Check what permissions are needed
flatpak info --show-permissions org.application.Name

# Grant necessary permissions using Flatseal or override
flatpak override --user --filesystem=home org.application.Name
```

### Theme Not Applied

```bash
# Install GTK themes for Flatpak
flatpak install flathub org.gtk.Gtk3theme.Adwaita-dark

# Override for specific app
flatpak override --user --env=GTK_THEME=Adwaita-dark org.application.Name
```

### Update Fails

```bash
# Repair installation
flatpak repair

# Force update
flatpak update --force-remove
```

## Flatpak vs Snap Comparison

| Feature | Flatpak | Snap |
|---------|---------|------|
| Primary focus | Desktop apps | All software |
| Main repository | Flathub | Snap Store |
| Sandboxing | Yes | Yes |
| Auto-updates | Via GNOME Software | Built-in |
| CLI tools | Native apps | Server tools too |
| Theme support | Better | Limited |

## Remove Flatpak

```bash
# Remove all Flatpak apps
flatpak uninstall --all

# Remove Flatpak
sudo apt remove --purge flatpak -y

# Clean up data
rm -rf ~/.local/share/flatpak
sudo rm -rf /var/lib/flatpak
```

---

Flatpak provides excellent desktop application sandboxing with strong theme integration and permissions control. Combined with Flathub, it offers access to thousands of applications that run consistently across Linux distributions.
