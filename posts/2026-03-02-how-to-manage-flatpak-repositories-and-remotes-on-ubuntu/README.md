# How to Manage Flatpak Repositories and Remotes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Flatpak, Linux, Package Management

Description: Learn how to add, configure, and manage Flatpak repositories and remotes on Ubuntu, including Flathub, custom repositories, and offline repository setups.

---

Flatpak uses a repository model similar in concept to APT's sources. A remote is a URL pointing to a Flatpak repository that your system can install applications from. Understanding how to manage remotes - adding, removing, prioritizing, and configuring them - is essential for getting the most out of Flatpak on Ubuntu.

## Understanding Flatpak Remotes

Unlike APT where packages from multiple repositories can conflict, Flatpak remotes mostly provide different applications with their own isolated runtimes. Applications from different remotes generally don't interfere with each other.

Remotes can be configured at two levels:
- **System level** (requires sudo): Available to all users on the machine
- **User level** (no sudo): Only available to the current user

```bash
# List all configured remotes
flatpak remotes

# List with detailed information
flatpak remotes --show-details

# List system remotes only
flatpak remotes --system

# List user remotes only
flatpak remotes --user

# Example output:
# Name    Options
# flathub system,eno
# gnome   system,eno
```

The `eno` in Options means "no enumeration" is disabled, meaning apps from this remote show up in searches.

## Adding Remotes

### Adding Flathub

Flathub is the main Flatpak repository. Add it if not already present:

```bash
# Add Flathub for all users (system level)
sudo flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Add Flathub for current user only
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

The `.flatpakrepo` file is a configuration file that sets the remote name, URL, and GPG key. Flatpak downloads and imports it during the `remote-add` command.

### Adding Other Public Repositories

```bash
# GNOME nightly builds (development versions of GNOME apps)
sudo flatpak remote-add --if-not-exists gnome-nightly https://nightly.gnome.org/gnome-nightly.flatpakrepo

# KDE Gear (KDE applications)
sudo flatpak remote-add --if-not-exists kde https://distribute.kde.org/kdeapps.flatpakrepo

# Flathub Beta (beta applications before they hit stable Flathub)
sudo flatpak remote-add --if-not-exists flathub-beta https://flathub.org/beta-repo/flathub-beta.flatpakrepo

# Fedora's Flatpak repository (additional apps maintained by Fedora)
sudo flatpak remote-add --if-not-exists fedora oci+https://registry.fedoraproject.org
```

### Adding a Custom Repository

If you maintain your own Flatpak repository (for enterprise distribution or development):

```bash
# Add from a local .flatpakrepo file
sudo flatpak remote-add --if-not-exists myrepo /path/to/myrepo.flatpakrepo

# Add directly with URL and GPG key
sudo flatpak remote-add --if-not-exists \
    --gpg-import=/path/to/myrepo.gpg \
    myrepo https://flatpak.example.com/repo/

# Add without GPG verification (insecure - only for testing)
sudo flatpak remote-add --if-not-exists --no-gpg-verify myrepo https://flatpak.example.com/repo/
```

## Configuring Remote Options

```bash
# Set a human-readable title for a remote
sudo flatpak remote-modify --title="My Company Apps" myrepo

# Disable a remote (don't pull updates, but keep installed apps working)
sudo flatpak remote-modify --disable gnome-nightly

# Re-enable a disabled remote
sudo flatpak remote-modify --enable gnome-nightly

# Change the URL of an existing remote
sudo flatpak remote-modify --url=https://new-url.example.com myrepo

# Set a priority (lower number = higher priority)
# Used when the same app is in multiple remotes
sudo flatpak remote-modify --prio=100 flathub
sudo flatpak remote-modify --prio=200 myrepo

# Set the default branch (e.g., 'stable' or 'master')
sudo flatpak remote-modify --default-branch=stable flathub
```

## Listing Apps in a Remote

```bash
# List all available apps in a remote
flatpak remote-ls flathub

# Search across all remotes
flatpak search firefox

# Search within a specific remote
flatpak remote-ls flathub | grep -i firefox

# List available updates from a remote
flatpak remote-ls flathub --updates

# List only apps (not runtimes)
flatpak remote-ls flathub --app

# List only runtimes
flatpak remote-ls flathub --runtime

# Get info about a specific app in a remote
flatpak remote-info flathub org.mozilla.firefox
```

## Removing Remotes

```bash
# Remove a remote (apps from this remote remain installed)
sudo flatpak remote-delete gnome-nightly

# Remove a user-level remote
flatpak remote-delete --user gnome-nightly

# Verify removal
flatpak remotes
```

Removing a remote doesn't uninstall apps already installed from it. They continue working but won't receive updates until you re-add the remote or update them manually from another source.

## Setting Up a Local/Offline Repository

For environments without internet access, you can mirror a Flatpak repository locally:

```bash
# Install ostree (Flatpak uses ostree underneath)
sudo apt install ostree

# Create a local repository directory
mkdir -p /srv/flatpak-mirror

# Mirror Flathub (large - will take time and space)
# This creates a partial mirror (only apps you specify)
ostree --repo=/srv/flatpak-mirror init --mode=archive

# Pull a specific app into your mirror
flatpak build-pull /srv/flatpak-mirror \
    --from-branch=app/org.mozilla.firefox/x86_64/stable \
    https://dl.flathub.org/repo/

# Serve the mirror over HTTP
sudo apt install nginx
# Point nginx's root to /srv/flatpak-mirror and serve files statically
```

For a simpler offline approach, use Flatpak bundles:

```bash
# On a connected machine: create a bundle for offline transfer
# First install the app
sudo flatpak install flathub org.gimp.GIMP

# Export it as a bundle
flatpak build-bundle /var/lib/flatpak/repo gimp.flatpak org.gimp.GIMP

# Transfer the bundle to the offline machine
scp gimp.flatpak offline-machine:/tmp/

# On the offline machine: install the bundle
flatpak install /tmp/gimp.flatpak
```

## Enterprise Repository Setup

For organizations distributing custom applications internally:

```bash
# Create a new Flatpak repository
mkdir -p /opt/company-flatpak-repo
flatpak build-init /tmp/myapp-build com.example.MyApp org.gnome.Sdk org.gnome.Platform 46

# Build the app (see the build guide for details)
# ...

# Export the built app to the repository
flatpak build-export /opt/company-flatpak-repo /tmp/myapp-build

# Update the repository summary (required after any changes)
flatpak build-update-repo /opt/company-flatpak-repo

# Sign the repository (recommended for production)
gpg --generate-key  # Generate a GPG key if you don't have one
flatpak build-update-repo --gpg-sign=YOUR_KEY_ID /opt/company-flatpak-repo

# Export the public key for distribution to clients
gpg --armor --export YOUR_KEY_ID > /opt/company-flatpak-repo/company-flatpak.gpg

# Serve over HTTP with nginx
sudo tee /etc/nginx/sites-available/flatpak-repo << 'EOF'
server {
    listen 80;
    server_name flatpak.company.internal;
    root /opt/company-flatpak-repo;
    autoindex on;
    # Flatpak needs these content types
    types {
        application/x-ostree-objects objects;
        application/x-flatpak-repo flatpakrepo;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/flatpak-repo /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

On client machines:

```bash
# Add the company repository
sudo flatpak remote-add --gpg-import=/tmp/company-flatpak.gpg \
    company-apps http://flatpak.company.internal/

# Install internal apps
flatpak install company-apps com.example.MyApp
```

## Troubleshooting Remote Issues

```bash
# Remote not responding
flatpak update --verbose 2>&1 | grep -i error

# Clear Flatpak's metadata cache and re-fetch
sudo flatpak repair --system
flatpak repair --user

# Force re-download of remote metadata
sudo flatpak remote-modify --url=https://dl.flathub.org/repo/ flathub
sudo flatpak update

# Check GPG verification issues
flatpak remote-ls --show-details flathub 2>&1 | grep -i gpg

# Reset a remote's configuration
sudo flatpak remote-delete flathub
sudo flatpak remote-add flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

Managing Flatpak remotes gives you fine-grained control over where applications come from. For enterprise environments, running your own remote gives you the same control over Flatpak applications that an internal APT mirror provides for traditional packages - centralized distribution, version control, and offline capability.
