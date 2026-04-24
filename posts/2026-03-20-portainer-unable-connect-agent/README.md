# How to Fix 'Unable to Connect to Agent' Errors in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Agent, Networking

Description: Diagnose and fix 'Unable to Connect to Agent' errors in Portainer, covering network connectivity, secret mismatches, TLS issues, and agent configuration problems.

## Introduction

When Portainer shows "Unable to Connect to Agent" for an environment, it means the Portainer server cannot establish a connection to the Portainer Agent running on a remote Docker host. This guide covers the most common causes and their resolution.

## Prerequisites

- Portainer server running and accessible
- Portainer Agent deployed on the target Docker host
- Network path between server and agent

## Step 1: Verify the Agent Is Running

```bash
# SSH to the agent host

# Check if the agent container is running
docker ps | grep portainer-agent

# If not running, start it
docker start portainer-agent

# If not installed, deploy the agent
# Replace <portainer-server-version> with the exact Portainer Server version
docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:<portainer-server-version>

# Check agent logs
docker logs portainer-agent --tail 50
```

## Step 2: Test Network Connectivity

```bash
# From the Portainer server host, test connectivity to the agent
# Replace agent-host with the actual IP or hostname
ping -c 4 agent-host

# Test the specific port (9001 is the default agent port)
telnet agent-host 9001
# or
nc -zv agent-host 9001

# If nc returns "Connection refused", the agent isn't listening
# If nc returns "No route to host", there's a routing issue
# If nc hangs, a firewall or network filter is blocking the connection
```

## Step 3: Check Firewall Rules on the Agent Host

```bash
# Ubuntu/Debian - UFW
sudo ufw status
sudo ufw allow from <portainer-server-ip> to any port 9001 proto tcp
# Or allow from anywhere (less secure)
sudo ufw allow 9001/tcp

# CentOS/RHEL - firewalld
sudo firewall-cmd --list-ports
sudo firewall-cmd --permanent --add-port=9001/tcp
sudo firewall-cmd --reload

# Check iptables directly
sudo iptables -L INPUT -n -v | grep 9001
```

## Step 4: Verify the Environment Configuration in Portainer

1. In Portainer, go to **Environments**
2. Click on the affected environment to edit it
3. Verify:
   - **URL** format: `agent-host:9001`
   - Do not include `tcp://`, `http://`, or `https://`
   - The IP/hostname resolves correctly from the Portainer server

```bash
# Test DNS resolution from the Portainer server host
getent hosts agent-host
# or, if nslookup is installed:
nslookup agent-host
ping -c 2 agent-host
```

## Step 5: Check for Secret/Token Mismatch

When using `AGENT_SECRET` for secure communication:

```bash
# Check what secret the agent is using
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' portainer-agent | grep '^AGENT_SECRET='

# Check whether the Portainer Server container is also using AGENT_SECRET
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' <portainer-container-name> | grep '^AGENT_SECRET='

# If Portainer Server is started with AGENT_SECRET, the agent must use the exact same value
```

If the secrets don't match, redeploy the agent with the correct secret:

```bash
# Replace <portainer-server-version> with the exact Portainer Server version
docker stop portainer-agent && docker rm portainer-agent
docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -e AGENT_SECRET="your-shared-secret" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:<portainer-server-version>
```

## Step 6: Check TLS Configuration

```bash
# Check agent logs for TLS/certificate errors
docker logs portainer-agent 2>&1 | grep -Ei 'tls|cert|ssl|handshake'

# Standard Portainer Agent deployments use HTTPS on port 9001 with
# certificates generated automatically by the agent.
# In Portainer, use agent-host:9001 with no protocol prefix.
# There is no separate "disable TLS" switch for the standard Portainer Agent.
```

## Step 7: Check Agent Version Compatibility

```bash
# Check agent image
docker inspect --format '{{.Config.Image}}' portainer-agent

# Check Portainer server image
docker inspect --format '{{.Config.Image}}' <portainer-container-name>

# Match the agent version to the Portainer Server version exactly
# If the Portainer Server uses a floating tag such as lts or sts,
# confirm the running version in the Portainer UI and use that exact version here
# Replace <portainer-server-version> with that exact version
docker pull portainer/agent:<portainer-server-version>
docker stop portainer-agent && docker rm portainer-agent

# Redeploy with the matching agent version
docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:<portainer-server-version>
```

## Step 8: Enable Debug Logging

```bash
# Run agent with debug logging to see exactly what's happening
# Replace <portainer-server-version> with the exact Portainer Server version
# If Portainer Server uses AGENT_SECRET, add:
#   -e AGENT_SECRET="your-shared-secret" \
# to the docker run command below
docker stop portainer-agent && docker rm portainer-agent
docker run -d \
  -p 9001:9001 \
  --name portainer-agent \
  --restart=unless-stopped \
  -e LOG_LEVEL=DEBUG \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:<portainer-server-version>

# Watch the logs
docker logs -f portainer-agent
```

## Step 9: Test Using curl Directly

```bash
# Test the agent API from Portainer server host
# Use -k because the standard Portainer Agent uses a self-signed HTTPS certificate
curl -vk https://agent-host:9001/ping

# Expected: HTTP/1.1 204 No Content
# "Connection refused" = agent not running or port blocked
# "Connection timed out" = firewall or network filtering
```

## Conclusion

"Unable to Connect to Agent" errors usually come down to the agent not running, the network path to port `9001` being blocked, the environment URL being wrong, `AGENT_SECRET` not matching, TLS/certificate issues, or the agent version not matching the Portainer Server version. Start with connectivity testing using `nc` or `curl -vk https://agent-host:9001/ping`, verify the agent is running, check the environment URL format, and ensure any configured secrets and versions match on both sides.
