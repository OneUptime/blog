# How to Deploy Stacks with Health Checks for All Services in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Health Check, Reliability, Stack, DevOps

Description: Add comprehensive health checks to every service in a Portainer stack to enable reliable startup ordering, automatic failure detection, and self-healing container restarts.

---

A stack where every service has a health check is significantly more reliable - startup ordering is correct, failed containers are automatically replaced, and Portainer shows accurate health status for all services.

## Complete Stack with Health Checks

```yaml
version: "3.8"
services:
  nginx:
    image: nginx:1.25
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    ports:
      - "80:80"
    depends_on:
      webapp:
        condition: service_healthy
    restart: unless-stopped

  webapp:
    image: myapp:1.2.3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s    # App may take time to initialize
    depends_on:
      database:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  database:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: always
    volumes:
      - db-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    restart: always

volumes:
  db-data:
```

## Health Check Design per Service Type

### HTTP Services

```yaml
healthcheck:
  # Use -f to fail on non-2xx status codes
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
```

Design a dedicated `/health` endpoint that returns 200 when ready:

```python
# health_endpoint.py

@app.route("/health")
def health():
    # Check database connectivity
    try:
        db.execute("SELECT 1")
    except Exception:
        return {"status": "unhealthy", "reason": "db"}, 503
    return {"status": "healthy"}, 200
```

### TCP Services

```yaml
healthcheck:
  # nc -z tests TCP connectivity without sending data
  test: ["CMD", "nc", "-z", "localhost", "PORT"]
```

### Message Queues

```yaml
# RabbitMQ
healthcheck:
  test: ["CMD", "rabbitmq-diagnostics", "ping"]
  
# Kafka
healthcheck:
  test: ["CMD", "kafka-broker-api-versions.sh", "--bootstrap-server", "localhost:9092"]
```

## Viewing Health History

In Portainer, click on a container and navigate to the **Inspect** tab to see:
- Current health status
- Last N health check results
- Failure reason (last output from the check command)

## Summary

Health checks on every service in a Portainer stack enable correct startup ordering, automatic failure detection, and actionable health status in the dashboard. Design meaningful health checks that test actual service functionality (database queries, HTTP endpoints) rather than just checking if the process is running.
