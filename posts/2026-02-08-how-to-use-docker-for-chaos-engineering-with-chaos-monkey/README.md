# How to Use Docker for Chaos Engineering with Chaos Monkey

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Chaos Engineering, Chaos Monkey, Resilience, Netflix, Reliability, Testing, Microservices

Description: Learn how to practice chaos engineering with Docker by simulating failures using Chaos Monkey-style approaches.

---

Netflix introduced Chaos Monkey to the world in 2011 with a simple premise: if you want your systems to survive failures, practice failing on purpose. The original Chaos Monkey randomly terminated EC2 instances in production to verify that services could handle unexpected outages. You can apply the same principles to Docker environments, testing how your containerized applications respond when containers crash, networks degrade, and resources become constrained.

This guide shows you how to build a chaos engineering practice using Docker, from basic container killing to sophisticated failure injection.

## Chaos Engineering Principles

Chaos engineering is not about breaking things randomly. It follows a scientific method: form a hypothesis about how your system handles a specific failure, introduce that failure in a controlled way, observe the results, and improve resilience based on what you learn. The goal is to find weaknesses before your users do.

In a Docker environment, the failure modes you care about include container crashes, network partitions, high latency, CPU exhaustion, memory pressure, and disk I/O saturation.

## Setting Up a Target Application

First, create a microservices application that we can run chaos experiments against. This simple stack has a web frontend, an API backend, and a Redis cache.

```yaml
# docker-compose.yml - Target application for chaos experiments
version: "3.8"

services:
  frontend:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - api
    deploy:
      replicas: 2
    restart: unless-stopped

  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    deploy:
      replicas: 3
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
```

```python
# api/app.py - Simple API with Redis dependency
from flask import Flask, jsonify
import redis
import os
import socket
import time

app = Flask(__name__)
redis_client = redis.Redis.from_url(
    os.environ.get("REDIS_URL", "redis://localhost:6379"),
    socket_timeout=2,
    retry_on_timeout=True
)

@app.route("/health")
def health():
    return jsonify({"status": "healthy", "host": socket.gethostname()})

@app.route("/api/data")
def get_data():
    try:
        # Try to get from cache
        cached = redis_client.get("data")
        if cached:
            return jsonify({"source": "cache", "data": cached.decode()})
    except redis.ConnectionError:
        # Gracefully degrade if Redis is unavailable
        pass

    # Fallback to computed data
    return jsonify({"source": "computed", "data": "fallback-value"})

@app.route("/api/counter")
def counter():
    try:
        count = redis_client.incr("request_counter")
        return jsonify({"count": count})
    except redis.ConnectionError:
        return jsonify({"error": "Cache unavailable", "count": -1}), 503

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)
```

## Experiment 1: Random Container Killing

The most basic chaos experiment kills random containers. Write a script that mimics Chaos Monkey behavior.

```bash
#!/bin/bash
# chaos-monkey.sh - Randomly kill containers from a target service
# Usage: ./chaos-monkey.sh <service-name> <interval-seconds>

SERVICE=${1:-api}
INTERVAL=${2:-30}
PROJECT="myapp"

echo "Chaos Monkey targeting service: $SERVICE"
echo "Kill interval: ${INTERVAL}s"
echo "Press Ctrl+C to stop"

while true; do
    # Get running containers for the target service
    CONTAINERS=$(docker ps --filter "name=${PROJECT}-${SERVICE}" --format '{{.ID}}' | shuf)

    if [ -z "$CONTAINERS" ]; then
        echo "[$(date)] No containers found for service: $SERVICE"
    else
        # Pick a random container
        TARGET=$(echo "$CONTAINERS" | head -1)
        CONTAINER_NAME=$(docker inspect --format '{{.Name}}' "$TARGET" | sed 's/\///')
        echo "[$(date)] Killing container: $CONTAINER_NAME ($TARGET)"
        docker kill "$TARGET"
    fi

    sleep "$INTERVAL"
done
```

```bash
# Start the application
docker compose up -d

# Run chaos monkey against the API service (kill one every 30 seconds)
chmod +x chaos-monkey.sh
./chaos-monkey.sh api 30
```

While the chaos monkey runs, monitor your application. Can you still reach the frontend? Does the API respond? Do requests fail and then recover when Docker restarts the killed container?

## Experiment 2: Network Partition Simulation

Simulate a network partition between services by disconnecting containers from the network.

```bash
#!/bin/bash
# network-chaos.sh - Simulate network partitions between services
# Usage: ./network-chaos.sh <container-name> <duration-seconds>

CONTAINER=${1:-myapp-redis-1}
DURATION=${2:-10}
NETWORK="myapp_default"

echo "[$(date)] Disconnecting $CONTAINER from $NETWORK for ${DURATION}s"

# Disconnect the container from the network
docker network disconnect "$NETWORK" "$CONTAINER"

echo "[$(date)] Container disconnected. Waiting ${DURATION}s..."
sleep "$DURATION"

# Reconnect the container
docker network connect "$NETWORK" "$CONTAINER"
echo "[$(date)] Container reconnected to $NETWORK"
```

```bash
# Simulate Redis becoming unreachable for 10 seconds
./network-chaos.sh myapp-redis-1 10
```

This experiment tests whether your application gracefully degrades when Redis becomes unreachable. The API should fall back to computed values instead of returning errors.

## Experiment 3: Resource Exhaustion

Test how your application handles resource constraints by limiting CPU and memory on running containers.

```bash
# Limit a container to 10% of one CPU core
docker update --cpus 0.1 myapp-api-1

# Monitor the effect on response times
for i in $(seq 1 20); do
    time curl -s http://localhost:3000/api/data > /dev/null
done

# Restore normal CPU allocation
docker update --cpus 0 myapp-api-1
```

```bash
# Limit a container's memory to 50MB (may cause OOM kills)
docker update --memory 50m --memory-swap 50m myapp-api-1

# Watch for OOM kills
docker events --filter event=oom --filter event=die
```

## Building a Chaos Dashboard

Create a simple monitoring script that watches system health during experiments.

```python
# chaos-monitor.py - Monitor application health during chaos experiments
import requests
import time
import sys
from datetime import datetime

API_URL = "http://localhost:3000"
CHECK_INTERVAL = 2  # seconds

def check_health():
    """Check the API health endpoint."""
    try:
        start = time.time()
        response = requests.get(f"{API_URL}/health", timeout=5)
        latency = (time.time() - start) * 1000
        return {
            "status": response.status_code,
            "latency_ms": round(latency, 1),
            "healthy": response.status_code == 200
        }
    except requests.exceptions.RequestException as e:
        return {
            "status": 0,
            "latency_ms": -1,
            "healthy": False,
            "error": str(e)
        }

def check_data_endpoint():
    """Check the data endpoint and its fallback behavior."""
    try:
        response = requests.get(f"{API_URL}/api/data", timeout=5)
        data = response.json()
        return data.get("source", "unknown")
    except Exception:
        return "unreachable"

print("Chaos Monitor - Watching application health")
print(f"{'Timestamp':<24} {'Health':<8} {'Latency':<10} {'Data Source':<12}")
print("-" * 60)

while True:
    health = check_health()
    data_source = check_data_endpoint()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    status = "OK" if health["healthy"] else "FAIL"
    latency = f"{health['latency_ms']}ms" if health["latency_ms"] > 0 else "timeout"

    print(f"{timestamp:<24} {status:<8} {latency:<10} {data_source:<12}")
    time.sleep(CHECK_INTERVAL)
```

Run the monitor in one terminal while conducting chaos experiments in another.

```bash
# Terminal 1: Start monitoring
pip install requests
python chaos-monitor.py

# Terminal 2: Run chaos experiments
./chaos-monkey.sh api 15
```

## Automated Chaos Experiments

Create a structured experiment runner that executes a series of chaos tests and reports results.

```bash
#!/bin/bash
# run-experiments.sh - Automated chaos experiment suite
set -e

RESULTS_FILE="chaos-results-$(date +%Y%m%d_%H%M%S).txt"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$RESULTS_FILE"
}

check_app() {
    local status=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health)
    echo "$status"
}

log "Starting chaos experiment suite"

# Experiment 1: Kill one API container
log "=== Experiment 1: Single container failure ==="
CONTAINER=$(docker ps --filter "name=api" --format '{{.ID}}' | head -1)
docker kill "$CONTAINER"
sleep 5
STATUS=$(check_app)
log "App status after killing one API container: HTTP $STATUS"
sleep 10

# Experiment 2: Kill Redis
log "=== Experiment 2: Cache failure ==="
docker kill $(docker ps --filter "name=redis" --format '{{.ID}}')
sleep 5
STATUS=$(check_app)
log "App status after killing Redis: HTTP $STATUS"
sleep 15

# Experiment 3: Network partition
log "=== Experiment 3: Network partition ==="
docker network disconnect myapp_default myapp-redis-1
sleep 10
STATUS=$(check_app)
log "App status during network partition: HTTP $STATUS"
docker network connect myapp_default myapp-redis-1
sleep 5

log "=== Experiment suite complete ==="
log "Results saved to: $RESULTS_FILE"
```

## Defining Steady State

Before running any chaos experiment, define what "normal" looks like. Measure baseline metrics: average response time, error rate, throughput, and cache hit ratio. After injecting failures, compare against these baselines to determine whether your system maintained acceptable behavior.

```bash
# Capture baseline metrics with a quick load test
for i in $(seq 1 100); do
    curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://localhost:3000/api/data
done | sort | uniq -c
```

## Wrapping Up

Chaos engineering in Docker provides a safe environment to test your system's resilience. Start with simple experiments like killing containers, then progress to network partitions and resource constraints. The goal is not to cause maximum destruction but to build confidence that your system handles failures gracefully. Run chaos experiments regularly, not just once. Systems change, and yesterday's resilience does not guarantee tomorrow's reliability.
