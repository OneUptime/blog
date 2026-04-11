# How to Set Up Redis Readiness and Liveness Probes in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Probe

Description: Learn how to configure Kubernetes readiness and liveness probes for Redis pods to ensure traffic only reaches healthy instances and unhealthy pods are restarted automatically.

---

Kubernetes probes are essential for Redis reliability in production. Readiness probes prevent traffic from reaching unready pods, while liveness probes restart pods that are stuck or unresponsive.

## Probe Types

```text
Liveness probe:   Is the container alive? Restart if it fails.
Readiness probe:  Is the container ready to serve traffic? Remove from
                  Service endpoints if it fails.
Startup probe:    Has the container started successfully? Disables
                  liveness/readiness during startup.
```

## Basic Probes

```yaml
# redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
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
          image: redis:7-alpine
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
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
            successThreshold: 1
```

## Probes with Authentication

For password-protected Redis, use a script:

```yaml
containers:
  - name: redis
    image: redis:7-alpine
    env:
      - name: REDIS_PASSWORD
        valueFrom:
          secretKeyRef:
            name: redis-secret
            key: password
    livenessProbe:
      exec:
        command:
          - sh
          - -c
          - redis-cli -a "$REDIS_PASSWORD" ping | grep -q PONG
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3

    readinessProbe:
      exec:
        command:
          - sh
          - -c
          - redis-cli -a "$REDIS_PASSWORD" ping | grep -q PONG
      initialDelaySeconds: 5
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
```

## Advanced Readiness Check

Check that Redis is ready to accept writes, not just ping:

```yaml
readinessProbe:
  exec:
    command:
      - sh
      - -c
      - |
        result=$(redis-cli -a "$REDIS_PASSWORD" SET healthcheck "ok" EX 10)
        [ "$result" = "OK" ]
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

## Startup Probe for Slow Initialization

Use a startup probe to give Redis time to load large RDB files:

```yaml
startupProbe:
  exec:
    command:
      - sh
      - -c
      - redis-cli ping | grep -q PONG
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30  # Allow up to 150 seconds (30 x 5s) to start
```

Once the startup probe succeeds, liveness and readiness probes take over.

## Replication-Aware Readiness

For replicas, check replication link status before marking ready:

```yaml
readinessProbe:
  exec:
    command:
      - sh
      - -c
      - |
        # Check PING
        redis-cli ping | grep -q PONG || exit 1
        # If replica, check master link is up
        ROLE=$(redis-cli INFO replication | grep "^role:" | cut -d: -f2 | tr -d '\r ')
        if [ "$ROLE" = "slave" ]; then
          LINK=$(redis-cli INFO replication | grep "master_link_status:" | cut -d: -f2 | tr -d '\r ')
          [ "$LINK" = "up" ] || exit 1
        fi
        exit 0
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 5
```

## Verifying Probe Behavior

```bash
# Check probe status
kubectl describe pod redis-0 | grep -A 10 "Liveness\|Readiness\|Startup"

# View probe failure events
kubectl get events --field-selector reason=Unhealthy

# Check if pod is ready
kubectl get pod redis-0 -o jsonpath='{.status.containerStatuses[0].ready}'
```

## Summary

Redis Kubernetes probes should use `redis-cli ping` as the baseline liveness check and a write test for readiness. Add startup probes with generous failure thresholds when loading large RDB files on startup. For replicated setups, enhance the readiness probe to verify the replication link is active before marking a replica pod as ready to serve traffic.
