# How to Set Up GitLab Runner on EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, GitLab, CI/CD, DevOps

Description: Learn how to install and configure GitLab Runner on EC2 for running CI/CD pipelines with Docker, shell, and autoscaling executors.

---

If your team uses GitLab for source control, you'll want your own GitLab Runners for CI/CD. While GitLab.com provides shared runners, they have limited minutes, queue times can be unpredictable, and you can't customize the build environment. Self-hosted runners on EC2 give you full control over capacity, performance, and cost.

Let's set up a GitLab Runner on EC2, starting with the basics and working up to autoscaling configurations.

## Instance Sizing

The right instance size depends on your build workloads:

| Build Type | Recommended Type | Why |
|-----------|-----------------|-----|
| Simple tests, linting | t3.medium | Burst-friendly, cheap |
| Docker builds | t3.large or c5.xlarge | Needs more CPU and RAM for layer caching |
| Multi-service builds | m5.xlarge | Memory for running multiple containers |
| Heavy compilation | c5.2xlarge | Sustained CPU performance |

If you're using Docker executor (recommended), allocate at least 30 GB of disk for Docker images and layer cache.

## Installing GitLab Runner

SSH into your EC2 instance and install the GitLab Runner package.

Install GitLab Runner on Amazon Linux 2023:

```bash
# Add the GitLab Runner repository
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh" | sudo bash

# Install GitLab Runner
sudo yum install -y gitlab-runner

# Verify installation
gitlab-runner --version
```

For Ubuntu:

```bash
# Add the repository
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash

# Install
sudo apt install -y gitlab-runner
```

## Installing Docker

The Docker executor is the most common choice - it runs each job in a fresh container, providing isolation and reproducibility.

Install Docker for the runner:

```bash
# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Add the gitlab-runner user to the docker group
sudo usermod -aG docker gitlab-runner

# Verify Docker works for the gitlab-runner user
sudo -u gitlab-runner docker info
```

## Registering the Runner

To register a runner, you need a registration token from your GitLab instance. Find it in:
- **Instance-wide**: Admin Area > CI/CD > Runners
- **Group-level**: Group > Settings > CI/CD > Runners
- **Project-level**: Project > Settings > CI/CD > Runners

Register the runner with Docker executor:

```bash
# Register the runner
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --token "YOUR_REGISTRATION_TOKEN" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --description "ec2-docker-runner" \
  --tag-list "docker,aws,ec2" \
  --run-untagged="true" \
  --locked="false"
```

Verify the registration:

```bash
# Check registered runners
sudo gitlab-runner list

# Verify the runner shows up in GitLab's UI
sudo gitlab-runner verify
```

## Configuring the Runner

The runner configuration lives in `/etc/gitlab-runner/config.toml`. Let's optimize it.

Edit the runner configuration for production use:

```toml
# /etc/gitlab-runner/config.toml
concurrent = 4  # Run up to 4 jobs simultaneously
check_interval = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "ec2-docker-runner"
  url = "https://gitlab.com/"
  token = "YOUR_RUNNER_TOKEN"
  executor = "docker"

  [runners.docker]
    tls_verify = false
    image = "alpine:latest"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false

    # Volume mounts for caching
    volumes = [
      "/cache",
      "/var/run/docker.sock:/var/run/docker.sock"
    ]

    # Resource limits per job
    memory = "2g"
    cpus = "2"

    # Pull policy
    pull_policy = ["if-not-present"]

    # Cleanup
    shm_size = 268435456  # 256MB shared memory

  [runners.cache]
    Type = "s3"
    Shared = true
    [runners.cache.s3]
      ServerAddress = "s3.amazonaws.com"
      BucketName = "my-gitlab-runner-cache"
      BucketLocation = "us-east-1"
```

Restart the runner to apply changes:

```bash
sudo gitlab-runner restart
```

## Setting Up S3 Cache

Caching build dependencies in S3 dramatically speeds up pipelines. Create an S3 bucket and configure the runner to use it.

Create the cache bucket:

```bash
# Create S3 bucket for runner cache
aws s3 mb s3://my-gitlab-runner-cache --region us-east-1

# Add lifecycle policy to expire old cache entries
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-gitlab-runner-cache \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "expire-cache",
      "Status": "Enabled",
      "Expiration": {"Days": 14},
      "Filter": {"Prefix": ""}
    }]
  }'
```

Make sure your EC2 instance's IAM role has S3 access:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::my-gitlab-runner-cache",
      "arn:aws:s3:::my-gitlab-runner-cache/*"
    ]
  }]
}
```

## Creating a Pipeline with the Runner

Here's a sample `.gitlab-ci.yml` that uses the EC2 runner effectively:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_DRIVER: overlay2

# Use caching for node_modules
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

build:
  stage: build
  image: node:20-alpine
  tags:
    - docker
    - aws
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

test:
  stage: test
  image: node:20-alpine
  tags:
    - docker
    - aws
  script:
    - npm ci
    - npm test
  coverage: '/Statements\s*:\s*(\d+\.?\d*)%/'

deploy:
  stage: deploy
  image: amazon/aws-cli:latest
  tags:
    - docker
    - aws
  only:
    - main
  script:
    - aws s3 sync dist/ s3://my-app-bucket/
    - aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"
```

## Docker-in-Docker Builds

If your pipelines need to build Docker images, you have two options: Docker-in-Docker (DinD) or Docker socket binding.

Option 1 - Docker socket binding (simpler, shares host Docker daemon):

```toml
# In config.toml, the volume mount we already added:
volumes = ["/var/run/docker.sock:/var/run/docker.sock"]
```

```yaml
# In .gitlab-ci.yml
build_image:
  stage: build
  image: docker:latest
  script:
    - docker build -t myapp:${CI_COMMIT_SHA} .
    - docker push myapp:${CI_COMMIT_SHA}
```

Option 2 - Docker-in-Docker (more isolated but slower):

```yaml
build_image:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2376
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    - docker build -t myapp:${CI_COMMIT_SHA} .
```

## Monitoring Runner Health

Keep an eye on your runner's performance and job queue.

Create a simple monitoring script:

```bash
#!/bin/bash
# /usr/local/bin/check-runner-health.sh

# Check if gitlab-runner process is running
if ! pgrep -x "gitlab-runner" > /dev/null; then
    echo "CRITICAL: GitLab Runner is not running!"
    sudo systemctl restart gitlab-runner
    exit 1
fi

# Check Docker disk usage
DOCKER_DISK_USAGE=$(docker system df --format '{{.Size}}' | head -1)
echo "Docker disk usage: $DOCKER_DISK_USAGE"

# Clean up old Docker resources
docker system prune -f --filter "until=48h"

# Check runner status
gitlab-runner verify 2>&1
```

Schedule Docker cleanup to prevent disk space issues:

```bash
# Run Docker cleanup daily
echo "0 4 * * * docker system prune -af --filter 'until=72h' >> /var/log/docker-cleanup.log 2>&1" | sudo crontab -u gitlab-runner -
```

## Multiple Runners on One Instance

You can register multiple runners on the same EC2 instance with different configurations - for example, one for Docker builds and one for shell scripts:

```bash
# Register a second runner with shell executor
sudo gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --token "YOUR_TOKEN" \
  --executor "shell" \
  --description "ec2-shell-runner" \
  --tag-list "shell,aws" \
  --run-untagged="false"
```

## Security Considerations

- Never run the Docker executor in `privileged` mode unless absolutely necessary
- Use project-level runners instead of shared runners for sensitive projects
- Store secrets in GitLab CI/CD variables (masked and protected), not in the repository
- Rotate the runner token periodically
- Keep the runner and Docker updated for security patches

For monitoring your CI/CD infrastructure health, check our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view).

## Wrapping Up

A self-hosted GitLab Runner on EC2 gives you predictable build times, customized environments, and no shared runner queues. The Docker executor provides clean isolation between jobs, S3 caching speeds up repeated builds, and you can scale by adding more runners as your team grows. Start with a single runner, tune the concurrency based on your instance size, and add S3 caching early - it makes a bigger difference than you'd expect.
