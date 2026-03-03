# How to Set Up stunnel for TLS Wrapping on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TLS, Security, Networking, stunnel

Description: Learn how to install and configure stunnel on Ubuntu to add TLS encryption to protocols that don't natively support it, including Redis, SMTP, and custom TCP services.

---

stunnel is a tool that wraps plain TCP connections in TLS. It sits between a client and server, handling the TLS handshake and certificate verification, while passing the decrypted traffic to the actual service. This lets you add encryption to protocols that were never designed to support it, or to older software that you can't easily modify.

Common use cases include: encrypting Redis connections between servers, wrapping an internal SMTP relay, adding TLS to a legacy application that only supports plain TCP, or creating an encrypted tunnel for any TCP-based protocol.

## How stunnel Works

stunnel operates in two modes:

- **Server mode** - listens on a TLS port and forwards decrypted traffic to a plain TCP service (backend)
- **Client mode** - accepts plain TCP connections locally and forwards them to a remote TLS endpoint

You can run it in both modes simultaneously on the same machine. For a typical deployment protecting an internal service, you'd run stunnel in server mode on the server side, and optionally in client mode on each client machine so applications don't need to handle TLS themselves.

## Installing stunnel

```bash
# Install from Ubuntu repositories
sudo apt update
sudo apt install stunnel4

# Verify the installation
stunnel -version

# The package creates:
# /etc/stunnel/ - configuration directory
# /etc/default/stunnel4 - startup configuration
# /lib/systemd/system/stunnel4.service - systemd unit
```

Enable the service at startup:

```bash
# By default, stunnel4 won't start because ENABLED=0 in /etc/default/stunnel4
sudo nano /etc/default/stunnel4
```

Change `ENABLED=0` to `ENABLED=1`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable stunnel4
```

## Generating Certificates

stunnel needs TLS certificates. For production, use Let's Encrypt or your PKI. For internal services, a self-signed certificate works:

```bash
# Create a directory for stunnel certificates
sudo mkdir -p /etc/stunnel/certs

# Generate a private key and self-signed certificate
# The combined PEM file (key + cert) is what stunnel server mode uses
sudo openssl req -newkey rsa:2048 -nodes \
    -keyout /etc/stunnel/certs/stunnel.key \
    -x509 -days 3650 \
    -out /etc/stunnel/certs/stunnel.crt \
    -subj "/CN=stunnel-server"

# Create the combined PEM file that stunnel needs
sudo cat /etc/stunnel/certs/stunnel.crt /etc/stunnel/certs/stunnel.key | \
    sudo tee /etc/stunnel/certs/stunnel.pem > /dev/null

# Set proper permissions
sudo chmod 600 /etc/stunnel/certs/stunnel.pem
sudo chmod 644 /etc/stunnel/certs/stunnel.crt
```

If using Let's Encrypt certificates:

```bash
# After getting certs with certbot, combine them for stunnel
sudo cat /etc/letsencrypt/live/your-domain.com/fullchain.pem \
         /etc/letsencrypt/live/your-domain.com/privkey.pem | \
    sudo tee /etc/stunnel/certs/stunnel.pem > /dev/null

sudo chmod 600 /etc/stunnel/certs/stunnel.pem
```

## Configuring stunnel in Server Mode

The main configuration file goes in `/etc/stunnel/stunnel.conf`. Let's set up TLS wrapping for Redis as an example:

```bash
sudo tee /etc/stunnel/stunnel.conf << 'EOF'
# Global settings
# Run as a non-privileged user
setuid = stunnel4
setgid = stunnel4

# PID file location
pid = /var/run/stunnel4/stunnel4.pid

# Log level (0=emerg, 1=alert, 2=crit, 3=err, 4=warning, 5=notice, 6=info, 7=debug)
debug = 5
output = /var/log/stunnel4/stunnel4.log

# Disable SSLv2 and SSLv3 - only allow TLS
sslVersion = TLSv1.2

# Cipher preferences (allow modern ciphers only)
ciphers = HIGH:!aNULL:!SSLv2:!DES:!3DES

# ---- Server mode: wrap Redis in TLS ----
[redis-tls]
# Server mode: accept TLS connections, forward as plain TCP
accept = 0.0.0.0:6380
# Connect to local Redis (which only listens on localhost)
connect = 127.0.0.1:6379
# Certificate and key for this service
cert = /etc/stunnel/certs/stunnel.pem
EOF
```

Start stunnel and verify it's listening:

```bash
sudo systemctl start stunnel4
systemctl status stunnel4

# Verify it's listening on port 6380
ss -tlnp | grep 6380

# Test with openssl
openssl s_client -connect localhost:6380 -verify_return_error
```

## Configuring stunnel in Client Mode

On a client machine that needs to connect to the TLS-wrapped Redis, you can either configure the application to handle TLS natively, or run stunnel in client mode to present a plain TCP socket locally:

```bash
# On the CLIENT machine - /etc/stunnel/stunnel.conf
sudo tee /etc/stunnel/stunnel.conf << 'EOF'
setuid = stunnel4
setgid = stunnel4
pid = /var/run/stunnel4/stunnel4.pid
debug = 5
output = /var/log/stunnel4/stunnel4.log

# ---- Client mode: wrap outbound connections in TLS ----
[redis-client]
# Client mode: accept plain TCP locally
client = yes
# Listen on localhost - applications connect here
accept = 127.0.0.1:6379
# Connect to the remote stunnel server using TLS
connect = redis-server.example.com:6380

# If using a self-signed cert on the server, either:
# Option 1: Verify against a specific CA cert
CAfile = /etc/stunnel/certs/server.crt

# Option 2: Disable verification (NOT for production)
# verify = 0
EOF
```

Copy the server's certificate to the client for verification:

```bash
# On the client, get the server's certificate
openssl s_client -connect redis-server.example.com:6380 </dev/null 2>/dev/null | \
    openssl x509 > /etc/stunnel/certs/server.crt
```

Now the Redis client application on this machine connects to `localhost:6379` (plain TCP), and stunnel handles the TLS to the remote server transparently.

## Example: Wrapping SMTP

stunnel is commonly used to add TLS to SMTP relays:

```bash
# Server-side: wrap port 465 (SMTPS) for an internal SMTP service
cat >> /etc/stunnel/stunnel.conf << 'EOF'

[smtps]
accept = 0.0.0.0:465
connect = 127.0.0.1:25
cert = /etc/stunnel/certs/stunnel.pem
EOF

# Allow the new port through the firewall
sudo ufw allow 465/tcp
```

## Example: Multiple Services in One Config

```bash
sudo tee /etc/stunnel/stunnel.conf << 'EOF'
# Global options
setuid = stunnel4
setgid = stunnel4
pid = /var/run/stunnel4/stunnel4.pid
debug = 5
output = /var/log/stunnel4/stunnel4.log
sslVersion = TLSv1.2
ciphers = HIGH:!aNULL:!SSLv2

# TLS-wrapped Redis
[redis-tls]
accept = 0.0.0.0:6380
connect = 127.0.0.1:6379
cert = /etc/stunnel/certs/stunnel.pem

# TLS-wrapped PostgreSQL
[postgres-tls]
accept = 0.0.0.0:5433
connect = 127.0.0.1:5432
cert = /etc/stunnel/certs/stunnel.pem

# TLS-wrapped custom TCP service
[myapp-tls]
accept = 0.0.0.0:9001
connect = 127.0.0.1:9000
cert = /etc/stunnel/certs/stunnel.pem
EOF

sudo systemctl restart stunnel4
```

## Mutual TLS (mTLS) Authentication

For additional security, require clients to present a certificate:

```bash
# Generate a client CA and client certificates
sudo openssl req -newkey rsa:2048 -nodes \
    -keyout /etc/stunnel/certs/client-ca.key \
    -x509 -days 3650 \
    -out /etc/stunnel/certs/client-ca.crt \
    -subj "/CN=Client CA"

# Generate a client certificate signed by the client CA
sudo openssl req -newkey rsa:2048 -nodes \
    -keyout /etc/stunnel/certs/client.key \
    -out /etc/stunnel/certs/client.csr \
    -subj "/CN=trusted-client"

sudo openssl x509 -req -days 365 \
    -in /etc/stunnel/certs/client.csr \
    -CA /etc/stunnel/certs/client-ca.crt \
    -CAkey /etc/stunnel/certs/client-ca.key \
    -CAcreateserial \
    -out /etc/stunnel/certs/client.crt
```

Server config with client certificate verification:

```text
[redis-tls]
accept = 0.0.0.0:6380
connect = 127.0.0.1:6379
cert = /etc/stunnel/certs/stunnel.pem
# Require clients to present a certificate signed by this CA
CAfile = /etc/stunnel/certs/client-ca.crt
# verify = 2 means require a valid client cert
verify = 2
```

Client config with its certificate:

```text
[redis-client]
client = yes
accept = 127.0.0.1:6379
connect = redis-server.example.com:6380
cert = /etc/stunnel/certs/client.crt
key = /etc/stunnel/certs/client.key
CAfile = /etc/stunnel/certs/server.crt
verify = 2
```

## Monitoring and Troubleshooting

```bash
# Check stunnel logs
tail -f /var/log/stunnel4/stunnel4.log

# Test TLS connection
openssl s_client -connect localhost:6380

# Test with cipher details
openssl s_client -connect localhost:6380 -tls1_2 -cipher HIGH

# Check if stunnel is listening on expected ports
ss -tlnp | grep stunnel

# Reload config without restart
sudo systemctl reload stunnel4

# If using client auth, test with certificate
openssl s_client \
    -connect redis-server.example.com:6380 \
    -cert /etc/stunnel/certs/client.crt \
    -key /etc/stunnel/certs/client.key
```

stunnel is mature, reliable, and well-suited for adding encryption to services without modifying them. The configuration is straightforward, and once running it's largely maintenance-free aside from certificate renewals.
