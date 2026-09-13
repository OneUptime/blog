# How to Deploy GitLab via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitLab, Git, CI/CD, Self-Hosted

Description: 
Learn how to deploy self-hosted GitLab CE via Portainer with persistent storage, SSL configuration, and GitLab Runner integration for CI/CD pipelines. Note: This guide is designed for environments utilizing an external reverse proxy. It assumes a service like NGINX, Apache, or Traefik is positioned at the edge of your network to intercept incoming web traffic, manage SSL certificates, and route connections to this isolated GitLab stack.

## GitLab via Portainer Stack

**Stacks → Add Stack → gitlab**

```yaml
version: "3.8"

services:
  gitlab:
    image: gitlab/gitlab-ce:latest
    restart: unless-stopped
    hostname: gitlab.yourdomain.com
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        external_url 'https://gitlab.yourdomain.com'
        gitlab_rails['gitlab_shell_ssh_port'] = 2222
        # HTTPS via external reverse proxy
        nginx['listen_port'] = 80
        nginx['listen_https'] = false
        nginx['proxy_set_headers'] = {
          "X-Forwarded-Proto" => "https",
          "X-Forwarded-Ssl" => "on"
        }
        # Email configuration
        gitlab_rails['smtp_enable'] = true
        gitlab_rails['smtp_address'] = "smtp.gmail.com"
        gitlab_rails['smtp_port'] = 587
        gitlab_rails['smtp_user_name'] = "${SMTP_USER}"
        gitlab_rails['smtp_password'] = "${SMTP_PASSWORD}"
        # Performance
        puma['worker_processes'] = 2
        sidekiq['max_concurrency'] = 10
        gitlab_rails['db_pool'] = 10
    ports:
      - "8929:80"       # HTTP (behind reverse proxy)                   
      - "2222:22"       # SSH for Git
    volumes:
      - gitlab_config:/etc/gitlab
      - gitlab_logs:/var/log/gitlab
      - gitlab_data:/var/opt/gitlab
    shm_size: 256m

  gitlab-runner:
    image: gitlab/gitlab-runner:latest
    restart: unless-stopped
    volumes:
      - gitlab_runner_config:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  gitlab_config:
  gitlab_logs:
  gitlab_data:
  gitlab_runner_config:
```

## System Requirements

GitLab CE is resource-intensive. Minimum requirements:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 4GB | 8GB+ |
| Storage | 20GB | 50GB+ |

GitLab is not suitable for devices with less than 4GB RAM.

## First-Time Setup

After the container starts (5-10 minutes to initialize):

```bash
# Get the initial root password

docker exec gitlab cat /etc/gitlab/initial_root_password

# Or from Portainer: Containers > gitlab > Console
cat /etc/gitlab/initial_root_password
```

Access `https://gitlab.yourdomain.com` and log in with `root` and the password.

## Register GitLab Runner

1. In GitLab: **Admin Area → CI/CD → Runners → New instance runner**
2. Copy the registration token
3. Register via Portainer exec on gitlab-runner:

```bash
gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.yourdomain.com" \
  --token "REGISTRATION_TOKEN" \
  --executor "docker" \
  --docker-image alpine:latest \
  --docker-volumes /var/run/docker.sock:/var/run/docker.sock \
  --description "docker-runner"
```

## GitLab CI Pipeline Example

```yaml
# .gitlab-ci.yml in your application repository
stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: docker:24
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

deploy:
  stage: deploy
  image: curlimages/curl:latest
  script:
    - curl -X POST "$PORTAINER_WEBHOOK_URL?tag=$CI_COMMIT_SHORT_SHA"
  only:
    - main
```

## Backup GitLab

```bash
# Create backup
docker exec gitlab gitlab-backup create

# Backup is in /var/opt/gitlab/backups/
# Copy to host
docker cp gitlab:/var/opt/gitlab/backups/ /backup/gitlab-$(date +%Y%m%d)
```

## Conclusion

Self-hosted GitLab via Portainer gives you a complete DevOps platform - source code management, CI/CD pipelines, container registry, and issue tracking - all running on your own infrastructure. The GitLab Runner container, also managed by Portainer, executes CI jobs using Docker-in-Docker or the Docker socket.
