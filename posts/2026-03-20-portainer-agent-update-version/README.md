# How to Update Portainer Agent to Match Server Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Update, Version Management, Maintenance

Description: Keep the Portainer Agent version synchronized with your Portainer server version to ensure compatibility and access to new features.

## Introduction

The Portainer Agent and Portainer server should use the same version. Portainer recommends updating the server before the agents, because newer servers can usually talk to older agents but the reverse is not always true. This guide covers updating agents on Docker standalone, Swarm, and Kubernetes.

## Checking Current Versions

```bash
# Check Portainer server version

TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/system/version \
  | python3 -m json.tool

# Check agent version
docker inspect --format 'Agent Image: {{.Config.Image}}' portainer_agent
```

## Update Agent on Docker Standalone

```bash
# 1. Set the agent version to match your Portainer server
PORTAINER_VERSION=2.39.1

# 2. Pull the matching version
docker pull portainer/agent:${PORTAINER_VERSION}

# 3. Stop and remove old agent
docker stop portainer_agent
docker rm portainer_agent

# 4. Run new agent with same configuration
docker run -d \
  --name portainer_agent \
  --restart always \
  -p 9001:9001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:${PORTAINER_VERSION}

# 5. Verify new version
docker inspect --format '{{.Config.Image}}' portainer_agent
```

## Update Agent on Docker Swarm

```bash
# Set the agent version to match your Portainer server
PORTAINER_VERSION=2.39.1

# Update the global agent service to the matching image
# Replace portainer_agent if your service name differs.
docker pull portainer/agent:${PORTAINER_VERSION}
docker service update \
  --image portainer/agent:${PORTAINER_VERSION} \
  --force \
  portainer_agent

# Monitor the update
docker service ps portainer_agent

# Check all replicas updated
docker service ls | grep portainer
```

## Update Agent on Kubernetes

```bash
# Set the agent version to match your Portainer server
PORTAINER_VERSION=2.39.1

# Update the agent DaemonSet image
kubectl set image daemonset/portainer-agent \
  portainer-agent=portainer/agent:${PORTAINER_VERSION} \
  -n portainer

# Monitor rollout
kubectl rollout status daemonset/portainer-agent -n portainer
```

## Automating Agent Updates

```bash
#!/bin/bash
# update-portainer-agent.sh

AGENTS=("192.168.1.50" "192.168.1.51" "192.168.1.52")
SSH_USER="ubuntu"
PORTAINER_VERSION="2.39.1" # Match your Portainer server version

for agent in "${AGENTS[@]}"; do
  echo "Updating agent on $agent..."
  ssh "$SSH_USER@$agent" "
    docker pull portainer/agent:${PORTAINER_VERSION}
    docker stop portainer_agent
    docker rm portainer_agent
    docker run -d \
      --name portainer_agent \
      --restart always \
      -p 9001:9001 \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v /var/lib/docker/volumes:/var/lib/docker/volumes \
      portainer/agent:${PORTAINER_VERSION}
    docker inspect portainer_agent --format '{{.Config.Image}}'
  "
  echo "Agent updated on $agent"
done
```

## Conclusion

Keeping agent versions synchronized with the Portainer server is an important maintenance task. Pin agent versions to match the server version in production (for example, `portainer/agent:<server-version>` not `latest`), and update Portainer Server first, then the agents during maintenance windows to avoid version skew.
