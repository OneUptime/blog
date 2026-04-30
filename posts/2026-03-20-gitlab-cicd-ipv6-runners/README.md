# How to Configure GitLab CI/CD with IPv6 Runners

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GitLab, CI/CD, Runner, Docker, DevOps

Description: Configure GitLab CI/CD runners to use IPv6 networking, enable IPv6 in Docker executor builds, and test IPv6 connectivity in GitLab CI pipelines.

## Introduction

GitLab CI/CD runners support IPv6 for both the runner registration communication and the build environment. Enabling IPv6 in GitLab CI requires configuring the runner's `config.toml`, enabling IPv6 in Docker networks, and ensuring the GitLab instance itself is reachable over IPv6.

## Step 1: Configure GitLab Runner for IPv6

```toml
# /etc/gitlab-runner/config.toml

concurrent = 4
check_interval = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "ipv6-docker-runner"
  url = "https://gitlab.example.com"
  token = "<your-runner-authentication-token>"
  executor = "docker"

  [runners.docker]
    tls_verify = false
    image = "ubuntu:22.04"
    privileged = true
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/certs/client", "/cache"]

    # Attach job and service containers to an IPv6-enabled Docker network
    network_mode = "ipv6-ci-net"

    # Optional: ensure IPv6 is not disabled inside job containers
    [runners.docker.sysctls]
      "net.ipv6.conf.all.disable_ipv6" = "0"
```

## Step 2: Create IPv6-Enabled Docker Network for Builds

```bash
# Create a Docker network with IPv6 support for GitLab CI builds

docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 2001:db8:100::/64 \
    --gateway 2001:db8:100::1 \
    ipv6-ci-net

# Verify network was created with IPv6
docker network inspect ipv6-ci-net | python3 -m json.tool | grep -A5 IPAM
```

Or add to `/etc/docker/daemon.json`:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64",
  "ip6tables": true
}
```

```bash
# Apply the Docker daemon changes
sudo systemctl restart docker
```

## Step 3: Register the Runner with IPv6

```bash
# Register the runner, ensuring gitlab.example.com resolves to an IPv6 address
gitlab-runner register \
    --non-interactive \
    --url https://gitlab.example.com/ \
    --token "$RUNNER_AUTHENTICATION_TOKEN" \
    --executor docker \
    --docker-image ubuntu:22.04 \
    --description "IPv6 Docker Runner"
```

## Step 4: GitLab CI Pipeline with IPv6 Tests

```yaml
# .gitlab-ci.yml

variables:
  DOCKER_BUILDKIT: "1"

stages:
  - test
  - build
  - deploy

ipv6-connectivity-test:
  stage: test
  image: ubuntu:22.04
  tags:
    - ipv6
  script:
    # Install networking tools
    - apt-get update -q && apt-get install -y iputils-ping curl dnsutils
    # Test IPv6 connectivity from the CI environment
    - ip -6 addr show
    - ping -6 -c 3 2606:4700:4700::1111
    - curl -6 https://ipv6.icanhazip.com
    - dig AAAA example.com +short

build-with-ipv6:
  stage: build
  image: docker:24
  services:
    - name: docker:24-dind
      command: ["--ipv6", "--fixed-cidr-v6=2001:db8:200::/64"]
  tags:
    - ipv6
  variables:
    DOCKER_HOST: tcp://docker:2376
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    # Build Docker image - base images pulled over IPv6 if available
    - docker build -t myapp:$CI_COMMIT_SHA .
    # Test IPv6 connectivity from a container started by the DinD daemon
    - docker run --rm ubuntu:22.04 sh -c "apt-get update -q && apt-get install -y curl ca-certificates && curl -6 https://example.com"

deploy-to-ipv6-cluster:
  stage: deploy
  image: portainer/kubectl-shell:latest
  tags:
    - ipv6
  script:
    # Deploy to Kubernetes cluster with IPv6 addresses
    - kubectl apply -f k8s/
    # Wait for rollout and verify IPv6 service
    - kubectl rollout status deployment/myapp
    - kubectl get svc myapp -o jsonpath='{.status.loadBalancer.ingress}'
  only:
    - main
```

## Step 5: GitLab Runner Docker Network IPv6 Verification

```bash
# Verify that CI containers get IPv6 addresses
docker run --rm --network ipv6-ci-net ubuntu:22.04 ip -6 addr show

# Test connectivity from a CI-like container
docker run --rm --network ipv6-ci-net ubuntu:22.04 \
    sh -c "apt-get update -q && apt-get install -y iputils-ping && ping -6 -c 3 2606:4700:4700::1111"
```

## Troubleshooting

```bash
# If containers don't get IPv6 addresses:
# 1. Check Docker daemon has IPv6 enabled
docker info | grep IPv6
# If you're using docker:dind, run the same command inside the CI job

# 2. Check ip6tables rules are not blocking
ip6tables -L DOCKER -n

# 3. Check that the network has IPv6 configured
docker network inspect ipv6-ci-net

# 4. Ensure kernel has IPv6 enabled
sysctl net.ipv6.conf.all.disable_ipv6
# Must be 0
```

## Conclusion

GitLab CI/CD runners support IPv6 by configuring `config.toml` to use IPv6-enabled Docker networks and ensuring the Docker daemon has IPv6 enabled. If your pipeline uses Docker-in-Docker, the DinD daemon must also start with IPv6 enabled so child containers receive IPv6 addresses. This enables testing IPv6-specific features, pulling dependencies over IPv6, and deploying to IPv6-only or dual-stack infrastructure directly from CI pipelines.
