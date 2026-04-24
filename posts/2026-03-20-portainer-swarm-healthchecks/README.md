# How to Configure Swarm Service Healthchecks in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Health Check, Reliability, Monitoring

Description: Configure Docker health checks for Swarm services managed by Portainer to enable automatic container replacement on failure.

## Introduction

Docker health checks run commands inside containers to verify they are functioning correctly. When a Swarm service task becomes unhealthy, Docker Swarm automatically replaces it. Portainer lets you inspect container and service task status, making it easier to identify and diagnose issues.

## Health Check Configuration

```yaml
# healthcheck-demo-stack.yml

version: '3.8'

services:
  # Web server with HTTP health check
  web:
    image: nginx:latest
    deploy:
      replicas: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s      # How often to check
      timeout: 10s       # Timeout per check
      retries: 3         # Failures before marking unhealthy
      start_period: 40s  # Grace period on start

  # API with custom health endpoint
  api:
    image: myapp-api:latest
    deploy:
      replicas: 2
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/health > /dev/null"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Database
  postgres:
    image: postgres:15
    deploy:
      replicas: 1
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d mydb || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb

  # Redis
  redis:
    image: redis:7-alpine
    deploy:
      replicas: 1
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Elasticsearch
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    deploy:
      replicas: 1
    healthcheck:
      test:
        - CMD-SHELL
        - "nc -z localhost 9200"
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s
    environment:
      discovery.type: single-node
      xpack.security.enabled: "false"
```

## Health Check for Custom Applications

```python
# Python Flask health endpoint example
from flask import Flask, jsonify
import psycopg2
import redis
import os

app = Flask(__name__)

@app.route('/health')
def health():
    checks = {}
    overall_healthy = True

    # Check database connectivity
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        conn.close()
        checks['database'] = {'status': 'healthy'}
    except Exception as e:
        checks['database'] = {'status': 'unhealthy', 'error': str(e)}
        overall_healthy = False

    # Check Redis
    try:
        r = redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379'))
        r.ping()
        checks['redis'] = {'status': 'healthy'}
    except Exception as e:
        checks['redis'] = {'status': 'unhealthy', 'error': str(e)}
        overall_healthy = False

    status_code = 200 if overall_healthy else 503
    return jsonify({
        'status': 'ok' if overall_healthy else 'degraded',
        'checks': checks
    }), status_code
```

## Advanced Health Check Patterns

```yaml
services:
  # Multi-stage health check using a dedicated script
  complex-app:
    image: myapp:latest
    healthcheck:
      test: ["CMD", "/app/healthcheck.sh"]
      interval: 30s
      timeout: 15s
      retries: 3

  # Health check with authentication
  secured-api:
    image: secured-app:latest
    healthcheck:
      test: 
        - CMD-SHELL
        - 'curl -sf -H "X-Health-Token: $$HEALTH_TOKEN" http://localhost:8080/internal/health'
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
#!/bin/bash
# healthcheck.sh - complex multi-step health check

# Check main process
if ! pgrep -f "myapp" > /dev/null; then
  echo "Process not running"
  exit 1
fi

# Check HTTP endpoint
if ! curl -sf http://localhost:8080/health; then
  echo "HTTP health check failed"
  exit 1
fi

# Check disk space (fail if > 90% full)
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ $DISK_USAGE -gt 90 ]; then
  echo "Disk usage critical: ${DISK_USAGE}%"
  exit 1
fi

echo "All checks passed"
exit 0
```

## Viewing Health Status in Portainer

Open the target environment in Portainer, then go to **Containers** to inspect container status and details.

For Docker Swarm endpoints, go to **Services** and expand a service to view the status of its tasks.

## Conclusion

Docker health checks with Swarm services in Portainer create self-healing infrastructure. When tasks fail their health checks, Swarm automatically replaces them, and Portainer provides task and container visibility for operational troubleshooting. Well-designed health check endpoints that test actual functionality (not just process availability) provide meaningful signals that enable genuine self-healing behavior.
