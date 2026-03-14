# How to Set Up OnionShare on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ToR, Privacy, OnionShare, Security

Description: Learn how to install and use OnionShare on Ubuntu to securely share files, host websites, and communicate anonymously over the Tor network.

---

OnionShare is an open-source tool that uses the Tor network to share files, receive files, host a simple website, or create a private chat room - all without requiring a central server. When you use OnionShare, it runs a local web server on your machine and exposes it as an onion service, generating a `.onion` address that others can use to access it through Tor Browser. Your IP address is never exposed to the recipient, and the recipient's IP is never exposed to you.

## Prerequisites

- Ubuntu 22.04 or newer
- Internet connection
- Root or sudo access

OnionShare handles Tor internally - you do not need to install or configure Tor separately.

## Installation

### Method 1: Snap Package (Easiest)

```bash
# Install OnionShare via Snap
sudo snap install onionshare

# Verify installation
onionshare --version
```

### Method 2: Flatpak

```bash
# Install Flatpak if not already installed
sudo apt install -y flatpak
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install OnionShare from Flathub
flatpak install flathub org.onionshare.OnionShare

# Run OnionShare
flatpak run org.onionshare.OnionShare
```

### Method 3: From the Official PPA

```bash
# Add the OnionShare PPA
sudo add-apt-repository ppa:micahflee/ppa
sudo apt update

# Install OnionShare
sudo apt install -y onionshare

# Verify
onionshare --version
```

## Using the Graphical Interface

OnionShare has both a GUI and a command-line interface. Launch the GUI:

```bash
onionshare
```

When it opens, you will see tabs for different modes: Share Files, Receive Files, Host a Website, and Chat.

### Sharing Files

1. Click "Share Files" in the OnionShare window
2. Drag and drop files or click "Add Files" to choose what to share
3. Optionally check "Stop sharing after files have been sent" for one-time sharing
4. Click "Start sharing"
5. OnionShare generates a `.onion` address like `http://abc123def456.onion/password`
6. Send this address (over Signal, PGP email, etc.) to the recipient
7. The recipient opens it in Tor Browser to download the files

### Receiving Files

In receive mode, OnionShare creates an upload endpoint:

1. Click "Receive Files"
2. Optionally set a password
3. Click "Start Receive Mode"
4. Share the generated `.onion` address with whoever needs to send you files
5. Files appear in your configured receive folder (default: `~/OnionShare`)

## Using the Command-Line Interface

OnionShare's CLI is powerful for scripted and headless use:

```bash
# Share a single file
onionshare-cli /path/to/document.pdf

# Share multiple files
onionshare-cli file1.txt file2.pdf directory/

# Share files and automatically stop after one download
onionshare-cli --stop-after-first-download /path/to/file.zip

# Receive files (upload mode)
onionshare-cli --receive

# Specify a custom receive directory
onionshare-cli --receive --data-dir /tmp/received_files/

# Host a website from a directory
onionshare-cli --website /path/to/website_directory/

# Start a private chat room
onionshare-cli --chat

# Run in persistent mode (keeps the same .onion address across restarts)
onionshare-cli --persistent /path/to/persistent.json /path/to/file.zip
```

## Persistent Onion Addresses

By default, each OnionShare session generates a new `.onion` address. For use cases where the address needs to stay the same across sessions (e.g., a permanent file drop box), use persistent mode:

```bash
# Create a persistent session - saves the private key to a JSON file
onionshare-cli --persistent ~/myservice.json --receive

# The next time you run it with the same JSON file, the .onion address is the same
onionshare-cli --persistent ~/myservice.json --receive
```

The JSON file contains the onion service private key. Guard it accordingly - anyone who has it can impersonate your onion address.

## Hosting a Website with OnionShare

OnionShare can serve a static website from a local directory:

```bash
# Create a simple website
mkdir -p ~/my-onion-site
cat > ~/my-onion-site/index.html <<'EOF'
<!DOCTYPE html>
<html>
<head><title>My Onion Site</title></head>
<body>
<h1>Welcome</h1>
<p>Accessible only via Tor.</p>
</body>
</html>
EOF

# Start serving the website
onionshare-cli --website ~/my-onion-site/

# Output includes the .onion address to share
```

## Setting Up a Private Chat Room

OnionShare's chat mode creates a private, ephemeral, end-to-end encrypted chat room:

```bash
# Start a chat room
onionshare-cli --chat

# OnionShare prints the .onion chat URL
# Share it with participants - they open it in Tor Browser
```

Messages are relayed through your machine rather than a central server. No message history is stored.

## Automating OnionShare with a Systemd Service

For a persistent file drop box that starts at boot:

```bash
# Create a systemd service file
sudo tee /etc/systemd/system/onionshare-receive.service > /dev/null <<'EOF'
[Unit]
Description=OnionShare Receive Mode
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/bin/onionshare-cli \
  --receive \
  --persistent /home/ubuntu/onionshare_persistent.json \
  --data-dir /home/ubuntu/received_files/
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable onionshare-receive
sudo systemctl start onionshare-receive

# Check its status
sudo systemctl status onionshare-receive

# See the .onion address from logs
sudo journalctl -u onionshare-receive | grep "onion"
```

## Security Considerations

OnionShare is designed to be secure, but there are a few practices to keep in mind:

- The `.onion` address and password together constitute the secret. Transmit them over an already-secure channel (Signal, PGP-encrypted email, etc.)
- Use "stop after first download" for one-time sensitive file shares
- For recurring use, persistent addresses need their private keys protected like any other credential
- OnionShare websites support JavaScript - if you need to serve content to users who have JavaScript disabled in Tor Browser's safest mode, keep that in mind when building pages
- If sharing sensitive files, verify checksums after transfer

```bash
# Generate a checksum before sharing
sha256sum sensitive_file.pdf

# Recipient verifies after downloading
sha256sum downloaded_file.pdf
# Both checksums should match
```

OnionShare is one of the most accessible tools for privacy-preserving file sharing and communication. It requires no server setup beyond your own machine and no accounts, and all traffic is routed through Tor automatically.
