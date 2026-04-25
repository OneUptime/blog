# How to Configure the Agent Secret Between Portainer Server and Agent - Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Security, Authentication, Secret

Description: Configure a shared agent secret to secure the communication channel between the Portainer server and its agents.

## Introduction

By default, the Portainer Agent waits for a Portainer instance to claim it, and after that only the claiming Portainer instance can manage it. If you want to use a shared secret, set `AGENT_SECRET` on the Portainer server and on each agent. Both the Portainer server and agents must use the same secret for communication to succeed.

## Setting the Agent Secret on the Agent Side

```bash
# Docker run

docker run -d \
  --name portainer_agent \
  --restart always \
  -p 9001:9001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -e AGENT_SECRET=your-shared-secret-here \
  portainer/agent:latest
```

```yaml
# docker-compose.yml
services:
  agent:
    image: portainer/agent:latest
    environment:
      AGENT_SECRET: "your-shared-secret-here"
    ports:
      - "9001:9001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
```

## Setting the Agent Secret on the Portainer Server Side

Set the same `AGENT_SECRET` value when starting the Portainer Server container. The agent secret is not configured per environment in the connection settings.

```bash
# Add this to your existing Portainer Server docker run command
-e AGENT_SECRET=your-shared-secret-here
```

```yaml
# docker-compose.yml (Portainer Server service)
services:
  portainer:
    environment:
      AGENT_SECRET: "your-shared-secret-here"
```

After restarting Portainer Server with that value, add the environment normally:

### Via Web UI

1. Environments → Add environment → Docker Standalone or Swarm
2. Select **Agent**
3. Enter the agent URL
4. Click **Connect**

### Via API

The secret is not passed in the endpoint creation request. Start Portainer Server with `AGENT_SECRET`, then create the agent environment normally:

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  -F "Name=Secured Agent Host" \
  -F "EndpointCreationType=2" \
  -F "URL=agent-host.example.com:9001" \
  -F "TLS=true" \
  -F "TLSSkipVerify=true" \
  -F "TLSSkipClientVerify=true"
```

## Generating a Strong Secret

```bash
# Generate a cryptographically random secret
openssl rand -hex 32
# Example: a3f9c2d1e4b5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1

# Or use Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Rotating the Agent Secret

```bash
# 1. Stop the agent
docker stop portainer_agent

# 2. Update the agent with new secret
docker rm portainer_agent
docker run -d \
  --name portainer_agent \
  --restart always \
  -e AGENT_SECRET=new-stronger-secret \
  -p 9001:9001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest

# 3. Recreate Portainer Server with the same new AGENT_SECRET value
# Add AGENT_SECRET=new-stronger-secret to the Portainer Server container config and restart it
```

## Verifying Secret Authentication

```bash
# Reachability check only; /ping does not verify AGENT_SECRET
curl -k -i https://agent-host.example.com:9001/ping
```

`AGENT_SECRET` is verified when Portainer Server connects successfully to the agent. If the server and agent secrets do not match, the environment connection fails.

## Conclusion

The `AGENT_SECRET` setting adds a shared-secret requirement to the authentication flow between Portainer Server and its agents. Use a strong, cryptographically random secret, store it securely, and rotate it by recreating both Portainer Server and its agents with the same new value. All agents managed by the same Portainer Server instance should use the same secret.
