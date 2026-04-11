# How to Use Redis Init Containers in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Init Container, Configuration, StatefulSet

Description: Learn how to use Kubernetes init containers with Redis to run pre-start tasks like configuration injection, dependency checks, and kernel tuning before Redis starts.

---

Init containers run to completion before your main Redis container starts. They are ideal for tasks like waiting for dependencies, setting kernel parameters, copying configuration files, or seeding data. This guide covers practical init container patterns for Redis deployments.

## Use Case 1: Kernel Tuning Before Redis Starts

Redis recommends setting `vm.overcommit_memory=1` and disabling transparent huge pages. These require root-level system calls that the Redis container itself should not have:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: redis
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
      initContainers:
      - name: sysctl-tuning
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          sysctl -w vm.overcommit_memory=1
          sysctl -w net.core.somaxconn=65535
          echo never > /sys/kernel/mm/transparent_hugepage/enabled
      containers:
      - name: redis
        image: redis:7.2-alpine
        ports:
        - containerPort: 6379
```

## Use Case 2: Waiting for a Dependency

If Redis depends on a Kubernetes Secret or ConfigMap being available, or another service being ready, use an init container to wait:

```yaml
initContainers:
- name: wait-for-config
  image: redis:7.2-alpine
  command:
  - sh
  - -c
  - |
    until redis-cli -h redis-primary.redis.svc.cluster.local ping 2>/dev/null; do
      echo "Waiting for Redis primary..."
      sleep 2
    done
    echo "Redis primary is ready"
```

## Use Case 3: Injecting Dynamic Redis Configuration

Generate a `redis.conf` dynamically from environment variables before Redis starts:

```yaml
initContainers:
- name: config-generator
  image: busybox:1.36
  env:
  - name: REDIS_MAX_MEMORY
    valueFrom:
      configMapKeyRef:
        name: redis-config
        key: max-memory
  - name: REDIS_MAX_MEMORY_POLICY
    value: "allkeys-lru"
  command:
  - sh
  - -c
  - |
    cat > /etc/redis/redis.conf <<EOF
    maxmemory ${REDIS_MAX_MEMORY}
    maxmemory-policy ${REDIS_MAX_MEMORY_POLICY}
    appendonly yes
    protected-mode no
    EOF
    echo "Config written:"
    cat /etc/redis/redis.conf
  volumeMounts:
  - name: redis-config
    mountPath: /etc/redis
```

The main Redis container then mounts the same volume:

```yaml
containers:
- name: redis
  image: redis:7.2-alpine
  command: ["redis-server", "/etc/redis/redis.conf"]
  volumeMounts:
  - name: redis-config
    mountPath: /etc/redis

volumes:
- name: redis-config
  emptyDir: {}
```

## Use Case 4: Restoring a Snapshot Before Start

Copy an RDB backup from object storage before Redis starts, enabling fast warm-up:

```yaml
initContainers:
- name: restore-rdb
  image: amazon/aws-cli:2.15.0
  env:
  - name: AWS_DEFAULT_REGION
    value: us-east-1
  command:
  - sh
  - -c
  - |
    if [ ! -f /data/dump.rdb ]; then
      echo "Downloading RDB snapshot..."
      aws s3 cp s3://my-redis-backups/dump.rdb /data/dump.rdb
      echo "Restore complete"
    else
      echo "RDB file already exists, skipping restore"
    fi
  volumeMounts:
  - name: redis-data
    mountPath: /data
```

## Checking Init Container Logs

```bash
# Check init container status
kubectl get pods -n redis redis-0 -o jsonpath='{.status.initContainerStatuses}'

# View init container logs
kubectl logs redis-0 -n redis -c sysctl-tuning
kubectl logs redis-0 -n redis -c config-generator
```

Expected log output from config-generator:

```text
Config written:
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
protected-mode no
```

## Summary

Init containers give you a clean way to prepare Redis's environment before the main process starts. Use them for privileged kernel tuning, dependency health checks, dynamic configuration generation, and data restoration. They run sequentially, so you can chain multiple init containers when the order of operations matters.
