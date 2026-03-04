# How to Install GitLab CE on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GitLab, Git, CI/CD, DevOps, Linux

Description: Install GitLab Community Edition on RHEL 9 with all dependencies, initial configuration, and basic hardening.

---

GitLab CE is a full DevOps platform that includes Git hosting, CI/CD pipelines, issue tracking, and container registry. Installing it on RHEL 9 is straightforward using the official Omnibus package.

## Prerequisites

```bash
# Install required dependencies
sudo dnf install -y curl policycoreutils openssh-server openssh-clients perl postfix

# Start and enable SSH and Postfix
sudo systemctl enable --now sshd
sudo systemctl enable --now postfix

# Open the firewall for HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Install GitLab CE

```bash
# Add the GitLab repository
curl -sS https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.rpm.sh | sudo bash

# Install GitLab CE and set the external URL
sudo EXTERNAL_URL="http://gitlab.example.com" dnf install -y gitlab-ce

# The installation takes a few minutes as it configures all services
```

## Initial Configuration

After installation, GitLab generates a random root password:

```bash
# View the initial root password (valid for 24 hours)
sudo cat /etc/gitlab/initial_root_password
```

Log in to `http://gitlab.example.com` with username `root` and the password from the file above.

## Reconfigure GitLab

Edit the main configuration file for custom settings:

```bash
# Edit the GitLab configuration
sudo vim /etc/gitlab/gitlab.rb
```

Key settings to adjust:

```ruby
# /etc/gitlab/gitlab.rb

# Set the external URL
external_url 'https://gitlab.example.com'

# Configure email
gitlab_rails['smtp_enable'] = true
gitlab_rails['smtp_address'] = "smtp.example.com"
gitlab_rails['smtp_port'] = 587
gitlab_rails['smtp_user_name'] = "gitlab@example.com"
gitlab_rails['smtp_password'] = "your_smtp_password"
gitlab_rails['smtp_domain'] = "example.com"
gitlab_rails['smtp_authentication'] = "login"
gitlab_rails['smtp_enable_starttls_auto'] = true

# Set the time zone
gitlab_rails['time_zone'] = 'America/New_York'

# Reduce memory usage (optional, for smaller servers)
puma['worker_processes'] = 2
sidekiq['concurrency'] = 10
```

Apply the changes:

```bash
# Reconfigure GitLab after editing gitlab.rb
sudo gitlab-ctl reconfigure

# Check the status of all GitLab services
sudo gitlab-ctl status
```

## Manage GitLab Services

```bash
# Stop all GitLab services
sudo gitlab-ctl stop

# Start all services
sudo gitlab-ctl start

# Restart all services
sudo gitlab-ctl restart

# Check logs for a specific service
sudo gitlab-ctl tail nginx
sudo gitlab-ctl tail puma
sudo gitlab-ctl tail sidekiq
```

## Enable HTTPS with Let's Encrypt

```hcl
# In /etc/gitlab/gitlab.rb, change the URL to HTTPS
# external_url 'https://gitlab.example.com'

# Enable Let's Encrypt
# letsencrypt['enable'] = true
# letsencrypt['contact_emails'] = ['admin@example.com']
# letsencrypt['auto_renew'] = true
```

```bash
# Apply the changes
sudo gitlab-ctl reconfigure
```

## Back Up GitLab

```bash
# Create a backup
sudo gitlab-backup create

# Backups are stored in /var/opt/gitlab/backups/
ls -la /var/opt/gitlab/backups/

# Also back up the config files separately
sudo cp /etc/gitlab/gitlab.rb /safe/location/
sudo cp /etc/gitlab/gitlab-secrets.json /safe/location/
```

GitLab CE on RHEL 9 gives you a complete DevOps platform with Git hosting, CI/CD, and project management, all running on your own infrastructure.
