# How to Deploy Apache Airflow with Helm for Workflow Orchestration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Airflow, Workflow, Orchestration, DevOps, Data Engineering

Description: Complete guide to deploying Apache Airflow using Helm including executor configuration, Git-sync for DAGs, KubernetesExecutor setup, and production hardening.

> Apache Airflow provides programmable workflow orchestration for data pipelines. This guide covers deploying Airflow on Kubernetes using the official Helm chart with production-ready configurations.

## Airflow Architecture on Kubernetes

```mermaid
flowchart TB
  subgraph "Kubernetes Cluster"
    subgraph "Airflow Components"
      webserver[Web Server]
      scheduler[Scheduler]
      triggerer[Triggerer]
      workers[Workers]
    end
    
    subgraph "Storage"
      db[(PostgreSQL)]
      redis[(Redis)]
      logs[Log Storage]
    end
    
    subgraph "DAG Sources"
      gitsync[Git-Sync]
      pvc[PVC DAGs]
    end
  end
  
  subgraph "External"
    git[Git Repository]
    users[Users]
  end
  
  users --> webserver
  webserver --> db
  scheduler --> db
  scheduler --> redis
  workers --> redis
  workers --> logs
  triggerer --> db
  git --> gitsync
  gitsync --> scheduler
  gitsync --> workers
```

## Installation

### Add Helm Repository

```bash
# Add Apache Airflow repository
helm repo add apache-airflow https://airflow.apache.org
helm repo update

# Search available versions
helm search repo apache-airflow/airflow --versions
```

### Basic Installation

```bash
# Install Airflow
helm install airflow apache-airflow/airflow \
  --namespace airflow \
  --create-namespace

# Get web server URL
kubectl port-forward svc/airflow-webserver 8080:8080 -n airflow
# Default credentials: admin / admin
```

## Production Configuration

### Complete Values File

```yaml
# airflow-values.yaml

# Airflow image
defaultAirflowRepository: apache/airflow
defaultAirflowTag: "2.8.0"

# Airflow configuration
airflowVersion: "2.8.0"

# Executor: KubernetesExecutor, CeleryExecutor, LocalExecutor
executor: KubernetesExecutor

# Webserver configuration
webserver:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1
      memory: 2Gi
  service:
    type: ClusterIP
  defaultUser:
    enabled: true
    role: Admin
    username: admin
    email: admin@example.com
    firstName: Admin
    lastName: User
    password: ""
  # Use secret for password
  webserverSecretKey: webserver-secret-key
  webserverSecretKeySecretName: airflow-webserver-secret

# Scheduler configuration
scheduler:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1
      memory: 2Gi

# Triggerer configuration (for deferrable operators)
triggerer:
  enabled: true
  replicas: 1
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# Workers (for CeleryExecutor)
workers:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2
      memory: 4Gi
  persistence:
    enabled: true
    size: 10Gi

# PostgreSQL
postgresql:
  enabled: true
  auth:
    postgresPassword: ""
    existingSecret: airflow-postgresql-secret
  primary:
    persistence:
      enabled: true
      storageClass: fast-storage
      size: 20Gi

# Or use external database
# data:
#   metadataConnection:
#     user: airflow
#     pass: ""
#     existingSecret: airflow-db-secret
#     existingSecretKey: password
#     host: postgres.database.svc.cluster.local
#     port: 5432
#     db: airflow

# Redis (for CeleryExecutor)
redis:
  enabled: false  # Not needed for KubernetesExecutor

# DAG synchronization via Git
dags:
  persistence:
    enabled: false
  gitSync:
    enabled: true
    repo: https://github.com/myorg/airflow-dags.git
    branch: main
    subPath: dags
    wait: 60
    # For private repos
    credentialsSecret: git-credentials
    sshKeySecret: git-ssh-key

# Logs configuration
logs:
  persistence:
    enabled: true
    size: 10Gi
    storageClassName: standard

# Or use remote logging
# config:
#   AIRFLOW__LOGGING__REMOTE_LOGGING: 'True'
#   AIRFLOW__LOGGING__REMOTE_BASE_LOG_FOLDER: 's3://airflow-logs/'
#   AIRFLOW__LOGGING__REMOTE_LOG_CONN_ID: 'aws_default'

# Ingress
ingress:
  web:
    enabled: true
    ingressClassName: nginx
    hosts:
      - name: airflow.example.com
        tls:
          enabled: true
          secretName: airflow-tls
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod

# Airflow configuration
config:
  AIRFLOW__CORE__LOAD_EXAMPLES: 'False'
  AIRFLOW__CORE__DAGS_ARE_PAUSED_AT_CREATION: 'True'
  AIRFLOW__CORE__MAX_ACTIVE_RUNS_PER_DAG: '16'
  AIRFLOW__SCHEDULER__DAG_DIR_LIST_INTERVAL: '30'
  AIRFLOW__WEBSERVER__EXPOSE_CONFIG: 'False'
  AIRFLOW__WEBSERVER__RBAC: 'True'
  AIRFLOW__API__AUTH_BACKENDS: 'airflow.api.auth.backend.basic_auth'

# Extra environment variables
extraEnv:
  - name: AIRFLOW__SECRETS__BACKEND
    value: airflow.providers.hashicorp.secrets.vault.VaultBackend
  - name: AIRFLOW__SECRETS__BACKEND_KWARGS
    value: '{"connections_path": "airflow/connections", "variables_path": "airflow/variables", "url": "http://vault:8200"}'

# ServiceAccount
serviceAccount:
  create: true
  name: airflow
  annotations:
    # For AWS IRSA
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT:role/airflow-role

# Flower (Celery monitoring)
flower:
  enabled: false

# Metrics
statsd:
  enabled: true
  
# Pod security
securityContext:
  runAsUser: 50000
  fsGroup: 0

# Priority class
priorityClassName: high-priority
```

### Create Secrets

```bash
# Create namespace
kubectl create namespace airflow

# Webserver secret key (used for session signing)
kubectl create secret generic airflow-webserver-secret \
  --namespace airflow \
  --from-literal=webserver-secret-key=$(openssl rand -base64 32)

# PostgreSQL password
kubectl create secret generic airflow-postgresql-secret \
  --namespace airflow \
  --from-literal=postgres-password=$(openssl rand -base64 24)

# Git credentials (for private repos)
kubectl create secret generic git-credentials \
  --namespace airflow \
  --from-literal=GIT_SYNC_USERNAME=username \
  --from-literal=GIT_SYNC_PASSWORD=token

# Or SSH key
kubectl create secret generic git-ssh-key \
  --namespace airflow \
  --from-file=gitSshKey=/path/to/id_rsa
```

### Deploy Airflow

```bash
helm install airflow apache-airflow/airflow \
  -f airflow-values.yaml \
  --namespace airflow \
  --create-namespace
```

## KubernetesExecutor Configuration

### Pod Template

```yaml
# airflow-values.yaml
podTemplate: |
  apiVersion: v1
  kind: Pod
  metadata:
    name: placeholder-name
    labels:
      app: airflow
  spec:
    serviceAccountName: airflow
    securityContext:
      runAsUser: 50000
      fsGroup: 0
    containers:
      - name: base
        image: apache/airflow:2.8.0
        imagePullPolicy: IfNotPresent
        env:
          - name: AIRFLOW__CORE__EXECUTOR
            value: LocalExecutor
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2
            memory: 4Gi
        volumeMounts:
          - name: dags
            mountPath: /opt/airflow/dags
            readOnly: true
    volumes:
      - name: dags
        emptyDir: {}
```

### Task-Specific Resources

```python
# In your DAG file
from airflow.decorators import task
from kubernetes.client import models as k8s

@task(
    executor_config={
        "pod_override": k8s.V1Pod(
            spec=k8s.V1PodSpec(
                containers=[
                    k8s.V1Container(
                        name="base",
                        resources=k8s.V1ResourceRequirements(
                            requests={"cpu": "2", "memory": "4Gi"},
                            limits={"cpu": "4", "memory": "8Gi"}
                        )
                    )
                ],
                node_selector={"node-type": "compute"},
                tolerations=[
                    k8s.V1Toleration(
                        key="compute",
                        operator="Equal",
                        value="true",
                        effect="NoSchedule"
                    )
                ]
            )
        )
    }
)
def heavy_computation():
    # Task code
    pass
```

## CeleryExecutor Configuration

### Enable Celery

```yaml
# airflow-celery-values.yaml
executor: CeleryExecutor

# Redis for Celery
redis:
  enabled: true
  auth:
    enabled: true
    existingSecret: airflow-redis-secret
    existingSecretPasswordKey: redis-password
  master:
    persistence:
      enabled: true
      size: 5Gi

# Workers
workers:
  replicas: 5
  resources:
    requests:
      cpu: 1
      memory: 2Gi
    limits:
      cpu: 2
      memory: 4Gi
  persistence:
    enabled: true
    size: 10Gi
  # Keda autoscaling
  keda:
    enabled: true
    minReplicaCount: 2
    maxReplicaCount: 10
    pollingInterval: 30
    cooldownPeriod: 300
    
# Flower for monitoring
flower:
  enabled: true
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
```

## Custom Airflow Image

### Dockerfile

```dockerfile
# Dockerfile
FROM apache/airflow:2.8.0

USER root
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

USER airflow

# Install Python dependencies
COPY requirements.txt /
RUN pip install --no-cache-dir -r /requirements.txt

# Copy custom plugins
COPY plugins/ /opt/airflow/plugins/
```

### Build and Push

```bash
# Build image
docker build -t myregistry.io/airflow:2.8.0-custom .

# Push to registry
docker push myregistry.io/airflow:2.8.0-custom

# Update values
# defaultAirflowRepository: myregistry.io/airflow
# defaultAirflowTag: 2.8.0-custom
```

## Connections and Variables

### Via Helm Values

```yaml
# airflow-values.yaml
extraEnvFrom:
  - configMapRef:
      name: airflow-connections
      
---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: airflow-connections
  namespace: airflow
data:
  AIRFLOW_CONN_AWS_DEFAULT: "aws://?region_name=us-east-1"
  AIRFLOW_CONN_POSTGRES_DEFAULT: "postgresql://user:pass@host:5432/db"
  AIRFLOW_VAR_ENVIRONMENT: "production"
```

### Via External Secrets

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: airflow-connections
  namespace: airflow
spec:
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: airflow-connections
  data:
    - secretKey: AIRFLOW_CONN_MY_DATABASE
      remoteRef:
        key: airflow/connections/my_database
```

## DAG Deployment Strategies

### Git-Sync (Recommended)

```yaml
# Already configured in main values
dags:
  gitSync:
    enabled: true
    repo: https://github.com/myorg/airflow-dags.git
    branch: main
    subPath: dags
    wait: 60
```

### PVC with CI/CD

```yaml
# airflow-values.yaml
dags:
  persistence:
    enabled: true
    size: 5Gi
    storageClassName: standard
    accessMode: ReadWriteMany  # Requires RWX storage
  gitSync:
    enabled: false

---
# ci-cd-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sync-dags
  namespace: airflow
spec:
  template:
    spec:
      containers:
        - name: sync
          image: alpine/git
          command:
            - /bin/sh
            - -c
            - |
              git clone --depth 1 https://github.com/myorg/airflow-dags.git /tmp/dags
              cp -r /tmp/dags/dags/* /dags/
          volumeMounts:
            - name: dags
              mountPath: /dags
      volumes:
        - name: dags
          persistentVolumeClaim:
            claimName: airflow-dags
      restartPolicy: Never
```

## Monitoring

### Prometheus Metrics

```yaml
# airflow-values.yaml
statsd:
  enabled: true
  
# ServiceMonitor
extraObjects:
  - apiVersion: monitoring.coreos.com/v1
    kind: ServiceMonitor
    metadata:
      name: airflow
      namespace: monitoring
    spec:
      selector:
        matchLabels:
          app: airflow
      namespaceSelector:
        matchNames:
          - airflow
      endpoints:
        - port: statsd-ingest
          interval: 30s
```

### Key Metrics

```promql
# DAG run duration
airflow_dagrun_duration_seconds

# Task instance successes/failures
airflow_ti_successes
airflow_ti_failures

# Scheduler heartbeat
airflow_scheduler_heartbeat

# Pool slots
airflow_pool_open_slots
airflow_pool_used_slots

# Executor slots
airflow_executor_open_slots
airflow_executor_running_tasks
```

## Troubleshooting

```bash
# Check pods
kubectl get pods -n airflow

# View scheduler logs
kubectl logs -n airflow -l component=scheduler -f

# View webserver logs
kubectl logs -n airflow -l component=webserver -f

# Check DAG sync
kubectl logs -n airflow -l component=scheduler -c git-sync

# Database migration
kubectl exec -it -n airflow deploy/airflow-scheduler -- \
  airflow db upgrade

# Test DAG
kubectl exec -it -n airflow deploy/airflow-scheduler -- \
  airflow dags test my_dag 2024-01-15

# List DAGs
kubectl exec -it -n airflow deploy/airflow-scheduler -- \
  airflow dags list
```

## Best Practices

| Practice | Description |
|----------|-------------|
| KubernetesExecutor | Dynamic worker scaling |
| Git-Sync | Version-controlled DAGs |
| External Database | Managed PostgreSQL for HA |
| Remote Logging | S3/GCS for persistent logs |
| RBAC | Role-based access control |
| Resource Limits | Prevent runaway tasks |

## Wrap-up

Deploying Airflow on Kubernetes with Helm provides scalable workflow orchestration. Use KubernetesExecutor for dynamic worker scaling, Git-sync for DAG deployment, and external databases for production reliability. Configure proper resource limits and monitoring to ensure stable pipeline execution.
