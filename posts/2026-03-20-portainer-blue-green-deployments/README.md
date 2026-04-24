# How to Implement Blue-Green Deployments with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Blue-Green Deployment, Zero Downtime, Docker, Traefik, CI/CD

Description: Learn how to implement blue-green deployments with Portainer to achieve zero-downtime releases by running two identical environments and switching traffic between them.

---

Blue-green deployment maintains two identical production environments - "blue" (current) and "green" (new version). Traffic switches instantly between them, enabling zero-downtime releases and instant rollbacks.

## Blue-Green with Traefik

Use Traefik labels to route traffic to the active environment:

```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - --api.insecure=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - proxy_net

  # Blue environment (current version)
  api-blue:
    image: myregistry.example.com/my-app:v1.4.0
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.service=api-blue"   # Point production traffic to blue
      - "traefik.http.services.api-blue.loadbalancer.server.port=3000"
    networks:
      - proxy_net

  # Green environment (new version - reachable on a separate hostname for smoke tests)
  api-green:
    image: myregistry.example.com/my-app:v1.5.0
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api-green.rule=Host(`green.api.example.com`)"
      - "traefik.http.routers.api-green.service=api-green"
      - "traefik.http.services.api-green.loadbalancer.server.port=3000"
    networks:
      - proxy_net

networks:
  proxy_net:
    driver: bridge
```

## Switching Traffic

To switch from blue to green, update the router's service label:

```bash
# Update the stack: change the router service from api-blue to api-green

# In Portainer, edit the stack and update this label:
# "traefik.http.routers.api.service=api-green"

```

This example uses Traefik's Docker provider. If you're running Docker Swarm instead, use Traefik's Swarm provider and define Traefik labels under `deploy.labels`.

After the stack is redeployed, Traefik reroutes `api.example.com` to the green service.

## Rolling Back

If the green environment has issues, switch back to blue instantly:

```bash
# Revert the router to blue
# Edit stack in Portainer and update:
# "traefik.http.routers.api.service=api-blue"
```

Blue is still running with the previous version, so the rollback is immediate.

## Automated Blue-Green Switch Script

```bash
#!/bin/bash
# blue-green-switch.sh

TRAEFIK_API="http://localhost:8080"
PORTAINER_URL="https://portainer.example.com:9443"
STACK_ID=1
ENDPOINT_ID=1

ACTIVE=$(curl -s "$TRAEFIK_API/api/http/routers/api@docker" | jq -r '.service')

if [[ "$ACTIVE" == *"blue"* ]]; then
  NEW="green"
  OLD="blue"
else
  NEW="blue"
  OLD="green"
fi

echo "Switching from $OLD to $NEW..."

# Authenticate to Portainer
TOKEN=$(curl -s -X POST "$PORTAINER_URL/api/auth" \
  -H 'Content-Type: application/json' \
  -d '{"Username":"admin","Password":"pass"}' | jq -r '.jwt')

# Update a file-based stack and redeploy it
STACK_PAYLOAD=$(jq -Rs '{StackFileContent: ., Env: []}' "docker-compose-$NEW.yml")

curl -s -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/stacks/$STACK_ID?endpointId=$ENDPOINT_ID" \
  -d "$STACK_PAYLOAD"

echo "Traffic now routing to $NEW"
```

## Smoke Testing the Green Environment

Before switching, test the green deployment on its smoke-test hostname:

```bash
# Access green through its smoke-test hostname (not the main production domain)
curl -H "Host: green.api.example.com" http://localhost/health
```

Only switch traffic after confirming green is healthy.
