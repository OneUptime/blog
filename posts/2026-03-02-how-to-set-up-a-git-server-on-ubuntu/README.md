# How to Set Up a Git Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Git, Self-Hosted, Version Control, System Administration

Description: Set up a simple self-hosted Git server on Ubuntu using SSH and git-shell, manage repositories and access control, and optionally add a web interface with gitweb.

---

Running your own Git server gives you full control over repository access, no dependency on external services, and no storage limits beyond your own hardware. The simplest approach uses SSH for transport and `git-shell` to restrict what authenticated users can do on the server. This setup works reliably for small teams and private projects without the overhead of running GitLab or Gitea.

## Setting Up the Git User

The standard approach is a single `git` user on the server. All repository access goes through this user via SSH, with access differentiated by SSH keys rather than system passwords.

```bash
# Install Git if not already present
sudo apt update && sudo apt install -y git

# Create the git user
sudo useradd -m -s /usr/bin/git-shell git

# Create the SSH directory
sudo mkdir -p /home/git/.ssh
sudo chmod 700 /home/git/.ssh
sudo touch /home/git/.ssh/authorized_keys
sudo chmod 600 /home/git/.ssh/authorized_keys
sudo chown -R git:git /home/git/.ssh

# Verify git-shell is available
which git-shell
# Should output: /usr/bin/git-shell

# Check that git-shell is in /etc/shells
grep git-shell /etc/shells
# If not present, add it:
echo "$(which git-shell)" | sudo tee -a /etc/shells
```

The `git-shell` restricts the git user to git operations only. Users cannot get a normal shell even if they have SSH access.

## Creating Repositories

Git server repositories use "bare" format - they contain the git object store without a working tree checkout.

```bash
# Create a directory for repositories
sudo mkdir -p /home/git/repositories
sudo chown git:git /home/git/repositories

# Create a bare repository
sudo -u git git init --bare /home/git/repositories/myproject.git

# Repeat for additional repositories
sudo -u git git init --bare /home/git/repositories/website.git
sudo -u git git init --bare /home/git/repositories/api.git

# List repositories
ls -la /home/git/repositories/
```

The `.git` extension on bare repositories is a convention that tells clients (and humans) that it's a server-side repository.

## Managing SSH Key Access

Add each developer's public SSH key to `/home/git/.ssh/authorized_keys`. Each line in this file grants access.

```bash
# Add a developer's public key
# The developer runs: cat ~/.ssh/id_ed25519.pub and sends you the output
echo "ssh-ed25519 AAAA...developer-key... alice@laptop" | \
  sudo tee -a /home/git/.ssh/authorized_keys

# Add another developer
echo "ssh-ed25519 AAAA...another-key... bob@workstation" | \
  sudo tee -a /home/git/.ssh/authorized_keys

# View current authorized keys
sudo cat /home/git/.ssh/authorized_keys
```

With this setup, all developers with authorized keys have access to all repositories. For finer-grained access control, see the section on `git-shell` commands below.

## Testing Client Access

Developers clone and push using SSH:

```bash
# Clone a repository (run by developer on their workstation)
git clone git@your-server.example.com:repositories/myproject.git

# Or with explicit path
git clone ssh://git@your-server.example.com/home/git/repositories/myproject.git

# Test SSH connection
ssh -T git@your-server.example.com
# Expected output: fatal: Interactive git shell is not enabled.
# This is correct - it confirms git-shell is working
```

The "fatal: Interactive git shell is not enabled" message is expected and correct. It means the user authenticated successfully but cannot get a shell, which is what we want.

## Initializing a Repository from a Local Project

When developers want to push an existing local project to the new server:

```bash
# On the server: create the bare repo (if not already done)
sudo -u git git init --bare /home/git/repositories/existingproject.git

# On developer's workstation: add the server as remote and push
cd /path/to/existing/project
git remote add origin git@your-server.example.com:repositories/existingproject.git
git push -u origin main
```

## Restricting Access Per Repository

For per-repository access control without a full Git hosting platform, use the `authorized_keys` command option to run a script that checks which repository is being accessed.

```bash
# Create the access control script
sudo nano /home/git/git-access-control.sh
```

```bash
#!/bin/bash
# Simple access control for git-shell
# Add logic here to check which repository is being accessed
# and whether the authenticated user (identified by SSH key) has access

# The SSH_ORIGINAL_COMMAND contains the git operation, e.g.:
# git-upload-pack 'repositories/private.git'
# git-receive-pack 'repositories/private.git'

COMMAND="$SSH_ORIGINAL_COMMAND"
REPO=$(echo "$COMMAND" | sed "s/.*'\(.*\)'/\1/")

# Example: restrict access to private.git to specific keys
# The USER variable is set by the calling authorized_keys entry
if [[ "$REPO" == "repositories/private.git" && "$ALLOWED_USER" != "alice" ]]; then
    echo "Access denied to $REPO"
    exit 1
fi

# Execute the original git command
exec git-shell -c "$COMMAND"
```

```bash
sudo chmod +x /home/git/git-access-control.sh
sudo chown git:git /home/git/git-access-control.sh
```

Modify `authorized_keys` to pass user identity:

```
command="ALLOWED_USER=alice /home/git/git-access-control.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...alice-key...

command="ALLOWED_USER=bob /home/git/git-access-control.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...bob-key...
```

## Enabling Git Daemon for Read-Only HTTP Access

For public repositories, git-daemon provides unauthenticated read-only access:

```bash
# Create a systemd service for git-daemon
sudo nano /etc/systemd/system/git-daemon.service
```

```ini
[Unit]
Description=Git Daemon
After=network.target

[Service]
User=git
Group=git
ExecStart=/usr/bin/git daemon \
    --reuseaddr \
    --base-path=/home/git/repositories \
    --export-all \
    --verbose \
    --enable=receive-pack
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now git-daemon

# Mark specific repositories as exportable
sudo touch /home/git/repositories/public-project.git/git-daemon-export-ok

# Clone via git protocol (port 9418)
git clone git://your-server.example.com/public-project.git
```

## Adding a Web Interface with Gitweb

Gitweb provides a basic web interface for browsing repositories.

```bash
# Install gitweb
sudo apt install -y gitweb

# Install a web server if not present
sudo apt install -y nginx

# Configure gitweb
sudo nano /etc/gitweb.conf
```

```perl
# gitweb configuration
our $projectroot = "/home/git/repositories";
our $git_temp = "/tmp/gitweb";
our $projects_list = $projectroot;

# Site customization
our $site_name = "My Git Server";
our $site_html_head_string = "";
our $home_text = "/etc/gitweb/indextext.html";

# Enable blame, snapshot downloads
our @features = (
    'blame',
    'snapshot',
    'grep',
    'pickaxe',
    'search',
);
```

```bash
# Create temp directory for gitweb
sudo mkdir -p /tmp/gitweb
sudo chown www-data:www-data /tmp/gitweb
```

Configure Nginx to serve gitweb:

```bash
sudo nano /etc/nginx/sites-available/gitweb
```

```nginx
# Gitweb configuration for Nginx
server {
    listen 80;
    server_name git.example.com;

    # Basic authentication to restrict access
    auth_basic "Git Repository Browser";
    auth_basic_user_file /etc/nginx/gitweb.htpasswd;

    location / {
        root /usr/share/gitweb;
        try_files $uri @gitweb;
    }

    location @gitweb {
        fastcgi_pass unix:/var/run/fcgiwrap.socket;
        fastcgi_param SCRIPT_FILENAME /usr/share/gitweb/gitweb.cgi;
        fastcgi_param PATH_INFO $uri;
        fastcgi_param QUERY_STRING $args;
        fastcgi_param HTTP_HOST $server_name;
        include fastcgi_params;
    }
}
```

```bash
# Install fcgiwrap for CGI support
sudo apt install -y fcgiwrap

# Create htpasswd file for web authentication
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/gitweb.htpasswd admin

sudo ln -s /etc/nginx/sites-available/gitweb /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable --now fcgiwrap
```

## Backup Strategy for Repositories

```bash
# Create a simple backup script for all repositories
sudo nano /usr/local/bin/backup-git-repos.sh
```

```bash
#!/bin/bash
# Backup all Git repositories
REPO_DIR="/home/git/repositories"
BACKUP_DIR="/backup/git"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Bundle each repository (git bundle includes all refs and objects)
for repo in "$REPO_DIR"/*.git; do
    repo_name=$(basename "$repo" .git)
    echo "Backing up $repo_name..."
    git -C "$repo" bundle create "$BACKUP_DIR/${repo_name}-${DATE}.bundle" --all
done

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "*.bundle" -mtime +30 -delete

echo "Backup completed: $(date)"
```

```bash
sudo chmod +x /usr/local/bin/backup-git-repos.sh

# Schedule daily backups
echo "0 3 * * * root /usr/local/bin/backup-git-repos.sh >> /var/log/git-backup.log 2>&1" | \
  sudo tee /etc/cron.d/git-backup
```

## Monitoring Repository Activity

```bash
# Check recent pushes to a repository
sudo -u git git -C /home/git/repositories/myproject.git log --oneline -20

# See who has pushed recently (from git reflog)
sudo -u git git -C /home/git/repositories/myproject.git reflog --all | head -20

# Check repository sizes
du -sh /home/git/repositories/*.git | sort -hr
```

## Summary

A bare-bones Git server on Ubuntu using SSH and git-shell is reliable and easy to maintain. It lacks the bells and whistles of GitLab or Gitea - no merge requests, no CI integration, no issue tracker - but for teams that just need shared repository hosting without external dependencies, it does the job with minimal resource requirements. If you later need those features, migrating repositories to Gitea is straightforward: push your local clones to the new server.
