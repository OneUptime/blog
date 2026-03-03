# How to Set Up Active-Passive Workloads on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Active-Passive, High Availability, Kubernetes, Failover, Workloads

Description: Configure active-passive workload patterns on Talos Linux for applications that require exactly one running instance with automatic failover to a standby.

---

Not all applications can run multiple replicas simultaneously. Databases, message brokers, and certain legacy applications often require that only one instance is active at any given time. The active-passive pattern addresses this by maintaining a primary (active) instance that handles all traffic and a secondary (passive) instance that stands by, ready to take over if the primary fails. Kubernetes on Talos Linux provides several mechanisms for implementing this pattern reliably.

This guide covers multiple approaches to active-passive workloads on Talos Linux, from simple StatefulSet configurations to leader election sidecars and operator-managed failover.

## Understanding Active-Passive Patterns

There are three main variations:

1. **Hot standby** - The passive instance is running and ready to take over immediately. Data is continuously replicated to the standby.
2. **Warm standby** - The passive instance is running but needs some initialization (loading data, warming caches) before it can serve traffic.
3. **Cold standby** - The passive instance is not running and needs to be started from scratch when the active fails.

Kubernetes naturally supports cold standby through its restart policy. For hot and warm standby, you need additional configuration.

## Method 1: StatefulSet with Single Replica

The simplest active-passive setup uses a StatefulSet with one replica. Kubernetes ensures exactly one pod is running:

```yaml
# single-replica-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-database
  namespace: default
spec:
  serviceName: my-database
  replicas: 1
  selector:
    matchLabels:
      app: my-database
  template:
    metadata:
      labels:
        app: my-database
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: database
          image: postgres:15
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              cpu: "2"
              memory: 4Gi
          livenessProbe:
            exec:
              command: ["pg_isready", "-U", "postgres"]
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "postgres"]
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: local-path
        resources:
          requests:
            storage: 50Gi
```

This is cold standby since if the pod crashes, Kubernetes restarts it. The restart may take some time depending on the application's startup process.

## Method 2: Leader Election with Sidecar

For hot standby, use a leader election sidecar. Both pods run simultaneously, but only the leader serves traffic:

```yaml
# leader-election-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: leader-election-sa
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: leader-election-role
rules:
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["get", "create", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: leader-election-rb
subjects:
  - kind: ServiceAccount
    name: leader-election-sa
roleRef:
  kind: Role
  name: leader-election-role
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: active-passive-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: active-passive-app
  template:
    metadata:
      labels:
        app: active-passive-app
    spec:
      serviceAccountName: leader-election-sa
      containers:
        - name: app
          image: my-app:latest
          ports:
            - containerPort: 8080
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          volumeMounts:
            - name: leader-status
              mountPath: /tmp/leader
        - name: leader-elector
          image: gcr.io/google_containers/leader-elector:0.5
          args:
            - --election=my-app-election
            - --http=0.0.0.0:4040
            - --election-namespace=$(POD_NAMESPACE)
          env:
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          ports:
            - containerPort: 4040
      volumes:
        - name: leader-status
          emptyDir: {}
```

The application container checks the leader elector sidecar to determine if it should be active or passive:

```python
# Application leader check
import requests
import os

def is_leader():
    try:
        response = requests.get("http://localhost:4040")
        leader_name = response.json().get("name")
        return leader_name == os.environ.get("POD_NAME")
    except Exception:
        return False

# In your main loop
if is_leader():
    # Active mode - process requests
    process_work()
else:
    # Passive mode - stay ready
    sync_state()
```

## Method 3: PostgreSQL Active-Passive with Patroni

For databases, Patroni provides a production-grade active-passive setup:

```yaml
# patroni-postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-ha
  namespace: database
spec:
  serviceName: postgres-ha
  replicas: 2
  selector:
    matchLabels:
      app: postgres-ha
  template:
    metadata:
      labels:
        app: postgres-ha
    spec:
      containers:
        - name: postgres
          image: registry.opensource.zalan.do/acid/spilo-15:3.0-p1
          ports:
            - containerPort: 5432
              name: postgresql
            - containerPort: 8008
              name: patroni
          env:
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: PGPASSWORD_SUPERUSER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: superuser-password
            - name: SCOPE
              value: postgres-ha
            - name: PGROOT
              value: /home/postgres/pgdata
          volumeMounts:
            - name: pgdata
              mountPath: /home/postgres/pgdata
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
  volumeClaimTemplates:
    - metadata:
        name: pgdata
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: local-path
        resources:
          requests:
            storage: 50Gi
---
# Service that always points to the primary
apiVersion: v1
kind: Service
metadata:
  name: postgres-primary
  namespace: database
spec:
  ports:
    - port: 5432
  selector:
    app: postgres-ha
    role: master
---
# Service for read replicas
apiVersion: v1
kind: Service
metadata:
  name: postgres-replica
  namespace: database
spec:
  ports:
    - port: 5432
  selector:
    app: postgres-ha
    role: replica
```

Patroni uses etcd (or the Kubernetes API) for leader election. The primary handles all writes, while the replica streams WAL changes and can serve read queries. If the primary fails, Patroni automatically promotes the replica.

## Method 4: Redis Sentinel for Active-Passive Redis

```yaml
# redis-sentinel.yaml
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
          ports:
            - containerPort: 6379
          command: ["redis-server"]
          args:
            - --requirepass
            - $(REDIS_PASSWORD)
            - --masterauth
            - $(REDIS_PASSWORD)
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-secret
                  key: password
        - name: sentinel
          image: redis:7
          ports:
            - containerPort: 26379
          command: ["redis-sentinel"]
          args: ["/etc/redis/sentinel.conf"]
          volumeMounts:
            - name: sentinel-config
              mountPath: /etc/redis
      volumes:
        - name: sentinel-config
          configMap:
            name: redis-sentinel-config
```

## Configuring Pod Disruption Budgets

Prevent Kubernetes from accidentally disrupting your active instance during maintenance:

```yaml
# pdb-active-passive.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-database-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: my-database
```

For the leader-elected deployment:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: active-passive-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: active-passive-app
```

## Anti-Affinity for Active-Passive Pods

Ensure active and passive pods run on different nodes:

```yaml
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: active-passive-app
          topologyKey: kubernetes.io/hostname
```

For cross-zone distribution:

```yaml
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: active-passive-app
          topologyKey: topology.kubernetes.io/zone
```

## Monitoring Active-Passive State

Track which instance is active and detect failover events:

```yaml
# active-passive-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: active-passive-alerts
spec:
  groups:
    - name: active-passive
      rules:
        - alert: NoActiveInstance
          expr: |
            count(kube_pod_status_ready{
              pod=~"active-passive-app.*",
              condition="true"
            }) == 0
          for: 30s
          labels:
            severity: critical
          annotations:
            summary: "No active instance for active-passive-app"
        - alert: FailoverOccurred
          expr: |
            changes(kube_pod_status_ready{
              pod=~"active-passive-app.*",
              condition="true"
            }[5m]) > 2
          labels:
            severity: warning
          annotations:
            summary: "Failover detected for active-passive-app"
```

## Conclusion

Active-passive workloads on Talos Linux give you the reliability of automatic failover for applications that cannot run multiple active replicas. Whether you use a simple single-replica StatefulSet, a leader election sidecar, or a specialized operator like Patroni, Kubernetes provides the building blocks for reliable active-passive patterns. Combined with anti-affinity rules, pod disruption budgets, and proper monitoring, you can build active-passive deployments on Talos Linux that fail over smoothly and recover quickly.
