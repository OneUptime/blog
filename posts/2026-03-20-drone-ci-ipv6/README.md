# How to Configure Drone CI with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Drone CI, CI/CD, Docker, DevOps, Pipeline

Description: Configure Drone CI server and runners to support IPv6 networking, enable IPv6 in pipeline containers, and test IPv6 connectivity in Drone pipeline steps.

## Introduction

Drone CI is a container-native CI/CD platform where every pipeline step runs in a Docker container. Enabling IPv6 for pipelines requires configuring Docker networking on the Drone runner hosts and optionally the Drone server itself.

## Step 1: Configure Drone Server with IPv6

```yaml
# docker-compose.yml - Drone server with IPv6 binding

services:
  drone:
    image: drone/drone:2
    container_name: drone
    environment:
      DRONE_GITHUB_CLIENT_ID: <github-client-id>
      DRONE_GITHUB_CLIENT_SECRET: <github-client-secret>
      DRONE_RPC_SECRET: <shared-secret>
      DRONE_SERVER_HOST: drone.example.com
      DRONE_SERVER_PROTO: https
    ports:
      # Docker publishes to IPv4 and IPv6 by default on dual-stack hosts
      - "80:80"
      - "443:443"
    volumes:
      - drone-data:/data
    networks:
      - drone-net

networks:
  drone-net:
    enable_ipv6: true
    ipam:
      config:
        - subnet: "fd12:3456:7890::/64"

volumes:
  drone-data:
```

## Step 2: Configure Drone Runner with Docker IPv6

```yaml
# docker-compose.runner.yml - Drone Docker runner with IPv6-enabled pipeline network

services:
  drone-runner:
    image: drone/drone-runner-docker:1
    container_name: drone-runner
    environment:
      DRONE_RPC_PROTO: https
      DRONE_RPC_HOST: drone.example.com
      DRONE_RPC_SECRET: <shared-secret>
      DRONE_RUNNER_CAPACITY: 4
      DRONE_RUNNER_NAME: ipv6-runner
      # Attach all pipeline containers to the pre-created IPv6 network
      DRONE_RUNNER_NETWORKS: drone-ipv6
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
```

## Step 3: Docker IPv6 Configuration on Runner Host

```bash
# Create an IPv6-enabled Docker network on the Drone runner host

docker network create --ipv6 --subnet fd12:3456:789a::/64 drone-ipv6

# Verify Docker IPv6

docker run --rm --network drone-ipv6 busybox ip -6 addr
```

## Step 4: Write a Drone Pipeline with IPv6 Steps

```yaml
# .drone.yml

kind: pipeline
type: docker
name: ipv6-pipeline

steps:
  - name: verify-ipv6
    image: ubuntu:22.04
    commands:
      # Install networking tools
      - apt-get update -q && apt-get install -y -q iputils-ping iproute2
      # Check IPv6 address in container
      - ip -6 addr show
      # Verify the IPv6 stack is available in the container
      - ping -6 -c 2 ::1

  - name: run-tests
    image: python:3.12
    environment:
      APP_IPV6_ENABLED: "true"
    commands:
      - pip install -q pytest requests
      - python -m pytest tests/ -v
    depends_on:
      - verify-ipv6

  - name: build-docker-image
    image: plugins/docker
    settings:
      repo: myregistry.example.com/myapp
      username:
        from_secret: docker_username
      password:
        from_secret: docker_password
      tags:
        - ${DRONE_COMMIT_SHA:0:8}
        - latest
      registry: myregistry.example.com
      # Enable IPv6 in the plugin's Docker daemon when the registry is reachable over IPv6
      ipv6: true
    depends_on:
      - run-tests
    when:
      branch:
        - main

---
# Pipeline with service containers (e.g., IPv6 test server)
kind: pipeline
type: docker
name: ipv6-integration

services:
  - name: test-nginx
    image: nginx:latest

steps:
  - name: wait-for-services
    image: busybox
    commands:
      - sleep 5

  - name: test-service-ipv6
    image: ubuntu:22.04
    commands:
      - apt-get update -q && apt-get install -y -q curl iproute2
      # Drone services are reachable by name on the pipeline network
      # Check if the attached network has IPv6
      - ip -6 addr show
      # Test HTTP connectivity to the service over IPv6
      - curl -6 -v http://test-nginx/
```

## Step 5: IPv6 Network Configuration for Drone Pipelines

Drone uses Docker networks to connect pipeline steps. Drone does not expose Docker IPAM settings in `.drone.yml`, so IPv6 needs to be configured on the Docker network that the runner attaches to pipeline containers.

```yaml
# .drone.yml network verification

kind: pipeline
type: docker
name: ipv6-network-test

platform:
  os: linux
  arch: amd64

steps:
  - name: inspect-network
    image: python:3.12
    commands:
      - apt-get update -q && apt-get install -y -q iproute2
      - ip -6 addr show
      - ip -6 route show

  - name: ipv6-test
    image: python:3.12
    commands:
      - python3 -c "import socket; print(socket.has_ipv6)"
      - python3 -c "import socket; s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM); s.bind(('::', 0)); print('IPv6 socket binding OK:', s.getsockname()); s.close()"
```

## Verifying Drone Pipeline IPv6

```bash
# Check Drone runner logs for IPv6-related issues
docker logs drone-runner 2>&1 | grep -i ipv6

# Inspect a running pipeline container attached to the IPv6 network
CONTAINER_ID=$(docker ps --filter network=drone-ipv6 -q | head -n 1)
docker exec "$CONTAINER_ID" ip -6 addr show

# Check the IPv6-enabled Docker network used by pipeline containers
docker network inspect drone-ipv6 | python3 -m json.tool | grep -A10 EnableIPv6
```

## Conclusion

Drone CI's container-native architecture means IPv6 support is primarily a Docker networking concern. Attaching pipeline containers to an IPv6-enabled Docker network on the runner host provides IPv6 addresses inside pipeline steps. The `.drone.yml` pipeline can then test IPv6 connectivity in steps, build and push images with the Docker plugin's IPv6 mode, and deploy to IPv6 infrastructure. For service containers, steps can reach the service by name and force IPv6 with `curl -6` when the attached Docker network has IPv6 enabled.
