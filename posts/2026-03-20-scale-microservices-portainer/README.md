# How to Scale Individual Microservices in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Microservice, Scaling, Docker Swarm, Auto-Scaling

Description: Scale individual microservices horizontally in Portainer using Docker Swarm replica management, resource limits, and auto-scaling triggers.

## Introduction

One of the key benefits of microservices is the ability to scale individual components independently. If your order processing is under load but your user service is idle, you scale only the order service. Portainer makes this straightforward with its visual scaling interface. This guide covers manual scaling, resource constraints, and auto-scaling strategies.

## Step 1: Scale Services in Portainer (Visual)

For Docker Swarm services:
1. Navigate to **Services** in Portainer
2. Select **scale** next to a replicated service (e.g., `myapp_order_service`)
3. Choose the desired number of replicas
4. Click the tick icon to apply the change

## Step 2: Deploy a Scalable Swarm Stack

```yaml
# docker-compose.yml - Scalable microservice stack

version: "3.8"

networks:
  app_overlay:
    name: app_overlay
    driver: overlay
    attachable: true

services:
  # API Gateway (Traefik)
  traefik:
    image: traefik:v3.0
    deploy:
      # Single instance per manager node
      mode: global
      placement:
        constraints:
          - node.role == manager
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command:
      - "--providers.swarm.endpoint=unix:///var/run/docker.sock"
      - "--providers.swarm.network=app_overlay"
      - "--providers.swarm.exposedByDefault=false"
      - "--entrypoints.web.address=:80"
    networks:
      - app_overlay

  # User Service - scales independently
  user_service:
    image: myapp/user-service:latest
    deploy:
      replicas: 2
      # Resource constraints per replica
      resources:
        limits:
          cpus: "0.5"       # Max 50% of one CPU
          memory: 256M
        reservations:
          cpus: "0.1"       # Guaranteed minimum
          memory: 128M
      # Update strategy
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first    # Start new before stopping old
        failure_action: rollback
      # Auto-restart policy
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.users.rule=PathPrefix(`/api/users`)"
        - "traefik.http.services.users.loadbalancer.server.port=8002"
    environment:
      - DATABASE_URL=postgresql://user:pass@user_db:5432/userdb
    networks:
      - app_overlay

  # Order Service - scales independently (more compute needed)
  order_service:
    image: myapp/order-service:latest
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M
      placement:
        # Spread across multiple nodes
        preferences:
          - spread: node.labels.region
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.orders.rule=PathPrefix(`/api/orders`)"
        - "traefik.http.services.orders.loadbalancer.server.port=8003"
        - "swarm.autoscale=true"
        - "swarm.autoscale.min=2"
        - "swarm.autoscale.max=20"
    networks:
      - app_overlay
```

## Step 3: Scale via Docker CLI

Run these commands on a Swarm manager node:

```bash
# Scale individual service
docker service scale myapp_order_service=8

# Scale multiple services at once
docker service scale \
  myapp_user_service=3 \
  myapp_order_service=6 \
  myapp_product_service=4

# Verify scaling
docker service ls
docker service ps myapp_order_service
```

## Step 4: Portainer API for Programmatic Scaling

```bash
#!/bin/bash
# scale-service.sh - Scale via Portainer API

PORTAINER_URL="https://portainer.yourdomain.com"
API_KEY="your-portainer-api-key"
ENDPOINT_ID="1"
SERVICE_NAME="myapp_order_service"
NEW_REPLICAS=6

# Get current service details
SERVICE=$(curl -fsS \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/services/$SERVICE_NAME")

VERSION=$(echo "$SERVICE" | jq -r '.Version.Index')
UPDATED_SPEC=$(echo "$SERVICE" | jq --argjson replicas "$NEW_REPLICAS" \
  '.Spec | .Mode.Replicated.Replicas = $replicas')

# Update replica count
curl -fsS -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/services/$SERVICE_NAME/update?version=$VERSION" \
  -d "$UPDATED_SPEC"

echo "Scaled $SERVICE_NAME to $NEW_REPLICAS replicas"
```

## Step 5: Auto-Scaling with Custom Metrics

```bash
#!/bin/bash
# autoscale.sh - Scale based on metrics

PROMETHEUS_URL="http://prometheus:9090"
SERVICE="myapp_order_service"

# Query CPU usage per replica
CPU_USAGE=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
  --data-urlencode "query=avg(rate(container_cpu_usage_seconds_total{container_label_com_docker_swarm_service_name=\"$SERVICE\"}[5m])) * 100" \
  | jq -r '.data.result[0].value[1] // "0"')

# Current desired replicas
CURRENT_REPLICAS=$(docker service inspect "$SERVICE" --format '{{.Spec.Mode.Replicated.Replicas}}')

echo "CPU Usage: ${CPU_USAGE}% | Replicas: ${CURRENT_REPLICAS}"

# Scale up if CPU > 70%
if (( $(echo "$CPU_USAGE > 70" | bc -l) )); then
    NEW_REPLICAS=$((CURRENT_REPLICAS + 2))
    MAX_REPLICAS=20

    if [ "$NEW_REPLICAS" -le "$MAX_REPLICAS" ]; then
        echo "Scaling UP: $CURRENT_REPLICAS → $NEW_REPLICAS replicas"
        docker service scale "$SERVICE=$NEW_REPLICAS"
    fi
fi

# Scale down if CPU < 20%
if (( $(echo "$CPU_USAGE < 20" | bc -l) )); then
    NEW_REPLICAS=$((CURRENT_REPLICAS - 1))
    MIN_REPLICAS=2

    if [ "$NEW_REPLICAS" -ge "$MIN_REPLICAS" ]; then
        echo "Scaling DOWN: $CURRENT_REPLICAS → $NEW_REPLICAS replicas"
        docker service scale "$SERVICE=$NEW_REPLICAS"
    fi
fi
```

```bash
# Run auto-scaler every 2 minutes
(crontab -l 2>/dev/null; echo "*/2 * * * * /usr/local/bin/autoscale.sh") | crontab -
```

## Step 6: Deploy Docker Autoscaler (3rd Party)

```yaml
# docker-compose.yml - Swarm Autoscaler
services:
  autoscaler:
    image: vayzer/swarm-autoscaler:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - AUTOSCALER_INTERVAL=120
      - AUTOSCALER_MIN_PERCENTAGE=20
      - AUTOSCALER_MAX_PERCENTAGE=80
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          memory: 64M
```

## Monitoring Scale Events in Portainer

1. Navigate to **Services** to see current replica counts
2. Click a service to see individual task health
3. Check **Service logs** for application behavior after scaling

```bash
# View scale events
docker events --filter type=service --filter event=update

# View current service state
docker service inspect myapp_order_service --format='Replicas: {{.Spec.Mode.Replicated.Replicas}}'

# Check which nodes replicas are running on
docker service ps myapp_order_service
```

## Conclusion

Portainer makes horizontal scaling intuitive - just change the replica count in the UI. For production environments, combine manual scaling (for planned events like marketing campaigns) with auto-scaling scripts based on Prometheus metrics (for unexpected load spikes). Docker Swarm schedules replicas across eligible nodes, and Traefik routes traffic to the matching service tasks. Resource limits cap each replica's CPU and memory use.
