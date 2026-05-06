# How to Implement Canary Deployments with Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Canary Deployment, CI/CD, Zero Downtime, DevOps

Description: Implement canary deployments on Docker Swarm with Portainer to gradually roll out new versions to a percentage of users.

## Introduction

Canary deployment gradually shifts traffic from the current version to a new version - starting with a small percentage (5-10%) and increasing as confidence grows. If issues arise, you roll back only the canary, limiting blast radius. Docker Swarm makes it straightforward to run stable and canary versions side by side, while Traefik's weighted services control how much traffic each version receives. This guide shows you how using Portainer.

## How Canary Works with Docker Swarm

With 10 total application replicas:
- Stable version: 9 replicas
- Canary version: 1 replica
- Traefik weighted routing sends ~10% of requests to canary
- Each service then load-balances across its own replicas

## Step 1: Deploy Base Service on Swarm

```bash
# Initialize Swarm if not done

docker swarm init

# Create overlay networks and Traefik dynamic config directory
mkdir -p /opt/traefik/dynamic
docker network create --driver overlay --attachable app_overlay
docker network create --driver overlay --attachable traefik_overlay
```

## Step 2: Deploy Stable Version as a Stack

In Portainer, create a new Swarm Stack:

```yaml
# stable-stack.yml - Stable production service
version: "3.8"

networks:
  app_overlay:
    external: true
  traefik_overlay:
    external: true

services:
  # Traefik load balancer
  traefik:
    image: traefik:v3.0
    deploy:
      mode: global
      placement:
        constraints:
          - node.role == manager
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/dynamic:/etc/traefik/dynamic:ro
    command:
      - "--providers.swarm=true"
      - "--providers.swarm.network=traefik_overlay"
      - "--providers.swarm.exposedByDefault=false"
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--entrypoints.web.address=:80"
      - "--api.insecure=true"
    networks:
      - traefik_overlay

  # Stable application (current version)
  app_stable:
    image: myapp:1.0.0
    deploy:
      replicas: 9
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.app.rule=Host(`app.yourdomain.com`)"
        - "traefik.http.routers.app.entrypoints=web"
        - "traefik.http.routers.app.service=app-weighted@file"
        - "traefik.http.services.stable-svc.loadbalancer.server.port=8080"
      update_config:
        parallelism: 2
        delay: 10s
        order: start-first
      rollback_config:
        parallelism: 1
      restart_policy:
        condition: on-failure
    networks:
      - app_overlay
      - traefik_overlay
    environment:
      - VERSION=stable-1.0.0
```

## Step 3: Deploy Canary Version

Add the canary service to the stack in Portainer, then create Traefik's weighted service config:

```yaml
# canary-stack.yml - Deploy canary alongside stable
version: "3.8"

networks:
  app_overlay:
    external: true
  traefik_overlay:
    external: true

services:
  # Canary application (new version - 1 of 10 replicas)
  app_canary:
    image: myapp:1.1.0
    deploy:
      replicas: 1
      labels:
        - "traefik.enable=true"
        # Hidden router keeps the canary backend registered without exposing it directly
        - "traefik.http.routers.app-canary-hidden.rule=Host(`canary.invalid`)"
        - "traefik.http.routers.app-canary-hidden.entrypoints=web"
        - "traefik.http.routers.app-canary-hidden.service=canary-svc"
        - "traefik.http.services.canary-svc.loadbalancer.server.port=8080"
      restart_policy:
        condition: on-failure
    networks:
      - app_overlay
      - traefik_overlay
    environment:
      - VERSION=canary-1.1.0
```

```yaml
# /opt/traefik/dynamic/canary.yml - Initial 90/10 traffic split
http:
  services:
    app-weighted:
      weighted:
        services:
          - name: stable-svc@swarm
            weight: 9
          - name: canary-svc@swarm
            weight: 1
```

## Step 4: Gradually Increase Canary Traffic

```bash
#!/bin/bash
# canary-promote.sh - Gradually increase canary traffic

set -euo pipefail

STABLE_SERVICE="mystack_app_stable"
CANARY_SERVICE="mystack_app_canary"
WEIGHTS_FILE="/opt/traefik/dynamic/canary.yml"
# Replace "mystack" with your actual Portainer stack name

set_weights() {
  local stable_weight="$1"
  local canary_weight="$2"

  cat > "${WEIGHTS_FILE}" <<EOF
http:
  services:
    app-weighted:
      weighted:
        services:
          - name: stable-svc@swarm
            weight: ${stable_weight}
          - name: canary-svc@swarm
            weight: ${canary_weight}
EOF
}

set_stable_only() {
  cat > "${WEIGHTS_FILE}" <<'EOF'
http:
  services:
    app-weighted:
      weighted:
        services:
          - name: stable-svc@swarm
            weight: 1
EOF
}

echo "Current state:"
docker service ls | grep -E "app_stable|app_canary" || true

# Phase 1: 10% canary (9 stable, 1 canary)
echo "Phase 1: 10% canary traffic"
docker service scale ${STABLE_SERVICE}=9 ${CANARY_SERVICE}=1
set_weights 9 1

# Monitor for 10 minutes
sleep 600

# Check metrics before proceeding
./check-canary-health.sh

# Phase 2: 25% canary
echo "Phase 2: 25% canary traffic"
docker service scale ${STABLE_SERVICE}=6 ${CANARY_SERVICE}=2
set_weights 6 2

sleep 600

./check-canary-health.sh

# Phase 3: 50% canary
echo "Phase 3: 50% canary traffic"
docker service scale ${STABLE_SERVICE}=5 ${CANARY_SERVICE}=5
set_weights 5 5

sleep 600

./check-canary-health.sh

# Phase 4: Full promotion
echo "Phase 4: Promoting canary to 100%"
docker service update \
  --image myapp:1.1.0 \
  --update-parallelism 2 \
  --update-delay 10s \
  ${STABLE_SERVICE}

set_stable_only
docker service scale ${STABLE_SERVICE}=10 ${CANARY_SERVICE}=0

echo "Canary deployment complete!"
```

## Step 5: Monitor Canary via Portainer + Prometheus

```yaml
# Add Prometheus metrics scraping for canary monitoring
services:
  prometheus:
    image: prom/prometheus:latest
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    volumes:
      - /opt/prometheus:/etc/prometheus
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "9090:9090"
    networks:
      - app_overlay
```

```yaml
# prometheus.yml - Scrape Docker service metrics
scrape_configs:
  - job_name: 'swarm-tasks'
    dockerswarm_sd_configs:
      - host: unix:///var/run/docker.sock
        role: tasks
        port: 8080
    metrics_path: /metrics
    relabel_configs:
      - source_labels: [__meta_dockerswarm_network_name]
        regex: app_overlay
        action: keep
      # Replace "mystack" with your actual Portainer stack name
      - source_labels: [__meta_dockerswarm_service_name]
        regex: mystack_app_(stable|canary)
        action: keep
      - source_labels: [__meta_dockerswarm_task_desired_state]
        regex: running
        action: keep
      - source_labels: [__meta_dockerswarm_service_name]
        regex: mystack_app_stable
        target_label: job
        replacement: app_stable
      - source_labels: [__meta_dockerswarm_service_name]
        regex: mystack_app_canary
        target_label: job
        replacement: app_canary
      - source_labels: [__address__]
        target_label: instance
```

## Step 6: Automatic Canary Analysis with Prometheus Queries

```bash
#!/bin/bash
# check-canary-health.sh - Automated canary analysis

PROM_URL="http://127.0.0.1:9090"
WEIGHTS_FILE="/opt/traefik/dynamic/canary.yml"

rollback_canary() {
  cat > "${WEIGHTS_FILE}" <<'EOF'
http:
  services:
    app-weighted:
      weighted:
        services:
          - name: stable-svc@swarm
            weight: 1
EOF

  docker service scale mystack_app_stable=10 mystack_app_canary=0
}

# Check error rate for canary (5xx responses)
CANARY_ERROR_RATE=$(curl -s "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=sum(rate(http_requests_total{status=~"5..",job="app_canary"}[5m])) / sum(rate(http_requests_total{job="app_canary"}[5m])) * 100' \
  | jq -r '.data.result[0].value[1] // "0"')

# Check P99 latency for canary
CANARY_P99=$(curl -s "$PROM_URL/api/v1/query" \
  --data-urlencode 'query=histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{job="app_canary"}[5m])))' \
  | jq -r '.data.result[0].value[1] // "0"')

echo "Canary Error Rate: ${CANARY_ERROR_RATE}%"
echo "Canary P99 Latency: ${CANARY_P99}s"

# Decision logic
if (( $(echo "$CANARY_ERROR_RATE > 2" | bc -l) )); then
    echo "FAIL: Error rate too high. Rolling back canary."
    rollback_canary
    exit 1
fi

if (( $(echo "$CANARY_P99 > 2" | bc -l) )); then
    echo "FAIL: Latency too high. Rolling back canary."
    rollback_canary
    exit 1
fi

echo "PASS: Canary metrics are healthy. Proceeding."
```

## Viewing Canary in Portainer

1. Navigate to **Services** in Portainer (Swarm mode)
2. You'll see both `app_stable` and `app_canary` with replica counts
3. Click on a service to see individual task health
4. Use the **Scale** button to adjust replica counts while the weighted Traefik config controls the traffic split
5. View task logs to compare behavior between versions

## Conclusion

Canary deployments on Docker Swarm with Portainer give you granular control over traffic percentage by updating Traefik weights and scaling replicas to match expected load. The automated analysis script checks error rates and latency before promoting - stopping bad deployments before they affect all users. Portainer's Services view makes it easy to see the current state, scale services, and roll back if needed. This pattern is especially valuable for APIs where even small changes can have unexpected performance impacts.
