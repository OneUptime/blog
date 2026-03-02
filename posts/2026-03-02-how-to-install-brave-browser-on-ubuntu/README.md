# How to Install Brave Browser on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Brave, Browser, Privacy, Desktop

Description: Step-by-step instructions for installing Brave browser on Ubuntu using Brave's official APT repository, with configuration tips for privacy settings and features.

---

Brave is a Chromium-based browser built with privacy as a core feature. It blocks ads and trackers by default without requiring extensions, includes a built-in VPN option, supports the BAT cryptocurrency for rewarding content creators, and uses less memory than Chrome because it doesn't load third-party ad scripts. Installation on Ubuntu is straightforward through Brave's official APT repository, which ensures you always get official builds with security updates.

## Installing Brave via APT

Brave Software maintains their own APT repository. The installation process adds the repository and GPG key, then installs via normal apt commands.

```bash
# Install prerequisites
sudo apt update
sudo apt install -y curl gpg

# Download and install the Brave GPG signing key
sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg \
    https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg

# Verify the key was downloaded (optional but recommended)
gpg --show-keys /usr/share/keyrings/brave-browser-archive-keyring.gpg

# Add the Brave repository to your APT sources
echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" | \
    sudo tee /etc/apt/sources.list.d/brave-browser-release.list

# Update package lists
sudo apt update

# Install Brave
sudo apt install brave-browser
```

## Verifying the Installation

```bash
# Check the installed version
brave-browser --version

# Find the binary location
which brave-browser

# Launch Brave
brave-browser &
```

The repository is added to your system, so future `apt upgrade` commands will include Brave updates automatically.

## Installing Different Release Channels

Brave offers multiple release channels:

### Beta Channel

The beta channel receives new features before stable. It installs alongside the stable version:

```bash
# Add the beta repository
sudo curl -fsSLo /usr/share/keyrings/brave-browser-beta-archive-keyring.gpg \
    https://brave-browser-apt-beta.s3.brave.com/brave-browser-beta-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/brave-browser-beta-archive-keyring.gpg] https://brave-browser-apt-beta.s3.brave.com/ stable main" | \
    sudo tee /etc/apt/sources.list.d/brave-browser-beta.list

sudo apt update
sudo apt install brave-browser-beta
```

### Nightly Channel

For testing the very latest changes:

```bash
sudo curl -fsSLo /usr/share/keyrings/brave-browser-nightly-archive-keyring.gpg \
    https://brave-browser-apt-nightly.s3.brave.com/brave-browser-nightly-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/brave-browser-nightly-archive-keyring.gpg] https://brave-browser-apt-nightly.s3.brave.com/ stable main" | \
    sudo tee /etc/apt/sources.list.d/brave-browser-nightly.list

sudo apt update
sudo apt install brave-browser-nightly
```

## First-Time Configuration

After launching Brave for the first time, some settings worth configuring:

### Shields Settings

Brave Shields blocks trackers and ads. Access global settings at `brave://settings/shields`:

```
- Trackers & ads blocking: Standard (default) or Aggressive
- Upgrade connections to HTTPS: Enabled (recommended)
- Block fingerprinting: Standard or Strict
- Block third-party cookies: Enabled
```

Individual site exceptions can be set by clicking the Brave lion icon in the address bar.

### Privacy Settings

Navigate to `brave://settings/privacy`:

```
- Send a "Do Not Track" request: Enable if desired
- Block Google Sign-In: Enable to prevent Google's FLoC tracking
- Allow privacy-preserving product analytics: Disable for maximum privacy
- Improve security by sending URLs to Google Safe Browsing:
  Disable if you're concerned about URL leakage to Google
```

### Search Engine

Set a privacy-respecting search engine at `brave://settings/search`:

- **Brave Search** - Brave's own search engine with no Google/Bing dependence
- **DuckDuckGo** - popular privacy-focused search
- **Startpage** - Google results through a privacy proxy
- **SearXNG** - self-hosted meta-search option

## Using Brave with Profiles

Multiple profiles let you separate browser contexts:

```bash
# Launch with a specific profile
brave-browser --profile-directory="Profile 1" &

# Create a new profile
brave-browser --profile-directory="Work" &
```

Or use the profile switcher in the top-right corner of the browser.

## Enabling Wayland Native Mode

On Ubuntu 22.04+ with Wayland:

```bash
# Create or edit a local desktop override
mkdir -p ~/.local/share/applications
cp /usr/share/applications/brave-browser.desktop ~/.local/share/applications/

# Edit the Exec line
nano ~/.local/share/applications/brave-browser.desktop
```

Change the `Exec=` line to include Wayland flags:

```ini
Exec=/usr/bin/brave-browser-stable --ozone-platform=wayland %U
```

Alternatively, set environment variable:

```bash
echo 'BRAVE_FLAGS="--ozone-platform=wayland"' | sudo tee -a /etc/environment
```

## Brave Tor Integration

Brave includes a built-in Tor mode for anonymous browsing:

```bash
# Open a new Private Window with Tor from the command line
brave-browser --tor &
```

Or use the menu: **File** > **New Private Window with Tor**. This routes traffic through the Tor network, adding anonymity but reducing speed. It is not a full Tor Browser Bundle - for comprehensive Tor usage, the dedicated Tor Browser is more appropriate.

## Hardware Video Acceleration

Like other Chromium-based browsers, Brave can use hardware video decoding:

```bash
# Install VA-API support
sudo apt install vainfo libva-drm2

# Launch Brave with hardware acceleration enabled
brave-browser --use-gl=egl --enable-features=VaapiVideoDecoder &
```

Check if hardware acceleration is active at `brave://gpu`:
- Look for `Video Decode: Hardware accelerated`

## Keeping Brave Updated

Brave updates through the standard APT mechanism:

```bash
# Update all packages including Brave
sudo apt update && sudo apt upgrade

# Update only Brave
sudo apt install --only-upgrade brave-browser

# Check current and available versions
apt-cache policy brave-browser
```

Brave typically releases updates weekly on the stable channel, with security patches released as needed between regular updates.

## Removing Brave

```bash
# Remove Brave but keep settings
sudo apt remove brave-browser

# Remove Brave and configuration files
sudo apt purge brave-browser

# Remove the Brave repository
sudo rm /etc/apt/sources.list.d/brave-browser-release.list
sudo rm /usr/share/keyrings/brave-browser-archive-keyring.gpg
sudo apt update
```

Your Brave profile data (bookmarks, passwords, history) stays in `~/.config/BraveSoftware/` until you manually delete it.

## Comparing Brave to Other Chromium Browsers

Brave's distinction from plain Chromium or Chrome:
- Native ad blocking at the network level (faster than extension-based blocking)
- Built-in HTTPS upgrading
- Fingerprint randomization to reduce cross-site tracking
- No Google services or telemetry to Google in the default build
- Integrated Tor mode for occasional anonymous browsing

The trade-off is Brave's business model around the BAT token and Brave Ads is not to everyone's taste, but these features are opt-in and the core browsing experience works without engaging with them.
