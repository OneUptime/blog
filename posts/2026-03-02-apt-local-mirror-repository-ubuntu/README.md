# How to Use APT with a Local Mirror Repository on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Network, System Administration

Description: Learn how to configure Ubuntu's APT to use a local mirror repository for faster package installations, reduced bandwidth usage, and offline package management in network-restricted environments.

---

Running a local APT mirror makes sense in several scenarios: you have dozens of Ubuntu servers that all pull the same packages, you're in an environment with restricted or metered internet access, or you need to guarantee that all machines in a cluster install identical package versions. A local mirror serves packages from your internal network, making updates faster and reducing external bandwidth consumption.

## Understanding APT Mirror Types

There are a few ways to provide packages locally:

1. **Full mirror** - A complete copy of an Ubuntu repository, synchronized with `apt-mirror` or `debmirror`
2. **Proxy cache** - A caching proxy like `apt-cacher-ng` that downloads packages on demand and caches them
3. **Local repository** - A custom repo containing specific packages you've built or collected
4. **Snapshot** - A point-in-time copy of a repository for reproducibility

This post covers configuring APT clients to use these mirrors, with focus on the proxy cache approach (most practical for most setups) and full mirrors.

## Option 1: Using apt-cacher-ng as a Caching Proxy

`apt-cacher-ng` is the simplest approach for most environments. It acts as a transparent proxy - the first client that requests a package downloads it from the internet, and subsequent requests are served from the cache.

### On the Cache Server

```bash
# Install apt-cacher-ng on your designated cache server
sudo apt install apt-cacher-ng

# Start and enable the service
sudo systemctl enable --now apt-cacher-ng

# The service listens on port 3142 by default
# Verify it's running
systemctl status apt-cacher-ng
```

The default configuration works for most setups. The cache is stored at `/var/cache/apt-cacher-ng/`.

### On Client Machines

Create a proxy configuration file:

```bash
# On each client machine, create an APT proxy config
sudo tee /etc/apt/apt.conf.d/01proxy << 'EOF'
Acquire::HTTP::Proxy "http://your-cache-server:3142";
Acquire::HTTPS::Proxy "DIRECT";
EOF
```

Alternatively, use the apt-cacher-ng protocol that handles HTTPS repositories:

```bash
sudo tee /etc/apt/apt.conf.d/01proxy << 'EOF'
Acquire::HTTP::Proxy "http://your-cache-server:3142";
Acquire::HTTPS::Proxy "http://your-cache-server:3142";
EOF
```

Test the proxy is working:

```bash
# Update should now route through the proxy
sudo apt update

# Check the proxy server's log to verify
# On the cache server:
sudo tail -f /var/log/apt-cacher-ng/apt-cacher-ng.log
```

## Option 2: Pointing APT at a Full Local Mirror

If you've set up a full mirror (with `apt-mirror` or similar), configure clients to use it directly:

### Editing sources.list

```bash
# Back up the original sources.list
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak

# Edit to point to your mirror
sudo nano /etc/apt/sources.list
```

Replace the Ubuntu mirror URL with your local server:

```text
# Original (pointing to Ubuntu's servers):
deb http://archive.ubuntu.com/ubuntu jammy main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu jammy-security main restricted universe multiverse

# Replaced with your local mirror:
deb http://192.168.1.50/ubuntu jammy main restricted universe multiverse
deb http://192.168.1.50/ubuntu jammy-updates main restricted universe multiverse
deb http://192.168.1.50/ubuntu jammy-security main restricted universe multiverse
```

### Using the deb822 Format (Ubuntu 22.04+)

On newer Ubuntu systems, the preferred format is:

```bash
sudo nano /etc/apt/sources.list.d/ubuntu.sources
```

```yaml
Types: deb
URIs: http://192.168.1.50/ubuntu
Suites: jammy jammy-updates jammy-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
```

### Testing the Configuration

```bash
# Test that packages are reachable from the mirror
sudo apt update

# Check where a specific package is coming from
sudo apt-get install -o APT::Get::Simulate=true curl 2>&1 | head -5

# Force download from the mirror and verify
sudo apt-get -d install curl --reinstall
```

## Option 3: Automating Mirror Selection

Ubuntu's `netselect-apt` can automatically pick the fastest mirror for your location:

```bash
# Install netselect-apt
sudo apt install netselect-apt

# Generate a sources.list with the fastest mirror
sudo netselect-apt jammy -o /tmp/sources.list.test

# Review and move it into place if it looks good
cat /tmp/sources.list.test
```

For local mirrors, you don't need this - you already know your server's address.

## Setting Up APT Mirror Selection with Multiple Fallbacks

You can list multiple mirror URLs and APT will try them in order:

```bash
sudo tee /etc/apt/sources.list.d/ubuntu.sources << 'EOF'
Types: deb
URIs: http://192.168.1.50/ubuntu http://archive.ubuntu.com/ubuntu
Suites: jammy jammy-updates
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF
```

With multiple URIs, APT tries the first, then falls back to the next if it's unreachable.

## Configuring the Mirror Server

If you're hosting the mirror with Apache or nginx:

```bash
# Using nginx as the mirror web server
sudo apt install nginx

# Create a site configuration
sudo tee /etc/nginx/sites-available/ubuntu-mirror << 'EOF'
server {
    listen 80;
    server_name mirror.local 192.168.1.50;

    root /var/mirrors/ubuntu;

    location / {
        autoindex on;
        autoindex_exact_size off;
        autoindex_localtime on;
    }

    # Set appropriate cache headers
    location ~* \.(deb|gz|bz2|xz|lzma)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/ubuntu-mirror /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Deploying Mirror Config at Scale with Ansible

When you have many servers to configure:

```yaml
# ansible/roles/apt-mirror/tasks/main.yml
---
- name: Configure APT to use local mirror
  copy:
    content: |
      Acquire::HTTP::Proxy "http://{{ apt_mirror_host }}:3142";
    dest: /etc/apt/apt.conf.d/01proxy
    owner: root
    group: root
    mode: '0644'

- name: Update package cache via mirror
  apt:
    update_cache: yes
    cache_valid_time: 3600
```

## Verifying Downloads Come from Your Mirror

```bash
# Add verbose output temporarily to verify the source
sudo apt-get -o Debug::Acquire::http=true update 2>&1 | grep "Connecting to"

# Or check the APT log after an update
sudo grep "http" /var/log/apt/history.log | tail -20
```

## Handling HTTPS Repositories Through the Mirror

Some repositories use HTTPS. Configure apt-cacher-ng to handle them:

```bash
# On the apt-cacher-ng server, edit the config
sudo nano /etc/apt-cacher-ng/acng.conf

# Add or uncomment:
PassThroughPattern: .*

# Or allow specific HTTPS domains:
# PassThroughPattern: download.docker.com

sudo systemctl restart apt-cacher-ng
```

## Summary

For most environments, `apt-cacher-ng` on a single machine with proxy configuration on all clients is the lowest-effort solution. It requires no repository mirroring setup - just install the daemon on one server and point clients at it. Full mirrors are appropriate when you need true offline operation or want complete control over which package versions are available. Either way, a few minutes of configuration saves significant bandwidth and improves update speeds across your infrastructure.
