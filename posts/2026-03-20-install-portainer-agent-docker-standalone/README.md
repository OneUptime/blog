# How to Install Portainer Agent on Docker Standalone

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Docker, Installation, Remote Management

Description: Install the Portainer Agent on a Docker standalone host to enable remote management from a central Portainer server.

---

The Portainer Agent is a lightweight service that runs on each Docker host and enables the central Portainer server to manage that host remotely. It's more feature-rich than the TCP API approach and supports volume browsing and other advanced features.

## Install via Docker Run

```bash
# Install Portainer Agent on the target Docker host

# Port 9001 is the default agent communication port
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

## Install via Docker Compose

```yaml
# docker-compose.yml
services:
  portainer_agent:
    image: portainer/agent:latest
    container_name: portainer_agent
    restart: always
    ports:
      - "9001:9001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
```

## Add the Agent Environment to Portainer

After the agent is running, add it to your Portainer server:

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Add the agent environment
curl -X POST \
  https://portainer.example.com:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --form "Name=docker-host-01" \
  --form "EndpointCreationType=2" \
  --form "URL=192.168.1.50:9001" \
  --form "TLS=true" \
  --form "TLSSkipVerify=true" \
  --form "TLSSkipClientVerify=true" \
  --form "GroupID=1" \
  --insecure
```

## Secure with Agent Secret

For additional security, if your Portainer Server is configured with `AGENT_SECRET`, configure the same shared secret on the agent:

```bash
# Agent with secret
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -e AGENT_SECRET=your-shared-secret \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

Set the same `AGENT_SECRET` value on the Portainer Server container as well.

## Verify the Agent is Running

```bash
# Check agent container status
docker ps --filter name=portainer_agent
docker logs portainer_agent 2>&1 | tail -10

# Test the agent endpoint is reachable (run from Portainer server)
curl -sk -o /dev/null -w "%{http_code}\n" https://192.168.1.50:9001/ping
```

---

*Monitor agent connectivity and host health with [OneUptime](https://oneuptime.com).*
