# How to Install GitLab CE on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GitLab, Self-Hosted, CI/CD, DevOps

Description: Install GitLab Community Edition on Ubuntu, configure it with your domain and HTTPS, set up email notifications, and enable GitLab CI/CD with a self-hosted runner.

---

GitLab CE (Community Edition) is a comprehensive self-hosted DevOps platform: Git hosting, CI/CD pipelines, container registry, wiki, issue tracking, and more - all in one package. It's heavier than Gitea but includes features that teams otherwise need separate tools for. If your team plans to use GitLab CI/CD with its built-in yaml pipelines and you want everything under one roof, GitLab CE is worth the resource investment.

## Requirements

GitLab's minimum requirements are real - respect them:
- CPU: 4 cores minimum, 8+ recommended
- RAM: 8GB minimum, 16GB+ recommended for comfortable operation
- Storage: 10GB for GitLab itself, plus however much your repositories will need
- Ubuntu 22.04 or 24.04

GitLab on a machine with less than 8GB RAM will work but will feel sluggish. At 4GB it's genuinely painful.

## Preparing the System

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y curl openssh-server ca-certificates tzdata

# Optional: Install Postfix for local email delivery
# Choose "Internet Site" when prompted and enter your server's hostname
sudo apt install -y postfix

# Set the hostname (GitLab uses this during installation)
sudo hostnamectl set-hostname gitlab.example.com
```

## Installing GitLab CE

GitLab provides an official installation script that adds the repository and installs the package:

```bash
# Add the GitLab repository
curl -sS https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | sudo bash

# Install GitLab CE with your external URL
# This URL is used everywhere - emails, OAuth callbacks, repository clone URLs
sudo EXTERNAL_URL="https://gitlab.example.com" apt install -y gitlab-ce

# The installation takes 5-10 minutes
# It configures PostgreSQL, Redis, Nginx, Puma, and Sidekiq automatically
```

GitLab's package includes its own Nginx. If you already have Nginx running on port 80/443, you either need to stop it or configure GitLab to use your existing Nginx.

### Using an External Nginx (Optional)

If you want to keep your existing Nginx:

```bash
# Tell GitLab not to manage Nginx
sudo nano /etc/gitlab/gitlab.rb
```

```ruby
# Disable GitLab's bundled Nginx
nginx['enable'] = false

# Set the external URL
external_url 'https://gitlab.example.com'

# Configure Puma to listen on a Unix socket (for Nginx to proxy to)
gitlab_rails['initial_root_password'] = 'ChangeThis123!'
```

## Getting the Initial Root Password

After installation, GitLab generates a random root password:

```bash
# Read the initial root password
sudo cat /etc/gitlab/initial_root_password

# This file is deleted after 24 hours, so change the password immediately
```

Log into `https://gitlab.example.com` with username `root` and the initial password. Change it immediately in the profile settings.

## Key Configuration File

GitLab's main configuration lives in `/etc/gitlab/gitlab.rb`. After changes, run `gitlab-ctl reconfigure` to apply them.

```bash
sudo nano /etc/gitlab/gitlab.rb
```

Important settings to review:

```ruby
# /etc/gitlab/gitlab.rb - key configuration options

# External URL - must match your domain and protocol
external_url 'https://gitlab.example.com'

# SMTP configuration for email notifications
gitlab_rails['smtp_enable'] = true
gitlab_rails['smtp_address'] = "smtp.example.com"
gitlab_rails['smtp_port'] = 587
gitlab_rails['smtp_user_name'] = "notifications@example.com"
gitlab_rails['smtp_password'] = "smtp-password"
gitlab_rails['smtp_domain'] = "example.com"
gitlab_rails['smtp_authentication'] = "login"
gitlab_rails['smtp_enable_starttls_auto'] = true
gitlab_rails['gitlab_email_from'] = 'gitlab@example.com'

# SSH settings
gitlab_rails['gitlab_shell_ssh_port'] = 22

# Backup configuration
gitlab_rails['backup_path'] = "/var/opt/gitlab/backups"
gitlab_rails['backup_keep_time'] = 604800  # Keep backups for 7 days (in seconds)

# Registry - enable built-in Docker registry
registry_external_url 'https://registry.example.com'

# Performance tuning - adjust based on your RAM
puma['worker_timeout'] = 60
puma['worker_processes'] = 4  # Rule of thumb: number of CPU cores - 1
sidekiq['concurrency'] = 15

# Reduce memory usage on smaller servers
postgresql['shared_buffers'] = "256MB"
postgresql['max_connections'] = 100
```

Apply changes:

```bash
# Validate and apply configuration
sudo gitlab-ctl reconfigure

# Check GitLab status
sudo gitlab-ctl status
```

## SSL/TLS Configuration

GitLab with `https://` in `external_url` automatically enables Let's Encrypt:

```ruby
# In gitlab.rb - Let's Encrypt settings
letsencrypt['enable'] = true
letsencrypt['contact_emails'] = ['admin@example.com']
# Auto-renew 30 days before expiry
letsencrypt['auto_renew'] = true
letsencrypt['auto_renew_hour'] = 0
letsencrypt['auto_renew_minute'] = 15
letsencrypt['auto_renew_day_of_month'] = "*/7"
```

For manual SSL certificates:

```ruby
# Manual SSL configuration
nginx['ssl_certificate'] = "/etc/ssl/certs/gitlab.example.com.crt"
nginx['ssl_certificate_key'] = "/etc/ssl/private/gitlab.example.com.key"
```

## GitLab Administration

### Managing Users via CLI

```bash
# Access GitLab Rails console for admin operations
sudo gitlab-rails console

# In the console:
# Create a new user
User.create!(name: 'New User', username: 'newuser', email: 'newuser@example.com', password: 'TempPassword123!', password_confirmation: 'TempPassword123!', confirmed_at: Time.now)

# Reset a user's password
user = User.find_by_username('someuser')
user.password = 'NewPassword123!'
user.save!

# Make a user an admin
user = User.find_by_username('someuser')
user.admin = true
user.save!

exit
```

### Configuring SSH Access

GitLab handles SSH keys through the web UI. Users add their SSH public keys at **Profile > SSH Keys**.

Test SSH connectivity:

```bash
# From developer workstation
ssh -T git@gitlab.example.com
# Expected: Welcome to GitLab, @username!
```

## Setting Up GitLab Runner for CI/CD

GitLab Runner is the agent that executes CI/CD jobs. Install it on the same server or a separate build machine.

```bash
# Add GitLab Runner repository
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash

# Install GitLab Runner
sudo apt install -y gitlab-runner

# Get a registration token from GitLab:
# Admin Area > CI/CD > Runners > New instance runner
# OR Repository > Settings > CI/CD > Runners > New project runner

# Register the runner (interactive)
sudo gitlab-runner register
```

During registration you'll provide:
- GitLab URL: `https://gitlab.example.com`
- Registration token: (from GitLab UI)
- Description: `ubuntu-docker-runner`
- Tags: `docker,ubuntu`
- Executor: `docker`
- Default Docker image: `ubuntu:22.04`

```bash
# Start and enable the runner
sudo systemctl enable --now gitlab-runner
sudo gitlab-runner status
```

## Writing GitLab CI Pipelines

Add a `.gitlab-ci.yml` file to your repository:

```yaml
# .gitlab-ci.yml - GitLab CI pipeline definition

# Pipeline stages run in order
stages:
  - build
  - test
  - deploy

# Variables available to all jobs
variables:
  NODE_ENV: test
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

# Build job
build:
  stage: build
  image: node:20-alpine
  cache:
    # Cache node_modules between pipeline runs
    key: "$CI_COMMIT_REF_SLUG"
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run build
  artifacts:
    # Pass build output to subsequent stages
    paths:
      - dist/
    expire_in: 1 hour

# Test job
test:
  stage: test
  image: node:20-alpine
  cache:
    key: "$CI_COMMIT_REF_SLUG"
    paths:
      - node_modules/
  script:
    - npm ci
    - npm test
  coverage: '/Lines\s*:\s*(\d+(?:\.\d+)?%)/'

# Docker build and push job
docker-build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    # Log into GitLab's built-in container registry
    - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
  script:
    - docker build -t "$DOCKER_IMAGE" .
    - docker push "$DOCKER_IMAGE"
    # Tag as latest on main branch
    - |
      if [[ "$CI_COMMIT_BRANCH" == "$CI_DEFAULT_BRANCH" ]]; then
        docker tag "$DOCKER_IMAGE" "$CI_REGISTRY_IMAGE:latest"
        docker push "$CI_REGISTRY_IMAGE:latest"
      fi
  only:
    - main
    - tags

# Deploy to staging (only on main branch)
deploy-staging:
  stage: deploy
  image: alpine:latest
  environment:
    name: staging
    url: https://staging.example.com
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$STAGING_SSH_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh && chmod 700 ~/.ssh
  script:
    - ssh -o StrictHostKeyChecking=no deploy@staging.example.com "
        docker pull $DOCKER_IMAGE &&
        docker stop app || true &&
        docker run -d --name app --rm $DOCKER_IMAGE
      "
  only:
    - main
```

## Backup and Restore

```bash
# Create a backup
sudo gitlab-backup create

# Backups are stored in /var/opt/gitlab/backups/
ls -lh /var/opt/gitlab/backups/

# Also back up these files separately (not included in the backup):
sudo cp /etc/gitlab/gitlab.rb /backup/gitlab.rb
sudo cp /etc/gitlab/gitlab-secrets.json /backup/gitlab-secrets.json

# Restore from backup
# Stop services first
sudo gitlab-ctl stop puma sidekiq

# Restore (backup_timestamp is the number at the start of the backup file)
sudo gitlab-backup restore BACKUP=backup_timestamp

# Restore configuration secrets
sudo cp /backup/gitlab-secrets.json /etc/gitlab/gitlab-secrets.json

sudo gitlab-ctl reconfigure
sudo gitlab-ctl restart
```

## Performance Tuning

```bash
# Check what's using the most memory
sudo gitlab-ctl status
sudo ps aux --sort=-%mem | head -20

# If running out of RAM, reduce worker processes
sudo nano /etc/gitlab/gitlab.rb
# puma['worker_processes'] = 2  # Reduce from 4
# sidekiq['concurrency'] = 10   # Reduce from 15

sudo gitlab-ctl reconfigure
```

## Monitoring

```bash
# Check GitLab health
curl https://gitlab.example.com/-/health
curl https://gitlab.example.com/-/readiness

# View logs for specific components
sudo gitlab-ctl tail puma
sudo gitlab-ctl tail sidekiq
sudo gitlab-ctl tail postgresql
sudo gitlab-ctl tail nginx

# Check overall service status
sudo gitlab-ctl status
```

## Summary

GitLab CE on Ubuntu provides an all-in-one platform for teams that want Git hosting, CI/CD, container registry, and project management without paying for SaaS. The omnibus package handles the complex multi-service installation, and the single `gitlab.rb` configuration file covers everything from SMTP to runner registration. Plan your server capacity carefully - GitLab's features come with real resource requirements, but on appropriate hardware it runs reliably with minimal ongoing maintenance.
