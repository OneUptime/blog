# How to Configure Git HTTP Backend with Nginx on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Git, NGINX, Self-Hosted, Version Control

Description: Configure git-http-backend with Nginx on Ubuntu to serve Git repositories over HTTP and HTTPS with basic authentication, enabling smart HTTP protocol for efficient clone and push operations.

---

Git supports two HTTP modes: "dumb" HTTP (simple file serving) and "smart" HTTP (via git-http-backend). Smart HTTP is what you want - it supports efficient pack negotiation during clone/fetch, and enables push over HTTPS. Combined with Nginx and HTTP basic authentication, you get a simple Git server accessible over standard web ports without needing SSH.

This is lighter than running Gitea or GitLab, and appropriate when you need repository access for a small team without the overhead of a full Git hosting platform.

## How git-http-backend Works

`git-http-backend` is a CGI program included with Git. It implements the Git smart HTTP protocol - handling `info/refs`, `git-upload-pack` (for clone/fetch), and `git-receive-pack` (for push). Nginx runs it as a FastCGI process (via `fcgiwrap`) and handles authentication before passing requests to it.

## Installing Required Packages

```bash
# Install Git, Nginx, and fcgiwrap (CGI-to-FastCGI bridge)
sudo apt update
sudo apt install -y git nginx fcgiwrap apache2-utils

# Enable and start fcgiwrap
sudo systemctl enable --now fcgiwrap

# Check fcgiwrap is running
sudo systemctl status fcgiwrap

# Verify fcgiwrap socket location
ls -la /var/run/fcgiwrap.socket
```

## Setting Up the Repository Directory

```bash
# Create a directory for Git repositories
sudo mkdir -p /srv/git

# Create the git user/group for repository ownership
sudo groupadd git
sudo useradd -r -g git -s /usr/sbin/nologin git

# Set ownership - www-data (Nginx) and git need access
sudo chown -R git:git /srv/git

# Set permissions so fcgiwrap (running as www-data) can read repositories
sudo chmod 755 /srv/git
sudo usermod -aG git www-data
```

### Create Bare Repositories

```bash
# Create repositories that clients can clone from and push to
sudo -u git git init --bare /srv/git/myproject.git
sudo -u git git init --bare /srv/git/website.git

# Enable push support - git-http-backend requires this config setting
cd /srv/git/myproject.git
sudo -u git git config http.receivepack true

cd /srv/git/website.git
sudo -u git git config http.receivepack true

# Verify repository structure
ls -la /srv/git/myproject.git/
```

## Setting Up Basic Authentication

```bash
# Create the password file for HTTP basic authentication
# Add the first user (-c creates the file)
sudo htpasswd -c /etc/nginx/git-htpasswd alice
# Enter and confirm password when prompted

# Add additional users (no -c flag - would overwrite the file)
sudo htpasswd /etc/nginx/git-htpasswd bob
sudo htpasswd /etc/nginx/git-htpasswd carol

# Set appropriate permissions
sudo chmod 640 /etc/nginx/git-htpasswd
sudo chown root:www-data /etc/nginx/git-htpasswd

# View the password file (passwords are hashed, not plaintext)
sudo cat /etc/nginx/git-htpasswd
```

## Configuring Nginx

```bash
sudo nano /etc/nginx/sites-available/git-http
```

```nginx
# Git HTTP backend via Nginx and fcgiwrap
server {
    listen 80;
    server_name git.example.com;

    # Redirect HTTP to HTTPS (enable after SSL setup)
    # return 301 https://$host$request_uri;

    # For initial testing, serve on HTTP first
    # Then switch to HTTPS configuration below

    # Path to Git repositories
    root /srv/git;

    # Git HTTP backend location
    location ~ ^(.*/objects/[0-9a-f]{2}/[0-9a-f]{38})$             { root /srv/git; }
    location ~ ^(.*/objects/pack/pack-[0-9a-f]{40}\.(pack|idx))$    { root /srv/git; }

    location ~ ^(/.*.git/(HEAD|info/refs|objects/info/.*|git-(upload|receive)-pack))$ {
        # Require authentication
        auth_basic "Git Repository Access";
        auth_basic_user_file /etc/nginx/git-htpasswd;

        # Pass to fcgiwrap as FastCGI
        fastcgi_pass unix:/var/run/fcgiwrap.socket;

        # FastCGI parameters
        fastcgi_param SCRIPT_FILENAME     /usr/lib/git-core/git-http-backend;
        fastcgi_param GIT_HTTP_EXPORT_ALL "";  # Allow all repos, not just those with git-daemon-export-ok
        fastcgi_param GIT_PROJECT_ROOT    /srv/git;  # Base directory for repositories
        fastcgi_param PATH_INFO           $uri;
        fastcgi_param REMOTE_USER         $remote_user;  # Pass authenticated username

        fastcgi_param QUERY_STRING        $query_string;
        fastcgi_param REQUEST_METHOD      $request_method;
        fastcgi_param CONTENT_TYPE        $content_type;
        fastcgi_param CONTENT_LENGTH      $content_length;
        fastcgi_param SERVER_NAME         $server_name;
        fastcgi_param SERVER_PORT         $server_port;
        fastcgi_param SERVER_PROTOCOL     $server_protocol;

        include fastcgi_params;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/git-http /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Testing HTTP Access

From a client machine (or the server itself):

```bash
# Test unauthenticated access (should get 401)
curl -I http://git.example.com/myproject.git/info/refs?service=git-upload-pack

# Test authenticated access
curl -u alice:password http://git.example.com/myproject.git/info/refs?service=git-upload-pack

# Clone the repository
git clone http://alice:password@git.example.com/myproject.git

# Or clone and enter password when prompted
git clone http://git.example.com/myproject.git

# Test push (after committing something locally)
git push origin main
```

## Adding HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d git.example.com

# After obtaining the certificate, update the Nginx configuration
```

Updated Nginx configuration with HTTPS:

```bash
sudo nano /etc/nginx/sites-available/git-http
```

```nginx
# Git HTTP backend with HTTPS
server {
    listen 80;
    server_name git.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name git.example.com;

    ssl_certificate     /etc/letsencrypt/live/git.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/git.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Allow large pushes
    client_max_body_size 100m;

    root /srv/git;

    # Smart HTTP protocol for Git operations
    location ~ ^(/.*.git/(HEAD|info/refs|objects/info/.*|git-(upload|receive)-pack))$ {
        auth_basic "Git Repository Access";
        auth_basic_user_file /etc/nginx/git-htpasswd;

        fastcgi_pass unix:/var/run/fcgiwrap.socket;

        fastcgi_param SCRIPT_FILENAME     /usr/lib/git-core/git-http-backend;
        fastcgi_param GIT_HTTP_EXPORT_ALL "";
        fastcgi_param GIT_PROJECT_ROOT    /srv/git;
        fastcgi_param PATH_INFO           $uri;
        fastcgi_param REMOTE_USER         $remote_user;
        fastcgi_param HTTPS               on;

        fastcgi_param QUERY_STRING        $query_string;
        fastcgi_param REQUEST_METHOD      $request_method;
        fastcgi_param CONTENT_TYPE        $content_type;
        fastcgi_param CONTENT_LENGTH      $content_length;
        fastcgi_param SERVER_NAME         $server_name;
        fastcgi_param SERVER_PORT         $server_port;
        fastcgi_param SERVER_PROTOCOL     $server_protocol;

        include fastcgi_params;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Per-Repository Access Control

For different authentication per repository, use separate Nginx location blocks:

```nginx
# Separate auth for different repos
server {
    listen 443 ssl http2;
    server_name git.example.com;

    # ... ssl config ...

    # Public read-only repository
    location ~ ^(/public-project.git/(HEAD|info/refs|objects/info/.*|git-upload-pack))$ {
        # No auth for reads, but push is still restricted
        fastcgi_pass unix:/var/run/fcgiwrap.socket;
        fastcgi_param SCRIPT_FILENAME  /usr/lib/git-core/git-http-backend;
        fastcgi_param GIT_PROJECT_ROOT /srv/git;
        fastcgi_param PATH_INFO        $uri;
        include fastcgi_params;
    }

    # Private repository - auth required for all operations
    location ~ ^(/private-project.git/(HEAD|info/refs|objects/info/.*|git-(upload|receive)-pack))$ {
        auth_basic "Private Repository";
        auth_basic_user_file /etc/nginx/private-htpasswd;

        fastcgi_pass unix:/var/run/fcgiwrap.socket;
        fastcgi_param SCRIPT_FILENAME  /usr/lib/git-core/git-http-backend;
        fastcgi_param GIT_PROJECT_ROOT /srv/git;
        fastcgi_param PATH_INFO        $uri;
        fastcgi_param REMOTE_USER      $remote_user;
        include fastcgi_params;
    }
}
```

## Configuring Git Credentials on Client

To avoid entering the password repeatedly, configure Git's credential helper:

```bash
# Store credentials in keyring (on desktop Linux with gnome-keyring)
git config --global credential.helper /usr/lib/git-core/git-credential-gnome-keyring

# Or use the file-based credential store (less secure - plaintext)
git config --global credential.helper store
# Credentials saved to ~/.git-credentials after first use

# Or cache in memory for a session (15 minutes default)
git config --global credential.helper 'cache --timeout=3600'

# Per-repository credential configuration
git config credential.helper store
git config credential.username alice
```

## Creating New Repositories Remotely

To allow creating repositories over HTTP, you'd need a web API wrapper (git-http-backend itself doesn't create repos). For now, create them on the server:

```bash
# Script to create a new repository
#!/bin/bash
# Usage: ./create-repo.sh reponame
REPO_NAME="$1"
REPO_PATH="/srv/git/${REPO_NAME}.git"

sudo -u git git init --bare "$REPO_PATH"
sudo -u git git -C "$REPO_PATH" config http.receivepack true

echo "Repository created: $REPO_PATH"
echo "Clone URL: https://git.example.com/${REPO_NAME}.git"
```

## Troubleshooting

**500 errors when pushing:**
```bash
# Check fcgiwrap error log
sudo journalctl -u fcgiwrap

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Verify repository permissions
ls -la /srv/git/myproject.git/
sudo chown -R git:git /srv/git/
```

**403 Forbidden on push:**
```bash
# Verify http.receivepack is set
sudo -u git git -C /srv/git/myproject.git config http.receivepack
# Should output: true
```

**Authentication loop:**
```bash
# Verify htpasswd file is readable by nginx
sudo -u www-data cat /etc/nginx/git-htpasswd
```

## Summary

Git smart HTTP via Nginx and `git-http-backend` gives you HTTPS-based repository access with basic authentication using only standard Ubuntu packages. It's simpler to set up and maintain than a full Git hosting platform, appropriate for small teams or environments where you already have Nginx and just need repository hosting over standard ports. For teams that need pull requests, issues, or CI integration, stepping up to Gitea or GitLab is the natural progression.
