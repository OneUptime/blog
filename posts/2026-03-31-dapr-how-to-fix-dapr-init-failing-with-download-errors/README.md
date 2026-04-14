# How to Fix 'dapr init' Failing with Download Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Troubleshooting, Installation, Docker, Networking

Description: Learn how to diagnose and fix common download errors when running 'dapr init' in self-hosted or Kubernetes mode.

---

## Overview

Running `dapr init` is the first step to setting up Dapr on your machine, but it can fail due to network restrictions, proxy configurations, Docker issues, or GitHub rate limiting. This guide walks through the most common failure modes and how to resolve each one.

## Common Error Messages

When `dapr init` fails, you'll typically see one of these errors:

```text
❌  Failed to download binaries: Get "https://github.com/dapr/dapr/releases/download/...": dial tcp: connection refused
❌  Failed to install Dapr: error getting releases from url: ...
❌  Error response from daemon: pull access denied for daprio/dapr
```

## Diagnosing the Root Cause

Start by running init with JSON-formatted output for easier diagnosis:

```bash
dapr init --log-as-json
```

Check the Dapr CLI version:

```bash
dapr --version
```

Try manually downloading the Dapr binary to confirm network access:

```bash
curl -I https://github.com/dapr/dapr/releases/latest
```

## Fix 1 - Set a Specific Runtime Version

If the latest release has a download issue or there is a GitHub API rate limit, pin to a known working version:

```bash
dapr init --runtime-version 1.13.0
```

List available versions at:

```bash
curl -s https://api.github.com/repos/dapr/dapr/releases | jq '.[].tag_name' | head -10
```

## Fix 2 - Configure HTTP Proxy

If you are behind a corporate proxy, export proxy settings before running init:

```bash
export HTTP_PROXY=http://proxy.corp.example.com:8080
export HTTPS_PROXY=http://proxy.corp.example.com:8080
export NO_PROXY=localhost,127.0.0.1

dapr init
```

For Windows (PowerShell):

```powershell
$env:HTTP_PROXY = "http://proxy.corp.example.com:8080"
$env:HTTPS_PROXY = "http://proxy.corp.example.com:8080"
dapr init
```

## Fix 3 - Docker Pull Failures

Dapr init pulls Docker images for Redis and Zipkin. If Docker Hub is inaccessible, use a mirror or pre-pull images from an accessible registry:

```bash
# Check if Docker is running
docker info

# Pre-pull required images manually
docker pull redis:6
docker pull openzipkin/zipkin

# Then run init normally - it will use the pre-pulled images
dapr init
```

For airgapped environments, retag images from an internal registry:

```bash
docker pull internal-registry.corp.com/redis:6
docker tag internal-registry.corp.com/redis:6 redis:6
docker pull internal-registry.corp.com/zipkin:latest
docker tag internal-registry.corp.com/zipkin:latest openzipkin/zipkin
dapr init
```

## Fix 4 - Use Slim Mode

Slim mode installs the Dapr binary without setting up the placement service, scheduler service, Redis, or Zipkin containers:

```bash
dapr init --slim
```

After slim init, you can configure components manually in `~/.dapr/components/`:

```yaml
# ~/.dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

## Fix 5 - Verify Firewall Rules

Dapr init needs outbound access to:
- `github.com` (port 443) - binary downloads
- `hub.docker.com` (port 443) - container images
- `ghcr.io` (port 443) - container images

Test connectivity:

```bash
curl -v https://github.com
curl -v https://registry-1.docker.io/v2/
```

If curl works but dapr init doesn't, check if TLS inspection is stripping certificates:

```bash
openssl s_client -connect github.com:443 -showcerts
```

## Fix 6 - Kubernetes Init Failures

For `dapr init -k`, check the image pull policy and registry:

```bash
# Check if pods are stuck in ImagePullBackOff
kubectl get pods -n dapr-system

# Describe a failing pod
kubectl describe pod -n dapr-system -l app=dapr-operator

# Use a custom image registry
dapr init -k --image-registry docker.io/daprio
```

Create an image pull secret if authentication is needed:

```bash
kubectl create secret docker-registry dapr-pull-secret \
  --docker-server=your-registry.example.com \
  --docker-username=user \
  --docker-password=password \
  -n dapr-system
```

## Verify Successful Installation

After resolving the issue, confirm Dapr is running:

```bash
# Self-hosted - verify containers are running
docker ps --filter name=dapr_

# Kubernetes
dapr status -k
```

Expected output for self-hosted:

```text
CONTAINER ID   IMAGE               COMMAND                  STATUS         NAMES
...            daprio/dapr:...     "./placement"            Up X minutes   dapr_placement
...            redis:6             "docker-entrypoint.s…"   Up X minutes   dapr_redis
...            openzipkin/zipkin   "start-zipkin"           Up X minutes   dapr_zipkin
```

## Summary

"dapr init" download failures are almost always caused by network restrictions, proxy misconfiguration, Docker Hub rate limits, or version pinning issues. By diagnosing with verbose logging, using slim mode for airgapped environments, and setting proper proxy variables, you can get Dapr running on virtually any infrastructure. Always verify your Docker daemon is healthy and that outbound HTTPS traffic to GitHub and Docker Hub is allowed.
