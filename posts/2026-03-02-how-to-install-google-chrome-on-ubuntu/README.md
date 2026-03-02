# How to Install Google Chrome on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Google Chrome, Browser, APT, Desktop

Description: A straightforward guide to installing Google Chrome on Ubuntu using Google's official Debian package and setting up the auto-update repository.

---

Google Chrome is not available in Ubuntu's official repositories because it is proprietary software. Installing it requires adding Google's APT repository manually. This process also sets up automatic updates so Chrome keeps itself current the same way other system packages do. This guide covers both the command-line and GUI installation paths, plus some post-installation configuration useful for daily use.

## Installation via the Command Line

The cleanest way to install Chrome is through the command-line process that adds Google's repository permanently.

### Download and Install the .deb Package

```bash
# Update package lists
sudo apt update

# Install required dependencies (usually already present)
sudo apt install -y wget apt-transport-https

# Download the latest Chrome stable .deb package
wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb

# Install the package
sudo dpkg -i google-chrome-stable_current_amd64.deb

# If there are dependency errors, fix them
sudo apt install -f

# Clean up the downloaded file
rm google-chrome-stable_current_amd64.deb
```

When you install Chrome this way, the installer automatically:
- Adds Google's signing key to the APT keyring
- Creates `/etc/apt/sources.list.d/google-chrome.list`
- Enables automatic updates via regular `apt upgrade`

### Verify the Repository Was Added

```bash
# Check that the Google repository is configured
cat /etc/apt/sources.list.d/google-chrome.list

# Expected output:
# deb [arch=amd64 signed-by=/etc/apt/trusted.gpg.d/google.gpg] https://dl.google.com/linux/chrome/deb/ stable main
```

### Install Chrome via APT (After Adding the Repo Manually)

If you prefer to add the repository first and then install:

```bash
# Download and install the Google GPG key
curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | \
    sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/google.gpg

# Add the Chrome repository
echo "deb [arch=amd64 signed-by=/etc/apt/trusted.gpg.d/google.gpg] https://dl.google.com/linux/chrome/deb/ stable main" | \
    sudo tee /etc/apt/sources.list.d/google-chrome.list

# Update and install
sudo apt update
sudo apt install google-chrome-stable
```

## Installing Chrome Variants

Google offers three release channels:

```bash
# Stable channel (recommended for most users)
sudo apt install google-chrome-stable

# Beta channel (newer features, may have bugs)
sudo apt install google-chrome-beta

# Unstable/Dev channel (cutting edge, use for testing)
sudo apt install google-chrome-unstable
```

All three can be installed simultaneously and each creates its own desktop shortcut.

## Verifying the Installation

```bash
# Check Chrome is installed
google-chrome --version

# Find the Chrome binary
which google-chrome
which google-chrome-stable

# Launch Chrome
google-chrome &

# Launch with specific profile
google-chrome --profile-directory="Profile 1" &
```

## Post-Installation Configuration

### Running Chrome with GPU Acceleration

On Ubuntu with Wayland or certain GPU configurations, hardware acceleration may be disabled by default. Enable it:

1. Open `chrome://flags` in Chrome
2. Search for "Override software rendering list"
3. Enable it and restart Chrome

Or launch with flags:

```bash
# Launch with GPU acceleration forced
google-chrome --use-gl=egl &

# Launch with specific GPU flags for AMD/Intel
google-chrome --use-gl=desktop --enable-features=VaapiVideoDecoder &
```

### Enabling Wayland Native Mode

On Wayland-based desktops (Ubuntu 22.04+ uses Wayland by default):

```bash
# Create or edit the Chrome desktop file to use native Wayland
cp /usr/share/applications/google-chrome.desktop ~/.local/share/applications/

# Edit the Exec line to add Wayland flags
nano ~/.local/share/applications/google-chrome.desktop
```

Find the `Exec=` line and add `--ozone-platform=wayland`:

```ini
Exec=/usr/bin/google-chrome-stable --ozone-platform=wayland %U
```

Or set it persistently via environment variable:

```bash
echo 'CHROMIUM_FLAGS="--ozone-platform=wayland"' | sudo tee /etc/environment
```

### Configuring Chrome for Enterprise/Managed Environments

Google provides Chrome policy templates for managed deployments:

```bash
# Create policy directory
sudo mkdir -p /etc/opt/chrome/policies/managed

# Create a policy file
sudo nano /etc/opt/chrome/policies/managed/corporate-policy.json
```

```json
{
    "HomepageLocation": "https://intranet.example.com",
    "HomepageIsNewTabPage": false,
    "RestoreOnStartup": 4,
    "RestoreOnStartupURLs": ["https://intranet.example.com"],
    "BrowserSignin": 0,
    "SyncDisabled": true,
    "PasswordManagerEnabled": false,
    "SafeBrowsingEnabled": true,
    "DefaultSearchProviderEnabled": true,
    "DefaultSearchProviderName": "Corporate Search",
    "DefaultSearchProviderSearchURL": "https://search.example.com/search?q={searchTerms}"
}
```

Policies set here apply to all Chrome users on the system and cannot be overridden in the browser UI.

## Keeping Chrome Updated

After the initial installation, Chrome updates via the standard APT workflow:

```bash
# Update Chrome along with other packages
sudo apt update && sudo apt upgrade

# Update only Chrome
sudo apt install --only-upgrade google-chrome-stable

# Check current vs available version
apt-cache policy google-chrome-stable
```

Chrome also has a built-in update mechanism, but on Ubuntu it defers to APT for updates. The `google-chrome-stable` package typically receives updates within a day or two of Google releasing them.

## Removing Chrome

```bash
# Remove Chrome but keep settings and the repository
sudo apt remove google-chrome-stable

# Remove Chrome completely including configuration
sudo apt purge google-chrome-stable

# Remove the Google APT repository
sudo rm /etc/apt/sources.list.d/google-chrome.list
sudo rm /etc/apt/trusted.gpg.d/google.gpg
sudo apt update
```

Your Chrome profile data (bookmarks, history, passwords if not synced) remains in `~/.config/google-chrome/` until you manually delete it.

## Troubleshooting

### Chrome crashes on startup

```bash
# Run Chrome from terminal to see error output
google-chrome --no-sandbox 2>&1

# If sandbox is the issue on some setups
google-chrome --disable-gpu 2>&1
```

### Missing libGL or GPU-related errors

```bash
# Install required libraries
sudo apt install libegl1 libgl1 libgles2

# For VA-API support (hardware video decoding)
sudo apt install libva-drm2 libva-x11-2 vainfo
```

### Certificate errors with corporate proxies

If your organization uses SSL inspection:

```bash
# Import your organization's root CA into Chrome's certificate store
# Chrome uses the system certificate store on Linux
sudo cp /path/to/corporate-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

Chrome on Ubuntu works well as a daily driver and benefits from the familiar `apt upgrade` workflow for keeping it updated alongside the rest of the system.
