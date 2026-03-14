# How to Configure Tor Hidden Services on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ToR, Privacy, Security, Networking

Description: Learn how to configure Tor hidden services on Ubuntu to host websites and services accessible only via .onion addresses with strong anonymity.

---

Tor hidden services (officially called onion services) allow you to host a website or service that is accessible exclusively through the Tor network using a `.onion` address. Unlike a regular web server, the physical location of the server is concealed from visitors, and visitors are anonymous to the server. This is useful for whistleblowing platforms, censorship-resistant publishing, secure communication channels, and privacy-focused services.

## Prerequisites

- Ubuntu 22.04 or newer
- Tor installed (see our relay setup guide if you need to install it)
- A local service to expose (e.g., Nginx, SSH, a web app)
- Root or sudo access

## Installing Tor

If Tor is not already installed, add the official Tor repository:

```bash
# Add Tor Project signing key
wget -qO- https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc \
  | gpg --dearmor \
  | sudo tee /usr/share/keyrings/tor-archive-keyring.gpg > /dev/null

# Add repository
echo "deb [signed-by=/usr/share/keyrings/tor-archive-keyring.gpg] \
  https://deb.torproject.org/torproject.org $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/tor.list

sudo apt update
sudo apt install -y tor deb.torproject.org-keyring
```

## Setting Up a Local Web Server

The hidden service will proxy traffic from the Tor network to a local service. Set up a simple Nginx server:

```bash
# Install Nginx
sudo apt install -y nginx

# Create a simple test page
sudo tee /var/www/html/index.html > /dev/null <<'EOF'
<!DOCTYPE html>
<html>
<head><title>Onion Service</title></head>
<body>
  <h1>Welcome to My Onion Service</h1>
  <p>You are accessing this site through the Tor network.</p>
</body>
</html>
EOF

# Ensure Nginx is running on localhost only
# Edit /etc/nginx/sites-available/default to listen on 127.0.0.1
sudo sed -i 's/listen 80 default_server;/listen 127.0.0.1:80 default_server;/' /etc/nginx/sites-available/default
sudo sed -i 's/listen \[::\]:80 default_server;//' /etc/nginx/sites-available/default

# Restart Nginx
sudo systemctl restart nginx

# Verify it's only listening locally
ss -tlnp | grep :80
```

## Configuring the Hidden Service

Edit the Tor configuration file to define the hidden service:

```bash
sudo nano /etc/tor/torrc
```

Add the following block:

```text
# Hidden Service configuration
# HiddenServiceDir is where Tor stores the service keys and hostname
HiddenServiceDir /var/lib/tor/hidden_service/

# Map the onion port to the local service
# Format: HiddenServicePort <onion_port> <local_address>:<local_port>
HiddenServicePort 80 127.0.0.1:80

# Optional: also expose SSH
# HiddenServicePort 22 127.0.0.1:22
```

Restart Tor to generate the service keys and hostname:

```bash
sudo systemctl restart tor

# Wait a moment for Tor to generate the keys, then read your .onion address
sudo cat /var/lib/tor/hidden_service/hostname
# Output: somethingXXXXXXXXXXXXXXXX.onion
```

The `.onion` address is derived from the hidden service's public key. Keep the private key in `/var/lib/tor/hidden_service/` backed up and secure.

## Using Version 3 Onion Services

Tor now defaults to version 3 onion services, which have longer addresses (56 characters) and stronger cryptography than the older v2 format. Verify your configuration:

```bash
# Check which version is in use
sudo ls /var/lib/tor/hidden_service/
# v3 services have: hostname, hs_ed25519_public_key, hs_ed25519_secret_key

# The hostname file contains your .onion address
sudo cat /var/lib/tor/hidden_service/hostname
```

## Multiple Hidden Services

You can run multiple onion services from a single Tor instance, each with a different address:

```bash
# Add to torrc
HiddenServiceDir /var/lib/tor/hidden_ssh/
HiddenServicePort 22 127.0.0.1:22

HiddenServiceDir /var/lib/tor/hidden_webapp/
HiddenServicePort 80 127.0.0.1:8080
HiddenServicePort 443 127.0.0.1:8443
```

```bash
# Restart Tor and retrieve each address
sudo systemctl restart tor
sudo cat /var/lib/tor/hidden_ssh/hostname
sudo cat /var/lib/tor/hidden_webapp/hostname
```

## Securing the Hidden Service

Preventing accidental exposure of the real server IP is critical.

### Bind Local Services to Localhost Only

Make sure all locally proxied services refuse connections from outside:

```bash
# Check that no services are listening on public interfaces unnecessarily
ss -tlnp | grep -v 127.0.0.1 | grep -v "::"

# For Nginx, bind to localhost in the server block:
# listen 127.0.0.1:80;
```

### Restrict Tor to Onion Services Only

If this server should only be accessible via Tor and not the open internet, configure the firewall to block inbound traffic on non-Tor ports:

```bash
# Allow only SSH from specific management IPs, block everything else inbound
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from <MANAGEMENT_IP> to any port 22
sudo ufw enable
```

### Enable Client Authorization (v3 Only)

Client authorization restricts access to your onion service to only users who have a specific key pair:

```bash
# Create the authorized_clients directory
sudo mkdir -p /var/lib/tor/hidden_service/authorized_clients

# Generate a key pair for the client
python3 -c "
import base64, os
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
priv = X25519PrivateKey.generate()
pub = priv.public_key()
priv_bytes = priv.private_bytes_raw()
pub_bytes = pub.public_bytes_raw()
print('Private key (for client):', base64.b32encode(priv_bytes).decode().rstrip('='))
print('Public key (for server):', base64.b32encode(pub_bytes).decode().rstrip('='))
"

# Add the client public key to authorized_clients
# Format: descriptor:x25519:<BASE32_PUBLIC_KEY>
sudo tee /var/lib/tor/hidden_service/authorized_clients/client1.auth <<'EOF'
descriptor:x25519:<BASE32_PUBLIC_KEY>
EOF

sudo systemctl reload tor
```

## Connecting to Your Hidden Service

Use the Tor Browser to access the service. Enter the `.onion` address directly in the address bar.

For SSH over Tor, configure your SSH client to use the Tor SOCKS proxy:

```bash
# On the client machine, add to ~/.ssh/config
Host *.onion
    ProxyCommand nc -x 127.0.0.1:9050 %h %p

# Connect to the SSH hidden service
ssh user@yourhiddenservice.onion
```

## Monitoring and Logs

```bash
# Watch Tor logs for hidden service activity
sudo tail -f /var/log/tor/log

# Check if the hidden service is functioning
sudo grep -i "hidden\|onion" /var/log/tor/log

# Verify Tor has loaded the hidden service correctly
sudo systemctl status tor
```

## Backing Up the Hidden Service Key

The `.onion` address is derived from the private key. If you lose it, the address is gone permanently.

```bash
# Create a secure backup of the hidden service directory
sudo tar czf hidden_service_backup_$(date +%Y%m%d).tar.gz \
  -C /var/lib/tor hidden_service

# Encrypt the backup before storing it
gpg --symmetric --cipher-algo AES256 hidden_service_backup_$(date +%Y%m%d).tar.gz

# Store the encrypted backup on an offline medium
```

Onion services provide strong anonymity for both operators and visitors, but security depends on keeping the server configuration tight. Always ensure locally exposed services do not leak to the public internet, keep Tor updated, and periodically review the hidden service configuration for changes in best practices.
