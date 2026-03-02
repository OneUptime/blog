# How to Remove Snap Completely and Use APT Instead on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, APT, Package Management, Linux

Description: A complete guide to removing snapd and all snap packages from Ubuntu and replacing them with APT alternatives, including preventing snap from being reinstalled.

---

Some Ubuntu users and administrators prefer to use only traditional APT packages and want to remove the snap ecosystem entirely. Valid reasons include concerns about confined application access, disk space usage from snap's squashfs mounts, or simply preferring the familiar APT workflow. Ubuntu installs several snaps by default in recent releases, including Firefox, which can be particularly surprising.

This guide walks through completely removing snapd and all snap packages, then configuring APT to prevent snap from being reinstalled, and finding APT alternatives for common snaps.

## Understanding What Gets Removed

Before proceeding, understand what you're removing. On a typical Ubuntu 22.04 or 24.04 desktop, these snaps are installed by default:

```bash
# List all installed snaps
snap list

# Common defaults you'll see:
# firefox         - The web browser
# snap-store      - Snap package manager GUI
# core20/core22   - Base runtime
# snapd           - The snap daemon itself
# gnome-*         - GNOME platform extensions
# gtk-common-themes
```

Removing snap means you lose access to all of these. You'll need APT alternatives before or immediately after removing snap.

## Step 1: Remove Snap Packages in Order

Remove all snap applications before removing the snapd daemon. Order matters because some snaps depend on others:

```bash
# Remove Firefox snap first (will reinstall via APT)
sudo snap remove --purge firefox

# Remove the GNOME extensions and themes
sudo snap remove --purge snap-store
sudo snap remove --purge gnome-3-38-2004 gnome-42-2204
sudo snap remove --purge gtk-common-themes
sudo snap remove --purge bare

# Remove base snaps
sudo snap remove --purge core20
sudo snap remove --purge core22
sudo snap remove --purge snapd

# Verify nothing remains
snap list
# Should return "No snaps are installed yet."
```

The `--purge` flag removes the snap and its user data. Without it, snap data directories remain on disk.

## Step 2: Remove the snapd Package

```bash
# Remove snapd entirely
sudo apt remove --autoremove snapd

# Verify removal
dpkg -l snapd
# Should show 'rc' (removed, config files remain) or not found

# Remove any remaining snap directories
sudo rm -rf /var/cache/snapd/
sudo rm -rf /var/snap/
sudo rm -rf /snap/
sudo rm -rf ~/snap/
```

After this step, the `snap` command will no longer be available.

## Step 3: Prevent Snap from Being Reinstalled

Ubuntu's APT configuration can automatically install snaps as dependencies for certain packages. Without pinning, `apt install firefox` on Ubuntu 22.04+ will reinstall snapd and install Firefox as a snap.

Create an APT preference file that blocks snapd:

```bash
# Create the APT preferences file to block snapd
sudo tee /etc/apt/preferences.d/no-snap.pref << 'EOF'
Package: snapd
Pin: release a=*
Pin-Priority: -10
EOF

# Verify the preference is in effect
apt-cache policy snapd
# Should show: Installed: (none)
# And priority -10
```

This preference file tells APT to never install snapd, even as a dependency of another package.

## Step 4: Install APT Alternatives

### Firefox via Mozilla's APT Repository

Mozilla maintains an official APT repository for Firefox:

```bash
# Install required tools
sudo apt install -y wget gnupg

# Add Mozilla's signing key
wget -q https://packages.mozilla.org/apt/repo-signing-key.gpg -O- | \
    sudo tee /etc/apt/keyrings/packages.mozilla.org.asc > /dev/null

# Add the Mozilla repository
echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" | \
    sudo tee /etc/apt/sources.list.d/mozilla.list > /dev/null

# Set Mozilla packages to take priority over Ubuntu's packages
echo '
Package: *
Pin: origin packages.mozilla.org
Pin-Priority: 1000
' | sudo tee /etc/apt/preferences.d/mozilla

# Update and install
sudo apt update
sudo apt install firefox
```

### Chromium via APT

Chromium on Ubuntu 20.04+ redirects to snap by default, but you can use the unofficial Chromium APT package or install Google Chrome directly:

```bash
# Option A: Install Google Chrome (includes its own update mechanism)
wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install ./google-chrome-stable_current_amd64.deb
rm google-chrome-stable_current_amd64.deb

# Option B: Use a third-party Chromium PPA
sudo add-apt-repository ppa:xtradeb/apps
sudo apt update
sudo apt install chromium
```

### Other Common Snap Replacements

```bash
# VLC - available in Ubuntu repos
sudo apt install vlc

# GIMP - available in Ubuntu repos
sudo apt install gimp

# LibreOffice - available in Ubuntu repos
sudo apt install libreoffice

# VS Code - via Microsoft's APT repository
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | \
    gpg --dearmor > /tmp/microsoft.gpg
sudo install -o root -g root -m 644 /tmp/microsoft.gpg /etc/apt/trusted.gpg.d/
echo "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main" | \
    sudo tee /etc/apt/sources.list.d/vscode.list
sudo apt update
sudo apt install code

# Spotify - via Spotify's APT repository
curl -sS https://download.spotify.com/debian/pubkey_6224F9941A8AA6D1.gpg | \
    sudo gpg --dearmor --yes -o /etc/apt/trusted.gpg.d/spotify.gpg
echo "deb https://repository.spotify.com stable non-free" | \
    sudo tee /etc/apt/sources.list.d/spotify.list
sudo apt update
sudo apt install spotify-client

# Slack - download .deb directly
wget -q https://downloads.slack-edge.com/releases/linux/4.35.131/prod/x64/slack-desktop-4.35.131-amd64.deb
sudo apt install ./slack-desktop-*.deb
```

## Step 5: Clean Up Snap Mount Points

After removing snap, you may notice old mount points still listed in `df` output or `findmnt`:

```bash
# Check for lingering snap mount points
mount | grep snap

# If any appear, unmount them
sudo umount /snap/firefox/current 2>/dev/null
sudo umount /snap/core20/current 2>/dev/null

# Remove empty snap directories if they weren't cleaned by apt
sudo rm -rf /snap

# Update the system journal to clear snap-related entries
sudo systemctl daemon-reload
```

## Verifying the Removal is Complete

```bash
# Confirm snapd is gone
which snap
# Should return nothing

# Confirm no snap packages are mounted
findmnt | grep squashfs
# Should return nothing

# Confirm the preference file is working
apt-cache policy snapd
# Should show Pin-Priority: -10

# Check for any snap-related processes
ps aux | grep snap
# Only shows the grep process itself
```

## Dealing with APT Trying to Install Snap

If you install a package that used to be snap-only, APT will fail with a dependency error rather than installing snapd:

```bash
# Example: if you try to install a package that depends on snapd
sudo apt install somepackage
# E: Package 'snapd' has no installation candidate (due to our Pin-Priority: -10)
```

In this case, look for an alternative way to install the package - usually a vendor APT repository, a Flatpak, or an AppImage.

Removing snap is a legitimate administrative choice. The trade-off is giving up automatic updates for the snapped applications and managing more APT repositories. For many administrators, the predictability and familiarity of APT is worth that trade-off, especially on servers where the snap ecosystem offers fewer advantages than on desktops.
