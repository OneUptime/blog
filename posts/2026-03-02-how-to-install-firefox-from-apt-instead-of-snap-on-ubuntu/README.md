# How to Install Firefox from APT Instead of Snap on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Firefox, APT, Snap, Desktop

Description: Learn how to install Firefox as a traditional APT package on Ubuntu 22.04 and later, bypassing the default Snap installation for better performance and system integration.

---

Since Ubuntu 22.04, Canonical switched Firefox from a traditional `.deb` package to a Snap package. The Snap version has real-world drawbacks: slower startup times, sandbox restrictions that break some integrations (KeePassXC, Yubikey, certain printing configurations), and increased memory usage. If these issues affect you, switching to the APT version of Firefox from Mozilla's official repository restores the traditional package behavior.

## Why the Snap Version Causes Problems

The Snap package runs in a strict confinement sandbox, which:
- Blocks certain filesystem paths that browser extensions rely on
- Prevents integration with password managers that use native messaging (like KeePassXC-Browser or Bitwarden)
- Causes issues with some hardware security keys and smart card authentication
- Results in 5-15 second startup times on many systems due to Snap mounting overhead
- Stores profile data in a different location than users expect

## Step 1: Remove the Snap Version

First, remove the existing Snap Firefox installation:

```bash
# Check if Firefox is installed as a snap
snap list | grep firefox

# Remove the Snap Firefox
sudo snap remove firefox

# Verify it's removed
which firefox  # Should show no output
```

## Step 2: Prevent Ubuntu from Reinstalling the Snap Version

Ubuntu's APT configuration includes a preference that redirects Firefox APT installs to the Snap. Disable this:

```bash
# Check for the redirect configuration
cat /etc/apt/preferences.d/firefox-no-snap 2>/dev/null || echo "File doesn't exist yet"

# Create a preference file that prevents Snap Firefox from being installed via APT
sudo nano /etc/apt/preferences.d/firefox-no-snap
```

```text
# /etc/apt/preferences.d/firefox-no-snap
# Prevent the firefox Snap from being installed via APT redirects
Package: firefox*
Pin: release o=Ubuntu*
Pin-Priority: -1
```

Also check for and remove the Firefox Snap package redirector:

```bash
# This package redirects apt install firefox to snap
sudo apt remove firefox-snap-package-redirector 2>/dev/null || true

# Check for the transition package
dpkg -l | grep firefox-snap
```

## Step 3: Add Mozilla's Official APT Repository

Mozilla maintains an official APT repository for Ubuntu:

```bash
# Install required tools
sudo apt update
sudo apt install -y curl gpg

# Create the keyrings directory if it doesn't exist
sudo install -d -m 0755 /etc/apt/keyrings

# Download and install Mozilla's GPG signing key
curl -fsSL https://packages.mozilla.org/apt/repo-signing-key.gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/packages.mozilla.org.asc

# Verify the key fingerprint (should be: 35BAA0B33E9EB396F59CA838C0BA5CE6DC6315A3)
gpg -n -q --import --import-options import-show /etc/apt/keyrings/packages.mozilla.org.asc | \
    awk '/pub/{getline; gsub(/^ +| +$/, ""); print "Key fingerprint: " $0}'

# Add the Mozilla APT repository
echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" | \
    sudo tee /etc/apt/sources.list.d/mozilla.list
```

## Step 4: Set APT Priority for Mozilla's Repository

Tell APT to prefer packages from the Mozilla repository over Ubuntu's versions:

```bash
sudo nano /etc/apt/preferences.d/mozilla
```

```text
# /etc/apt/preferences.d/mozilla
# Prefer Mozilla's APT repository for Firefox and Thunderbird
Package: *
Pin: origin packages.mozilla.org
Pin-Priority: 1000
```

## Step 5: Install Firefox from APT

```bash
sudo apt update

# Install Firefox from Mozilla's repository
sudo apt install firefox

# Verify the installation source
apt-cache policy firefox
```

The output should show the installed version is from `packages.mozilla.org`, not from Ubuntu or Snap.

## Step 6: Verify the APT Version is Running

```bash
# Check which Firefox binary is being used
which firefox

# Should show something like /usr/bin/firefox or /usr/lib/firefox/firefox
# Not something under /snap/

# Check the Firefox version and build info
firefox --version

# Start Firefox and verify it launches quickly (should be 2-3 seconds, not 10+)
firefox &
```

## Installing Language Packs

The Mozilla repository also includes Firefox language packs:

```bash
# Install your language pack
sudo apt install firefox-l10n-de   # German
sudo apt install firefox-l10n-fr   # French
sudo apt install firefox-l10n-es   # Spanish

# List available language packs
apt-cache search firefox-l10n
```

## Keeping Firefox Updated

Firefox updates from the Mozilla APT repository arrive via normal `apt upgrade`:

```bash
# Update all packages including Firefox
sudo apt update && sudo apt upgrade

# Update only Firefox
sudo apt install --only-upgrade firefox

# Check current vs available version
apt-cache policy firefox
```

## Restoring KeePassXC Integration

After switching to the APT version, KeePassXC-Browser should work automatically. Verify:

1. Install the [KeePassXC-Browser extension](https://addons.mozilla.org/en-US/firefox/addon/keepassxc-browser/) in Firefox
2. Open KeePassXC > **Tools** > **Settings** > **Browser Integration**
3. Enable Firefox integration
4. In the extension settings, click "Connect" to KeePassXC

The native messaging connection that failed with Snap should now work.

## Troubleshooting

### APT still wants to install the Snap version

```bash
# Check if a snap transition package is interfering
apt-cache showpkg firefox | grep depends

# Ensure the preferences file is in the right location
ls -la /etc/apt/preferences.d/firefox-no-snap

# Check what version APT would install
apt-cache policy firefox
```

### Firefox profile migration

If you had bookmarks and settings in the Snap version, they're stored in a different location:

```bash
# Snap Firefox profile location
ls ~/.snap/firefox/common/.mozilla/firefox/

# Standard Firefox profile location (APT version)
ls ~/.mozilla/firefox/

# Copy your profile from Snap to standard location
# First, find your profile directory name
ls ~/.snap/firefox/common/.mozilla/firefox/

# Copy it
cp -r ~/.snap/firefox/common/.mozilla/firefox/xxxxxxxx.default-release \
    ~/.mozilla/firefox/
```

The APT version of Firefox offers the same browser features as the Snap version but without the confinement overhead. For most desktop Ubuntu users who need hardware security key support, password manager integration, or fast browser startup, the APT installation is the better choice.
