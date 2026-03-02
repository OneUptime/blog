# How to Configure journald Remote Logging on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, journald, systemd, Centralized Logging

Description: Set up journald remote logging on Ubuntu to centralize logs from multiple hosts using systemd-journal-remote and systemd-journal-upload, with TLS encryption.

---

Centralizing logs from multiple servers is a core operational practice - it simplifies troubleshooting, enables correlation across systems, and provides a single location for log retention and search. systemd provides `systemd-journal-remote` and `systemd-journal-upload` for this purpose. These tools stream journals over HTTP or HTTPS, preserving the structured binary format so you retain all the structured fields that make journald logs queryable.

## Architecture Overview

The remote logging setup uses two components:
- **`systemd-journal-remote`** - runs on the central log server; receives logs over HTTP/HTTPS
- **`systemd-journal-upload`** - runs on each client; pushes logs to the server

Data flows one-way from clients to the server. The server stores received journals in separate files per source host.

## Setting Up the Log Server

### Install systemd-journal-remote

```bash
# Install on the server
sudo apt update
sudo apt install systemd-journal-remote
```

### Configure the Server

```bash
# Edit the configuration for the remote receiver
sudo nano /lib/systemd/system/systemd-journal-remote.service
```

Or create a drop-in override:

```bash
sudo mkdir -p /etc/systemd/system/systemd-journal-remote.service.d/
sudo tee /etc/systemd/system/systemd-journal-remote.service.d/override.conf << 'EOF'
[Service]
# Listen on all interfaces, port 19532
ExecStart=
ExecStart=/lib/systemd/systemd-journal-remote \
  --listen-http=-3 \
  --output=/var/log/journal/remote
EOF
```

Create the directory for received journals.

```bash
sudo mkdir -p /var/log/journal/remote
sudo chown systemd-journal-remote:systemd-journal-remote /var/log/journal/remote
```

### Start the Server

```bash
sudo systemctl enable systemd-journal-remote.socket
sudo systemctl start systemd-journal-remote.socket
sudo systemctl status systemd-journal-remote.socket

# Open the firewall for the journal remote port
sudo ufw allow 19532/tcp
```

## Setting Up TLS (Recommended for Production)

Plain HTTP is fine on trusted internal networks, but use HTTPS across untrusted networks.

### Generate Certificates

```bash
# On the server: create a self-signed CA and certificates
# Install easy-rsa or use openssl directly

# Create server key and certificate
sudo mkdir -p /etc/systemd/journal-remote-certs

# Generate CA key and certificate
sudo openssl req -x509 -newkey rsa:4096 \
  -keyout /etc/systemd/journal-remote-certs/ca.key \
  -out /etc/systemd/journal-remote-certs/ca.crt \
  -days 3650 -nodes \
  -subj "/CN=JournalCA"

# Generate server key and CSR
sudo openssl req -newkey rsa:4096 \
  -keyout /etc/systemd/journal-remote-certs/server.key \
  -out /etc/systemd/journal-remote-certs/server.csr \
  -nodes \
  -subj "/CN=logserver.example.com"

# Sign the server certificate
sudo openssl x509 -req -days 3650 \
  -in /etc/systemd/journal-remote-certs/server.csr \
  -CA /etc/systemd/journal-remote-certs/ca.crt \
  -CAkey /etc/systemd/journal-remote-certs/ca.key \
  -CAcreateserial \
  -out /etc/systemd/journal-remote-certs/server.crt

# Set permissions
sudo chown -R systemd-journal-remote:systemd-journal-remote \
  /etc/systemd/journal-remote-certs/
sudo chmod 640 /etc/systemd/journal-remote-certs/server.key
```

### Configure the Server for HTTPS

```bash
sudo tee /etc/systemd/system/systemd-journal-remote.service.d/override.conf << 'EOF'
[Service]
ExecStart=
ExecStart=/lib/systemd/systemd-journal-remote \
  --listen-https=-3 \
  --output=/var/log/journal/remote \
  --server-key=/etc/systemd/journal-remote-certs/server.key \
  --server-cert=/etc/systemd/journal-remote-certs/server.crt \
  --trust=/etc/systemd/journal-remote-certs/ca.crt
EOF

sudo systemctl daemon-reload
sudo systemctl restart systemd-journal-remote.socket
```

## Setting Up Clients (journal-upload)

### Install systemd-journal-upload

```bash
# Install on each client machine
sudo apt update
sudo apt install systemd-journal-upload
```

### Configure the Upload Service

```bash
sudo nano /etc/systemd/journal-upload.conf
```

```ini
[Upload]
# Server URL - use http:// for plain HTTP or https:// for TLS
URL=https://logserver.example.com:19532

# For TLS: paths to client certificate files
# ServerKeyFile=/etc/ssl/journal/client.key
# ServerCertificateFile=/etc/ssl/journal/client.crt
# TrustedCertificateFile=/etc/ssl/journal/ca.crt
```

For plain HTTP:

```ini
[Upload]
URL=http://192.168.1.100:19532
```

### Start the Upload Service

```bash
sudo systemctl enable systemd-journal-upload.service
sudo systemctl start systemd-journal-upload.service
sudo systemctl status systemd-journal-upload.service

# Check the logs for connection status
sudo journalctl -u systemd-journal-upload -f
```

## Generating and Distributing Client Certificates (TLS)

For each client that connects with TLS, generate a certificate signed by the same CA.

```bash
# On the log server: generate a certificate for a client
CLIENT_NAME="webserver01"

sudo openssl req -newkey rsa:4096 \
  -keyout /etc/systemd/journal-remote-certs/client-${CLIENT_NAME}.key \
  -out /etc/systemd/journal-remote-certs/client-${CLIENT_NAME}.csr \
  -nodes -subj "/CN=${CLIENT_NAME}"

sudo openssl x509 -req -days 3650 \
  -in /etc/systemd/journal-remote-certs/client-${CLIENT_NAME}.csr \
  -CA /etc/systemd/journal-remote-certs/ca.crt \
  -CAkey /etc/systemd/journal-remote-certs/ca.key \
  -CAcreateserial \
  -out /etc/systemd/journal-remote-certs/client-${CLIENT_NAME}.crt

# Copy the client certificate files to the client machine
scp /etc/systemd/journal-remote-certs/client-${CLIENT_NAME}.key admin@${CLIENT_NAME}:/etc/ssl/journal/
scp /etc/systemd/journal-remote-certs/client-${CLIENT_NAME}.crt admin@${CLIENT_NAME}:/etc/ssl/journal/
scp /etc/systemd/journal-remote-certs/ca.crt admin@${CLIENT_NAME}:/etc/ssl/journal/
```

On the client:

```ini
# /etc/systemd/journal-upload.conf
[Upload]
URL=https://logserver.example.com:19532
ServerKeyFile=/etc/ssl/journal/client-webserver01.key
ServerCertificateFile=/etc/ssl/journal/client-webserver01.crt
TrustedCertificateFile=/etc/ssl/journal/ca.crt
```

## Reading Remote Journals on the Server

Received journals are stored in `/var/log/journal/remote/` as separate files, one per client.

```bash
# List received journal files
ls /var/log/journal/remote/

# Read logs from a specific remote host
sudo journalctl --file=/var/log/journal/remote/remote-webserver01.journal

# Merge and query logs from all remote hosts
sudo journalctl --directory=/var/log/journal/remote/ -n 50

# Filter merged remote logs by service
sudo journalctl --directory=/var/log/journal/remote/ -u nginx.service

# Filter by priority across all remote hosts
sudo journalctl --directory=/var/log/journal/remote/ -p err --since "1 hour ago"

# Show which host each entry came from
sudo journalctl --directory=/var/log/journal/remote/ \
  -o json | python3 -c "
import json, sys
for line in sys.stdin:
    entry = json.loads(line)
    print(entry.get('_HOSTNAME', 'unknown'), entry.get('MESSAGE', ''))
" | head -20
```

## Monitoring the Remote Logging Infrastructure

```bash
# Check upload service status on clients
sudo systemctl status systemd-journal-upload

# Check for upload errors
sudo journalctl -u systemd-journal-upload -p err

# Check server socket status
sudo systemctl status systemd-journal-remote.socket

# Monitor incoming connections
sudo ss -tlnp | grep 19532

# Watch log file sizes on the server
watch -n 30 "ls -lh /var/log/journal/remote/"
```

## Automatic Upload State Recovery

`systemd-journal-upload` maintains a state file that tracks which journal entries have been sent. If the connection drops, it resumes from where it left off.

```bash
# View the upload state file (shows last cursor position)
sudo cat /var/lib/systemd/journal-upload/state

# If the state file is corrupted and you want to restart from the beginning
sudo systemctl stop systemd-journal-upload
sudo rm /var/lib/systemd/journal-upload/state
sudo systemctl start systemd-journal-upload
```

## Configuring Log Retention on the Server

```bash
# Set retention for remote journals in /etc/systemd/journald.conf
sudo nano /etc/systemd/journald.conf
```

```ini
[Journal]
# These settings apply to the system journal; for remote journals
# manage retention manually or with a cron job
SystemMaxUse=50G
SystemKeepFree=10G
SystemMaxFiles=100
```

```bash
# Create a cron job to vacuum remote journals
sudo tee /etc/cron.daily/vacuum-remote-journals << 'EOF'
#!/bin/bash
# Keep last 30 days of remote journal data
journalctl --directory=/var/log/journal/remote/ --vacuum-time=30d
EOF
sudo chmod +x /etc/cron.daily/vacuum-remote-journals
```

The systemd remote logging stack is lightweight, preserves structured fields, and handles reconnection automatically. For large-scale environments, pairing it with a search backend like Elasticsearch (via a log shipper reading from the remote journals) gives you full-text search and dashboard capabilities over all your centralized logs.
