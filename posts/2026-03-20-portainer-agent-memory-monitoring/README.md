# How to Monitor Agent Memory Usage in Portainer - Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Memory, Monitoring, Performance

Description: Monitor and manage Portainer Agent memory consumption to prevent resource issues on Docker hosts.

## Introduction

The Portainer Agent is lightweight but can consume increasing memory in high-load environments or when managing large numbers of containers. Monitoring agent memory usage prevents out-of-memory situations that would disrupt container management.

## Checking Agent Memory Usage

```bash
# Real-time memory stats

docker stats portainer_agent --no-stream
# Shows: CPU %, MEM USAGE/LIMIT, MEM %

# Historical stats (watch mode)
docker stats portainer_agent

# Single-sample stats in JSON format
docker stats portainer_agent --no-stream --format "{{ json . }}"
```

## Setting Memory Limits on the Agent

Prevent the agent from consuming excessive memory by setting limits. Use an agent image tag that matches your Portainer Server version:

```bash
# Set memory limit to 256MB
docker run -d \
  --name portainer_agent \
  --restart always \
  -p 9001:9001 \
  --memory="256m" \
  --memory-swap="512m" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:lts
```

```yaml
# docker-compose.yml
services:
  agent:
    container_name: portainer_agent
    image: portainer/agent:lts
    restart: always
    ports:
      - "9001:9001"
    mem_limit: 256m
    memswap_limit: 512m
    mem_reservation: 64m
    cpus: 0.25
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
```

## Monitoring with Docker Stats API

```bash
# Get memory stats via Docker API
API_VERSION=$(docker version --format '{{.Server.APIVersion}}')

curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v${API_VERSION}/containers/portainer_agent/stats?stream=false" \
  | python3 -c "
import sys, json
stats = json.load(sys.stdin)
mem = stats['memory_stats']
mem_stats = mem.get('stats', {})
cache = mem_stats.get('inactive_file', mem_stats.get('total_inactive_file', mem_stats.get('cache', 0)))
used = max(mem['usage'] - cache, 0) / 1024 / 1024
limit = mem['limit'] / 1024 / 1024
print(f'Memory: {used:.1f}MiB / {limit:.1f}MiB ({used/limit*100:.1f}%)')
"
```

## Alerting on High Memory Usage

```bash
#!/bin/bash
# check-agent-memory.sh

THRESHOLD_MB=200
THRESHOLD_BYTES=$((THRESHOLD_MB * 1024 * 1024))
CONTAINER_NAME="portainer_agent"
API_VERSION=$(docker version --format '{{.Server.APIVersion}}')

MEM_USAGE_BYTES=$(curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v${API_VERSION}/containers/${CONTAINER_NAME}/stats?stream=false" \
  | python3 -c "
import sys, json
stats = json.load(sys.stdin)
mem = stats['memory_stats']
mem_stats = mem.get('stats', {})
cache = mem_stats.get('inactive_file', mem_stats.get('total_inactive_file', mem_stats.get('cache', 0)))
print(max(mem['usage'] - cache, 0))
")

if (( MEM_USAGE_BYTES > THRESHOLD_BYTES )); then
  echo "WARNING: Agent memory usage $((MEM_USAGE_BYTES / 1024 / 1024))MB exceeds threshold ${THRESHOLD_MB}MB"
  # Add alerting logic here (email, Slack, PagerDuty)
fi
```

## Reducing Agent Memory Footprint

If the agent uses excessive memory:

```bash
# 1. Restart the agent periodically via cron
0 3 * * 0 docker restart portainer_agent  # Weekly restart Sunday 3am

# 2. Reduce log verbosity when recreating the agent
# Add this option to your docker run or Compose config: -e LOG_LEVEL=ERROR

# 3. Check for memory leaks - track over time
for i in $(seq 1 10); do
  docker stats portainer_agent --no-stream --format "{{.MemUsage}}"
  sleep 60
done
```

## Conclusion

Portainer Agent memory usage is usually modest, but it should still be monitored on busy hosts and investigated if it grows steadily over time. Set memory limits to protect host stability, monitor usage trends, and restart the agent on a schedule if memory growth is observed. The Docker stats API provides the most detailed memory breakdown for diagnosing consumption patterns, while `docker stats` is the quickest interactive check.
