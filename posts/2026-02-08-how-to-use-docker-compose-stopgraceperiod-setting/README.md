# How to Use Docker Compose stop_grace_period Setting

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Graceful Shutdown, SIGTERM, Container Lifecycle, DevOps

Description: Configure Docker Compose stop_grace_period to give containers enough time for graceful shutdown and clean resource cleanup.

---

When you stop a Docker container, a clock starts ticking. Docker sends SIGTERM to the main process and waits for it to shut down cleanly. If the process does not exit before the grace period expires, Docker sends SIGKILL, which terminates it immediately. The `stop_grace_period` setting in Docker Compose controls how long that clock runs.

## The Container Shutdown Sequence

Understanding the shutdown sequence is essential for configuring the grace period correctly.

1. You run `docker compose down` or `docker compose stop`
2. Docker sends SIGTERM (signal 15) to the container's PID 1 process
3. The application receives SIGTERM and begins its shutdown procedure
4. Docker waits for the `stop_grace_period` duration
5. If the process is still running after the grace period, Docker sends SIGKILL (signal 9)
6. SIGKILL cannot be caught or ignored, and the process terminates immediately

The default grace period is 10 seconds. For many applications, that is not enough time to finish processing in-flight requests, close database connections, flush buffers, and deregister from service discovery.

## Setting stop_grace_period

The syntax accepts duration strings with unit suffixes.

```yaml
# Give the service 30 seconds to shut down gracefully
version: "3.8"

services:
  api:
    image: my-api:latest
    stop_grace_period: 30s
```

Supported duration formats:

```yaml
# Various duration formats
services:
  quick-stop:
    image: my-app:latest
    stop_grace_period: 5s       # 5 seconds

  medium-stop:
    image: my-app:latest
    stop_grace_period: 1m       # 1 minute

  long-stop:
    image: my-app:latest
    stop_grace_period: 2m30s    # 2 minutes and 30 seconds

  precise-stop:
    image: my-app:latest
    stop_grace_period: 90s      # 90 seconds
```

## Why the Default 10 Seconds Is Often Not Enough

Consider what happens when a web server shuts down:

1. Stop accepting new connections
2. Wait for in-flight HTTP requests to complete
3. Close database connection pools
4. Flush any buffered writes (logs, metrics, caches)
5. Deregister from load balancer or service mesh
6. Send final metrics and traces
7. Close file handles and release resources

A single long-running API request might take 30 seconds to complete. If your grace period is only 10 seconds, that request gets killed mid-execution, potentially leaving data in an inconsistent state.

## Configuring Grace Periods by Service Type

Different services need different grace periods. Here are recommendations based on service type.

### Web Servers and API Services

Web servers need enough time to drain active connections.

```yaml
# API server with connection draining
services:
  api:
    image: my-api:latest
    stop_grace_period: 30s
    stop_signal: SIGTERM
```

Nginx has its own graceful shutdown mechanism when it receives SIGQUIT instead of SIGTERM.

```yaml
# Nginx with proper shutdown signal
services:
  nginx:
    image: nginx:alpine
    stop_grace_period: 30s
    stop_signal: SIGQUIT
```

### Databases

Databases need time to flush dirty pages, complete active transactions, and write checkpoint records. Killing a database abruptly can lead to a lengthy recovery on the next startup.

```yaml
# PostgreSQL needs time to checkpoint and flush
services:
  postgres:
    image: postgres:16
    stop_grace_period: 2m
    volumes:
      - pgdata:/var/lib/postgresql/data
```

```yaml
# MySQL with extended grace period for InnoDB flush
services:
  mysql:
    image: mysql:8
    stop_grace_period: 90s
    volumes:
      - mysqldata:/var/lib/mysql
```

### Message Queue Consumers

Workers processing messages should finish their current message before stopping. The grace period needs to cover the longest possible message processing time.

```yaml
# Worker that processes messages taking up to 60 seconds each
services:
  worker:
    image: my-worker:latest
    stop_grace_period: 90s
    environment:
      # Configure the worker to stop accepting new messages on SIGTERM
      GRACEFUL_SHUTDOWN: "true"
      MAX_PROCESSING_TIME: "60"
```

### Batch Processing and ETL Jobs

Long-running batch jobs might need several minutes to reach a safe checkpoint.

```yaml
# ETL job with long grace period
services:
  etl:
    image: my-etl:latest
    stop_grace_period: 5m
```

### Cache Services

Redis, for example, needs time to persist data if you are using RDB snapshots or AOF.

```yaml
# Redis with persistence flush time
services:
  redis:
    image: redis:7-alpine
    stop_grace_period: 30s
    command: redis-server --save 60 1000 --appendonly yes
```

## The stop_signal Directive

`stop_grace_period` works together with `stop_signal`. By default, Docker sends SIGTERM, but some applications respond better to different signals.

```yaml
# Custom stop signal for specific applications
services:
  # Nginx prefers SIGQUIT for graceful shutdown
  nginx:
    image: nginx:alpine
    stop_signal: SIGQUIT
    stop_grace_period: 30s

  # Some Java applications handle SIGINT better
  java-app:
    image: my-java-app:latest
    stop_signal: SIGINT
    stop_grace_period: 60s

  # Default SIGTERM works for most applications
  node-app:
    image: my-node-app:latest
    stop_signal: SIGTERM
    stop_grace_period: 30s
```

## Writing Applications That Handle Graceful Shutdown

The grace period only helps if your application actually handles the shutdown signal. Here is how to implement graceful shutdown in different languages.

### Node.js

```javascript
// Graceful shutdown handler in Node.js
const server = app.listen(3000);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, starting graceful shutdown');

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');

    // Close database connections
    db.end(() => {
      console.log('Database connections closed');
      process.exit(0);
    });
  });

  // Force shutdown if graceful shutdown takes too long
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 25000); // Should be less than stop_grace_period
});
```

### Python

```python
# Graceful shutdown handler in Python
import signal
import sys

def handle_sigterm(signum, frame):
    print("SIGTERM received, shutting down gracefully")
    # Close connections, flush buffers, etc.
    cleanup()
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)
```

## Full Stack Example

Here is a complete Compose file with appropriate grace periods for each service.

```yaml
# Production stack with tuned grace periods
version: "3.8"

services:
  # Reverse proxy - drain connections
  nginx:
    image: nginx:alpine
    stop_signal: SIGQUIT
    stop_grace_period: 30s
    ports:
      - "80:80"

  # API - finish in-flight requests
  api:
    build: ./api
    stop_grace_period: 30s
    expose:
      - "3000"

  # Background workers - finish current job
  worker:
    build: ./worker
    stop_grace_period: 2m
    deploy:
      replicas: 3

  # Database - flush and checkpoint
  postgres:
    image: postgres:16
    stop_grace_period: 2m
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Cache - persist to disk
  redis:
    image: redis:7-alpine
    stop_grace_period: 30s
    command: redis-server --appendonly yes

  # Scheduler - wait for current task
  scheduler:
    build: ./scheduler
    stop_grace_period: 60s

volumes:
  pgdata:
```

## Debugging Shutdown Issues

When containers are not shutting down cleanly, investigate with these commands.

```bash
# Watch the shutdown process in real time
docker compose down & docker events --filter event=kill --filter event=die --filter event=stop

# Check if a container was killed (exit code 137 = SIGKILL)
docker inspect --format='{{.State.ExitCode}}' my-container
# 137 means the container did not shut down within the grace period

# Check container logs during shutdown
docker logs --tail 50 my-container
```

If you consistently see exit code 137, your grace period is too short. If containers stop almost instantly, you might be able to reduce it.

```bash
# Time how long a container takes to shut down
time docker stop my-container
```

## The Cost of a Long Grace Period

Setting a very long grace period does not slow down normal shutdowns. Docker sends SIGKILL only if the process has not exited after the full grace period. If your application shuts down in 2 seconds, the remaining 58 seconds of a 60-second grace period are never used.

The only real cost is during `docker compose down`. If a container is truly stuck and will never exit on its own, you have to wait the full grace period before Docker force-kills it. For this reason, set the grace period to the maximum time your application legitimately needs, not an arbitrarily large number.

```bash
# Override the grace period for a one-time faster shutdown
docker compose down -t 5
```

The `-t` flag overrides `stop_grace_period` for that specific command, which is useful when you know you do not care about graceful shutdown (like tearing down a development environment).

Proper grace periods prevent data loss, connection errors, and inconsistent state. Take a few minutes to measure how long each of your services needs to shut down cleanly, then set `stop_grace_period` accordingly. Your users and your data will benefit.
