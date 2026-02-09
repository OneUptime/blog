# How to Use Docker for Chaos Engineering with Pumba

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Pumba, Chaos Engineering, Resilience Testing, Network Emulation, Container Testing, DevOps

Description: Use Pumba to inject network failures, latency, and container crashes into Docker environments for resilience testing.

---

Pumba is a chaos testing tool built specifically for Docker. While other chaos tools focus on Kubernetes or cloud infrastructure, Pumba targets Docker containers directly. It can kill containers, pause them, inject network latency, corrupt packets, limit bandwidth, and more. All of this happens without modifying your application code or container images.

Named after the lovable character from The Lion King, Pumba brings controlled chaos to your Docker environments. This guide covers installation, common chaos experiments, and practical patterns for building resilient containerized applications.

## Installing Pumba

Pumba runs as a standalone binary or, fittingly, as a Docker container. Running it in Docker is the cleanest approach since it needs access to the Docker socket to manipulate other containers.

```bash
# Run Pumba as a Docker container
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba --help
```

You can also download the binary directly.

```bash
# Download the Pumba binary (Linux)
curl -L https://github.com/alexei-led/pumba/releases/download/0.9.7/pumba_linux_amd64 -o pumba
chmod +x pumba
sudo mv pumba /usr/local/bin/
```

## Setting Up a Test Application

Create a simple microservices application to run chaos experiments against.

```yaml
# docker-compose.yml - Target application for Pumba chaos experiments
version: "3.8"

services:
  web:
    image: nginx:alpine
    container_name: web-app
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - api
    restart: unless-stopped

  api:
    build: ./api
    container_name: api-service
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=cache
      - DB_HOST=database
    depends_on:
      - cache
      - database
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    container_name: cache-service
    restart: unless-stopped

  database:
    image: postgres:16-alpine
    container_name: db-service
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    restart: unless-stopped
```

```bash
# Start the application
docker compose up -d
```

## Experiment 1: Killing Containers

The simplest chaos experiment is killing containers. Pumba can kill containers by name, label, or randomly.

```bash
# Kill a specific container with SIGKILL
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba kill api-service

# Kill a container with SIGTERM (graceful shutdown)
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba kill --signal SIGTERM api-service

# Kill a random container matching a pattern every 60 seconds
docker run -d \
  --name pumba-killer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba --interval 60s kill --signal SIGKILL "re2:.*-service"
```

The `re2:` prefix lets you use regular expressions to match container names. This is useful for targeting a group of services.

## Experiment 2: Pausing Containers

Pausing is more subtle than killing. A paused container still exists and holds its network connections, but it stops processing entirely. This simulates a frozen process or a garbage collection pause.

```bash
# Pause a container for 30 seconds
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba pause --duration 30s api-service

# Pause the database for 10 seconds to simulate GC pause
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba pause --duration 10s db-service
```

Watch what happens to your application when the database freezes for 10 seconds. Do connections time out? Does the connection pool recover? These are the questions chaos engineering answers.

## Experiment 3: Network Latency Injection

Pumba uses Linux traffic control (tc) to inject network delays. This simulates slow networks, congested links, or geographically distributed services.

```bash
# Add 500ms latency to all traffic from the API container
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba netem --duration 60s \
  delay --time 500 \
  api-service

# Add 200ms latency with 50ms jitter (more realistic)
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba netem --duration 60s \
  delay --time 200 --jitter 50 \
  api-service

# Add latency to the database connection
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba netem --duration 30s \
  delay --time 1000 \
  db-service
```

The `--jitter` flag adds variability to the delay, which better simulates real network conditions where latency fluctuates.

## Experiment 4: Packet Loss

Simulate an unreliable network by dropping a percentage of packets.

```bash
# Drop 10% of packets from the cache service
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba netem --duration 60s \
  loss --percent 10 \
  cache-service

# Drop 50% of packets (severe network degradation)
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba netem --duration 30s \
  loss --percent 50 \
  api-service
```

Packet loss often causes more insidious problems than outright failures. TCP retransmissions increase latency unpredictably, and applications that do not handle timeouts properly can hang indefinitely.

## Experiment 5: Bandwidth Limiting

Restrict bandwidth to simulate slow network links or bandwidth contention.

```bash
# Limit bandwidth to 1 Mbit/s
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba netem --duration 60s \
  rate --rate 1mbit \
  api-service
```

## Experiment 6: Combining Network Effects

Real network problems rarely come as isolated latency or packet loss. Combine multiple effects for more realistic scenarios.

```bash
# Add 100ms latency AND 5% packet loss simultaneously
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gaiaadm/pumba netem --duration 60s \
  delay --time 100 --jitter 20 \
  loss --percent 5 \
  api-service
```

## Scheduled Chaos with Docker Compose

Run Pumba alongside your application in Docker Compose for automated chaos testing.

```yaml
# docker-compose-chaos.yml - Application with Pumba chaos injection
version: "3.8"

services:
  api:
    build: ./api
    container_name: api-service
    ports:
      - "3000:3000"
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    container_name: cache-service
    restart: unless-stopped

  # Pumba injects latency into the cache every 2 minutes
  pumba-cache-latency:
    image: gaiaadm/pumba
    container_name: pumba-latency
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: >
      --interval 120s
      netem --duration 15s
      delay --time 300 --jitter 100
      cache-service

  # Pumba randomly kills the API container every 5 minutes
  pumba-api-killer:
    image: gaiaadm/pumba
    container_name: pumba-killer
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: >
      --interval 300s
      kill --signal SIGKILL
      api-service
```

```bash
# Start the application with continuous chaos
docker compose -f docker-compose-chaos.yml up -d

# Monitor the API health while chaos runs
watch -n 2 'curl -s http://localhost:3000/health | python3 -m json.tool'
```

## Monitoring During Chaos

Set up monitoring to capture the impact of chaos experiments.

```python
# monitor.py - Track application behavior during chaos
import requests
import time
import csv
from datetime import datetime

def probe_service(url, timeout=5):
    """Send a request and record the result."""
    try:
        start = time.time()
        resp = requests.get(url, timeout=timeout)
        latency = (time.time() - start) * 1000
        return {
            "timestamp": datetime.now().isoformat(),
            "status": resp.status_code,
            "latency_ms": round(latency, 1),
            "success": True
        }
    except Exception as e:
        return {
            "timestamp": datetime.now().isoformat(),
            "status": 0,
            "latency_ms": -1,
            "success": False,
            "error": str(type(e).__name__)
        }

# Write results to CSV for later analysis
with open("chaos-results.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["timestamp", "status", "latency_ms", "success", "error"])
    writer.writeheader()

    print("Monitoring started. Press Ctrl+C to stop.")
    while True:
        result = probe_service("http://localhost:3000/health")
        result.setdefault("error", "")
        writer.writerow(result)
        f.flush()

        status = "OK" if result["success"] else "FAIL"
        print(f"[{result['timestamp']}] {status} - {result['latency_ms']}ms")
        time.sleep(1)
```

## Wrapping Up

Pumba gives you precise control over Docker container chaos. Its network emulation capabilities are particularly valuable because network problems are the most common cause of distributed system failures. Start with simple kill experiments to verify your restart policies work, then graduate to network chaos to test your timeout and retry logic. The goal is not to prove your system is indestructible but to understand exactly how it fails and whether it recovers gracefully.
