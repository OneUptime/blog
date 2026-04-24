# How to Deploy Applications to Intermittent-Connectivity Edge Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Edge Computing, IoT, Reliability

Description: Learn how to reliably deploy and manage containerized applications on edge devices that have unreliable or intermittent network connectivity.

## Introduction

Many edge devices - remote sensors, vehicles, construction sites, ships - operate in environments where internet connectivity is sporadic. Standard deployment workflows that assume always-on connectivity will fail in these scenarios. Portainer's async Edge Agent mode is specifically designed for this challenge.

## Prerequisites

- Portainer Business Edition with Edge Compute enabled
- Edge devices with Docker installed
- Understanding of Edge Stacks and Edge Groups

## How Portainer Handles Intermittent Connectivity

Portainer's Edge Agent uses an **asynchronous polling model**:

1. The edge agent periodically connects *out* to the Portainer server (no inbound connection needed).
2. When connected, it retrieves pending stack deployments, updates, and configurations.
3. When disconnected, it continues running existing workloads independently.
4. On reconnect, it reports its current state back to Portainer.

This means devices can operate for days or weeks without connectivity and still run correctly.

## Step 1: Configure the Edge Agent for Async Mode

Create the async Edge environment in Portainer, then run the Portainer-generated deployment command on the device. A Docker Standalone deployment looks like this:

```bash
#!/bin/bash
# Deploy Portainer Edge Agent in async mode for intermittent connectivity

docker run -d \
  --name portainer_edge_agent \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${EDGE_ID}" \
  -e EDGE_KEY="${EDGE_KEY}" \
  portainer/agent:lts
```

Use the exact command Portainer generates so the agent tag matches your Portainer Server version. Set the async Ping, Snapshot, and Command intervals in Portainer when you create the environment, and only add `-e EDGE_INSECURE_POLL=1` if your Portainer server uses a self-signed HTTPS certificate.

## Step 2: Design Offline-First Application Stacks

Your application containers must work without network access:

```yaml
# offline-first-app.yml

# All services designed to run without internet connectivity
services:
  # Local application - reads from local DB only
  app:
    image: myorg/edge-app:2.1.0  # Always pin versions - no :latest for offline
    restart: always
    environment:
      - DB_HOST=postgres
      - OFFLINE_MODE=true  # App flag to disable cloud sync when offline
      - SYNC_INTERVAL=300  # Try to sync every 5 minutes when online
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "-O-", "http://localhost:8080/health"]
      interval: 30s
      retries: 5

  # Local database - all data stored on device
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      retries: 5

  # Local MQTT broker for device communication (no cloud dependency)
  mqtt:
    image: eclipse-mosquitto:2.0
    restart: always
    volumes:
      - mosquitto_data:/mosquitto/data
      - mosquitto_logs:/mosquitto/log

  # Store-and-forward: queue data for when connectivity returns
  store-forward:
    image: myorg/store-forward:1.0
    restart: always
    environment:
      - MQTT_HOST=mqtt
      - UPSTREAM_URL=${UPSTREAM_URL:-}  # Empty when offline
      - BUFFER_SIZE_MB=500  # Buffer up to 500MB of messages locally
    volumes:
      - forward_buffer:/data/buffer

volumes:
  postgres_data:
  mosquitto_data:
  mosquitto_logs:
  forward_buffer:
```

## Step 3: Pre-Pull Images Before Going Offline

When you know connectivity will be lost (e.g., before deploying to a ship), pre-pull all images:

```bash
#!/bin/bash
# Pre-pull all required images while connected

images=(
  "myorg/edge-app:2.1.0"
  "postgres:15-alpine"
  "eclipse-mosquitto:2.0"
  "myorg/store-forward:1.0"
)

for image in "${images[@]}"; do
  echo "Pre-pulling: ${image}"
  docker pull "${image}"
done

echo "All images pre-pulled. Device ready for offline operation."
```

Portainer also has a **Pre-pull images** option in Edge Stack settings that automates this.

## Step 4: Configure Stack Auto-Recovery

Ensure stacks automatically restart on device reboot:

```yaml
# All services should have restart: always
# This ensures recovery from power outages and reboots
services:
  app:
    restart: always
    # Add a delay before marking as unhealthy to survive startup
    healthcheck:
      start_period: 30s
      interval: 30s
      retries: 5
```

Also ensure Docker itself starts on boot:

```bash
# Enable Docker to start on system boot
systemctl enable docker.service
systemctl enable containerd.service

# Optionally configure Docker daemon for offline resilience
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
EOF

systemctl reload docker
```

The `live-restore: true` option helps keep standalone containers running even when the Docker daemon is reloaded or restarted.

## Step 5: Handle Data Buffering During Outages

Implement a store-and-forward pattern for data generated during outages:

```python
# Example: store-forward service logic (pseudo-code; production buffers should be persisted)
import time
import queue

local_buffer = queue.Queue(maxsize=10000)

def collect_data():
    """Continuously collect sensor data into local buffer"""
    while True:
        data = read_sensor()
        local_buffer.put(data)  # Blocks if the buffer is full
        time.sleep(1)

def forward_data():
    """Attempt to forward data when online; buffer otherwise"""
    while True:
        if is_network_available():
            while not local_buffer.empty():
                data = local_buffer.get()
                try:
                    send_to_cloud(data)
                except Exception:
                    local_buffer.put(data)  # Re-queue on failure
                    break
        time.sleep(10)
```

## Best Practices

- **Pin all image versions** - never use `:latest` for offline deployments.
- **Design for local autonomy** - your app must function without cloud services.
- **Buffer outbound data** - use local queues (MQTT, Redis, flat files) to hold data until reconnection.
- **Set realistic poll intervals** - balance freshness against bandwidth costs.
- **Test offline scenarios** - deliberately disconnect a test device before deployment.

## Conclusion

Intermittent connectivity is a fact of life for many edge deployments. Portainer's async polling model, combined with offline-first application design, `restart: always` policies, and local data buffering, ensures your edge devices remain operational and your data is preserved even during extended outages.
