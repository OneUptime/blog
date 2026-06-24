# How to Fix Agent Secret Mismatch Between Server and Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, Agent Secret, Authentication, Docker, Security

Description: Learn how to diagnose and fix agent secret mismatches between the Portainer server and agent, which cause silent authentication failures when connecting environments.

---

Portainer can use a shared secret for authentication between the server and agent. When `AGENT_SECRET` is configured on the Portainer Server, the agent must use the same secret or the environment connection will fail and remain in an "Offline" state.

## How Agent Secrets Work

Both sides must be configured with the same secret when you enable it:

```bash
# Portainer Server side

docker run ... -e AGENT_SECRET=mysecrettoken portainer/portainer-ce:lts

# Portainer Agent side
docker run ... -e AGENT_SECRET=mysecrettoken portainer/agent:lts
```

If no `AGENT_SECRET` is set, a standard Portainer Agent uses its default claim-based authentication flow. If the server has a secret but the agent does not (or has a different one), the environment connection will fail.

## Step 1: Verify Current Server Secret

```bash
# Check Portainer server environment variables
docker inspect portainer \
  --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^AGENT_SECRET='

# If empty, no custom AGENT_SECRET is configured on the server
```

## Step 2: Verify Current Agent Secret

```bash
# Check agent environment variables
docker inspect portainer_agent \
  --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^AGENT_SECRET='

# If empty, no secret is set on the agent
```

## Step 3: Align the Secrets

Decide on a new shared secret and update both sides with matching Portainer Server and Agent tags or versions:

```bash
# Generate a strong secret
SECRET=$(openssl rand -hex 32)
echo "Your new secret: $SECRET"

# Stop and remove both containers
docker stop portainer portainer_agent
docker rm portainer portainer_agent

# Restart Portainer server with the secret
docker run -d \
  --name portainer \
  --restart=always \
  -p 9000:9000 -p 9443:9443 -p 8000:8000 \
  -e AGENT_SECRET="$SECRET" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Restart agent with the same secret
docker run -d \
  --name portainer_agent \
  --restart=always \
  -p 9001:9001 \
  -e AGENT_SECRET="$SECRET" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:lts
```

## Step 4: Verify Connection

```bash
# After restart, check agent logs for auth-related errors
docker logs portainer_agent --tail 20

# And check server logs
docker logs portainer --tail 20 | grep -i "agent\|secret\|auth"
```

In the Portainer UI, the environment should now show as "Online" once the agent reconnects.
