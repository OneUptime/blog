# How to Set Up a Local APT Repository Mirror with apt-mirror on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Network, System Administration

Description: Learn how to create a full local Ubuntu repository mirror using apt-mirror, configure synchronization schedules, and serve packages to your internal network with nginx.

---

Running a full Ubuntu repository mirror on your local network is valuable for organizations that need reliable, fast package installations without depending on internet connectivity. Once set up, all your Ubuntu machines can point to the local mirror, dramatically reducing update times and internet bandwidth usage.

## Requirements

A full Ubuntu mirror for a single release (like 22.04 Jammy) with amd64 architecture takes approximately 200-300 GB of disk space. Plan accordingly. You'll also need:

- A machine with sufficient disk space (500 GB+ recommended for flexibility)
- Good network connectivity to upstream Ubuntu mirrors
- A web server to serve the mirror to clients

## Installing apt-mirror

```bash
# Install apt-mirror
sudo apt install apt-mirror

# The main configuration file
cat /etc/apt/mirror.list
```

## Configuring apt-mirror

Edit `/etc/apt/mirror.list` to specify what to mirror:

```bash
sudo nano /etc/apt/mirror.list
```

```text
# Default mirror configuration
set base_path    /var/spool/apt-mirror

# Where to store packages
set mirror_path  $base_path/mirror

# Where to store temporary files
set spool_path   $base_path/skel

# Log file location
set _tilde 0

# Number of threads for parallel downloading
set nthreads     20

# How many attempts to retry failed downloads
set _retry 3

# Bandwidth limit in kbps (0 = unlimited)
# set limit_rate 100k

# Ubuntu 22.04 Jammy - main components
deb http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-security main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu jammy-backports main restricted universe multiverse

# Source packages (comment out to save significant space)
# deb-src http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
# deb-src http://archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse
# deb-src http://archive.ubuntu.com/ubuntu jammy-security main restricted universe multiverse

# Optional: Ubuntu 20.04 Focal as well
# deb http://archive.ubuntu.com/ubuntu focal main restricted universe multiverse
# deb http://archive.ubuntu.com/ubuntu focal-updates main restricted universe multiverse
# deb http://archive.ubuntu.com/ubuntu focal-security main restricted universe multiverse

clean http://archive.ubuntu.com/ubuntu
```

The `clean` directive tells apt-mirror to remove packages from the mirror that are no longer in the repository (packages removed upstream).

## Running the Initial Mirror Sync

The first sync downloads the entire repository and takes significant time (hours to days depending on your connection):

```bash
# Start the mirror sync (run in a screen or tmux session)
sudo apt-mirror

# Or run in background and log output
sudo apt-mirror 2>&1 | tee /var/log/apt-mirror.log &

# Monitor progress
tail -f /var/log/apt-mirror.log
```

## Checking Sync Progress and Status

```bash
# Check how much has been downloaded
du -sh /var/spool/apt-mirror/mirror/

# List what's being downloaded currently
ls -lt /var/spool/apt-mirror/mirror/archive.ubuntu.com/ubuntu/pool/main/ | head -20

# Check for any failed downloads
grep "Failed\|Error" /var/log/apt-mirror.log
```

## Serving the Mirror with nginx

After the initial sync completes, set up a web server to serve the packages:

```bash
# Install nginx
sudo apt install nginx

# Create the site configuration
sudo tee /etc/nginx/sites-available/ubuntu-mirror << 'EOF'
server {
    listen 80;
    server_name mirror.internal 192.168.1.50;

    root /var/spool/apt-mirror/mirror;

    location / {
        autoindex on;
        autoindex_exact_size off;
        autoindex_localtime on;

        # Set cache headers for package files
        location ~* \.(deb|udeb)$ {
            expires 7d;
            add_header Cache-Control "public";
        }

        # Don't cache index files - they change frequently
        location ~* (Packages|Release|Sources)(\.gz|\.bz2|\.xz)?$ {
            expires -1;
            add_header Cache-Control "no-cache";
        }
    }

    # Enable gzip for text files
    gzip on;
    gzip_types text/plain application/x-gzip;

    access_log /var/log/nginx/ubuntu-mirror-access.log;
    error_log /var/log/nginx/ubuntu-mirror-error.log;
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/ubuntu-mirror /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Automating Sync with Cron

Set up automatic synchronization to keep the mirror current:

```bash
# Add a cron job for regular syncing (runs daily at 2 AM)
sudo crontab -e
```

Add:
```text
# Sync Ubuntu mirror daily at 2 AM
0 2 * * * /usr/bin/apt-mirror >> /var/log/apt-mirror.log 2>&1
```

Or create a proper script for more control:

```bash
sudo tee /usr/local/bin/sync-ubuntu-mirror.sh << 'SCRIPT'
#!/bin/bash

LOG="/var/log/apt-mirror-sync.log"
LOCK="/var/run/apt-mirror.lock"

# Prevent concurrent runs
if [ -f "$LOCK" ]; then
    echo "$(date): Another sync is running, exiting" >> "$LOG"
    exit 1
fi

touch "$LOCK"
trap "rm -f $LOCK" EXIT

echo "$(date): Starting mirror sync" >> "$LOG"
/usr/bin/apt-mirror >> "$LOG" 2>&1

if [ $? -eq 0 ]; then
    echo "$(date): Mirror sync completed successfully" >> "$LOG"
else
    echo "$(date): Mirror sync failed with errors" >> "$LOG"
fi
SCRIPT

sudo chmod +x /usr/local/bin/sync-ubuntu-mirror.sh

# Schedule via cron
echo "0 2 * * * root /usr/local/bin/sync-ubuntu-mirror.sh" | sudo tee /etc/cron.d/apt-mirror
```

## Configuring Clients to Use the Mirror

On each client machine, update the sources.list or sources file:

```bash
# On client machines - replace the Ubuntu mirror URL
sudo tee /etc/apt/sources.list.d/local-mirror.list << 'EOF'
deb http://192.168.1.50/archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
deb http://192.168.1.50/archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse
deb http://192.168.1.50/archive.ubuntu.com/ubuntu jammy-security main restricted universe multiverse
EOF

# Disable or rename the default sources.list to avoid pulling from internet
sudo mv /etc/apt/sources.list /etc/apt/sources.list.internet-backup

# Test the connection to your mirror
sudo apt update
```

Note the path structure: `apt-mirror` mirrors the directory structure of the upstream server, so the path becomes `192.168.1.50/archive.ubuntu.com/ubuntu`.

## Handling GPG Verification

The mirror serves the same GPG-signed Release files as the official Ubuntu servers. Clients use the Ubuntu archive signing key that's pre-installed on all Ubuntu systems, so GPG verification should work without any additional configuration.

If you see GPG errors on clients:

```bash
# Check that the Ubuntu signing key is installed on the client
apt-key list | grep -A 2 Ubuntu

# If needed, import the Ubuntu signing key
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 3B4FE6ACC0B21F32
```

## Monitoring Mirror Health

```bash
# Check mirror disk usage
df -h /var/spool/apt-mirror/

# Verify the mirror directory structure is complete
ls /var/spool/apt-mirror/mirror/archive.ubuntu.com/ubuntu/dists/

# Check that recent sync updated the Release files
ls -la /var/spool/apt-mirror/mirror/archive.ubuntu.com/ubuntu/dists/jammy/Release

# Verify a package is accessible via HTTP
curl -I http://localhost/archive.ubuntu.com/ubuntu/dists/jammy/Release
```

## Partial Mirror for Bandwidth Savings

If a full mirror is too large, mirror only the components you need:

```bash
# In /etc/apt/mirror.list, be selective:

# Only security updates (much smaller)
deb http://security.ubuntu.com/ubuntu jammy-security main restricted

# Only the packages your organization uses
# Use a filter if apt-mirror supports it (it doesn't natively)
# Consider using debmirror for more granular control
```

For partial mirrors, `debmirror` offers more flexibility with package filtering, though it's more complex to configure.

## Summary

Setting up an `apt-mirror` repository involves:

1. Installing `apt-mirror` and configuring `/etc/apt/mirror.list`
2. Running the initial sync (takes time - plan around your bandwidth)
3. Serving the mirror directory with nginx
4. Automating sync with a cron job
5. Configuring clients to use `http://your-mirror/archive.ubuntu.com/ubuntu`

The initial investment in setup and disk space pays off quickly in faster package installations and reduced internet bandwidth costs across your entire fleet.
