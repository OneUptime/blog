# How to Fix Agent Secret Mismatch Between Server and Agent - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Agent, Security, Authentication

Description: Resolve authentication failures between Portainer server and agent caused by AGENT_SECRET mismatches, including how to correctly configure and synchronize secrets.

## Introduction

When using `AGENT_SECRET` for secure agent-to-server communication, both the Portainer Server container and the agent container must use the exact same secret. A mismatch results in authentication failures, often surfacing as "Unable to connect to agent" or signature/authentication errors. This guide explains how to diagnose and fix this.

## How AGENT_SECRET Works

The `AGENT_SECRET` is a pre-shared key used to authenticate connections between the Portainer server and the Agent. When set:
- The Agent only accepts connections from Portainer instances configured with the matching `AGENT_SECRET`
- The Portainer Server container must also be started with the same `AGENT_SECRET` value
- Both must be identical - case-sensitive

## Step 1: Check the Agent's Secret

```bash
# Check what secret the agent is configured with

docker inspect portainer-agent | grep -i "AGENT_SECRET"

# Example output showing the secret is set:
# "AGENT_SECRET=mysecret123"

# Check via environment
docker exec portainer-agent env | grep AGENT_SECRET
```

## Step 2: Check the Portainer Server's Secret

```bash
# Replace "portainer" with your Portainer Server container name if different

# Check what secret the Portainer Server is configured with
docker inspect portainer | grep -i "AGENT_SECRET"

# Check via environment
docker exec portainer env | grep AGENT_SECRET
```

If the Portainer Server has no `AGENT_SECRET` set, or it is different from the agent's value, that's the mismatch.

## Step 3: Fix - Update the Portainer Server Secret

1. Stop and remove the current Portainer Server container
2. Redeploy it using your normal Portainer Server install command, but add `-e AGENT_SECRET="the-agent-secret"`
3. Start it again
4. Verify the value with `docker exec portainer env | grep AGENT_SECRET`

## Step 4: Fix - Update the Agent Secret

If you want to change the secret to match what the Portainer Server is using:

```bash
# Stop and remove the current agent
docker stop portainer-agent
docker rm portainer-agent

# Redeploy with the correct secret
docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -e AGENT_SECRET="the-secret-portainer-expects" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest

# Verify the secret is set
docker exec portainer-agent env | grep AGENT_SECRET
```

After changing the agent secret, make sure the Portainer Server container is also restarted with the same `AGENT_SECRET` value.

## Step 5: Set Up a Strong Secret from Scratch

If you're configuring everything fresh:

```bash
# Generate a strong random secret
openssl rand -hex 32
# Example: 4a8f2c1e9d3b7a6e5f8c2d1b4e7a9f3c2b1d8e7f6a5c4b3d2e1f9a8b7c6d5e4f

# Deploy agent with this secret
docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -e AGENT_SECRET="4a8f2c1e9d3b7a6e5f8c2d1b4e7a9f3c2b1d8e7f6a5c4b3d2e1f9a8b7c6d5e4f" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest

# In Portainer, when adding the environment:
# URL: agent-host:9001
# Make sure the Portainer Server container is also started with:
# -e AGENT_SECRET="4a8f2c1e9d3b7a6e5f8c2d1b4e7a9f3c2b1d8e7f6a5c4b3d2e1f9a8b7c6d5e4f"
```

## Step 6: Fix for Docker Compose Deployments

```yaml
services:
  portainer-agent:
    image: portainer/agent:latest
    ports:
      - "9001:9001"
    environment:
      # Must match the AGENT_SECRET set on the Portainer Server container/service
      AGENT_SECRET: "your-shared-secret-here"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    restart: unless-stopped
```

## Step 7: Fix for Docker Swarm Global Service

```bash
# Update the service environment variable
# The Portainer Server service must use the same AGENT_SECRET value
docker service update \
  --env-add AGENT_SECRET="the-correct-secret" \
  portainer_portainer-agent

# Verify the update
docker service inspect portainer_portainer-agent | grep AGENT_SECRET
```

## Step 8: Debug Authentication Failures

```bash
# Enable debug logging on the agent to see authentication details
docker stop portainer-agent && docker rm portainer-agent

docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -e AGENT_SECRET="your-secret" \
  -e LOG_LEVEL=DEBUG \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest

# Watch for authentication messages
docker logs -f portainer-agent | grep -i "auth\|secret\|signature\|invalid"
```

## Step 9: Common Mistakes to Avoid

```bash
# WRONG: Secret file with hidden Windows line endings or whitespace
printf 'mysecret\r\n' > /tmp/secret
AGENT_SECRET=$(cat /tmp/secret)  # Will include the hidden \r character

# CORRECT: Strip line endings when reading from a file
AGENT_SECRET=$(tr -d '\r\n' < /tmp/secret)

# Or just specify directly in the run command:
-e AGENT_SECRET="mysecret"

# WRONG: Different case
# Agent: AGENT_SECRET="MySecret"
# Portainer Server: AGENT_SECRET="mysecret"  ← case mismatch

# CORRECT: Exact same string
# Both use: "MySecret"
```

## Step 10: Remove the Secret (Use Default Claim-Based Authentication)

For internal networks where you want to use the agent's default single-Portainer claim behavior:

```bash
# Deploy agent WITHOUT a secret
# The first Portainer instance to claim the agent becomes the only one allowed
docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest

# On the Portainer Server, do not set AGENT_SECRET
```

> **Security Note**: Without `AGENT_SECRET`, the first Portainer instance that successfully claims the agent becomes the only instance allowed to manage it. Use `AGENT_SECRET` when you want multiple Portainer instances with the same secret to be able to connect.

## Conclusion

Agent secret mismatches are simple to fix but easy to miss: the `AGENT_SECRET` environment variable on both the Portainer Server and the agent must contain the exact same string. Always generate a strong random secret with `openssl rand -hex 32`, set it in both places simultaneously, and avoid hidden carriage returns or whitespace that can silently corrupt the value.
