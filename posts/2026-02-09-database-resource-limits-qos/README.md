# How to Configure Database Resource Limits and QoS for Kubernetes StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Database, StatefulSet, QoS, Resource Management

Description: Configure resource limits and Quality of Service classes for database StatefulSets on Kubernetes to ensure performance, prevent resource contention, and optimize cluster utilization.

---

Proper resource management ensures databases get the resources they need while preventing them from consuming excessive cluster capacity. Kubernetes resource requests and limits combined with QoS classes provide predictable database performance even under heavy load.

## Understanding Kubernetes QoS Classes

Kubernetes assigns Quality of Service classes based on resource specifications. Guaranteed QoS provides the highest priority, ensuring pods are not evicted except under extreme conditions. Burstable QoS allows pods to use more than requested resources when available. BestEffort QoS has no guarantees and faces eviction first during resource pressure.

For production databases, always use Guaranteed QoS. Set requests equal to limits for both CPU and memory. This prevents the kubelet from evicting database pods and ensures consistent performance. Databases are sensitive to resource fluctuations that can cause query timeouts or connection failures.

CPU throttling occurs when a pod exceeds its CPU limit. The kernel restricts the pod's CPU usage, causing increased query latency. Memory limits are hard boundaries. When exceeded, the kernel kills the process with an OOM error, forcing pod restart and potential data loss.

## Configuring PostgreSQL with Guaranteed QoS

Deploy PostgreSQL with properly sized resources:

```yaml
# postgres-guaranteed-qos.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: databases
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      priorityClassName: high-priority
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
              name: postgres
          env:
            - name: POSTGRES_DB
              value: appdb
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          resources:
            requests:
              memory: "4Gi"
              cpu: "2000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
            - name: shm
              mountPath: /dev/shm
      volumes:
        - name: shm
          emptyDir:
            medium: Memory
            sizeLimit: 1Gi
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

Create a PriorityClass for database workloads:

```yaml
# high-priority-class.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "High priority for database workloads"
```

Apply configurations:

```bash
kubectl apply -f high-priority-class.yaml
kubectl apply -f postgres-guaranteed-qos.yaml
```

## Tuning PostgreSQL Configuration for Resource Limits

Configure PostgreSQL to use allocated resources effectively:

```yaml
# postgres-tuned-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-tuned-config
  namespace: databases
data:
  postgresql.conf: |
    # Memory settings (25% of 4Gi = 1Gi)
    shared_buffers = 1GB
    effective_cache_size = 3GB
    maintenance_work_mem = 256MB
    work_mem = 32MB

    # Checkpoint settings
    checkpoint_completion_target = 0.9
    wal_buffers = 16MB
    min_wal_size = 1GB
    max_wal_size = 4GB

    # Connection settings
    max_connections = 200

    # Parallel query settings (based on 2 CPUs)
    max_worker_processes = 4
    max_parallel_workers_per_gather = 2
    max_parallel_workers = 4
    max_parallel_maintenance_workers = 2

    # Logging
    log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
    log_checkpoints = on
    log_connections = on
    log_disconnections = on
    log_lock_waits = on
    log_temp_files = 0
```

Update the StatefulSet to use this configuration:

```yaml
volumeMounts:
  - name: postgres-storage
    mountPath: /var/lib/postgresql/data
  - name: postgres-config
    mountPath: /etc/postgresql/postgresql.conf
    subPath: postgresql.conf
volumes:
  - name: postgres-config
    configMap:
      name: postgres-tuned-config
command:
  - postgres
  - -c
  - config_file=/etc/postgresql/postgresql.conf
```

## Configuring MySQL with Resource Limits

Deploy MySQL with appropriate resource allocation:

```yaml
# mysql-guaranteed-qos.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: databases
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      priorityClassName: high-priority
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
              name: mysql
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: root-password
            - name: MYSQL_DATABASE
              value: appdb
          resources:
            requests:
              memory: "4Gi"
              cpu: "2000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          volumeMounts:
            - name: mysql-storage
              mountPath: /var/lib/mysql
            - name: mysql-config
              mountPath: /etc/mysql/conf.d/my.cnf
              subPath: my.cnf
      volumes:
        - name: mysql-config
          configMap:
            name: mysql-tuned-config
  volumeClaimTemplates:
    - metadata:
        name: mysql-storage
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-tuned-config
  namespace: databases
data:
  my.cnf: |
    [mysqld]
    # Memory settings (based on 4Gi)
    innodb_buffer_pool_size = 3G
    innodb_log_buffer_size = 64M
    
    # Connection settings
    max_connections = 200
    
    # InnoDB settings
    innodb_flush_method = O_DIRECT
    innodb_flush_log_at_trx_commit = 2
    innodb_file_per_table = 1
    
    # Logging
    slow_query_log = 1
    long_query_time = 2
    log_error = /var/lib/mysql/error.log
```

## Monitoring Resource Usage

Deploy metrics collection to track resource consumption:

```yaml
# resource-monitor.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: resource-monitor-script
  namespace: databases
data:
  monitor.sh: |
    #!/bin/bash
    while true; do
      kubectl top pods -n databases --containers
      echo "---"
      sleep 30
    done
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: resource-usage-report
  namespace: databases
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          serviceAccountName: resource-monitor
          containers:
            - name: monitor
              image: bitnami/kubectl:latest
              command:
                - sh
                - -c
                - |
                  echo "=== Database Resource Usage Report ==="
                  kubectl top pods -n databases --containers
                  echo ""
                  echo "=== Pod QoS Classes ==="
                  kubectl get pods -n databases -o custom-columns=NAME:.metadata.name,QOS:.status.qosClass
```

## Setting Resource Quotas for Database Namespace

Prevent resource overcommitment with ResourceQuota:

```yaml
# database-resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: database-quota
  namespace: databases
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    persistentvolumeclaims: "10"
    requests.storage: 1Ti
---
apiVersion: v1
kind: LimitRange
metadata:
  name: database-limit-range
  namespace: databases
spec:
  limits:
    - max:
        cpu: "8"
        memory: "16Gi"
      min:
        cpu: "100m"
        memory: "128Mi"
      type: Container
    - max:
        cpu: "16"
        memory: "32Gi"
      min:
        cpu: "200m"
        memory: "256Mi"
      type: Pod
```

## Handling OOM Events

Monitor and alert on OOM kills:

```yaml
# oom-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: database-oom-alerts
  namespace: databases
spec:
  groups:
    - name: oom
      rules:
        - alert: DatabaseOOMKill
          expr: increase(kube_pod_container_status_restarts_total{namespace="databases"}[5m]) > 0
          labels:
            severity: critical
          annotations:
            summary: "Database pod restarted"
            description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has restarted, possibly due to OOM"
        
        - alert: DatabaseHighMemoryUsage
          expr: container_memory_working_set_bytes{namespace="databases"} / container_spec_memory_limit_bytes{namespace="databases"} > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Database pod using high memory"
            description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of memory limit"
```

## Implementing Node Affinity for Database Pods

Reserve specific nodes for database workloads:

```bash
# Label nodes for databases
kubectl label nodes node-db-1 node-db-2 workload=database

# Taint nodes to dedicate them
kubectl taint nodes node-db-1 node-db-2 workload=database:NoSchedule
```

Update StatefulSet with node affinity:

```yaml
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: workload
                    operator: In
                    values:
                      - database
      tolerations:
        - key: workload
          operator: Equal
          value: database
          effect: NoSchedule
```

Proper resource configuration for database StatefulSets ensures predictable performance and prevents resource contention. Guaranteed QoS, combined with appropriate resource sizing and priority classes, protects critical database workloads from eviction and throttling in shared Kubernetes clusters.
