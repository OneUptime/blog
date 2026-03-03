# How to Install Chromium on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Chromium, Browser, Open Source, Desktop

Description: Learn how to install Chromium browser on Ubuntu using APT, Snap, or by building from source, with tips for configuration and managing the Snap vs APT versions.

---

Chromium is the open-source browser that Google Chrome is built from. Unlike Chrome, Chromium doesn't include proprietary codecs, Google-specific integrations, or automatic update mechanisms, making it appealing to users who want a modern browser without vendor lock-in. On Ubuntu, Chromium is primarily distributed as a Snap package since 18.10, but there are ways to get an APT-based version if you prefer.

## Understanding the Chromium Options on Ubuntu

Ubuntu's Chromium situation mirrors Firefox: since Ubuntu 18.10, the official Ubuntu package for Chromium is a Snap that redirects APT installs to the Snap store. This means `sudo apt install chromium-browser` silently installs a Snap package.

Your options are:
1. **Snap version** - easiest, auto-updates, sandboxed (Ubuntu default)
2. **APT version from a PPA** - classic .deb package with regular apt integration
3. **Ungoogled Chromium** - Chromium with all Google services removed

## Option 1: Installing via Snap (Default)

```bash
# Install Chromium as a Snap (this is what apt does too)
sudo snap install chromium

# Verify installation
snap list chromium

# Launch
chromium &
# or
chromium-browser &
```

Check the Snap version:

```bash
snap info chromium | grep -E "name|version|installed"
```

Snap Chromium updates automatically. You can also manually trigger an update:

```bash
sudo snap refresh chromium
```

## Option 2: Installing Chromium via APT

To get a traditional Debian package, use a community-maintained PPA or the Debian package:

### Using the Debian Chromium Package

```bash
# Add the Debian repository for a proper .deb Chromium
# This approach uses Debian's package which is well-maintained

# First, add the Debian repository signing key
curl -fsSL https://ftp-master.debian.org/keys/archive-key-12.asc | \
    sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/debian-archive-keyring.gpg

# Add the Debian Bookworm repository (pin to only pull Chromium from it)
echo "deb [signed-by=/etc/apt/trusted.gpg.d/debian-archive-keyring.gpg] http://deb.debian.org/debian bookworm main" | \
    sudo tee /etc/apt/sources.list.d/debian-bookworm.list

# Pin this repository to a low priority so it only provides Chromium
sudo nano /etc/apt/preferences.d/debian-chromium
```

```text
# /etc/apt/preferences.d/debian-chromium
# Pull chromium from Debian but nothing else
Package: chromium chromium-common chromium-driver chromium-l10n chromium-sandbox
Pin: origin deb.debian.org
Pin-Priority: 1001

Package: *
Pin: origin deb.debian.org
Pin-Priority: -1
```

```bash
# Prevent the Snap redirect
sudo nano /etc/apt/preferences.d/chromium-no-snap
```

```text
Package: chromium-browser
Pin: release o=Ubuntu*
Pin-Priority: -1
```

```bash
sudo apt update
sudo apt install chromium
```

### Using the Snap Removal Method

A cleaner approach if you find the Snap redirect problematic:

```bash
# Remove any existing Chromium Snap
sudo snap remove chromium 2>/dev/null

# Create a dummy package to satisfy the apt dependency without installing the Snap
sudo apt install -y equivs
cat > chromium-no-snap.ctl << 'EOF'
Package: chromium-browser
Version: 999
Maintainer: local
Architecture: amd64
Description: Dummy package to prevent Snap installation
EOF
equivs-build chromium-no-snap.ctl
sudo dpkg -i chromium-browser_999_amd64.deb

# Now install Chromium from the Debian repository
sudo apt install chromium
```

## Option 3: Ungoogled Chromium

Ungoogled Chromium removes all Google services calls - no Safe Browsing, no sync, no account integration, no usage statistics sent to Google:

```bash
# Install from the ungoogled-chromium PPA
sudo add-apt-repository ppa:xtradeb/apps
sudo apt update
sudo apt install ungoogled-chromium

# Or download from the Chromium Updater project
# https://chromium.woolyss.com/ has current builds
wget https://github.com/ungoogled-software/ungoogled-chromium-debian/releases/download/[VERSION]/ungoogled-chromium_[VERSION]-1_amd64.deb
sudo dpkg -i ungoogled-chromium_*.deb
sudo apt install -f
```

## Verifying the Installation Type

Check whether you got a Snap or APT package:

```bash
# Check if it's a Snap
snap list | grep chromium

# Check if it's an APT package
dpkg -l | grep chromium

# Find the actual binary location
which chromium chromium-browser
# Snap installs to /snap/bin/
# APT installs to /usr/bin/
```

## Post-Installation Configuration

### Setting as Default Browser

```bash
# Set Chromium as the default browser from command line
xdg-settings set default-web-browser chromium.desktop
# or
xdg-settings set default-web-browser chromium-browser.desktop

# Verify
xdg-settings get default-web-browser
```

### Enabling Widevine DRM (for Netflix, etc.)

Chromium doesn't ship with the Widevine DRM component needed for Netflix and similar services. Install it:

```bash
# For APT-installed Chromium
sudo apt install chromium-codecs-ffmpeg-extra

# For Ungoogled Chromium, download Widevine separately
# The chromium-widevine package or manual extraction from Chrome
```

### Hardware Video Acceleration

Enable VA-API for hardware video decoding:

```bash
# Install VA-API utilities and libraries
sudo apt install vainfo libva-drm2

# Check VA-API support
vainfo

# Launch Chromium with VA-API enabled
chromium --use-gl=egl --enable-features=VaapiVideoDecoder,VaapiVideoEncoder
```

Set it persistently in the Chromium flags file:

```bash
# APT version uses a flags file
echo '--use-gl=egl
--enable-features=VaapiVideoDecoder' >> ~/.config/chromium-flags.conf
```

For the Snap version, flags are set differently:

```bash
# Edit the Snap Chromium wrapper
sudo nano /var/snap/chromium/current/args
```

## Managing Profiles

Chromium supports multiple profiles, useful for separating work and personal browsing:

```bash
# Launch with a specific profile directory
chromium --profile-directory="Profile 1" &

# Create a new profile at launch
chromium --profile-directory="Work" &
```

## Chromium for Automation and Testing

Chromium is commonly used with Playwright or Selenium for browser automation:

```bash
# Install Playwright with Chromium
npm install playwright
npx playwright install chromium

# Or install ChromeDriver for Selenium
sudo apt install chromium-driver

# Verify chromedriver version matches Chromium
chromium --version
chromedriver --version
```

## Keeping Chromium Updated

For Snap:

```bash
# Snaps auto-update, but you can force an update
sudo snap refresh chromium
```

For APT version:

```bash
# Standard package update
sudo apt update && sudo apt upgrade chromium
```

Chromium is a solid choice for users who want Chrome's rendering engine and compatibility without Google's proprietary additions. The open-source codebase also means security researchers can audit exactly what the browser does, which matters for privacy-conscious users and organizations.
