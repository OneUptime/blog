# How to Debug Redis in Docker Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Docker, Debugging

Description: Learn how to debug Redis running in Docker containers using exec, log inspection, network troubleshooting, and performance diagnostics without disrupting production services.

---

Debugging Redis in Docker requires adapting your diagnostic workflow to the containerized environment. This guide covers practical techniques for investigating connectivity, performance, and data issues in Docker-hosted Redis instances.

## Accessing the Redis Container

```bash
# Open an interactive shell in the container
docker exec -it redis sh

# Run redis-cli directly
docker exec -it redis redis-cli

# Connect with authentication
docker exec -it redis redis-cli -a "$REDIS_PASSWORD"

# Run a single command
docker exec redis redis-cli PING
docker exec redis redis-cli INFO server
```

## Inspecting Container Logs

```bash
# View recent logs
docker logs redis --tail 100

# Follow logs in real time
docker logs redis -f

# View logs from the last hour
docker logs redis --since 1h

# Filter for errors
docker logs redis 2>&1 | grep -iE "error|warn|oom|fatal"

# With timestamps
docker logs redis --timestamps | tail -50
```

## Network Connectivity Debugging

```bash
# Test Redis is reachable from another container
docker compose exec app sh -c "nc -zv redis 6379"

# Check which ports Redis is listening on inside the container
docker exec redis netstat -tlnp 2>/dev/null || \
  docker exec redis ss -tlnp

# Verify DNS resolution
docker compose exec app sh -c "nslookup redis"

# Test from a temporary debug container on the same network
docker run --rm --network myapp_default alpine \
  sh -c "apk add redis && redis-cli -h redis PING"
```

## Inspecting Container Configuration

```bash
# View how the container was started
docker inspect redis | python3 -c "
import sys, json
d = json.load(sys.stdin)[0]
print('Command:', d['Config']['Cmd'])
print('Env:', d['Config']['Env'])
print('Mounts:', [m['Source'] + ' -> ' + m['Destination'] for m in d['Mounts']])
"

# Check resource limits
docker inspect redis --format='{{json .HostConfig}}' | \
  python3 -m json.tool | grep -E "Memory|CPU|Ulimit"
```

## Performance Debugging Inside Container

```bash
# Monitor Redis operations in real time (brief)
docker exec redis timeout 5 redis-cli MONITOR | head -100

# Check slowlog
docker exec redis redis-cli SLOWLOG GET 20

# Latency stats (runs for 5 seconds)
docker exec redis timeout 5 redis-cli --latency

# Memory doctor
docker exec redis redis-cli MEMORY DOCTOR

# Big key scan
docker exec redis redis-cli --bigkeys -i 0.1
```

## Debugging Persistence Issues

```bash
# Verify data directory is writable
docker exec redis ls -la /data/

# Check RDB save status
docker exec redis redis-cli INFO persistence | grep -E "rdb_|aof_"

# Check if volume is mounted correctly
docker inspect redis --format='{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'

# Trigger manual save and verify
docker exec redis redis-cli BGSAVE
sleep 3
docker exec redis redis-cli LASTSAVE
docker exec redis ls -la /data/dump.rdb
```

## Debugging OOM Container Kills

```bash
# Check if Redis was OOM killed
docker inspect redis --format='{{.State.OOMKilled}}'

# View container resource usage
docker stats redis --no-stream

# Increase memory limit in compose
# services.redis.deploy.resources.limits.memory: 2g
```

## Summary

Debugging Redis in Docker relies on `docker exec` for CLI access, `docker logs` for log inspection, network tools for connectivity validation, and standard Redis diagnostic commands like SLOWLOG, MONITOR, and MEMORY DOCTOR. Always check container health status, resource limits, and volume mounts before digging into application-level issues, as container misconfiguration is often the root cause.
