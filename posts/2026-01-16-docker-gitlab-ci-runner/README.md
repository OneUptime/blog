# How to Set Up Docker with GitLab CI Runner

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, GitLab, CI/CD, DevOps, Runners

Description: Learn how to set up and configure GitLab CI Runner with Docker executor, including registration, configuration options, caching strategies, and troubleshooting common issues.

---

GitLab CI Runner with Docker executor provides isolated, reproducible build environments for CI/CD pipelines. This guide covers installation, configuration, and optimization of GitLab runners using Docker.

## Runner Architecture

```
GitLab Server
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                    GitLab Runner                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Docker Executor                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │  Job 1  │  │  Job 2  │  │  Job 3  │            │   │
│  │  │Container│  │Container│  │Container│            │   │
│  │  └─────────┘  └─────────┘  └─────────┘            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Installing GitLab Runner

### Linux Installation

```bash
# Add GitLab repository
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash

# Install runner
sudo apt-get install gitlab-runner

# Verify installation
gitlab-runner --version
```

### Docker-based Runner

```bash
# Run GitLab Runner in Docker
docker run -d \
  --name gitlab-runner \
  --restart always \
  -v /srv/gitlab-runner/config:/etc/gitlab-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gitlab/gitlab-runner:latest
```

### Docker Compose Installation

```yaml
version: '3.8'

services:
  gitlab-runner:
    image: gitlab/gitlab-runner:latest
    restart: always
    volumes:
      - ./config:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - TZ=UTC
```

## Registering a Runner

### Interactive Registration

```bash
# Register runner interactively
gitlab-runner register

# You'll be prompted for:
# - GitLab instance URL
# - Registration token
# - Runner description
# - Tags
# - Executor type (choose docker)
# - Default Docker image
```

### Non-Interactive Registration

```bash
# Register with all options
gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com/" \
  --registration-token "PROJECT_REGISTRATION_TOKEN" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --description "docker-runner" \
  --tag-list "docker,linux" \
  --run-untagged="true" \
  --locked="false"
```

### Registration with Docker Compose

```yaml
version: '3.8'

services:
  gitlab-runner:
    image: gitlab/gitlab-runner:latest
    restart: always
    volumes:
      - ./config:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CI_SERVER_URL=https://gitlab.com/
      - REGISTRATION_TOKEN=${GITLAB_REGISTRATION_TOKEN}
      - RUNNER_NAME=docker-runner
      - RUNNER_EXECUTOR=docker
      - DOCKER_IMAGE=alpine:latest

  register:
    image: gitlab/gitlab-runner:latest
    volumes:
      - ./config:/etc/gitlab-runner
    command: >
      register
        --non-interactive
        --url "${CI_SERVER_URL}"
        --registration-token "${REGISTRATION_TOKEN}"
        --executor "docker"
        --docker-image "alpine:latest"
        --description "docker-runner"
    depends_on:
      - gitlab-runner
    profiles:
      - register
```

## Runner Configuration

### Basic Configuration

```toml
# /etc/gitlab-runner/config.toml
concurrent = 4
check_interval = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "docker-runner"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  [runners.docker]
    tls_verify = false
    image = "alpine:latest"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache"]
    shm_size = 0
```

### Advanced Docker Executor Configuration

```toml
[[runners]]
  name = "advanced-docker-runner"
  url = "https://gitlab.com/"
  token = "RUNNER_TOKEN"
  executor = "docker"

  [runners.docker]
    # Base image
    image = "docker:latest"

    # Privileged mode (needed for DinD)
    privileged = true

    # Volume mounts
    volumes = [
      "/cache",
      "/var/run/docker.sock:/var/run/docker.sock",
      "/builds:/builds:rw"
    ]

    # Network mode
    network_mode = "bridge"

    # Resource limits
    memory = "2g"
    cpus = "2"

    # Pull policy
    pull_policy = ["if-not-present"]

    # DNS settings
    dns = ["8.8.8.8", "8.8.4.4"]

    # Extra hosts
    extra_hosts = ["registry.local:192.168.1.100"]

    # Environment variables
    environment = ["DOCKER_DRIVER=overlay2"]

    # Disable cache
    disable_cache = false

    # Cache directory
    cache_dir = "/cache"

    # Allowed images (security)
    allowed_images = ["ruby:*", "python:*", "node:*"]

    # Services configuration
    services_limit = 3
```

## Docker-in-Docker (DinD) Setup

### Enabling DinD

```toml
[[runners]]
  name = "dind-runner"
  executor = "docker"

  [runners.docker]
    image = "docker:latest"
    privileged = true
    volumes = ["/cache", "/certs/client"]
```

### GitLab CI with DinD

```yaml
# .gitlab-ci.yml
image: docker:latest

services:
  - docker:dind

variables:
  DOCKER_HOST: tcp://docker:2376
  DOCKER_TLS_CERTDIR: "/certs"
  DOCKER_CERT_PATH: "/certs/client"
  DOCKER_TLS_VERIFY: 1

stages:
  - build
  - test
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

### DinD Without TLS (Development)

```yaml
services:
  - name: docker:dind
    command: ["--tls=false"]

variables:
  DOCKER_HOST: tcp://docker:2375
  DOCKER_TLS_CERTDIR: ""
```

## Socket Binding Alternative

For better performance, bind the Docker socket instead of using DinD.

```toml
# config.toml
[[runners]]
  name = "socket-runner"
  executor = "docker"

  [runners.docker]
    image = "docker:latest"
    privileged = false
    volumes = [
      "/var/run/docker.sock:/var/run/docker.sock",
      "/cache"
    ]
```

```yaml
# .gitlab-ci.yml
image: docker:latest

variables:
  DOCKER_HOST: unix:///var/run/docker.sock

build:
  script:
    - docker build -t myimage .
```

## Caching Configuration

### Local Cache

```toml
[[runners]]
  [runners.docker]
    volumes = ["/cache"]
    cache_dir = "/cache"
    disable_cache = false

  [runners.cache]
    Type = "local"
    Path = "/cache"
    Shared = true
```

### S3 Cache

```toml
[[runners]]
  [runners.cache]
    Type = "s3"
    Path = "runner-cache"
    Shared = true

    [runners.cache.s3]
      ServerAddress = "s3.amazonaws.com"
      AccessKey = "ACCESS_KEY"
      SecretKey = "SECRET_KEY"
      BucketName = "gitlab-runner-cache"
      BucketLocation = "us-east-1"
```

### GCS Cache

```toml
[[runners]]
  [runners.cache]
    Type = "gcs"
    Path = "runner-cache"
    Shared = true

    [runners.cache.gcs]
      BucketName = "gitlab-runner-cache"
      CredentialsFile = "/path/to/credentials.json"
```

### Using Cache in Pipeline

```yaml
# .gitlab-ci.yml
variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .npm/
    - node_modules/

stages:
  - build
  - test

build:
  stage: build
  image: node:20
  script:
    - npm ci --cache .npm --prefer-offline
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

test:
  stage: test
  image: node:20
  script:
    - npm ci --cache .npm --prefer-offline
    - npm test
```

## Service Containers

### Database Services

```yaml
test:
  image: python:3.11
  services:
    - name: postgres:15
      alias: db
    - name: redis:7
      alias: cache
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: runner
    POSTGRES_PASSWORD: password
    DATABASE_URL: postgresql://runner:password@db:5432/test
    REDIS_URL: redis://cache:6379
  script:
    - pip install -r requirements.txt
    - pytest
```

### Custom Service Configuration

```yaml
test:
  image: node:20
  services:
    - name: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
      alias: elasticsearch
      command: ["bin/elasticsearch", "-Expack.security.enabled=false", "-Ediscovery.type=single-node"]
  variables:
    ELASTICSEARCH_URL: http://elasticsearch:9200
  script:
    - npm test
```

## Multi-Runner Setup

### Running Multiple Runners

```toml
# config.toml with multiple runners
concurrent = 10

[[runners]]
  name = "build-runner"
  url = "https://gitlab.com/"
  token = "TOKEN_1"
  executor = "docker"
  tag_list = ["build"]

  [runners.docker]
    image = "docker:latest"
    privileged = true
    memory = "4g"
    cpus = "4"

[[runners]]
  name = "test-runner"
  url = "https://gitlab.com/"
  token = "TOKEN_2"
  executor = "docker"
  tag_list = ["test"]

  [runners.docker]
    image = "node:20"
    privileged = false
    memory = "2g"
    cpus = "2"

[[runners]]
  name = "deploy-runner"
  url = "https://gitlab.com/"
  token = "TOKEN_3"
  executor = "docker"
  tag_list = ["deploy"]

  [runners.docker]
    image = "alpine:latest"
    privileged = false
```

### Docker Compose Multi-Runner

```yaml
version: '3.8'

services:
  runner-build:
    image: gitlab/gitlab-runner:latest
    restart: always
    volumes:
      - ./config-build:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - RUNNER_TAG_LIST=build,docker

  runner-test:
    image: gitlab/gitlab-runner:latest
    restart: always
    volumes:
      - ./config-test:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - RUNNER_TAG_LIST=test

  runner-deploy:
    image: gitlab/gitlab-runner:latest
    restart: always
    volumes:
      - ./config-deploy:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - RUNNER_TAG_LIST=deploy
```

## Security Configuration

### Restricting Runner Access

```toml
[[runners]]
  [runners.docker]
    # Only allow specific images
    allowed_images = [
      "node:*",
      "python:*",
      "ruby:*",
      "golang:*",
      "registry.example.com/*"
    ]

    # Only allow specific services
    allowed_services = [
      "postgres:*",
      "redis:*",
      "mysql:*"
    ]

    # Disable privileged mode
    privileged = false

    # Drop capabilities
    cap_drop = ["ALL"]
    cap_add = ["NET_BIND_SERVICE"]
```

### Using Docker Socket Proxy

```yaml
version: '3.8'

services:
  docker-proxy:
    image: tecnativa/docker-socket-proxy
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - CONTAINERS=1
      - IMAGES=1
      - BUILD=1
      - POST=1
      - EXEC=0
    networks:
      - runner-network

  gitlab-runner:
    image: gitlab/gitlab-runner:latest
    restart: always
    volumes:
      - ./config:/etc/gitlab-runner
    environment:
      - DOCKER_HOST=tcp://docker-proxy:2375
    networks:
      - runner-network
    depends_on:
      - docker-proxy

networks:
  runner-network:
```

## Complete Production Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - security
  - deploy

variables:
  DOCKER_BUILDKIT: 1
  DOCKER_CLI_EXPERIMENTAL: enabled

.docker_login: &docker_login
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2376
    DOCKER_TLS_CERTDIR: "/certs"
  <<: *docker_login
  script:
    - docker build
        --cache-from $CI_REGISTRY_IMAGE:latest
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        --tag $CI_REGISTRY_IMAGE:latest
        --build-arg BUILDKIT_INLINE_CACHE=1
        .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  tags:
    - docker
    - build

test:unit:
  stage: test
  image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  services:
    - name: postgres:15
      alias: db
  variables:
    DATABASE_URL: postgresql://postgres:postgres@db:5432/test
  script:
    - npm test
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura.xml
  tags:
    - docker
    - test

test:integration:
  stage: test
  image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  services:
    - name: postgres:15
      alias: db
    - name: redis:7
      alias: cache
  script:
    - npm run test:integration
  tags:
    - docker
    - test

security:scan:
  stage: security
  image: docker:latest
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2376
  script:
    - docker run --rm
        -v /var/run/docker.sock:/var/run/docker.sock
        aquasec/trivy image
        --exit-code 1
        --severity HIGH,CRITICAL
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  allow_failure: true
  tags:
    - docker
    - security

deploy:staging:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - curl -X POST
        -H "Authorization: Bearer $DEPLOY_TOKEN"
        "$DEPLOY_URL/staging?image=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop
  tags:
    - deploy

deploy:production:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache curl
  script:
    - curl -X POST
        -H "Authorization: Bearer $DEPLOY_TOKEN"
        "$DEPLOY_URL/production?image=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
  environment:
    name: production
    url: https://example.com
  when: manual
  only:
    - main
  tags:
    - deploy
```

## Troubleshooting

### Runner Not Picking Up Jobs

```bash
# Check runner status
gitlab-runner status

# Verify registration
gitlab-runner verify

# Check logs
journalctl -u gitlab-runner -f

# Or for Docker-based runner
docker logs -f gitlab-runner
```

### Docker Permission Issues

```bash
# Add gitlab-runner user to docker group
sudo usermod -aG docker gitlab-runner

# Restart runner
sudo gitlab-runner restart
```

### Service Container Connection Issues

```yaml
# Use alias for service hostname
services:
  - name: postgres:15
    alias: db  # Connect using "db" as hostname

# Wait for service to be ready
before_script:
  - until pg_isready -h db -U postgres; do sleep 1; done
```

### Cache Not Working

```bash
# Verify cache volume
docker volume ls | grep cache

# Check cache directory permissions
docker exec gitlab-runner ls -la /cache
```

## Summary

| Configuration | Use Case | Performance |
|--------------|----------|-------------|
| Docker executor | Standard builds | Good |
| DinD | Building Docker images | Slower |
| Socket binding | Building Docker images | Fast |
| Privileged mode | DinD, system tests | Security risk |
| S3/GCS cache | Distributed runners | Good |

For building Docker images, socket binding offers better performance than DinD but requires careful security configuration. Use GitLab's built-in container registry for seamless integration, and configure caching to speed up repeated builds. For more on Docker socket security, see our post on [Docker Socket Binding in CI/CD Pipelines](https://oneuptime.com/blog/post/2026-01-16-docker-socket-binding-cicd/view).

