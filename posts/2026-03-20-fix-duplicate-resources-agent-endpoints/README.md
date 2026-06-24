# How to Fix Duplicate Resources Appearing with Agent Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Agent, Docker, Duplicate Containers, Endpoint

Description: Learn how to fix duplicate containers, volumes, or networks appearing in Portainer when using Agent endpoints, caused by multiple agent registrations or snapshot conflicts.

---

Duplicate resources in Portainer typically happen when the same Docker host is registered as multiple environments, such as a local socket connection plus an Agent connection to the same host. If you use Agent-based connections, it is also worth checking that you did not leave an extra standalone Agent container running for the same Docker host.

## Step 1: Identify Duplicate Environments

In Portainer go to **Environments**. Look for two environments pointing to the same host IP or with very similar names. Having both a "Local" socket connection and an Agent connection to the same host means the same Docker resources are being exposed through two Portainer environments.

## Step 2: Check for Multiple Agent Containers

```bash
# On a Docker Standalone host, check if multiple agent instances are running

docker ps --format '{{.ID}}\t{{.Names}}\t{{.Image}}' | grep 'portainer/agent'

# If you see more than one standalone agent container for the same host, remove the extras
docker stop <extra-agent-container-id>
docker rm <extra-agent-container-id>
```

## Step 3: Remove the Duplicate Environment

In Portainer, remove the duplicate environment keeping only the one you want:

1. Go to **Environments**.
2. Identify the duplicate (check the URL/IP).
3. Select the duplicate environment and click **Remove**.
4. Confirm removal.

## Step 4: Avoid Socket + Agent on the Same Host

A common mistake is adding the Portainer host through both a local socket connection and an Agent connection. Remove one:

- Keep the local socket (`/var/run/docker.sock`) for the host running Portainer
- Use an Agent connection only for remote hosts

## Step 5: Clean Up Stale Environments

After a hardware migration or hostname change, old stale environments can interfere:

```bash
# In Portainer: Environments > select stale environment > Remove
# Then re-add with the correct new IP/hostname
```

## Step 6: Restart Portainer After an Address Change

If the environment IP or hostname changed and Portainer is still showing stale environment details, restart the Portainer Server container:

```bash
# On Docker Standalone
docker restart portainer
```

Portainer documents this restart step when an Agent environment's updated IP does not apply correctly in the UI.
