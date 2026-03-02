# How to Install and Configure Flatpak on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Flatpak, Package Management, Linux

Description: A complete guide to installing and configuring Flatpak on Ubuntu, including adding Flathub, installing applications, managing permissions, and integrating with the desktop.

---

Flatpak is a cross-distribution application packaging format that bundles applications with their dependencies and runs them in isolated sandboxes. Unlike snap packages, Flatpak is community-driven and works consistently across major Linux distributions. Ubuntu does not include Flatpak by default, but setup takes only a few commands.

## Installing Flatpak

```bash
# Install Flatpak from Ubuntu's repositories
sudo apt install flatpak

# Verify the installation
flatpak --version
```

## Adding the GNOME Software Plugin (Desktop Integration)

If you use GNOME Software as your application manager, install the Flatpak plugin so you can install Flatpak apps from the GUI:

```bash
# Install the Software plugin for GNOME Software
sudo apt install gnome-software-plugin-flatpak

# Restart GNOME Software if it was open
# (usually requires logging out and back in)
```

For KDE Plasma users, Discover already supports Flatpak without additional plugins.

## Adding the Flathub Repository

Flathub is the primary repository for Flatpak applications. Without it, you have almost no apps available:

```bash
# Add Flathub as a remote repository
sudo flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Verify it was added
flatpak remotes

# Output:
# Name    Options
# flathub system,eno
```

The `--if-not-exists` flag prevents errors if Flathub is already configured.

**After adding Flathub, log out and log back in, or restart your system.** This ensures the Flatpak portals and desktop integration work correctly.

## Installing Applications

```bash
# Search for an application
flatpak search firefox

# Install an application from Flathub
sudo flatpak install flathub org.mozilla.firefox

# Install for current user only (no sudo required)
flatpak install --user flathub org.mozilla.firefox

# Install without confirmation prompts
sudo flatpak install --noninteractive flathub org.mozilla.firefox
```

The application ID format is reverse-domain notation: `org.mozilla.firefox`, `com.spotify.Client`, `org.gimp.GIMP`.

```bash
# Common applications and their Flatpak IDs
flatpak install flathub org.mozilla.firefox        # Firefox
flatpak install flathub org.gimp.GIMP              # GIMP
flatpak install flathub org.libreoffice.LibreOffice # LibreOffice
flatpak install flathub com.spotify.Client          # Spotify
flatpak install flathub com.discordapp.Discord      # Discord
flatpak install flathub com.slack.Slack             # Slack
flatpak install flathub com.visualstudio.code       # VS Code
flatpak install flathub com.valvesoftware.Steam     # Steam
flatpak install flathub org.videolan.VLC            # VLC
flatpak install flathub org.inkscape.Inkscape       # Inkscape
```

## Running Flatpak Applications

```bash
# Run an installed Flatpak app
flatpak run org.mozilla.firefox

# Or use the application's name as created in /var/lib/flatpak/exports/bin/
# (This path is added to $PATH automatically after login)
firefox  # Works if org.mozilla.firefox creates this binary

# List all installed Flatpak apps
flatpak list

# List only user-installed apps
flatpak list --user

# List only system-installed apps
flatpak list --system
```

## Updating Applications

```bash
# Update all installed Flatpak apps
sudo flatpak update

# Update a specific app
sudo flatpak update org.mozilla.firefox

# Update user-installed apps
flatpak update --user

# Check for updates without applying them
flatpak remote-ls --updates
```

## Removing Applications

```bash
# Remove an application
sudo flatpak uninstall org.mozilla.firefox

# Remove and delete user data
sudo flatpak uninstall --delete-data org.mozilla.firefox

# Remove unused runtimes (like apt autoremove)
sudo flatpak uninstall --unused

# Remove an app installed per-user
flatpak uninstall --user org.mozilla.firefox
```

## Managing Permissions with Flatpak Override

Flatpak applications declare their required permissions in their manifest. You can view and modify these permissions:

```bash
# View current permissions for an app
flatpak info --show-permissions org.mozilla.firefox

# Or use the permissions summary
flatpak override --show org.mozilla.firefox
```

To modify permissions:

```bash
# Grant access to the entire home directory (disabled by default)
sudo flatpak override org.mozilla.firefox --filesystem=home

# Grant access to a specific directory
sudo flatpak override org.gimp.GIMP --filesystem=/mnt/photos

# Revoke filesystem access that was granted
sudo flatpak override org.mozilla.firefox --nofilesystem=home

# Grant network access
sudo flatpak override myapp --share=network

# Revoke network access (sandbox the app from network)
sudo flatpak override myapp --unshare=network

# Override for current user only (no sudo)
flatpak override --user org.mozilla.firefox --filesystem=home

# Reset all overrides for an app
sudo flatpak override --reset org.mozilla.firefox
```

## Adding Additional Repositories

Beyond Flathub, you can add other Flatpak repositories:

```bash
# Add GNOME Nightly for testing GNOME apps
sudo flatpak remote-add --if-not-exists gnome-nightly https://nightly.gnome.org/gnome-nightly.flatpakrepo

# Add KDE Gear for KDE applications
sudo flatpak remote-add --if-not-exists kde-nightly https://distribute.kde.org/kdeapps.flatpakrepo

# List all configured remotes
flatpak remotes --show-details

# Disable a remote without removing it
sudo flatpak remote-modify --disable gnome-nightly

# Remove a remote
sudo flatpak remote-delete gnome-nightly
```

## System vs User Installation

Flatpak supports two installation modes:

```bash
# System installation (requires sudo, available to all users)
sudo flatpak install flathub org.mozilla.firefox

# User installation (no sudo, only for current user)
flatpak install --user flathub org.mozilla.firefox

# Check where an app is installed
flatpak list --columns=name,installation

# Convert between system and user installation
flatpak install --user flathub org.mozilla.firefox  # If previously system-installed
```

System-installed apps are available to all users on the machine. User-installed apps are in `~/.local/share/flatpak/` and only visible to that user.

## Viewing Application Information

```bash
# Detailed information about an installed app
flatpak info org.mozilla.firefox

# Shows: version, runtime, install location, disk usage

# List available versions of an app
flatpak remote-info flathub org.mozilla.firefox

# View app metadata and permissions
flatpak info --show-metadata org.mozilla.firefox
```

## Disk Space Management

Flatpak runtimes are shared between applications, but multiple runtime versions can accumulate:

```bash
# See disk usage by app and runtime
flatpak list --columns=name,size

# See unused runtimes
flatpak list --unused

# Remove unused runtimes to reclaim space
sudo flatpak uninstall --unused

# Total Flatpak disk usage
du -sh /var/lib/flatpak/
du -sh ~/.local/share/flatpak/  # User installations
```

## Desktop Integration

Flatpak applications integrate with the desktop through `.desktop` files:

```bash
# Flatpak creates desktop entries automatically
ls /var/lib/flatpak/exports/share/applications/

# Force update of desktop database
sudo update-desktop-database
```

Applications installed via Flatpak appear in your application launcher (GNOME Activities, KDE application menu, etc.) automatically. If an app doesn't appear, log out and back in, or run:

```bash
# Update XDG desktop database
update-desktop-database ~/.local/share/applications/
```

Flatpak on Ubuntu gives you access to the same application versions as users on Fedora, Arch, and other distributions - useful when Ubuntu's repositories lag behind on specific applications you care about.
