# How to Deploy GitLab via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, GitLab, CI/CD, DevOps, Self-Hosted, Git

Description: Deploy GitLab CE via Portainer for a complete self-hosted DevSecOps platform including Git hosting, CI/CD pipelines, container registry, and issue tracking.

## Introduction

GitLab CE (Community Edition) provides everything a development team needs: Git hosting, merge requests, CI/CD pipelines, container registry, and issue tracking. Deploying via Portainer gives you a manageable setup with persistent storage.

## Prerequisites

- Docker host with at least 8GB RAM (GitLab is resource-intensive)
- 40GB+ available disk space
- A public domain name pointing to the host (recommended for HTTPS and the integrated container registry)

## Deploy as a Stack

```yaml
version: "3.8"

services:
  gitlab:
    image: gitlab/gitlab-ce:latest
    container_name: gitlab
    hostname: gitlab.example.com  # Change to your domain
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        external_url 'https://gitlab.example.com'
        gitlab_rails['gitlab_shell_ssh_port'] = 2224
        gitlab_rails['time_zone'] = 'UTC'
        
        # Reduce memory usage
        puma['worker_processes'] = 2
        puma['max_threads'] = 4
        sidekiq['concurrency'] = 5
        
        # Email settings
        gitlab_rails['smtp_enable'] = true
        gitlab_rails['smtp_address'] = 'smtp.example.com'
        gitlab_rails['smtp_port'] = 587
        gitlab_rails['smtp_user_name'] = 'gitlab@example.com'
        gitlab_rails['smtp_password'] = 'smtp_password'
        gitlab_rails['smtp_domain'] = 'example.com'
        gitlab_rails['smtp_authentication'] = 'login'
        gitlab_rails['smtp_enable_starttls_auto'] = true
        
        # Container registry
        registry_external_url 'https://gitlab.example.com:5050'
    volumes:
      - gitlab_config:/etc/gitlab
      - gitlab_logs:/var/log/gitlab
      - gitlab_data:/var/opt/gitlab
    ports:
      - "80:80"
      - "443:443"
      - "5050:5050"
      - "2224:22"     # SSH port (using non-standard to avoid host conflict)
    shm_size: '256m'   # Required for GitLab
    restart: unless-stopped

volumes:
  gitlab_config:
  gitlab_logs:
  gitlab_data:
```

## Initial Access

After deployment (allow several minutes for initialization):

```bash
# Get initial root password

docker exec gitlab grep 'Password:' /etc/gitlab/initial_root_password
```

Navigate to `https://gitlab.example.com` and log in with `root` and the initial password.

## GitLab CI/CD Pipeline Example

Create `.gitlab-ci.yml` in your repository:

```yaml
# GitLab CI pipeline
default:
  image: docker:24-cli

stages:
  - build
  - test
  - release
  - deploy

variables:
  CONTAINER_TEST_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  CONTAINER_RELEASE_IMAGE: $CI_REGISTRY_IMAGE:latest

before_script:
  - echo "$CI_REGISTRY_PASSWORD" | docker login $CI_REGISTRY -u $CI_REGISTRY_USER --password-stdin

build:
  stage: build
  script:
    - docker build --pull -t $CONTAINER_TEST_IMAGE .
    - docker push $CONTAINER_TEST_IMAGE

test:
  stage: test
  script:
    - docker pull $CONTAINER_TEST_IMAGE
    - docker run --rm $CONTAINER_TEST_IMAGE npm test

release:
  stage: release
  script:
    - docker pull $CONTAINER_TEST_IMAGE
    - docker tag $CONTAINER_TEST_IMAGE $CONTAINER_RELEASE_IMAGE
    - docker push $CONTAINER_RELEASE_IMAGE
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'

deploy:
  stage: deploy
  image: curlimages/curl:latest
  before_script: []
  script:
    # Trigger Portainer stack webhook to redeploy (Business Edition)
    - curl -X POST "$PORTAINER_WEBHOOK_URL"
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## GitLab Runner for Portainer-Deployed Apps

Deploy a GitLab Runner to handle CI jobs:

```yaml
version: "3.8"

services:
  gitlab-runner:
    image: gitlab/gitlab-runner:latest
    container_name: gitlab-runner
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - gitlab_runner_config:/etc/gitlab-runner
    restart: unless-stopped

volumes:
  gitlab_runner_config:
```

Register the runner with a runner authentication token:

```bash
docker exec -it gitlab-runner gitlab-runner register \
  --non-interactive \
  --url https://gitlab.example.com \
  --token YOUR_RUNNER_AUTH_TOKEN \
  --executor docker \
  --description "docker-runner" \
  --docker-image docker:24-cli \
  --docker-volumes /var/run/docker.sock:/var/run/docker.sock
```

## Conclusion

GitLab CE deployed via Portainer provides a complete self-hosted DevSecOps platform. The persistent volumes store your repositories, pipelines, and configurations safely. The integrated container registry and CI/CD pipelines make it possible to build complete continuous deployment workflows, with Portainer Business Edition webhooks providing the deployment trigger.
