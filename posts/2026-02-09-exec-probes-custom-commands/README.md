# How to Use Exec Probes with Custom Commands for Application-Specific Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Exec Probes

Description: Implement Kubernetes exec probes with custom shell commands and scripts to perform application-specific health checks that verify complex dependencies and internal state.

---

Exec probes run commands inside your container and check the exit code. An exit code of 0 means success, while any non-zero exit code means failure. This flexibility makes exec probes perfect for checking database connectivity, validating file system state, or running custom health check scripts.

This guide shows you how to configure exec probes effectively, write robust health check scripts, and handle common pitfalls.

## Understanding Exec Probes

An exec probe executes a command in the container using the container's default shell (or the specified binary). If the command exits with status code 0, the probe succeeds. Any other exit code fails the probe.

Exec probes are more flexible than HTTP or TCP probes but also more expensive since they spawn a new process for each check.

## Basic Exec Probe Configuration

Configure a simple exec probe for PostgreSQL:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: secret
    ports:
    - containerPort: 5432

    livenessProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - pg_isready -U postgres
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3

    readinessProbe:
      exec:
        command:
        - psql
        - -U
        - postgres
        - -c
        - SELECT 1
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 2
```

The liveness probe checks if Postgres is accepting connections, while readiness verifies it can execute queries.

## Writing Robust Health Check Scripts

Create a dedicated health check script:

```bash
#!/bin/bash
# /usr/local/bin/health-check.sh

set -e  # Exit immediately if a command exits with a non-zero status

# Check 1: Database connectivity
psql -U postgres -c "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Database connection failed"
    exit 1
fi

# Check 2: Can write data
psql -U postgres -c "CREATE TEMP TABLE health_check (id int);" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Cannot write to database"
    exit 1
fi

# Check 3: Replication lag (if replica)
if [ "$POSTGRES_REPLICA" = "true" ]; then
    LAG=$(psql -U postgres -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" | tr -d ' ')
    if (( $(echo "$LAG > 30" | bc -l) )); then
        echo "Replication lag too high: ${LAG}s"
        exit 1
    fi
fi

# All checks passed
echo "All health checks passed"
exit 0
```

Use this script in your probe configuration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
  - name: postgres
    image: postgres:15
    volumeMounts:
    - name: scripts
      mountPath: /usr/local/bin/health-check.sh
      subPath: health-check.sh

    readinessProbe:
      exec:
        command:
        - /bin/bash
        - /usr/local/bin/health-check.sh
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 10

  volumes:
  - name: scripts
    configMap:
      name: health-check-scripts
      defaultMode: 0755
```

## Exec Probes for Redis

Check Redis functionality:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7
        command:
        - redis-server
        - /etc/redis/redis.conf
        ports:
        - containerPort: 6379

        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - |
              redis-cli ping &&
              redis-cli --no-raw incr ping_counter > /dev/null
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

The readiness probe verifies both connectivity and write capability.

## Exec Probes for MongoDB

Check MongoDB replica set health:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
spec:
  serviceName: mongodb
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:7
        ports:
        - containerPort: 27017

        livenessProbe:
          exec:
            command:
            - mongosh
            - --eval
            - db.adminCommand('ping')
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - |
              mongosh --eval '
                var status = rs.status();
                if (status.myState !== 1 && status.myState !== 2) {
                  quit(1);
                }
              '
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 2
```

This checks if the MongoDB instance is in PRIMARY (1) or SECONDARY (2) state.

## File System Health Checks

Verify file system accessibility and disk space:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-storage
spec:
  containers:
  - name: app
    image: my-app:latest
    volumeMounts:
    - name: data
      mountPath: /data

    livenessProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - |
          # Check if data directory is writable
          touch /data/.health-check-$$
          if [ $? -eq 0 ]; then
            rm -f /data/.health-check-$$
            exit 0
          fi
          exit 1
      periodSeconds: 30
      timeoutSeconds: 10

    readinessProbe:
      exec:
        command:
        - /bin/sh
        - -c
        - |
          # Check disk space (fail if <10% free)
          USAGE=$(df /data | tail -1 | awk '{print $5}' | sed 's/%//')
          if [ "$USAGE" -gt 90 ]; then
            echo "Disk usage too high: ${USAGE}%"
            exit 1
          fi
          exit 0
      periodSeconds: 60

  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

## Checking Multiple Dependencies

Create comprehensive health checks:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: health-check-script
data:
  health-check.sh: |
    #!/bin/bash
    set -e

    echo "Checking database..."
    psql -h postgres -U app -c "SELECT 1" > /dev/null

    echo "Checking Redis..."
    redis-cli -h redis ping > /dev/null

    echo "Checking RabbitMQ..."
    rabbitmqctl status > /dev/null

    echo "Checking S3 connectivity..."
    aws s3 ls s3://my-bucket/ --region us-east-1 > /dev/null

    echo "All checks passed"
    exit 0
---
apiVersion: v1
kind: Pod
metadata:
  name: api-server
spec:
  containers:
  - name: api
    image: api-server:latest
    volumeMounts:
    - name: health-check
      mountPath: /health-check.sh
      subPath: health-check.sh

    readinessProbe:
      exec:
        command:
        - /bin/bash
        - /health-check.sh
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 15
      failureThreshold: 2

  volumes:
  - name: health-check
    configMap:
      name: health-check-script
      defaultMode: 0755
```

## Timeout Handling in Exec Probes

Implement timeout handling in your scripts:

```bash
#!/bin/bash
# health-check-with-timeout.sh

TIMEOUT=5

# Function that might hang
check_external_service() {
    curl -s --max-time $TIMEOUT http://external-api/health
}

# Run with timeout
if timeout $TIMEOUT check_external_service > /dev/null 2>&1; then
    echo "External service healthy"
    exit 0
else
    echo "External service check failed or timed out"
    exit 1
fi
```

Use in probe configuration:

```yaml
readinessProbe:
  exec:
    command:
    - /bin/bash
    - /health-check-with-timeout.sh
  periodSeconds: 10
  timeoutSeconds: 10  # Kubernetes timeout (should be > script timeout)
```

## Python Health Check Scripts

Use Python for complex logic:

```python
#!/usr/bin/env python3
# /usr/local/bin/health-check.py

import sys
import psycopg2
import redis
import requests

def check_database():
    try:
        conn = psycopg2.connect(
            host="postgres",
            database="myapp",
            user="app",
            password="secret",
            connect_timeout=3
        )
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        return True
    except Exception as e:
        print(f"Database check failed: {e}")
        return False

def check_redis():
    try:
        r = redis.Redis(host='redis', port=6379, socket_timeout=3)
        r.ping()
        return True
    except Exception as e:
        print(f"Redis check failed: {e}")
        return False

def check_api():
    try:
        response = requests.get('http://api/health', timeout=3)
        return response.status_code == 200
    except Exception as e:
        print(f"API check failed: {e}")
        return False

if __name__ == '__main__':
    checks = {
        'database': check_database(),
        'redis': check_redis(),
        'api': check_api()
    }

    failed = [name for name, passed in checks.items() if not passed]

    if failed:
        print(f"Failed checks: {', '.join(failed)}")
        sys.exit(1)

    print("All checks passed")
    sys.exit(0)
```

Configure the probe:

```yaml
readinessProbe:
  exec:
    command:
    - python3
    - /usr/local/bin/health-check.py
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 10
```

## Performance Considerations

Exec probes can be expensive. Optimize them:

```bash
#!/bin/bash
# Lightweight check that caches results

CACHE_FILE="/tmp/health-check-cache"
CACHE_TTL=5  # Cache for 5 seconds

# Check if cache is still valid
if [ -f "$CACHE_FILE" ]; then
    AGE=$(($(date +%s) - $(stat -c %Y "$CACHE_FILE" 2>/dev/null || stat -f %m "$CACHE_FILE")))
    if [ $AGE -lt $CACHE_TTL ]; then
        cat "$CACHE_FILE"
        exit $(cat "${CACHE_FILE}.exitcode")
    fi
fi

# Perform actual check
if check_health; then
    echo "Healthy" > "$CACHE_FILE"
    echo "0" > "${CACHE_FILE}.exitcode"
    exit 0
else
    echo "Unhealthy" > "$CACHE_FILE"
    echo "1" > "${CACHE_FILE}.exitcode"
    exit 1
fi
```

## Debugging Exec Probe Failures

Troubleshoot exec probe issues:

```bash
# Run the probe command manually
kubectl exec -it my-pod -- /bin/sh -c "command from probe"

# Check command exit code
kubectl exec -it my-pod -- /bin/sh -c "your-command; echo Exit code: $?"

# View probe output in events
kubectl describe pod my-pod

# Check if required binaries exist
kubectl exec -it my-pod -- which psql
kubectl exec -it my-pod -- ls -la /usr/local/bin/health-check.sh

# Test with verbose output
kubectl exec -it my-pod -- /bin/bash -x /health-check.sh

# Check for permission issues
kubectl exec -it my-pod -- ls -la /health-check.sh
kubectl exec -it my-pod -- /bin/sh -c "test -x /health-check.sh && echo executable"
```

## Common Exec Probe Pitfalls

**Shell not available:**
```yaml
# BAD: Assumes bash exists
command:
- bash
- -c
- "pg_isready"

# GOOD: Use explicit path or sh
command:
- /bin/sh
- -c
- "pg_isready"
```

**Command not found:**
```yaml
# Ensure binary is in PATH or use full path
command:
- /usr/local/bin/pg_isready
# not just:
- pg_isready
```

**Script not executable:**
```yaml
# Set execute permission in ConfigMap
volumes:
- name: scripts
  configMap:
    name: health-scripts
    defaultMode: 0755  # rwxr-xr-x
```

**Timeout too short:**
```yaml
# Ensure Kubernetes timeout > script execution time
readinessProbe:
  exec:
    command: ["/slow-check.sh"]
  timeoutSeconds: 30  # Allow enough time
```

## Best Practices

Follow these guidelines for exec probes:

```yaml
# DO: Use for database and service-specific checks
livenessProbe:
  exec:
    command:
    - redis-cli
    - ping

# DO: Keep checks lightweight and fast
readinessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - "pg_isready -U postgres"
  timeoutSeconds: 5

# DON'T: Run expensive operations
# BAD
command:
- /bin/sh
- -c
- "pg_dump mydb > /dev/null"  # Too slow!

# DO: Use explicit shell and paths
command:
- /bin/sh
- -c
- "/usr/local/bin/my-check"

# DON'T: Rely on environment variables from shell rc files
# Use explicit env vars in pod spec

# DO: Handle errors gracefully
command:
- /bin/sh
- -c
- |
  set -e
  check1 && check2 && check3
```

## Monitoring Exec Probe Performance

Track exec probe execution:

```promql
# Exec probe duration
histogram_quantile(0.95,
  rate(prober_probe_duration_seconds_bucket{probe_type="Exec"}[5m])
)

# Exec probe failures
rate(prober_probe_total{probe_type="Exec",result="failed"}[5m])

# Slow exec probes (> 5 seconds)
prober_probe_duration_seconds{probe_type="Exec"} > 5
```

## Conclusion

Exec probes provide maximum flexibility for application-specific health checks. By running custom commands and scripts inside your containers, you can verify complex dependencies, check internal application state, and implement sophisticated health logic that goes beyond simple HTTP or TCP checks.

Keep your exec probes lightweight and fast, use explicit paths and shells, handle timeouts appropriately, and always test them manually before deploying to production. Well-designed exec probes can detect issues that simpler probe types would miss.
