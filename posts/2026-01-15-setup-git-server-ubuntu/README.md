# How to Set Up a Git Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Git, Version Control, Self-Hosted, DevOps, Tutorial

Description: Complete guide to setting up a private Git server on Ubuntu for secure, self-hosted version control without external services.

---

Running your own Git server gives you complete control over your code repositories without relying on GitHub, GitLab, or Bitbucket. This guide covers setting up Git over SSH, Git daemon for anonymous access, and GitWeb for browser viewing.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- SSH access configured
- Domain name (optional, for GitWeb)

## Installing Git

```bash
# Update packages
sudo apt update

# Install Git
sudo apt install git -y

# Verify installation
git --version
```

## Method 1: Git over SSH (Recommended)

The simplest and most secure method for small teams.

### Create Git User

```bash
# Create dedicated git user
sudo adduser --system --shell /usr/bin/git-shell --group --disabled-password --home /home/git git

# Create .ssh directory
sudo mkdir -p /home/git/.ssh
sudo chmod 700 /home/git/.ssh
sudo touch /home/git/.ssh/authorized_keys
sudo chmod 600 /home/git/.ssh/authorized_keys
sudo chown -R git:git /home/git/.ssh
```

### Configure git-shell

The git-shell restricts the git user to only Git operations:

```bash
# Verify git-shell is in allowed shells
cat /etc/shells | grep git-shell

# If not present, add it
echo "/usr/bin/git-shell" | sudo tee -a /etc/shells
```

### Create Repository Directory

```bash
# Create repositories directory
sudo mkdir -p /home/git/repositories
sudo chown git:git /home/git/repositories
```

### Initialize a Bare Repository

```bash
# Create a new bare repository
sudo mkdir /home/git/repositories/myproject.git
cd /home/git/repositories/myproject.git
sudo git init --bare
sudo chown -R git:git /home/git/repositories/myproject.git
```

### Add User SSH Keys

```bash
# Add developer's public key
sudo nano /home/git/.ssh/authorized_keys

# Paste the developer's public key (from their ~/.ssh/id_ed25519.pub)
# One key per line
```

### Clone and Push

From developer's machine:

```bash
# Clone empty repository
git clone git@your_server_ip:/home/git/repositories/myproject.git

# Or push existing project
cd existing-project
git remote add origin git@your_server_ip:/home/git/repositories/myproject.git
git push -u origin main
```

### Helper Script for Creating Repos

```bash
#!/bin/bash
# create-repo.sh - Create new Git repository

if [ -z "$1" ]; then
    echo "Usage: $0 <repo-name>"
    exit 1
fi

REPO_PATH="/home/git/repositories/$1.git"

if [ -d "$REPO_PATH" ]; then
    echo "Repository already exists!"
    exit 1
fi

sudo mkdir "$REPO_PATH"
cd "$REPO_PATH"
sudo git init --bare
sudo chown -R git:git "$REPO_PATH"

echo "Repository created: $REPO_PATH"
echo "Clone with: git clone git@$(hostname):$REPO_PATH"
```

## Method 2: Git Daemon (Anonymous Access)

For public, read-only access to repositories.

### Install and Configure

```bash
# Git daemon is included with Git

# Create systemd service
sudo nano /etc/systemd/system/git-daemon.service
```

```ini
[Unit]
Description=Git Daemon
After=network.target

[Service]
ExecStart=/usr/bin/git daemon --reuseaddr --base-path=/home/git/repositories --export-all --enable=receive-pack
Restart=always
User=git
Group=git

[Install]
WantedBy=multi-user.target
```

### Enable Read-Only for Specific Repos

```bash
# In repository, create magic file to allow export
sudo touch /home/git/repositories/public-project.git/git-daemon-export-ok
```

### Start Git Daemon

```bash
sudo systemctl daemon-reload
sudo systemctl start git-daemon
sudo systemctl enable git-daemon

# Open firewall port
sudo ufw allow 9418/tcp
```

### Clone via Git Protocol

```bash
# Anonymous clone (read-only)
git clone git://your_server_ip/public-project.git
```

## Method 3: GitWeb (Web Interface)

Provide a web interface for browsing repositories.

### Install GitWeb

```bash
# Install GitWeb and web server
sudo apt install gitweb nginx fcgiwrap -y
```

### Configure GitWeb

```bash
# Edit GitWeb configuration
sudo nano /etc/gitweb.conf
```

```perl
# Path to git projects
$projectroot = "/home/git/repositories";

# Git binary
$git_temp = "/tmp";

# Optional: Custom title
$site_name = "My Git Server";

# Show owner in project list
$feature{'owner'}{'default'} = [1];

# Enable grep, search
$feature{'search'}{'default'} = [1];
$feature{'grep'}{'default'} = [1];

# Syntax highlighting
$feature{'highlight'}{'default'} = [1];
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/gitweb
```

```nginx
server {
    listen 80;
    server_name git.example.com;

    root /usr/share/gitweb;
    index index.cgi;

    location /index.cgi {
        include fastcgi_params;
        gzip off;
        fastcgi_param SCRIPT_NAME $uri;
        fastcgi_param GITWEB_CONFIG /etc/gitweb.conf;
        fastcgi_pass unix:/var/run/fcgiwrap.socket;
    }

    location / {
        try_files $uri @gitweb;
    }

    location @gitweb {
        include fastcgi_params;
        gzip off;
        fastcgi_param SCRIPT_NAME /index.cgi;
        fastcgi_param PATH_INFO $uri;
        fastcgi_param GITWEB_CONFIG /etc/gitweb.conf;
        fastcgi_pass unix:/var/run/fcgiwrap.socket;
    }
}
```

### Enable and Restart

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/gitweb /etc/nginx/sites-enabled/

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

Access at `http://git.example.com`

### Add Authentication to GitWeb

```bash
# Create password file
sudo apt install apache2-utils -y
sudo htpasswd -c /etc/nginx/.gitpasswd admin

# Add to Nginx config in server block
auth_basic "Git Repository";
auth_basic_user_file /etc/nginx/.gitpasswd;
```

## Repository Management

### Repository Structure

```
/home/git/repositories/
├── project-a.git/
├── project-b.git/
└── team/
    ├── frontend.git/
    └── backend.git/
```

### Repository Descriptions

```bash
# Add description for GitWeb
echo "My awesome project" | sudo tee /home/git/repositories/myproject.git/description
```

### Server-Side Hooks

Create hooks for automation:

```bash
# Post-receive hook (runs after push)
sudo nano /home/git/repositories/myproject.git/hooks/post-receive
```

```bash
#!/bin/bash
# Deploy on push

while read oldrev newrev refname; do
    if [ "$refname" = "refs/heads/main" ]; then
        echo "Deploying main branch..."
        GIT_WORK_TREE=/var/www/myproject git checkout -f main
    fi
done
```

```bash
chmod +x /home/git/repositories/myproject.git/hooks/post-receive
```

## Access Control

### Per-Repository Access

For fine-grained access, use SSH command restrictions:

```bash
# In authorized_keys, restrict to specific repos
command="git-shell -c \"$SSH_ORIGINAL_COMMAND\"",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAAC3... user@example.com
```

### Use Gitolite for Advanced Access Control

```bash
# Install Gitolite for complex permissions
sudo apt install gitolite3 -y
```

## Backup Repositories

### Simple Backup Script

```bash
#!/bin/bash
# Backup all Git repositories

BACKUP_DIR="/backup/git-$(date +%Y%m%d)"
SOURCE_DIR="/home/git/repositories"

mkdir -p "$BACKUP_DIR"

for repo in "$SOURCE_DIR"/*.git; do
    repo_name=$(basename "$repo")
    git clone --mirror "$repo" "$BACKUP_DIR/$repo_name"
done

# Compress
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "Backup complete: $BACKUP_DIR.tar.gz"
```

### Mirror to Remote

```bash
# Add mirror remote
cd /home/git/repositories/myproject.git
sudo git remote add --mirror=push backup git@backup-server:/repos/myproject.git

# Push to mirror
sudo git push backup
```

## Troubleshooting

### Permission Denied

```bash
# Check repository ownership
ls -la /home/git/repositories/

# Fix permissions
sudo chown -R git:git /home/git/repositories/

# Check SSH key is in authorized_keys
sudo cat /home/git/.ssh/authorized_keys
```

### Repository Not Found

```bash
# Verify path is correct
ls /home/git/repositories/

# Check bare repository is initialized
ls /home/git/repositories/myproject.git/
# Should see: HEAD, config, objects/, refs/, etc.
```

### Push Rejected

```bash
# Check if repository is bare
cd /home/git/repositories/myproject.git
git config --get core.bare  # Should be true
```

### SSH Connection Issues

```bash
# Test SSH connection
ssh -v git@your_server_ip

# Check git-shell is allowed
cat /etc/shells | grep git-shell
```

## Security Best Practices

1. **Use SSH keys only**: Disable password authentication for git user
2. **Restrict git user**: Use git-shell to prevent shell access
3. **Firewall rules**: Only expose necessary ports
4. **Regular backups**: Automate repository backups
5. **Audit access**: Monitor SSH logs for git user

---

A self-hosted Git server gives you complete control over your source code. For small teams, Git over SSH is simple and secure. For public projects, add Git daemon or GitWeb. For enterprise needs with complex permissions, consider Gitea, GitLab, or Gitolite.
