# How to Run GitLab CE in Docker (Self-Hosted)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, GitLab, Git, CI/CD, DevOps, Self-Hosted, Docker Compose

Description: Complete guide to deploying self-hosted GitLab Community Edition in Docker with CI/CD runners

---

GitLab Community Edition is a full-featured DevOps platform that covers source code management, CI/CD pipelines, container registry, issue tracking, and more. Self-hosting GitLab gives your organization complete control over its code and data. Docker makes the deployment significantly easier than a bare-metal installation, packaging GitLab's complex stack of services (PostgreSQL, Redis, Puma, Sidekiq, Gitaly, and more) into a single manageable container.

This guide walks through deploying GitLab CE in Docker, configuring it for production use, setting up CI/CD runners, and handling backups.

## System Requirements

GitLab CE is resource-intensive. Plan for the following minimums:

- **CPU**: 4 cores (8 recommended for 100+ users)
- **RAM**: 8 GB minimum (16 GB recommended)
- **Storage**: 50 GB SSD for small teams, significantly more for large repositories
- **Docker**: Engine 24.0+ with Docker Compose V2

## Quick Start

The simplest way to get GitLab running:

```bash
# Start GitLab CE with minimal configuration
docker run -d \
  --name gitlab \
  --hostname gitlab.example.com \
  -p 443:443 \
  -p 80:80 \
  -p 2222:22 \
  -v gitlab-config:/etc/gitlab \
  -v gitlab-logs:/var/log/gitlab \
  -v gitlab-data:/var/opt/gitlab \
  --shm-size 256m \
  gitlab/gitlab-ce:17.4.0-ce.0
```

GitLab takes several minutes to initialize on first start. Monitor the progress:

```bash
# Watch GitLab startup logs until it is ready
docker logs -f gitlab
```

Once the logs show "gitlab Reconfigured!", the web interface is available at http://localhost. The default root password is stored in a file inside the container:

```bash
# Retrieve the initial root password (valid for 24 hours)
docker exec gitlab cat /etc/gitlab/initial_root_password
```

## Docker Compose for Production

A production-ready setup should use Docker Compose with proper configuration:

```yaml
# docker-compose.yml - GitLab CE production deployment
version: "3.8"

services:
  gitlab:
    image: gitlab/gitlab-ce:17.4.0-ce.0
    container_name: gitlab
    hostname: gitlab.example.com
    restart: unless-stopped
    shm_size: "256m"
    ports:
      - "80:80"
      - "443:443"
      - "2222:22"
    volumes:
      - gitlab-config:/etc/gitlab
      - gitlab-logs:/var/log/gitlab
      - gitlab-data:/var/opt/gitlab
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        # External URL - set this to your actual domain
        external_url 'https://gitlab.example.com'

        # SSH configuration
        gitlab_rails['gitlab_shell_ssh_port'] = 2222

        # Timezone
        gitlab_rails['time_zone'] = 'America/New_York'

        # Email configuration
        gitlab_rails['smtp_enable'] = true
        gitlab_rails['smtp_address'] = 'smtp.mailgun.org'
        gitlab_rails['smtp_port'] = 587
        gitlab_rails['smtp_user_name'] = 'gitlab@example.com'
        gitlab_rails['smtp_password'] = 'smtp-password-here'
        gitlab_rails['smtp_domain'] = 'example.com'
        gitlab_rails['smtp_authentication'] = 'login'
        gitlab_rails['smtp_enable_starttls_auto'] = true

        # Reduce memory usage for smaller instances
        puma['worker_processes'] = 2
        sidekiq['concurrency'] = 10

        # Container registry
        registry_external_url 'https://registry.example.com'

        # Monitoring
        prometheus_monitoring['enable'] = true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/-/health"]
      interval: 60s
      timeout: 30s
      retries: 5
      start_period: 300s

volumes:
  gitlab-config:
  gitlab-logs:
  gitlab-data:
```

Start it:

```bash
# Launch GitLab
docker compose up -d

# Monitor startup progress
docker compose logs -f gitlab
```

## Memory Optimization

GitLab ships with many sub-services enabled by default. For smaller teams, disable what you do not need:

```ruby
# Add to GITLAB_OMNIBUS_CONFIG to reduce memory footprint
# Disable Prometheus monitoring if using external monitoring
prometheus_monitoring['enable'] = false

# Disable the Container Registry if you do not need it
registry['enable'] = false

# Reduce Puma workers (minimum 2)
puma['worker_processes'] = 2
puma['min_threads'] = 1
puma['max_threads'] = 4

# Reduce Sidekiq concurrency
sidekiq['concurrency'] = 5

# Disable GitLab Pages if not used
pages_external_url nil
gitlab_pages['enable'] = false

# Reduce Gitaly concurrency
gitaly['configuration'] = {
  concurrency: [{ rpc: "/gitaly.SmartHTTPService/PostReceivePack", max_per_repo: 3 }]
}
```

With these optimizations, GitLab can run comfortably in 4 GB of RAM for small teams.

## Setting Up GitLab Runner

GitLab CI/CD requires a Runner to execute pipeline jobs. Run the GitLab Runner as a separate container:

```yaml
# Add to your docker-compose.yml
  gitlab-runner:
    image: gitlab/gitlab-runner:v17.4.0
    container_name: gitlab-runner
    restart: unless-stopped
    volumes:
      - runner-config:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - gitlab
```

Register the runner with your GitLab instance:

```bash
# Register the runner (interactive)
docker exec -it gitlab-runner gitlab-runner register \
  --url https://gitlab.example.com \
  --registration-token YOUR_REGISTRATION_TOKEN \
  --executor docker \
  --docker-image alpine:latest \
  --description "Docker Runner" \
  --tag-list "docker,linux"
```

Get the registration token from GitLab's Admin Area under CI/CD > Runners.

## SSL with Let's Encrypt

GitLab can automatically obtain and renew SSL certificates from Let's Encrypt:

```ruby
# Add to GITLAB_OMNIBUS_CONFIG for automatic SSL
external_url 'https://gitlab.example.com'
letsencrypt['enable'] = true
letsencrypt['contact_emails'] = ['admin@example.com']
letsencrypt['auto_renew'] = true
letsencrypt['auto_renew_hour'] = 3
letsencrypt['auto_renew_day_of_month'] = "*/7"
```

Make sure ports 80 and 443 are accessible from the internet for the ACME challenge.

## Backup and Restore

Regular backups are critical. GitLab includes a built-in backup tool:

```bash
# Create a full backup of GitLab data
docker exec gitlab gitlab-backup create

# Backups are stored in /var/opt/gitlab/backups
docker exec gitlab ls /var/opt/gitlab/backups
```

Also back up the configuration files separately, as they contain secrets not included in the data backup:

```bash
# Back up GitLab configuration (contains encryption keys)
docker exec gitlab tar czf /var/opt/gitlab/backups/gitlab-config-backup.tar.gz \
  /etc/gitlab/gitlab-secrets.json /etc/gitlab/gitlab.rb
```

Automate backups with a cron job:

```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * docker exec gitlab gitlab-backup create CRON=1
```

To restore from a backup:

```bash
# Stop services that write to the database
docker exec gitlab gitlab-ctl stop puma
docker exec gitlab gitlab-ctl stop sidekiq

# Restore from the most recent backup
docker exec gitlab gitlab-backup restore BACKUP=timestamp_of_backup

# Restart GitLab
docker exec gitlab gitlab-ctl restart
```

## Monitoring GitLab Health

Check GitLab's internal health endpoints:

```bash
# Check overall health
curl -s http://localhost/-/health | python3 -m json.tool

# Check readiness (all sub-services)
curl -s http://localhost/-/readiness | python3 -m json.tool

# Check liveness
curl -s http://localhost/-/liveness
```

## Upgrading GitLab

Always follow GitLab's upgrade path guidelines. Never skip major versions:

```bash
# Pull the new image version
docker compose pull

# Stop and recreate the container
docker compose up -d

# Monitor the upgrade process
docker compose logs -f gitlab
```

Check the [GitLab upgrade path tool](https://gitlab-com.gitlab.io/support/toolbox/upgrade-path/) before upgrading to determine the correct intermediate versions.

## Conclusion

Self-hosted GitLab CE in Docker gives you a complete DevOps platform under your control. The Docker deployment simplifies initial setup and upgrades, while the volume mounts ensure data persistence. Start with the minimal configuration, tune memory settings for your team size, add a CI/CD runner for pipelines, and set up automated backups from day one. The main thing to remember is that GitLab is heavy on resources, so plan your host accordingly and disable sub-services you do not need.
