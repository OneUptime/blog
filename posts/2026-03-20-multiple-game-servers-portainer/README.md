# How to Manage Multiple Game Servers with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Game Server, Docker, Self-Hosted, Management

Description: Centrally manage multiple game servers across different titles using Portainer stacks and resource management.

## Introduction

Running multiple game servers on a single machine or across multiple hosts requires careful resource management and centralized control. Portainer excels in this scenario - you can deploy Minecraft, Valheim, Counter-Strike, and more as separate stacks, manage their resources, monitor performance, and handle updates all from a single interface.

## Prerequisites

- Portainer installed with Docker
- Server with substantial RAM (16-32 GB recommended for multiple servers)
- Multiple CPU cores (8+ recommended)
- Fast SSD storage for game data

## Architecture Overview

```text
Portainer Server
├── Stack: minecraft-server (Port 25565)
├── Stack: valheim-server (Port 2456-2458)
├── Stack: cs2-server (Port 27015)
├── Stack: factorio-server (Port 34197)
└── Stack: ark-server (Port 7777, 7778, 27015)
```

## Step 1: Plan Resource Allocation

Before deploying, calculate resource needs:

| Game Server | RAM | CPU | Storage | Ports |
|-------------|-----|-----|---------|-------|
| Minecraft (20 players) | 4 GB | 2 cores | 10 GB | 25565 |
| Valheim (10 players) | 2 GB | 2 cores | 5 GB | 2456-2458 |
| CS2 (10 players) | 2 GB | 2 cores | 20 GB | 27015 |
| Factorio (8 players) | 1 GB | 1 core | 2 GB | 34197 |
| ARK (20 players) | 8 GB | 4 cores | 50 GB | 7777, 7778, 27015 |

## Step 2: Deploy Each Game Server as Separate Stacks

Use Portainer's Stack Labels to organize servers:

```yaml
# minecraft-stack labels

version: "3.8"

services:
  minecraft:
    image: itzg/minecraft-server:latest
    container_name: minecraft
    restart: unless-stopped
    ports:
      - "25565:25565"
    volumes:
      - minecraft-data:/data
    # Resource limits to prevent one game from monopolizing resources
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 2G
    environment:
      - EULA=TRUE
      - MEMORY=3G
      - TYPE=PAPER
      - VERSION=LATEST
    labels:
      - "game-server=true"
      - "game=minecraft"
      - "portainer.stack=minecraft"
    networks:
      - game-servers

volumes:
  minecraft-data:

networks:
  game-servers:
    driver: bridge
```

## Step 3: Create a Centralized Monitoring Stack

Deploy a monitoring stack to track all game servers:

```yaml
# monitoring-stack for all game servers
version: "3.8"

services:
  # Prometheus for metrics collection
  prometheus:
    image: prom/prometheus:latest
    container_name: game-prometheus
    restart: always
    ports:
      - "9090:9090"
    volumes:
      - prometheus-data:/prometheus
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro

  # Grafana for dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: game-grafana
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}

  # Uptime monitoring for all servers
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    restart: always
    ports:
      - "3001:3001"
    volumes:
      - uptime-data:/app/data

volumes:
  prometheus-data:
  grafana-data:
  uptime-data:
```

Configure Prometheus to scrape cAdvisor metrics from all game containers:

```yaml
# prometheus.yml
global:
  scrape_interval: 30s

scrape_configs:
  # Discover Docker containers and keep only those labeled as game servers
  - job_name: 'game-servers'
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: [__meta_docker_container_label_game_server]
        regex: "true"
        action: keep
```

## Step 4: Schedule Server Maintenance Windows

Use Portainer's Edge Jobs for automated maintenance:

```bash
#!/bin/bash
# maintenance.sh - run during off-peak hours

echo "=== Starting maintenance window ==="
DATE=$(date +%Y%m%d_%H%M%S)

# Backup all game servers
for container in minecraft valheim cs2; do
  echo "Backing up $container..."
  docker exec $container rcon-cli save-all 2>/dev/null || true
  
  docker run --rm \
    -v ${container}-data:/source:ro \
    -v /backups/$container:/backup \
    alpine tar czf /backup/backup-$DATE.tar.gz -C /source .
done

# Update all game server images
for stack in minecraft valheim cs2 factorio; do
  docker compose -f /opt/stacks/$stack/docker-compose.yml pull
  docker compose -f /opt/stacks/$stack/docker-compose.yml up -d
done

echo "=== Maintenance complete ==="
```

## Step 5: Manage Server Restarts and Scheduling

Configure scheduled restarts via Portainer Edge Jobs:

```bash
#!/bin/bash
# daily-restart.sh - run at 4 AM daily

# Announce restart to players (if RCON available)
for server in minecraft; do
  docker exec $server rcon-cli "say Server restarting in 5 minutes!" 2>/dev/null || true
done

sleep 300  # Wait 5 minutes

# Restart all game servers
docker restart minecraft valheim factorio

echo "All game servers restarted at $(date)"
```

## Step 6: Resource Monitoring and Scaling

Monitor resource usage across all game servers:

```bash
# View resource usage for all game containers
docker stats --no-stream \
  --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
  $(docker ps --filter "label=game-server=true" --format "{{.Names}}")
```

Use Portainer's built-in stats view:
1. Go to **Containers**
2. Sort by CPU or Memory usage
3. Identify resource-hungry servers
4. Adjust limits as needed

## Step 7: Whitelist and Player Management

Centralized player management script:

```bash
#!/bin/bash
# add-player.sh username game

USERNAME=$1
GAME=$2

case $GAME in
  minecraft)
    docker exec minecraft rcon-cli "whitelist add $USERNAME"
    docker exec minecraft rcon-cli "whitelist reload"
    ;;
  *)
    echo "Unknown game: $GAME"
    exit 1
    ;;
esac

echo "Added $USERNAME to $GAME whitelist"
```

## Conclusion

Managing multiple game servers with Portainer provides a single pane of glass for your entire gaming infrastructure. Resource limits prevent any single game from starving others, centralized monitoring gives visibility into performance, and automated maintenance reduces operational overhead. Whether you're running a gaming community or just want a private server for friends, Portainer makes multi-game server management practical and manageable.
