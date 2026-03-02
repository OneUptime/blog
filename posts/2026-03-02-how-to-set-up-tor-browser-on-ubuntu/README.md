# How to Set Up Tor Browser on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Privacy, Security, Tor, Networking

Description: A practical guide to installing and configuring Tor Browser on Ubuntu for anonymous, private web browsing and accessing .onion services.

---

Tor Browser routes your internet traffic through the Tor network, anonymizing your connection by bouncing it through multiple relays before reaching the destination. This makes it much harder for ISPs, advertisers, and surveillance systems to track your browsing. This post walks through installing Tor Browser on Ubuntu, configuring it properly, and understanding what it does and does not protect you from.

## Prerequisites

You need a working Ubuntu system (20.04, 22.04, or 24.04) with sudo access. A stable internet connection is required. The installation itself is straightforward, but understanding the tool is just as important as installing it.

## Installing Tor Browser

The recommended approach is using the official Tor Project repository or the Flatpak package. Avoid random third-party PPAs since you're trusting this software with your anonymity.

### Option 1: Using the Tor Project's apt Repository

```bash
# Add the Tor Project's GPG key
wget -qO- https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc | gpg --dearmor | sudo tee /usr/share/keyrings/tor-archive-keyring.gpg >/dev/null

# Add the Tor repository
echo "deb [signed-by=/usr/share/keyrings/tor-archive-keyring.gpg] https://deb.torproject.org/torproject.org $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/tor.list

# Update and install Tor Browser Launcher
sudo apt update
sudo apt install torbrowser-launcher
```

The `torbrowser-launcher` package handles downloading the actual Tor Browser binary from the Tor Project website, verifying its signature, and keeping it updated.

### Option 2: Using Flatpak

```bash
# Install Flatpak if not already installed
sudo apt install flatpak

# Add the Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Tor Browser
flatpak install flathub com.github.micahflee.torbrowser-launcher
```

### Option 3: Direct Download

```bash
# Download the official package from torproject.org
wget https://www.torproject.org/dist/torbrowser/13.0.16/tor-browser-linux-x86_64-13.0.16.tar.xz

# Verify the signature (important - do not skip this)
wget https://www.torproject.org/dist/torbrowser/13.0.16/tor-browser-linux-x86_64-13.0.16.tar.xz.asc
gpg --auto-key-locate nodefault,wkd --locate-keys torbrowser@torproject.org
gpg --verify tor-browser-linux-x86_64-13.0.16.tar.xz.asc

# Extract and run
tar -xvJf tor-browser-linux-x86_64-13.0.16.tar.xz
cd tor-browser
./start-tor-browser.desktop
```

Always verify the GPG signature when downloading directly. The Tor Project's signing key fingerprint should be `EF6E 286D DA85 EA2A 4BA7 DE68 4E2C 6E87 9329 8290`.

## First Launch and Initial Configuration

When you first launch Tor Browser, you'll see the Tor Network Settings dialog.

### Standard Connection

If you're in a country where Tor is not censored, simply click "Connect." The browser will establish a circuit through three Tor relays and open the browser window.

```bash
# Launch from terminal to see connection logs
torbrowser-launcher
```

### Using Bridges for Censored Networks

If Tor is blocked in your country, you need bridges - unlisted relays that aren't in the public Tor directory.

1. Click "Configure Connection" before connecting
2. Select "Use a bridge"
3. Choose "Request a bridge from torproject.org" or enter known bridge addresses

You can also obtain bridges by emailing bridges@torproject.org from a Gmail or Riseup account, or visiting https://bridges.torproject.org.

Common bridge types:
- **obfs4** - obfuscates Tor traffic to look like random data
- **meek** - makes traffic look like HTTPS to a CDN
- **Snowflake** - uses WebRTC to blend in with normal browser traffic

## Understanding the Security Levels

Tor Browser has three security levels accessible from the Shield icon in the toolbar.

### Standard
All browser features are enabled. This provides Tor's anonymity but leaves JavaScript running, which can be used to fingerprint or deanonymize you through browser exploits.

### Safer
- JavaScript is disabled on non-HTTPS sites
- Some fonts and math symbols are disabled
- Audio and video media are click-to-play

### Safest
- JavaScript is disabled on all sites
- Most fonts, icons, math symbols, and images are disabled
- Audio and video features are disabled

For sensitive browsing, use Safest. For general browsing where usability matters, Safer is a reasonable middle ground.

## What Tor Browser Protects Against

Tor Browser is designed to defend against several types of attacks:

**Traffic analysis** - By routing through three relays, no single relay knows both the source and destination of traffic. The entry guard knows your IP but not the destination. The exit relay knows the destination but not your IP.

**Fingerprinting** - Tor Browser makes all users look the same by standardizing many browser parameters: window size (always 1000x1000 initially), User-Agent, fonts, WebGL signatures, and more.

**Cross-site tracking** - Each website gets a separate "circuit," so sites can't correlate your visits using session data.

## What Tor Browser Does NOT Protect Against

This is equally important to understand:

**Your behavior** - If you log into a personal account, you've identified yourself regardless of Tor.

**Malicious exit nodes** - Traffic between the exit node and the destination is unencrypted unless you use HTTPS. Always verify the HTTPS padlock.

**Malware** - Tor Browser doesn't protect against malware on your system. If your machine is compromised, anonymity is lost.

**JavaScript exploits (at Standard level)** - JavaScript can potentially be used to exploit browser vulnerabilities and reveal your real IP.

**Timing attacks by global adversaries** - An attacker controlling a significant portion of the network can potentially deanonymize users through traffic correlation.

## Practical Usage Tips

```bash
# Check your Tor circuit for a specific site
# Click the Lock icon in the address bar to see the circuit path

# To get a new identity (new circuit and clear session data)
# Click the broom icon (New Identity) in the toolbar

# Verify you're using Tor
# Visit https://check.torproject.org
```

### File Downloads and Tor

Opening files downloaded through Tor Browser in external applications can bypass Tor and reveal your IP. Tor Browser warns you about this for some file types. When possible, view documents within the browser or disconnect from the internet before opening them.

### Torrenting Over Tor

Do not torrent over Tor. Torrent clients often bypass SOCKS proxy settings, revealing your real IP. Torrenting also slows down the network for everyone else.

## Running Tor as a Relay or Bridge

If you want to contribute to the Tor network without running a full browser, you can run a relay:

```bash
# Install Tor daemon
sudo apt install tor

# Edit the torrc configuration
sudo nano /etc/tor/torrc

# Add these lines to run a relay
ORPort 9001
Nickname MyTorRelay
ContactInfo your@email.com
RelayBandwidthRate 100 KB   # Limit bandwidth
RelayBandwidthBurst 200 KB

# Restart Tor
sudo systemctl restart tor
sudo systemctl status tor
```

Running a non-exit relay is generally safe and contributes to the network's capacity and resilience.

## Keeping Tor Browser Updated

Security updates are critical for a privacy tool. The browser launcher handles updates automatically, but you can trigger a manual check:

```bash
# If installed via torbrowser-launcher
torbrowser-launcher

# If installed via Flatpak
flatpak update com.github.micahflee.torbrowser-launcher
```

Tor Browser will also notify you of available updates within the browser interface. Never run an outdated version for extended periods.

## Troubleshooting Common Issues

**Tor fails to connect** - Check if your ISP is blocking Tor. Try using bridges. Verify system time is accurate since Tor is sensitive to clock skew.

```bash
# Check system time
timedatectl status

# Synchronize if needed
sudo timedatectl set-ntp true
```

**Slow connections** - Tor is inherently slower than direct connections due to multiple relay hops. Avoid high-bandwidth activities. Using the New Circuit option can sometimes route through faster relays.

**Browser won't start** - Check for conflicting Tor instances.

```bash
# Check if tor is already running
ps aux | grep tor

# Kill any zombie instances
pkill -f tor
```

Tor Browser is a powerful tool for protecting your privacy and circumventing censorship. Used correctly, it significantly reduces your digital footprint. Used carelessly, the false sense of security it provides can be more dangerous than browsing without it. Understanding both its capabilities and its limitations is the foundation of using it effectively.
