# How to Add the Flathub Repository to RHEL for Sandboxed Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Flathub, Flatpak, Application Repository, Sandboxing, Linux

Description: Add the Flathub repository to RHEL to access thousands of sandboxed desktop applications distributed as Flatpaks, including up-to-date versions of popular software.

---

Flathub is the largest repository of Flatpak applications, hosting thousands of desktop applications including web browsers, media players, development tools, and office suites. Adding Flathub to your RHEL system gives you access to applications that may not be available in the standard RHEL repositories or where you need a newer version.

## Prerequisites

```bash
# Install Flatpak if not already installed
sudo dnf install -y flatpak

# Verify the installation
flatpak --version
```

## Add the Flathub Repository

```bash
# Add Flathub as a Flatpak remote repository (system-wide)
sudo flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Or add Flathub for the current user only
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

## Verify the Repository

```bash
# List all configured remotes
flatpak remotes

# View details about the Flathub remote
flatpak remote-info --list flathub | head -20

# Check the repository URL
flatpak remote-ls flathub --columns=application | head -20
```

## Install GNOME Software Integration

For a graphical experience, install the GNOME Software Flatpak plugin.

```bash
# Install the plugin
sudo dnf install -y gnome-software-plugin-flatpak

# Restart GNOME Software to detect the new source
# Close and reopen GNOME Software from the Activities menu
```

After this, Flathub applications appear alongside RPM packages in the GNOME Software application.

## Browse and Install Applications

```bash
# Search for applications on Flathub
flatpak search --remote=flathub "text editor"

# Install popular applications
# Visual Studio Code (OSS)
flatpak install -y flathub com.visualstudio.code

# GIMP image editor
flatpak install -y flathub org.gimp.GIMP

# VLC media player
flatpak install -y flathub org.videolan.VLC

# LibreOffice
flatpak install -y flathub org.libreoffice.LibreOffice

# Slack
flatpak install -y flathub com.slack.Slack
```

## Configure Flathub Filters

If you want to restrict which applications can be installed from Flathub:

```bash
# Disable the Flathub remote temporarily
sudo flatpak remote-modify --disable flathub

# Re-enable it
sudo flatpak remote-modify --enable flathub

# Set a subset filter to only allow specific applications
# Create a filter file
sudo mkdir -p /etc/flatpak/remotes.d
sudo tee /etc/flatpak/remotes.d/flathub.filter > /dev/null << 'EOF'
# Only allow specific applications
allow org.mozilla.firefox
allow org.videolan.VLC
allow org.gimp.GIMP
deny *
EOF

# Apply the filter
sudo flatpak remote-modify --filter=/etc/flatpak/remotes.d/flathub.filter flathub
```

## Remove the Flathub Repository

```bash
# If you need to remove Flathub
# First, uninstall all applications from Flathub
flatpak uninstall --all

# Then remove the remote
sudo flatpak remote-delete flathub
```

## Keep Applications Updated

```bash
# Update all Flatpak applications from Flathub
flatpak update

# Set up automatic updates via systemd timer
systemctl --user enable flatpak-update.timer 2>/dev/null || \
  echo "Create a custom timer for automatic updates"
```

Flathub combined with Flatpak gives RHEL users access to a wide ecosystem of up-to-date desktop applications while maintaining the stability and security of the base RHEL system.
