# How to Configure ArgoCD High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ArgoCD, High Availability, GitOps, DevOps, Reliability

Description: A comprehensive guide to configuring ArgoCD for high availability in production environments, covering multi-replica deployments, Redis clustering, database backends, and disaster recovery strategies.

---

Running ArgoCD in production requires high availability to ensure your GitOps workflows remain operational even during component failures. A single-instance ArgoCD deployment creates a dangerous single point of failure for your entire deployment pipeline.

## Understanding ArgoCD Architecture

Before configuring HA, you need to understand the components that make up ArgoCD and their roles in the system.

```mermaid
flowchart TB
    subgraph "ArgoCD Components"
        API[API Server]
        Repo[Repo Server]
        Controller[Application Controller]
        Redis[Redis]
        Dex[Dex - SSO]
        Notif[Notifications Controller]
    end

    subgraph "External Dependencies"
        Git[Git Repositories]
        K8s[Kubernetes API]
        DB[(Database)]
    end

    API --> Redis
    API --> Repo
    Controller --> Redis
    Controller --> Repo
    Controller --> K8s
    Repo --> Git
    API --> Dex
    Notif --> Redis
```

Key components requiring HA consideration:
- **API Server** - Handles UI and CLI requests, stateless and horizontally scalable
- **Repo Server** - Clones and renders manifests from Git, stateless and scalable
- **Application Controller** - Reconciles application state, requires leader election
- **Redis** - Caches Git repository data and application state
- **Dex** - Handles SSO authentication, stateless

## Prerequisites

Your cluster needs the following before configuring ArgoCD HA:

The following command creates the ArgoCD namespace if it does not already exist.

```bash
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
```

Verify you have sufficient cluster resources to run multiple replicas.

```bash
# Check available nodes and their resources
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CPU:.status.allocatable.cpu,\
MEMORY:.status.allocatable.memory
```

## Installing ArgoCD in HA Mode

### Method 1: Using the Official HA Manifests

ArgoCD provides pre-built HA manifests that configure multiple replicas with proper anti-affinity rules.

```bash
# Apply the HA installation manifest directly from the ArgoCD repository
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml

# Wait for all pods to become ready before proceeding
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=600s
```

### Method 2: Using Helm with HA Configuration

Helm provides more flexibility for customizing the HA configuration. Create a values file with HA settings.

```yaml
# argocd-ha-values.yaml
# Helm values for ArgoCD High Availability deployment
# Each component is configured with multiple replicas and anti-affinity rules

global:
  # Ensure pods are spread across different nodes for fault tolerance
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app.kubernetes.io/part-of: argocd
            topologyKey: kubernetes.io/hostname

# API Server configuration with horizontal scaling
server:
  replicas: 3
  # Pod Disruption Budget ensures minimum availability during updates
  pdb:
    enabled: true
    minAvailable: 2
  # Resource limits prevent noisy neighbor issues
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  # Autoscaling for handling variable load
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

# Repo Server handles Git operations and manifest rendering
repoServer:
  replicas: 3
  pdb:
    enabled: true
    minAvailable: 2
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

# Application Controller uses leader election, only one active at a time
controller:
  replicas: 1
  # Enable HA mode for controller leader election
  env:
    - name: ARGOCD_CONTROLLER_REPLICAS
      value: "1"
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi

# Redis HA configuration using Redis Sentinel
redis-ha:
  enabled: true
  # Run 3 Redis instances with Sentinel for automatic failover
  replicas: 3
  haproxy:
    enabled: true
    replicas: 3

# Dex for SSO authentication
dex:
  enabled: true
  replicas: 2
  pdb:
    enabled: true
    minAvailable: 1

# Notifications controller
notifications:
  replicas: 1
```

Install ArgoCD using the HA values file.

```bash
# Add the ArgoCD Helm repository
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# Install with HA configuration
helm install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --values argocd-ha-values.yaml \
  --wait
```

## Configuring Redis for High Availability

Redis stores critical caching data and must be highly available in production.

### Option 1: Redis HA with Sentinel

Redis Sentinel provides automatic failover when the primary Redis instance fails.

```yaml
# redis-ha-config.yaml
# ConfigMap for Redis HA Sentinel configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-redis-ha-configmap
  namespace: argocd
data:
  redis.conf: |
    # Maximum memory limit for Redis cache
    maxmemory 256mb
    # Eviction policy when memory is full
    maxmemory-policy volatile-lru
    # Append-only file for persistence
    appendonly yes
    appendfsync everysec
    # Disable RDB snapshots in favor of AOF
    save ""

  sentinel.conf: |
    # Sentinel monitors the Redis master
    sentinel monitor mymaster argocd-redis-ha 6379 2
    # Failover if master is down for 30 seconds
    sentinel down-after-milliseconds mymaster 30000
    # Timeout for failover operation
    sentinel failover-timeout mymaster 180000
    # Only one slave syncs at a time during failover
    sentinel parallel-syncs mymaster 1
```

### Option 2: External Redis Cluster

For larger deployments, use a managed Redis service or external Redis cluster.

```yaml
# argocd-cm-external-redis.yaml
# ConfigMap pointing ArgoCD to an external Redis cluster
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # External Redis connection string
  redis.server: "redis-cluster.redis.svc.cluster.local:6379"
```

Configure Redis authentication for security.

```yaml
# argocd-redis-secret.yaml
# Secret containing Redis authentication credentials
apiVersion: v1
kind: Secret
metadata:
  name: argocd-redis
  namespace: argocd
type: Opaque
stringData:
  # Redis password for authentication
  auth: "your-secure-redis-password"
```

## Application Controller HA Configuration

The Application Controller requires special handling because only one instance can be active at a time. Leader election ensures automatic failover.

```yaml
# argocd-application-controller-statefulset.yaml
# StatefulSet for Application Controller with leader election
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  replicas: 3
  serviceName: argocd-application-controller
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-application-controller
  template:
    metadata:
      labels:
        app.kubernetes.io/name: argocd-application-controller
    spec:
      serviceAccountName: argocd-application-controller
      containers:
        - name: argocd-application-controller
          image: quay.io/argoproj/argocd:v2.9.3
          command:
            - argocd-application-controller
          env:
            # Enable leader election for HA
            - name: ARGOCD_CONTROLLER_REPLICAS
              value: "3"
          args:
            # Shard applications across controller replicas
            - --app-state-cache-expiration
            - 1h
            - --repo-server
            - argocd-repo-server:8081
            - --redis
            - argocd-redis-ha-haproxy:6379
            - --status-processors
            - "50"
            - --operation-processors
            - "25"
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi
      # Spread pods across different nodes
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app.kubernetes.io/name: argocd-application-controller
              topologyKey: kubernetes.io/hostname
```

## Configuring External Database Backend

For enterprise deployments, use PostgreSQL instead of the embedded database for better reliability and backup options.

```mermaid
flowchart LR
    subgraph "ArgoCD HA Cluster"
        API1[API Server 1]
        API2[API Server 2]
        API3[API Server 3]
    end

    subgraph "Database HA"
        PG1[(PostgreSQL Primary)]
        PG2[(PostgreSQL Replica)]
        PG3[(PostgreSQL Replica)]
    end

    API1 --> PG1
    API2 --> PG1
    API3 --> PG1
    PG1 --> PG2
    PG1 --> PG3
```

Configure ArgoCD to use an external PostgreSQL database.

```yaml
# argocd-cm-postgres.yaml
# ConfigMap for external PostgreSQL connection
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Connection string for PostgreSQL
  # Using read replicas for read operations improves performance
  dex.config: |
    connectors:
      - type: ldap
        id: ldap
        name: LDAP
        config:
          # LDAP configuration here
```

Create the database credentials secret.

```yaml
# argocd-postgres-secret.yaml
# Secret containing PostgreSQL connection credentials
apiVersion: v1
kind: Secret
metadata:
  name: argocd-postgres-secret
  namespace: argocd
type: Opaque
stringData:
  # PostgreSQL connection URL with credentials
  db-url: "postgresql://argocd:password@postgres-primary.database:5432/argocd?sslmode=require"
```

## Network Policies for Security

Implement network policies to restrict traffic between ArgoCD components.

```yaml
# argocd-network-policies.yaml
# Network policy restricting ingress to ArgoCD API Server
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-network-policy
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
    - Ingress
  ingress:
    # Allow traffic from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
        - protocol: TCP
          port: 8083
    # Allow internal ArgoCD component communication
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/part-of: argocd
      ports:
        - protocol: TCP
          port: 8080

---
# Network policy for Redis HA cluster
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-redis-network-policy
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-redis-ha
  policyTypes:
    - Ingress
  ingress:
    # Only allow ArgoCD components to access Redis
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/part-of: argocd
      ports:
        - protocol: TCP
          port: 6379
        - protocol: TCP
          port: 26379
```

## Pod Disruption Budgets

Pod Disruption Budgets ensure minimum availability during voluntary disruptions like node maintenance.

```yaml
# argocd-pdbs.yaml
# Pod Disruption Budget for API Server
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: argocd-server-pdb
  namespace: argocd
spec:
  # At least 2 API server pods must always be available
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server

---
# Pod Disruption Budget for Repo Server
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: argocd-repo-server-pdb
  namespace: argocd
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-repo-server

---
# Pod Disruption Budget for Redis HA
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: argocd-redis-ha-pdb
  namespace: argocd
spec:
  # Redis quorum requires majority to be available
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-redis-ha
```

## Health Checks and Monitoring

Configure proper health checks and integrate with your monitoring stack.

```yaml
# argocd-servicemonitor.yaml
# ServiceMonitor for Prometheus to scrape ArgoCD metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: argocd
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: argocd
  endpoints:
    # API Server metrics endpoint
    - port: metrics
      interval: 30s
      path: /metrics
  namespaceSelector:
    matchNames:
      - argocd
```

Create alerting rules for ArgoCD HA monitoring.

```yaml
# argocd-alerts.yaml
# PrometheusRule for ArgoCD HA alerting
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-ha-alerts
  namespace: argocd
spec:
  groups:
    - name: argocd-ha
      rules:
        # Alert when API Server replicas are below threshold
        - alert: ArgoCDAPIServerDown
          expr: |
            sum(up{job="argocd-server-metrics"}) < 2
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD API Server replicas below threshold"
            description: "Less than 2 ArgoCD API Server pods are running"

        # Alert when Redis HA quorum is at risk
        - alert: ArgoCDRedisQuorumAtRisk
          expr: |
            sum(redis_up{job="argocd-redis-ha"}) < 2
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD Redis HA quorum at risk"
            description: "Less than 2 Redis instances are available"

        # Alert when Application Controller has no leader
        - alert: ArgoCDControllerNoLeader
          expr: |
            sum(argocd_app_controller_leader) == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD Application Controller has no leader"
            description: "No Application Controller has acquired leadership"

        # Alert on sync failures
        - alert: ArgoCDSyncFailures
          expr: |
            sum(increase(argocd_app_sync_total{phase="Error"}[10m])) > 5
          labels:
            severity: warning
          annotations:
            summary: "High number of ArgoCD sync failures"
            description: "More than 5 sync failures in the last 10 minutes"
```

## Disaster Recovery Configuration

Implement backup and restore procedures for ArgoCD.

```yaml
# argocd-backup-cronjob.yaml
# CronJob for automated ArgoCD configuration backups
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-backup
  namespace: argocd
spec:
  # Run backup daily at 2 AM
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-backup
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Export all ArgoCD applications
                  kubectl get applications -n argocd -o yaml > /backup/applications.yaml

                  # Export all AppProjects
                  kubectl get appprojects -n argocd -o yaml > /backup/appprojects.yaml

                  # Export ArgoCD ConfigMaps
                  kubectl get configmaps -n argocd \
                    -l app.kubernetes.io/part-of=argocd \
                    -o yaml > /backup/configmaps.yaml

                  # Export secrets (encrypted)
                  kubectl get secrets -n argocd \
                    -l app.kubernetes.io/part-of=argocd \
                    -o yaml > /backup/secrets.yaml

                  # Compress and upload to S3
                  tar -czf /backup/argocd-backup-$(date +%Y%m%d).tar.gz /backup/*.yaml
                  aws s3 cp /backup/argocd-backup-$(date +%Y%m%d).tar.gz \
                    s3://your-backup-bucket/argocd/
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
          volumes:
            - name: backup-volume
              emptyDir: {}
          restartPolicy: OnFailure
```

Create a restore script for disaster recovery.

```bash
#!/bin/bash
# argocd-restore.sh
# Script to restore ArgoCD from backup

set -euo pipefail

BACKUP_DATE=${1:-$(date +%Y%m%d)}
BACKUP_BUCKET="s3://your-backup-bucket/argocd"
RESTORE_DIR="/tmp/argocd-restore"

echo "Downloading backup from ${BACKUP_DATE}..."
mkdir -p ${RESTORE_DIR}
aws s3 cp ${BACKUP_BUCKET}/argocd-backup-${BACKUP_DATE}.tar.gz ${RESTORE_DIR}/

echo "Extracting backup..."
tar -xzf ${RESTORE_DIR}/argocd-backup-${BACKUP_DATE}.tar.gz -C ${RESTORE_DIR}

echo "Restoring ConfigMaps..."
kubectl apply -f ${RESTORE_DIR}/backup/configmaps.yaml

echo "Restoring Secrets..."
kubectl apply -f ${RESTORE_DIR}/backup/secrets.yaml

echo "Restoring AppProjects..."
kubectl apply -f ${RESTORE_DIR}/backup/appprojects.yaml

echo "Restoring Applications..."
kubectl apply -f ${RESTORE_DIR}/backup/applications.yaml

echo "Restore complete. Verify application status:"
kubectl get applications -n argocd

# Cleanup
rm -rf ${RESTORE_DIR}
```

## Multi-Cluster HA Architecture

For enterprise environments, deploy ArgoCD across multiple clusters for geographic redundancy.

```mermaid
flowchart TB
    subgraph "Region A"
        subgraph "ArgoCD Primary"
            API_A[API Server]
            Ctrl_A[Controller]
            Redis_A[Redis HA]
        end
        K8s_A[Target Clusters]
    end

    subgraph "Region B"
        subgraph "ArgoCD Standby"
            API_B[API Server]
            Ctrl_B[Controller]
            Redis_B[Redis HA]
        end
        K8s_B[Target Clusters]
    end

    Git[Git Repository]
    LB[Global Load Balancer]

    Git --> API_A
    Git --> API_B
    LB --> API_A
    LB -.->|Failover| API_B
    API_A --> K8s_A
    API_A --> K8s_B
    API_B --> K8s_A
    API_B --> K8s_B
```

Configure cross-region synchronization for the standby cluster.

```yaml
# argocd-standby-config.yaml
# Configuration for standby ArgoCD instance
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Shared repository credentials
  repositories: |
    - url: https://github.com/your-org/gitops-config.git
      passwordSecret:
        name: repo-creds
        key: password
      usernameSecret:
        name: repo-creds
        key: username

  # Same cluster configurations as primary
  # Standby remains read-only until failover
```

## Validation and Testing

Verify your HA configuration is working correctly.

```bash
#!/bin/bash
# verify-argocd-ha.sh
# Script to validate ArgoCD HA deployment

echo "Checking ArgoCD component replicas..."

# Verify API Server replicas
API_REPLICAS=$(kubectl get deployment argocd-server -n argocd -o jsonpath='{.status.readyReplicas}')
if [ "$API_REPLICAS" -ge 2 ]; then
    echo "API Server: OK ($API_REPLICAS replicas)"
else
    echo "API Server: WARN (only $API_REPLICAS replicas)"
fi

# Verify Repo Server replicas
REPO_REPLICAS=$(kubectl get deployment argocd-repo-server -n argocd -o jsonpath='{.status.readyReplicas}')
if [ "$REPO_REPLICAS" -ge 2 ]; then
    echo "Repo Server: OK ($REPO_REPLICAS replicas)"
else
    echo "Repo Server: WARN (only $REPO_REPLICAS replicas)"
fi

# Verify Redis HA
REDIS_REPLICAS=$(kubectl get statefulset argocd-redis-ha-server -n argocd -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
if [ "$REDIS_REPLICAS" -ge 2 ]; then
    echo "Redis HA: OK ($REDIS_REPLICAS replicas)"
else
    echo "Redis HA: WARN (only $REDIS_REPLICAS replicas)"
fi

# Check Application Controller leader election
LEADER=$(kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.controller\.status\.processors}' 2>/dev/null)
echo "Controller status: Leader election enabled"

# Verify Pod Disruption Budgets
echo ""
echo "Pod Disruption Budgets:"
kubectl get pdb -n argocd

# Check node distribution
echo ""
echo "Pod distribution across nodes:"
kubectl get pods -n argocd -o wide | grep -E "argocd-server|argocd-repo-server|redis"
```

Test failover behavior by simulating component failure.

```bash
# Test API Server failover
# Delete one API server pod and verify continued availability
kubectl delete pod -n argocd -l app.kubernetes.io/name=argocd-server --wait=false

# Verify API is still accessible
curl -k https://argocd.your-domain.com/api/version

# Test Redis failover
# Identify and delete the Redis primary
REDIS_MASTER=$(kubectl exec -n argocd argocd-redis-ha-server-0 -- redis-cli info replication | grep role:master)
if [ -n "$REDIS_MASTER" ]; then
    kubectl delete pod -n argocd argocd-redis-ha-server-0
fi

# Wait for Sentinel to elect new master
sleep 30

# Verify ArgoCD is still functional
argocd app list
```

## Performance Tuning

Optimize ArgoCD for large-scale deployments.

```yaml
# argocd-cm-performance.yaml
# ConfigMap with performance tuning settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase timeout for large repositories
  timeout.reconciliation: 300s

  # Limit concurrent manifest generation
  reposerver.parallelism.limit: "50"

  # Configure application resync period
  timeout.hard.reconciliation: 0s

  # Resource tracking method for better performance
  application.resourceTrackingMethod: annotation
```

Configure controller sharding for managing many applications.

```yaml
# argocd-cmd-params-cm.yaml
# ConfigMap for Application Controller performance tuning
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Number of application processors
  controller.status.processors: "50"
  controller.operation.processors: "25"

  # Sharding configuration for multiple controllers
  controller.sharding.algorithm: "round-robin"

  # Repository cache expiration
  reposerver.cache.expiration: "24h"
```

---

Configuring ArgoCD for high availability requires attention to each component's specific needs. Start with the HA Helm installation, add Redis clustering, implement proper Pod Disruption Budgets, and establish backup procedures. Regular testing of failover scenarios ensures your GitOps platform remains reliable when you need it most. Monitor your deployment closely and adjust replica counts based on your workload requirements.
