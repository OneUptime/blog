# How to Run Restic Backup Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, restic, backup, rest-server, self-hosted, deduplication

Description: Deploy the Restic REST server in Docker to host a centralized backup repository for multiple machines using Restic.

---

Restic is a fast, secure backup program that supports encrypted, deduplicated backups to various storage backends. The Restic REST server provides an HTTP-based backend that multiple machines can back up to over the network. Running the REST server in Docker gives you a centralized backup target that is easy to deploy and manage. This guide covers server setup, client configuration, and operational best practices.

## Why Restic?

Restic stands out from other backup tools for several reasons. It is fast because it processes data in parallel. It is efficient because block-level deduplication means identical data is stored only once, even across different backup sources. Encryption is mandatory, not optional, so every backup is protected with AES-256. The REST server adds network accessibility, letting any machine with the Restic client send backups to your central server.

## Architecture

```mermaid
graph TD
    A[Web Server] -->|HTTPS| D[Restic REST Server / Docker]
    B[Database Server] -->|HTTPS| D
    C[Workstation] -->|HTTPS| D
    D --> E[Backup Storage]
```

Multiple machines run the Restic client and send encrypted backup data to the REST server. The server stores repository data on its local storage or a mounted drive.

## Prerequisites

- A Linux server with Docker and Docker Compose installed
- At least 1 GB of RAM
- Sufficient storage for your backup repositories
- Restic client installed on machines you want to back up
- Optional: a domain name and TLS certificates for encrypted connections

## Project Setup

```bash
# Create the Restic server project directory
mkdir -p ~/restic-server/{data,htpasswd}
cd ~/restic-server
```

## Creating Authentication Credentials

The REST server uses HTTP basic authentication. Create a password file with htpasswd:

```bash
# Install htpasswd utility if not already present
sudo apt install apache2-utils

# Create the password file with the first user
htpasswd -Bc ~/restic-server/htpasswd/credentials webserver

# Add additional users
htpasswd -B ~/restic-server/htpasswd/credentials dbserver
htpasswd -B ~/restic-server/htpasswd/credentials workstation
```

Each backup client gets its own username and password. The `-B` flag uses bcrypt hashing.

## Docker Compose Configuration

```yaml
# docker-compose.yml - Restic REST Server
version: "3.8"

services:
  restic-server:
    image: restic/rest-server:latest
    container_name: restic-server
    restart: unless-stopped
    ports:
      # REST API port
      - "8000:8000"
    environment:
      # Enable authentication
      - OPTIONS=--htpasswd-file /htpasswd/credentials --append-only
    volumes:
      # Backup data storage
      - ./data:/data
      # Authentication file
      - ./htpasswd:/htpasswd:ro
```

The `--append-only` flag is important for security. It prevents clients from deleting or modifying existing backup data. Even if a client machine is compromised, the attacker cannot destroy your backups.

## Starting the Server

```bash
# Start the Restic REST server
docker compose up -d
```

Verify it is running:

```bash
# Check the server logs
docker compose logs -f restic-server
```

Test the connection:

```bash
# Verify the server responds to HTTP requests
curl -u webserver:your_password http://localhost:8000
```

## Client Setup

Install the Restic client on each machine you want to back up:

```bash
# Install Restic on Ubuntu/Debian
sudo apt install restic

# Or download the latest binary directly
wget https://github.com/restic/restic/releases/latest/download/restic_linux_amd64.bz2
bunzip2 restic_linux_amd64.bz2
chmod +x restic_linux_amd64
sudo mv restic_linux_amd64 /usr/local/bin/restic
```

## Initializing a Repository

Each client needs to initialize its repository on the server before the first backup:

```bash
# Set the repository URL and password as environment variables
export RESTIC_REPOSITORY="rest:http://webserver:your_password@your-server:8000/webserver"
export RESTIC_PASSWORD="a_strong_repository_encryption_password"

# Initialize the repository
restic init
```

The repository password encrypts your backup data. It is separate from the HTTP authentication password. Store it safely because without it, your backups cannot be decrypted.

## Running Backups

Back up directories by specifying them as arguments:

```bash
# Back up the web application and configuration
export RESTIC_REPOSITORY="rest:http://webserver:your_password@your-server:8000/webserver"
export RESTIC_PASSWORD="your_repository_password"

restic backup /var/www /etc/nginx /etc/letsencrypt \
  --exclude="*.log" \
  --exclude="*.tmp" \
  --exclude="node_modules" \
  --tag="daily"
```

The first backup transfers all data. Subsequent backups only transfer changed blocks, making them much faster.

## Backup Scheduling

Create a backup script and schedule it with cron:

```bash
#!/bin/bash
# /usr/local/bin/backup.sh - Automated Restic backup script

export RESTIC_REPOSITORY="rest:http://webserver:your_password@your-server:8000/webserver"
export RESTIC_PASSWORD="your_repository_password"

# Run the backup
restic backup /var/www /etc/nginx /etc/letsencrypt \
  --exclude="*.log" \
  --exclude="node_modules" \
  --tag="automated" \
  --quiet

# Check backup integrity (runs on 5% of data each time)
restic check --read-data-subset=5%

# Output status for logging
echo "Backup completed at $(date)"
```

Make the script executable and add it to cron:

```bash
# Make the script executable
chmod +x /usr/local/bin/backup.sh

# Run backups every night at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/restic-backup.log 2>&1") | crontab -
```

## Snapshot Management

List available snapshots:

```bash
# List all snapshots in the repository
restic snapshots
```

Output shows each snapshot with its ID, timestamp, hostname, paths, and tags:

```
ID        Time                 Host        Tags        Paths
----------------------------------------------------------------------
a1b2c3d4  2026-02-01 02:00:05  webserver   automated   /var/www, /etc/nginx
e5f6g7h8  2026-02-02 02:00:03  webserver   automated   /var/www, /etc/nginx
```

## Restoring Files

Restore an entire snapshot or specific files:

```bash
# Restore the latest snapshot to a target directory
restic restore latest --target /tmp/restore

# Restore a specific snapshot by ID
restic restore a1b2c3d4 --target /tmp/restore

# Restore a specific file or directory
restic restore latest --target /tmp/restore --include "/var/www/app"
```

You can also mount a snapshot as a filesystem for browsing:

```bash
# Mount snapshots as a FUSE filesystem (requires fuse)
mkdir /tmp/restic-mount
restic mount /tmp/restic-mount

# Browse the snapshots at /tmp/restic-mount/snapshots/
ls /tmp/restic-mount/snapshots/latest/
```

## Retention Policies

Since the server runs in append-only mode, clients cannot delete old snapshots directly. Run the `forget` and `prune` commands on the server itself:

```bash
# On the server, run retention policy for a user's repository
docker exec restic-server restic \
  -r /data/webserver \
  forget \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 12 \
  --keep-yearly 3 \
  --prune
```

This keeps 7 daily, 4 weekly, 12 monthly, and 3 yearly snapshots. The `--prune` flag actually removes unreferenced data to free storage.

Create a server-side script for regular cleanup:

```bash
#!/bin/bash
# /usr/local/bin/restic-prune.sh - Server-side retention policy

# Apply retention to each user's repository
for repo in /path/to/restic-server/data/*/; do
    username=$(basename "$repo")
    echo "Pruning repository: $username"
    docker exec restic-server restic \
      -r "/data/$username" \
      forget \
      --keep-daily 7 \
      --keep-weekly 4 \
      --keep-monthly 12 \
      --prune
done
```

## Adding TLS Encryption

For backing up over the internet, wrap the REST server with TLS. Use an Nginx reverse proxy:

```nginx
# /etc/nginx/sites-available/restic
server {
    listen 443 ssl http2;
    server_name backup.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/backup.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backup.your-domain.com/privkey.pem;

    # Allow large backup uploads
    client_max_body_size 0;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Update client repository URLs to use HTTPS:

```bash
export RESTIC_REPOSITORY="rest:https://webserver:your_password@backup.your-domain.com/webserver"
```

## Monitoring with OneUptime

Monitor the REST server with OneUptime using an HTTP monitor on port 8000. Backup infrastructure is invisible until something goes wrong, and by then it is too late. Proactive monitoring ensures your backup target is always available when clients need to send data.

## Wrapping Up

The Restic REST server in Docker provides a centralized, secure backup target for all your machines. Append-only mode protects against ransomware and accidental deletion, while Restic's encryption and deduplication keep your data safe and storage efficient. With scheduled backups on clients and server-side retention policies, you get a complete backup infrastructure that runs unattended.
