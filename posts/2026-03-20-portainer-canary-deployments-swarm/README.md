# How to Implement Canary Deployments with Portainer on Swarm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Canary Deployment, Docker Swarm, Zero Downtime, Traefik, CI/CD

Description: Learn how to implement canary deployments with Portainer on Docker Swarm to gradually roll out new versions to a small percentage of traffic before full release.

---

A canary deployment routes a small percentage of traffic to a new version while the rest continues to the stable version. This allows you to monitor the new version with real user traffic before committing to a full rollout.

## Canary with Traefik Weighted Load Balancing

Traefik supports weighted services, but on Swarm the weighted service itself needs to be defined with the File provider:

```yaml
version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    command:
      - --api.insecure=true
      - --providers.file.filename=/etc/traefik/dynamic/canary.yml
      - --entrypoints.web.address=:80
    ports:
      - "80:80"
    configs:
      - source: canary-config-v1
        target: /etc/traefik/dynamic/canary.yml
    networks:
      - proxy_net

  # Stable version
  api-stable:
    image: myregistry.example.com/my-app:v1.4.0
    deploy:
      replicas: 9
    networks:
      - proxy_net

  # Canary version
  api-canary:
    image: myregistry.example.com/my-app:v1.5.0
    deploy:
      replicas: 1
    networks:
      - proxy_net

networks:
  proxy_net:
    driver: overlay
    attachable: true

configs:
  canary-config-v1:
    file: ./canary.yml
```

```yaml
# canary.yml
http:
  routers:
    api:
      rule: "Host(`api.example.com`)"
      entryPoints:
        - web
      service: weighted-api

  services:
    weighted-api:
      weighted:
        services:
          - name: stable-lb
            weight: 90
          - name: canary-lb
            weight: 10

    stable-lb:
      loadBalancer:
        servers:
          - url: "http://my-stack_api-stable:3000"

    canary-lb:
      loadBalancer:
        servers:
          - url: "http://my-stack_api-canary:3000"
```

The `weighted-api` service routes 90% of traffic to `api-stable` and 10% to `api-canary`. Replace `my-stack` in `canary.yml` with your actual stack name.

## Gradual Traffic Shifting

Increase canary traffic over time as confidence grows:

```bash
# Phase 1: 10% canary

# Set in canary.yml: stable weight=90, canary weight=10

# Phase 2: After 30 minutes with no errors, increase to 30%
# Update canary.yml to: stable weight=70, canary weight=30
# Swarm configs are immutable, so update the config name in docker-compose.yml
# (for example, canary-config-v2) and redeploy the stack:
docker stack deploy -c docker-compose.yml my-stack

# Phase 3: 50/50 split
# Phase 4: 100% canary (remove stable)
```

## Monitoring the Canary

Watch error rates during the canary phase:

```bash
#!/bin/bash
# monitor-canary.sh

LOKI_URL="http://loki:3100"
THRESHOLD_ERROR_RATE=0.05  # 5% error rate triggers rollback

while true; do
  # Query error rate from Loki
  ERROR_RATE=$(curl -s "$LOKI_URL/loki/api/v1/query" \
    --data-urlencode 'query=sum(rate({service="api-canary"} |= "error" [5m])) / sum(rate({service="api-canary"} [5m]))' \
    | jq -r '.data.result[0].value[1] // "0"')

  echo "Canary error rate: $ERROR_RATE"

  if (( $(echo "$ERROR_RATE > $THRESHOLD_ERROR_RATE" | bc -l) )); then
    echo "ERROR RATE TOO HIGH - rolling back canary"
    # Point the stack back at the last known-good canary config
    # (for example, 100% stable) and redeploy it.
    docker stack deploy -c docker-compose.yml my-stack
    break
  fi

  sleep 60
done
```

## Promoting the Canary to Production

Once confident, redirect all traffic to the canary and decommission the stable version:

```bash
# Phase: Full canary promotion
# Update canary.yml so weighted-api sends 100% to canary-lb,
# update the config name in docker-compose.yml, and redeploy:
docker stack deploy -c docker-compose.yml my-stack

# Watch for issues, then remove it:
docker service rm my-stack_api-stable
```

## Canary for Database Migrations

For deployments that include database migrations, validate the canary against a shadow database first:

```yaml
  api-canary:
    environment:
      DATABASE_URL: "postgresql://user:pass@postgres:5432/appdb_canary"  # Shadow DB
```

After validating the migration and application behavior on the shadow DB, run the production migration and promote the canary.
