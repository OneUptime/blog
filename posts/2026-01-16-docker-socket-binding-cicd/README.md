# How to Use Docker Socket Binding in CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, CI/CD, DevOps, Security, Pipelines

Description: Learn how to safely use Docker socket binding in CI/CD pipelines, understand the security risks, implement protection measures, and choose the right approach for your build environment.

---

Docker socket binding (`/var/run/docker.sock`) allows containers to communicate with the host's Docker daemon. This is commonly used in CI/CD pipelines to build Docker images, but it comes with significant security implications that must be understood and mitigated.

## How Socket Binding Works

```bash
# Mount Docker socket into container
docker run -v /var/run/docker.sock:/var/run/docker.sock docker:latest docker ps
```

The container can now execute Docker commands against the host's daemon:

```
Container with Socket Access
┌──────────────────────────────────────┐
│  docker build ...                    │
│  docker run ...                      │
│  docker ps                           │
│       │                              │
│       ▼                              │
│  /var/run/docker.sock ───────────────┼──► Host Docker Daemon
└──────────────────────────────────────┘
```

## Security Risks

### Risk 1: Host Filesystem Access

```bash
# Inside container with socket access
docker run -v /:/host alpine cat /host/etc/shadow
docker run -v /:/host alpine sh -c 'echo "attacker:x:0:0::/root:/bin/bash" >> /host/etc/passwd'
```

### Risk 2: Container Escape

```bash
# Run privileged container from inside CI container
docker run --privileged -v /:/host alpine chroot /host
```

### Risk 3: Denial of Service

```bash
# Stop all containers
docker stop $(docker ps -q)

# Remove all images
docker rmi -f $(docker images -q)

# Fill disk with images
while true; do docker pull random-image; done
```

### Risk 4: Data Exfiltration

```bash
# Access secrets from other containers
docker inspect --format='{{json .Config.Env}}' production-app
```

## Mitigation Strategies

### Strategy 1: Docker Socket Proxy

Use a proxy that filters Docker API requests.

```yaml
version: '3.8'

services:
  # Socket proxy with restricted permissions
  docker-proxy:
    image: tecnativa/docker-socket-proxy
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      # Read-only operations
      - CONTAINERS=1
      - IMAGES=1
      - INFO=1
      - NETWORKS=1
      - VOLUMES=1
      # Write operations (be careful!)
      - POST=1
      - BUILD=1
      - PULL=1
      # Dangerous operations - DENY
      - EXEC=0
      - COMMIT=0
      - CONFIGS=0
      - SECRETS=0
      - SWARM=0
      - SERVICES=0
      - TASKS=0
      - NODES=0
      - PLUGINS=0
      - SYSTEM=0

  ci-runner:
    image: docker:latest
    environment:
      - DOCKER_HOST=tcp://docker-proxy:2375
    depends_on:
      - docker-proxy
```

### Strategy 2: Dedicated Build Hosts

Run CI builds on isolated, ephemeral hosts.

```yaml
# Infrastructure as Code example
resource "aws_instance" "ci_builder" {
  ami           = "ami-xxxxx"  # Docker-ready AMI
  instance_type = "c5.large"

  user_data = <<-EOF
    #!/bin/bash
    # Fresh instance for each build
    # Terminate after use
  EOF

  tags = {
    Purpose = "ephemeral-ci-builder"
  }
}
```

### Strategy 3: Rootless Docker

Run Docker daemon without root privileges.

```yaml
services:
  rootless-docker:
    image: docker:dind-rootless
    privileged: true  # Still needed but with reduced capabilities
    environment:
      - DOCKER_HOST=unix:///run/user/1000/docker.sock
    security_opt:
      - seccomp:unconfined
```

### Strategy 4: Restrict with AppArmor/SELinux

Create profiles that limit socket access.

```bash
# AppArmor profile for CI container
#include <tunables/global>

profile docker-ci flags=(attach_disconnected,mediate_deleted) {
  # Allow Docker socket
  /var/run/docker.sock rw,

  # Deny host filesystem
  deny /host/** rwklx,

  # Allow only specific Docker operations
  network,
  capability,
}
```

## CI Platform Implementations

### GitLab CI with Socket Binding

```yaml
# .gitlab-ci.yml
build:
  image: docker:latest
  services: []  # No DinD service
  variables:
    DOCKER_HOST: unix:///var/run/docker.sock
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  tags:
    - docker-socket  # Use runner with socket mounted
```

GitLab Runner configuration:
```toml
# /etc/gitlab-runner/config.toml
[[runners]]
  [runners.docker]
    volumes = ["/var/run/docker.sock:/var/run/docker.sock"]
```

### Jenkins with Socket Binding

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'docker:latest'
            args '-v /var/run/docker.sock:/var/run/docker.sock -u root'
        }
    }
    stages {
        stage('Build') {
            steps {
                sh 'docker build -t myimage:${BUILD_NUMBER} .'
            }
        }
        stage('Test') {
            steps {
                sh 'docker run --rm myimage:${BUILD_NUMBER} npm test'
            }
        }
        stage('Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                        docker push myimage:${BUILD_NUMBER}
                    '''
                }
            }
        }
    }
    post {
        always {
            sh 'docker rmi myimage:${BUILD_NUMBER} || true'
        }
    }
}
```

### GitHub Actions Self-Hosted Runner

```yaml
# .github/workflows/build.yml
name: Build

on: push

jobs:
  build:
    runs-on: self-hosted
    container:
      image: docker:latest
      volumes:
        - /var/run/docker.sock:/var/run/docker.sock

    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: docker build -t myimage .

      - name: Test
        run: docker run --rm myimage npm test
```

### CircleCI with Machine Executor

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  build:
    machine:
      image: ubuntu-2204:current
    steps:
      - checkout
      - run:
          name: Build Image
          command: docker build -t myimage .
      - run:
          name: Test
          command: docker run --rm myimage npm test
```

## Best Practices

### 1. Minimal Permissions

```yaml
# Only mount what you need
services:
  ci:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro  # Read-only when possible
```

### 2. Clean Up After Builds

```bash
#!/bin/bash
# cleanup.sh - Run after each build

# Remove containers created during build
docker rm -f $(docker ps -aq --filter "label=ci-build=$BUILD_ID") 2>/dev/null || true

# Remove images
docker rmi $(docker images -q --filter "label=ci-build=$BUILD_ID") 2>/dev/null || true

# Prune dangling images
docker image prune -f
```

### 3. Label CI Resources

```dockerfile
# Dockerfile
LABEL ci-build="${BUILD_ID}"
LABEL ci-pipeline="${PIPELINE_NAME}"
```

```bash
docker build --label "ci-build=$BUILD_ID" -t myimage .
```

### 4. Use Build Cache Carefully

```yaml
services:
  builder:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - build-cache:/root/.docker/buildx
    environment:
      - DOCKER_BUILDKIT=1

volumes:
  build-cache:
```

### 5. Audit Socket Access

```bash
#!/bin/bash
# audit-docker.sh

# Log all Docker commands
export DOCKER_HOST=unix:///var/run/docker.sock

# Wrapper function
docker() {
    echo "[$(date)] docker $*" >> /var/log/docker-audit.log
    /usr/bin/docker "$@"
}
export -f docker
```

## Complete Secure Pipeline Example

```yaml
version: '3.8'

services:
  # Proxy to filter dangerous operations
  docker-proxy:
    image: tecnativa/docker-socket-proxy
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - LOG=1
      - CONTAINERS=1
      - IMAGES=1
      - NETWORKS=1
      - BUILD=1
      - POST=1
      - EXEC=0
      - COMMIT=0
    networks:
      - ci-internal

  # Build container
  builder:
    image: docker:latest
    environment:
      - DOCKER_HOST=tcp://docker-proxy:2375
      - DOCKER_BUILDKIT=1
    volumes:
      - ./:/workspace:ro
      - build-output:/output
    working_dir: /workspace
    depends_on:
      - docker-proxy
    networks:
      - ci-internal
    command: |
      sh -c "
        docker build -t myapp:build .
        docker create --name extract myapp:build
        docker cp extract:/app/dist /output/
        docker rm extract
      "

  # Test container (no Docker access)
  tester:
    image: node:20
    volumes:
      - build-output:/app:ro
    working_dir: /app
    depends_on:
      - builder
    command: npm test

volumes:
  build-output:

networks:
  ci-internal:
```

## Comparison: Socket Binding vs Alternatives

| Approach | Security | Performance | Complexity | Layer Caching |
|----------|----------|-------------|------------|---------------|
| Socket binding | Low | High | Low | Shared |
| Socket + proxy | Medium | High | Medium | Shared |
| DinD | Medium-High | Medium | High | Isolated |
| Kaniko | High | Medium | Medium | BuildKit cache |
| Buildah | High | High | Medium | Layer cache |

## Summary

| Scenario | Recommendation |
|----------|---------------|
| Trusted internal code | Socket binding + proxy |
| Untrusted/external code | DinD or Kaniko |
| High security requirements | Ephemeral VMs + Kaniko |
| Performance critical | Socket binding with audit |
| Multi-tenant CI | DinD with strict isolation |

Docker socket binding is convenient but dangerous. Always use a socket proxy to restrict API access, implement cleanup procedures, and consider alternatives like Kaniko for untrusted code. The convenience of shared layer caching must be weighed against the security risks of host access.

