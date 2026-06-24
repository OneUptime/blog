# How to Fix Tab Switching Causing Long Reloads in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Performance, UI, Browser, Caching

Description: Learn how to fix excessive reload times when switching between Portainer tabs, caused by repeated API calls and lack of UI state caching.

---

Switching between Portainer views (Containers, Images, Volumes, Networks) can trigger fresh API calls. On large environments or slow connections, each tab switch can take several seconds. This guide explains why it happens and how to reduce it.

## Why Tab Switching Triggers Reloads

Portainer refreshes environment data when you navigate between views. For Docker environments, that can translate into repeated Docker Engine API requests, which keeps the UI current but can be slow when:

- The Docker host has hundreds of resources
- There is high network latency between the Portainer Server and the managed environment
- The Docker daemon itself is slow to respond to API calls

## Step 1: Check Docker API Response Times

```bash
# Measure the raw Docker API response time for the containers endpoint

time curl -s --unix-socket /var/run/docker.sock \
  http://localhost/containers/json?all=1 | wc -c

# If this takes a noticeable amount of time, Docker API latency is likely part of the problem
# This is common on hosts with many stopped containers
```

## Step 2: Reduce Number of Containers

One common improvement is removing stopped containers, because the `containers/json?all=1` response includes them:

```bash
# Remove all stopped containers
docker container prune -f

# Count remaining containers
docker ps -aq | wc -l
```

## Step 3: Use Portainer Front-End Data Caching Where Available

For Kubernetes environments, Portainer supports front-end data caching as a per-user setting. It is not configured under **Settings > General**:

1. Click your username in the top-right and open **My account**.
2. Under **Application settings**, enable **front-end data caching** for Kubernetes environments if you want faster cluster views.

Portainer notes that cached Kubernetes data in your session can take up to five minutes to reflect outside changes. Portainer does not document an equivalent front-end caching setting for Docker environments.

## Step 4: Use a Faster Storage Backend

Portainer stores its configuration in a BoltDB database on the `/data` volume. Slow storage can affect Portainer itself, so check that the Portainer data volume is not backed by slow spinning storage.

```bash
# If you deployed Portainer with the default Docker volume,
# inspect where the Portainer data volume is stored
docker volume inspect --format '{{ .Mountpoint }}' portainer_data
```

If that volume is on slow spinning storage, moving it to SSD-backed storage can help Portainer's own database operations.

## Step 5: Deploy Portainer Closer to the Docker Host

Network round-trip time between the Portainer Server and the managed environment adds latency to every refresh. For remote Docker environments, Portainer documents direct Docker API connections as a legacy option and recommends the Edge Agent for most use cases.

## Step 6: Browser-Side Optimization

Keep only one Portainer browser tab open while troubleshooting. Multiple open tabs can generate duplicate refresh traffic from the same browser session.

Disable browser extensions (ad blockers, privacy tools) on the Portainer URL while testing, since browser extensions can intercept or modify requests.
