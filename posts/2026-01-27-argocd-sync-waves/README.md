# How to Implement ArgoCD Sync Waves

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, Sync Waves, Hooks, DevOps, Deployment, CI/CD

Description: A comprehensive guide to implementing ArgoCD sync waves for controlling deployment order, including resource ordering, hooks, phases, and complex multi-tier deployment scenarios.

---

> "In distributed systems, order is not a luxury - it is a necessity. Sync waves bring determinism to the chaos of concurrent deployments." - Site Reliability Engineering Wisdom

## What Are Sync Waves?

Sync waves in ArgoCD provide fine-grained control over the order in which Kubernetes resources are deployed. Without sync waves, ArgoCD applies all resources in parallel, which can cause failures when resources depend on each other. Sync waves solve this by allowing you to specify a deployment sequence.

```mermaid
flowchart LR
    subgraph Wave -2
        CRD[CRDs]
    end
    subgraph Wave -1
        NS[Namespaces]
        SA[ServiceAccounts]
    end
    subgraph Wave 0
        CM[ConfigMaps]
        SEC[Secrets]
    end
    subgraph Wave 1
        SVC[Services]
        PVC[PVCs]
    end
    subgraph Wave 2
        DB[(Database)]
    end
    subgraph Wave 3
        APP[Application]
    end
    subgraph Wave 4
        ING[Ingress]
    end

    Wave -2 --> Wave -1 --> Wave 0 --> Wave 1 --> Wave 2 --> Wave 3 --> Wave 4
```

ArgoCD processes waves sequentially from lowest to highest number. Resources within the same wave deploy in parallel. ArgoCD waits for all resources in a wave to become healthy before proceeding to the next wave.

## Sync Wave Annotations

The sync wave is controlled through a simple annotation on your Kubernetes resources. The annotation accepts an integer value (including negative numbers) that determines the deployment sequence.

```yaml
# Basic sync wave annotation syntax
# Lower numbers sync first, negative numbers are allowed
# Default wave is 0 if no annotation is specified

apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
  annotations:
    # This resource will be applied in wave 1
    # ArgoCD waits for wave 0 to complete before starting wave 1
    argocd.argoproj.io/sync-wave: "1"
data:
  database_host: "postgres-primary.database.svc.cluster.local"
  cache_host: "redis-master.cache.svc.cluster.local"
  log_level: "info"
```

Key characteristics of sync waves:

- Default wave is 0 when no annotation is present
- Negative numbers are valid and deploy before wave 0
- Resources in the same wave deploy in parallel
- ArgoCD waits for all resources in a wave to be healthy before proceeding
- Health is determined by Kubernetes readiness probes and ArgoCD health checks

## Resource Ordering Patterns

A well-designed wave strategy follows the natural dependency order of your resources. Here is a comprehensive example showing proper resource ordering.

```yaml
# ============================================================
# Wave -3: Custom Resource Definitions (CRDs)
# CRDs must exist before any custom resources can be created
# ============================================================

apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: certificates.cert-manager.io
  annotations:
    # CRDs deploy first since other resources may depend on them
    argocd.argoproj.io/sync-wave: "-3"
spec:
  group: cert-manager.io
  names:
    kind: Certificate
    listKind: CertificateList
    plural: certificates
    singular: certificate
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object

---
# ============================================================
# Wave -2: Namespaces
# Namespaces must exist before resources can be created in them
# ============================================================

apiVersion: v1
kind: Namespace
metadata:
  name: myapp-production
  annotations:
    # Namespaces deploy early to ensure they exist for other resources
    argocd.argoproj.io/sync-wave: "-2"
  labels:
    environment: production
    team: platform

---
# ============================================================
# Wave -1: RBAC, Secrets, and ConfigMaps
# Configuration resources must exist before pods reference them
# ============================================================

apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-service-account
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-role
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-rolebinding
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
subjects:
  - kind: ServiceAccount
    name: myapp-service-account
    namespace: myapp-production
roleRef:
  kind: Role
  name: myapp-role
  apiGroup: rbac.authorization.k8s.io

---
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
type: Opaque
stringData:
  username: myapp_user
  password: "secure-password-here"
  connection_string: "postgres://myapp_user:secure-password-here@postgres:5432/myapp"

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
data:
  LOG_LEVEL: "info"
  CACHE_TTL: "300"
  FEATURE_FLAGS: |
    {
      "new_dashboard": true,
      "beta_api": false
    }

---
# ============================================================
# Wave 0: Services and PersistentVolumeClaims
# Services should exist before deployments for DNS resolution
# PVCs should exist before StatefulSets that use them
# ============================================================

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd

---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
  clusterIP: None  # Headless service for StatefulSet

---
apiVersion: v1
kind: Service
metadata:
  name: myapp-api
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  selector:
    app: myapp-api
  ports:
    - port: 8080
      targetPort: 8080

---
# ============================================================
# Wave 1: Database StatefulSets
# Databases deploy before applications that depend on them
# ============================================================

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: myapp-production
  annotations:
    # Database deploys in wave 1, after services and PVCs
    argocd.argoproj.io/sync-wave: "1"
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
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: myapp
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
          # Readiness probe ensures ArgoCD waits for database to be ready
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data

---
# ============================================================
# Wave 2: Application Deployments
# Applications deploy after their database dependencies
# ============================================================

apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-api
  namespace: myapp-production
  annotations:
    # Application deploys after database is healthy
    argocd.argoproj.io/sync-wave: "2"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp-api
  template:
    metadata:
      labels:
        app: myapp-api
    spec:
      serviceAccountName: myapp-service-account
      containers:
        - name: api
          image: myapp/api:v2.1.0
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: app-config
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection_string
          # Readiness probe ensures traffic only routes to healthy pods
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"

---
# ============================================================
# Wave 3: Ingress and External Access
# Ingress deploys last after services and backends are ready
# ============================================================

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: myapp-production
  annotations:
    # Ingress is the final wave - all backends must be ready
    argocd.argoproj.io/sync-wave: "3"
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.myapp.example.com
      secretName: myapp-tls
  rules:
    - host: api.myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-api
                port:
                  number: 8080
```

## Hooks and Phases

ArgoCD hooks allow you to run operations at specific points in the sync lifecycle. Hooks are typically implemented as Kubernetes Jobs that execute scripts or commands.

```mermaid
sequenceDiagram
    participant Git as Git Repository
    participant ArgoCD as ArgoCD
    participant K8s as Kubernetes

    Git->>ArgoCD: Detect changes
    Note over ArgoCD: Begin sync operation

    ArgoCD->>K8s: Execute PreSync hooks
    Note over K8s: Database migrations<br/>Backup jobs<br/>Schema validation

    K8s-->>ArgoCD: PreSync hooks complete

    ArgoCD->>K8s: Apply Wave -2 (CRDs)
    ArgoCD->>K8s: Apply Wave -1 (Namespaces, Config)
    ArgoCD->>K8s: Apply Wave 0 (Services)
    ArgoCD->>K8s: Apply Wave 1 (Databases)
    ArgoCD->>K8s: Apply Wave 2 (Applications)
    ArgoCD->>K8s: Apply Wave 3 (Ingress)

    K8s-->>ArgoCD: All resources healthy

    ArgoCD->>K8s: Execute PostSync hooks
    Note over K8s: Smoke tests<br/>Cache warming<br/>Notifications

    K8s-->>ArgoCD: PostSync hooks complete
    ArgoCD-->>Git: Sync successful
```

### Available Hook Phases

| Phase | When It Runs | Common Use Cases |
|-------|--------------|------------------|
| PreSync | Before any sync waves begin | Database migrations, backups, validation |
| Sync | During the sync (with wave ordering) | Resources needing special handling |
| PostSync | After all waves complete successfully | Smoke tests, notifications, cache warming |
| SyncFail | Only when sync fails | Alerting, cleanup, rollback triggers |
| Skip | Never runs automatically | Manual operations, debugging |

### PreSync Hook - Database Migration

```yaml
# PreSync hooks run BEFORE any application resources are deployed
# This is the ideal place for database migrations that must complete
# before new application code starts

apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: myapp-production
  annotations:
    # This job runs before the main sync begins
    argocd.argoproj.io/hook: PreSync
    # Delete the job after it succeeds to keep the namespace clean
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    # If you have multiple PreSync hooks, use sync-wave to order them
    # This migration runs in wave -1, before other PreSync hooks in wave 0
    argocd.argoproj.io/sync-wave: "-1"
spec:
  # TTL controller cleans up completed jobs after 1 hour
  ttlSecondsAfterFinished: 3600
  template:
    metadata:
      labels:
        app: db-migration
    spec:
      # Init container waits for database to be available
      initContainers:
        - name: wait-for-db
          image: busybox:1.36
          command:
            - /bin/sh
            - -c
            - |
              echo "Waiting for PostgreSQL to be ready..."
              until nc -z postgres 5432; do
                echo "PostgreSQL is not ready - sleeping 2s"
                sleep 2
              done
              echo "PostgreSQL is ready!"
      containers:
        - name: migrate
          image: myapp/migrations:v2.1.0
          command:
            - /bin/sh
            - -c
            - |
              set -e
              echo "=== Database Migration Starting ==="
              echo "Current migration version:"
              ./migrate version

              echo "Checking for pending migrations..."
              ./migrate status

              echo "Applying pending migrations..."
              ./migrate up

              echo "New migration version:"
              ./migrate version
              echo "=== Database Migration Complete ==="
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection_string
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
      restartPolicy: Never
  # Retry failed migrations up to 3 times
  backoffLimit: 3
```

### PostSync Hook - Smoke Tests and Notifications

```yaml
# PostSync hooks run AFTER all resources are deployed and healthy
# Use them for verification, notifications, or post-deployment tasks

apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-tests
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    # Run smoke tests first (wave 0), then notifications (wave 1)
    argocd.argoproj.io/sync-wave: "0"
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      containers:
        - name: smoke-test
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              set -e
              echo "=== Running Smoke Tests ==="

              echo "1. Testing API health endpoint..."
              response=$(curl -sf -w "%{http_code}" -o /dev/null \
                http://myapp-api:8080/health/ready)
              if [ "$response" = "200" ]; then
                echo "   PASS: API health check returned 200"
              else
                echo "   FAIL: API health check returned $response"
                exit 1
              fi

              echo "2. Testing API version endpoint..."
              version=$(curl -sf http://myapp-api:8080/api/version)
              echo "   API version: $version"

              echo "3. Testing database connectivity..."
              response=$(curl -sf -w "%{http_code}" -o /dev/null \
                http://myapp-api:8080/health/db)
              if [ "$response" = "200" ]; then
                echo "   PASS: Database connection healthy"
              else
                echo "   FAIL: Database connection failed"
                exit 1
              fi

              echo "4. Testing critical API endpoint..."
              response=$(curl -sf -w "%{http_code}" -o /dev/null \
                http://myapp-api:8080/api/v1/status)
              if [ "$response" = "200" ]; then
                echo "   PASS: Critical endpoint responding"
              else
                echo "   FAIL: Critical endpoint returned $response"
                exit 1
              fi

              echo ""
              echo "=== All Smoke Tests Passed ==="
      restartPolicy: Never
  backoffLimit: 2

---
# Notification hook runs after smoke tests pass

apiVersion: batch/v1
kind: Job
metadata:
  name: deployment-notification
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    # Run after smoke tests complete
    argocd.argoproj.io/sync-wave: "1"
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              curl -X POST "$SLACK_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d '{
                  "text": "Deployment Successful",
                  "blocks": [
                    {
                      "type": "section",
                      "text": {
                        "type": "mrkdwn",
                        "text": "*Deployment Successful* :white_check_mark:"
                      }
                    },
                    {
                      "type": "section",
                      "fields": [
                        {
                          "type": "mrkdwn",
                          "text": "*Application:*\nmyapp-api"
                        },
                        {
                          "type": "mrkdwn",
                          "text": "*Environment:*\nproduction"
                        },
                        {
                          "type": "mrkdwn",
                          "text": "*Version:*\nv2.1.0"
                        },
                        {
                          "type": "mrkdwn",
                          "text": "*Status:*\nHealthy"
                        }
                      ]
                    }
                  ]
                }'
          env:
            - name: SLACK_WEBHOOK_URL
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
      restartPolicy: Never
```

### SyncFail Hook - Failure Alerting

```yaml
# SyncFail hooks run ONLY when the sync operation fails
# Use them for alerting, automated rollback, or cleanup

apiVersion: batch/v1
kind: Job
metadata:
  name: sync-failure-alert
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      containers:
        - name: alert
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              # Send alert to Slack
              curl -X POST "$SLACK_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d '{
                  "text": "Deployment Failed",
                  "blocks": [
                    {
                      "type": "section",
                      "text": {
                        "type": "mrkdwn",
                        "text": "*Deployment Failed* :x:"
                      }
                    },
                    {
                      "type": "section",
                      "fields": [
                        {
                          "type": "mrkdwn",
                          "text": "*Application:*\nmyapp-api"
                        },
                        {
                          "type": "mrkdwn",
                          "text": "*Environment:*\nproduction"
                        }
                      ]
                    },
                    {
                      "type": "section",
                      "text": {
                        "type": "mrkdwn",
                        "text": "Please check ArgoCD for details and consider rolling back."
                      }
                    }
                  ]
                }'

              # Send PagerDuty incident
              curl -X POST "https://events.pagerduty.com/v2/enqueue" \
                -H "Content-Type: application/json" \
                -d "{
                  \"routing_key\": \"$PAGERDUTY_ROUTING_KEY\",
                  \"event_action\": \"trigger\",
                  \"payload\": {
                    \"summary\": \"ArgoCD deployment failed for myapp-production\",
                    \"severity\": \"critical\",
                    \"source\": \"argocd\"
                  }
                }"
          env:
            - name: SLACK_WEBHOOK_URL
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
            - name: PAGERDUTY_ROUTING_KEY
              valueFrom:
                secretKeyRef:
                  name: pagerduty-config
                  key: routing-key
      restartPolicy: Never
```

### Hook Delete Policies

```yaml
# HookSucceeded: Delete the hook resource after successful completion
# Best for most hooks - keeps the namespace clean
apiVersion: batch/v1
kind: Job
metadata:
  name: migration-job
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded

---
# HookFailed: Delete the hook resource after it fails
# Useful when you want to clean up failed optional tasks
apiVersion: batch/v1
kind: Job
metadata:
  name: optional-warmup
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookFailed

---
# BeforeHookCreation: Delete existing hook before creating new one
# Essential for jobs that must run fresh on every sync
# Prevents "job already exists" errors
apiVersion: batch/v1
kind: Job
metadata:
  name: always-run-fresh
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation

---
# Combined policies: Multiple policies can be specified
# This hook is deleted on success OR before the next sync creates it
apiVersion: batch/v1
kind: Job
metadata:
  name: clean-hook
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded,BeforeHookCreation
```

## Complex Deployment Scenarios

### Multi-Tier Application with Database Dependencies

```mermaid
flowchart TB
    subgraph PreSync Phase
        BACKUP[Database Backup]
        MIGRATE[Database Migration]
        BACKUP --> MIGRATE
    end

    subgraph Wave -1
        NS[Namespace]
        CONFIG[ConfigMaps & Secrets]
    end

    subgraph Wave 0
        SVC[Services]
        PVC[PersistentVolumeClaims]
    end

    subgraph Wave 1
        REDIS[Redis Cache]
        PG[PostgreSQL]
    end

    subgraph Wave 2
        WORKER[Background Workers]
        API[API Servers]
    end

    subgraph Wave 3
        WEB[Web Frontend]
        ING[Ingress]
    end

    subgraph PostSync Phase
        SMOKE[Smoke Tests]
        NOTIFY[Notifications]
        SMOKE --> NOTIFY
    end

    PreSync Phase --> Wave -1
    Wave -1 --> Wave 0
    Wave 0 --> Wave 1
    Wave 1 --> Wave 2
    Wave 2 --> Wave 3
    Wave 3 --> PostSync Phase
```

```yaml
# Complete multi-tier deployment with all waves and hooks

# ============================================================
# PRESYNC HOOKS - Run before any sync waves
# ============================================================

apiVersion: batch/v1
kind: Job
metadata:
  name: pre-deployment-backup
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
    argocd.argoproj.io/sync-wave: "-2"
spec:
  ttlSecondsAfterFinished: 7200
  template:
    spec:
      containers:
        - name: backup
          image: postgres:15-alpine
          command:
            - /bin/sh
            - -c
            - |
              set -e
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="/backups/myapp_${TIMESTAMP}.sql.gz"

              echo "Creating backup: $BACKUP_FILE"
              pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

              echo "Backup created successfully"
              ls -lh "$BACKUP_FILE"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection_string
          volumeMounts:
            - name: backup-storage
              mountPath: /backups
      volumes:
        - name: backup-storage
          persistentVolumeClaim:
            claimName: backup-pvc
      restartPolicy: Never
  backoffLimit: 2

---
apiVersion: batch/v1
kind: Job
metadata:
  name: database-migration
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
    # Runs after backup completes
    argocd.argoproj.io/sync-wave: "-1"
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      initContainers:
        - name: wait-for-db
          image: busybox:1.36
          command:
            - /bin/sh
            - -c
            - |
              until nc -z postgres 5432; do
                echo "Waiting for database..."
                sleep 2
              done
      containers:
        - name: migrate
          image: myapp/migrations:v2.1.0
          command:
            - /bin/sh
            - -c
            - |
              set -e
              echo "Running database migrations..."
              ./migrate up
              echo "Migrations complete"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection_string
      restartPolicy: Never
  backoffLimit: 3

---
# ============================================================
# WAVE -1: Namespace, RBAC, and Configuration
# ============================================================

apiVersion: v1
kind: Namespace
metadata:
  name: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
  labels:
    environment: production

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
data:
  REDIS_HOST: "redis-master"
  REDIS_PORT: "6379"
  LOG_LEVEL: "info"
  API_TIMEOUT: "30s"

---
# ============================================================
# WAVE 0: Services (DNS must exist before pods start)
# ============================================================

apiVersion: v1
kind: Service
metadata:
  name: redis-master
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379

---
apiVersion: v1
kind: Service
metadata:
  name: postgres-primary
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
  clusterIP: None

---
apiVersion: v1
kind: Service
metadata:
  name: api-server
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  selector:
    app: api-server
  ports:
    - port: 8080
      targetPort: 8080

---
apiVersion: v1
kind: Service
metadata:
  name: web-frontend
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  selector:
    app: web-frontend
  ports:
    - port: 3000
      targetPort: 3000

---
# ============================================================
# WAVE 1: Stateful Dependencies (Redis, PostgreSQL)
# ============================================================

apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  replicas: 1
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
          readinessProbe:
            exec:
              command: ["redis-cli", "ping"]
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  serviceName: postgres-primary
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: myapp
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "postgres"]
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi

---
# ============================================================
# WAVE 2: Application Servers
# ============================================================

apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: api
          image: myapp/api:v2.1.0
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: myapp-config
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection_string
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: background-worker
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: background-worker
  template:
    metadata:
      labels:
        app: background-worker
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: worker
          image: myapp/worker:v2.1.0
          envFrom:
            - configMapRef:
                name: myapp-config
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: connection_string
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "300m"

---
# ============================================================
# WAVE 3: Frontend and Ingress
# ============================================================

apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      containers:
        - name: web
          image: myapp/web:v2.1.0
          ports:
            - containerPort: 3000
          env:
            - name: API_URL
              value: http://api-server:8080
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "3"
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - myapp.example.com
        - api.myapp.example.com
      secretName: myapp-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-frontend
                port:
                  number: 3000
    - host: api.myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 8080

---
# ============================================================
# POSTSYNC HOOKS - Run after all waves complete
# ============================================================

apiVersion: batch/v1
kind: Job
metadata:
  name: post-deployment-tests
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    argocd.argoproj.io/sync-wave: "0"
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      containers:
        - name: test
          image: myapp/integration-tests:v2.1.0
          command:
            - /bin/sh
            - -c
            - |
              set -e
              echo "Running post-deployment tests..."

              # Health checks
              curl -sf http://api-server:8080/health/ready
              curl -sf http://web-frontend:3000/

              # API endpoint tests
              curl -sf http://api-server:8080/api/v1/status

              echo "All tests passed!"
      restartPolicy: Never
  backoffLimit: 2

---
apiVersion: batch/v1
kind: Job
metadata:
  name: deployment-complete-notification
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    argocd.argoproj.io/sync-wave: "1"
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              curl -X POST "$SLACK_WEBHOOK" \
                -H "Content-Type: application/json" \
                -d '{"text":"MyApp v2.1.0 deployed successfully to production!"}'
          env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
      restartPolicy: Never
```

### Canary Deployment Pattern

```mermaid
flowchart LR
    subgraph Wave 1
        CANARY[Canary Pod<br/>1 replica]
    end

    subgraph Wave 2
        TEST[Canary Validation<br/>Job]
    end

    subgraph Wave 3
        STABLE[Stable Pods<br/>N replicas]
    end

    CANARY --> TEST
    TEST -->|Pass| STABLE
    TEST -->|Fail| ROLLBACK[Sync Fails]
```

```yaml
# Canary deployment using sync waves
# The stable deployment only proceeds if canary validation passes

# Wave 1: Deploy canary with single replica
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-canary
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api-server
      track: canary
  template:
    metadata:
      labels:
        app: api-server
        track: canary
    spec:
      containers:
        - name: api
          # New version for canary testing
          image: myapp/api:v2.2.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          env:
            - name: CANARY
              value: "true"

---
# Service for canary testing
apiVersion: v1
kind: Service
metadata:
  name: api-canary
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  selector:
    app: api-server
    track: canary
  ports:
    - port: 8080
      targetPort: 8080

---
# Wave 2: Validate canary before proceeding
# If this job fails, the sync fails and stable deployment does not update
apiVersion: batch/v1
kind: Job
metadata:
  name: canary-validation
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "2"
    argocd.argoproj.io/hook: Sync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: validate
          image: myapp/canary-validator:latest
          command:
            - /bin/sh
            - -c
            - |
              set -e
              echo "=== Canary Validation Starting ==="

              # Wait for canary to be ready
              echo "Waiting for canary pod to be ready..."
              sleep 10

              # Run load test against canary
              echo "Running load test against canary..."
              for i in $(seq 1 100); do
                response=$(curl -sf -w "%{http_code}" -o /dev/null \
                  http://api-canary:8080/health/ready)
                if [ "$response" != "200" ]; then
                  echo "FAIL: Canary health check failed (attempt $i)"
                  exit 1
                fi
              done
              echo "PASS: All 100 health checks succeeded"

              # Check error rate
              echo "Checking error rates..."
              errors=$(curl -sf http://api-canary:8080/metrics | \
                grep 'http_requests_total{status="5"}' | \
                awk '{print $2}' || echo "0")
              if [ "$errors" -gt "5" ]; then
                echo "FAIL: Error rate too high: $errors"
                exit 1
              fi
              echo "PASS: Error rate acceptable"

              # Check response latency
              echo "Checking response latency..."
              latency=$(curl -sf -w "%{time_total}" -o /dev/null \
                http://api-canary:8080/api/v1/status)
              # latency is in seconds, check if > 1s
              if [ $(echo "$latency > 1" | bc) -eq 1 ]; then
                echo "FAIL: Latency too high: ${latency}s"
                exit 1
              fi
              echo "PASS: Latency acceptable: ${latency}s"

              echo ""
              echo "=== Canary Validation Passed ==="
      restartPolicy: Never
  backoffLimit: 1

---
# Wave 3: Deploy stable version (only if canary validation passes)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-stable
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
      track: stable
  template:
    metadata:
      labels:
        app: api-server
        track: stable
    spec:
      containers:
        - name: api
          # Same version as canary (now validated)
          image: myapp/api:v2.2.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
```

## Monitoring Sync Waves with OneUptime

When deploying complex applications with multiple sync waves and hooks, observability is critical. Use [OneUptime](https://oneuptime.com) to monitor your ArgoCD deployments, track sync wave progress, and alert on failures.

```yaml
# PostSync hook to report deployment metrics to OneUptime
apiVersion: batch/v1
kind: Job
metadata:
  name: report-deployment-metrics
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: report
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              # Report successful deployment metric
              curl -X POST "https://oneuptime.com/api/telemetry/metrics" \
                -H "Content-Type: application/json" \
                -H "x-oneuptime-token: ${ONEUPTIME_TOKEN}" \
                -d '{
                  "projectId": "'${PROJECT_ID}'",
                  "metrics": [{
                    "name": "deployment.success",
                    "value": 1,
                    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                    "attributes": {
                      "application": "myapp",
                      "environment": "production",
                      "version": "v2.1.0"
                    }
                  }]
                }'

              # Report deployment duration
              curl -X POST "https://oneuptime.com/api/telemetry/metrics" \
                -H "Content-Type: application/json" \
                -H "x-oneuptime-token: ${ONEUPTIME_TOKEN}" \
                -d '{
                  "projectId": "'${PROJECT_ID}'",
                  "metrics": [{
                    "name": "deployment.duration_seconds",
                    "value": '${DEPLOYMENT_DURATION:-60}',
                    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                    "attributes": {
                      "application": "myapp",
                      "environment": "production"
                    }
                  }]
                }'
          env:
            - name: ONEUPTIME_TOKEN
              valueFrom:
                secretKeyRef:
                  name: oneuptime-credentials
                  key: token
            - name: PROJECT_ID
              valueFrom:
                secretKeyRef:
                  name: oneuptime-credentials
                  key: project-id
      restartPolicy: Never

---
# SyncFail hook to create incident in OneUptime
apiVersion: batch/v1
kind: Job
metadata:
  name: report-deployment-failure
  namespace: myapp-production
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: report
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              # Create incident in OneUptime
              curl -X POST "https://oneuptime.com/api/incidents" \
                -H "Content-Type: application/json" \
                -H "x-oneuptime-token: ${ONEUPTIME_TOKEN}" \
                -d '{
                  "projectId": "'${PROJECT_ID}'",
                  "title": "Deployment Failed: myapp production",
                  "description": "ArgoCD sync operation failed for myapp in production environment. Manual investigation required.",
                  "severity": "Critical",
                  "monitors": ["'${MONITOR_ID}'"]
                }'
          env:
            - name: ONEUPTIME_TOKEN
              valueFrom:
                secretKeyRef:
                  name: oneuptime-credentials
                  key: token
            - name: PROJECT_ID
              valueFrom:
                secretKeyRef:
                  name: oneuptime-credentials
                  key: project-id
            - name: MONITOR_ID
              valueFrom:
                secretKeyRef:
                  name: oneuptime-credentials
                  key: monitor-id
      restartPolicy: Never
```

## Troubleshooting

### Common Issues and Solutions

```bash
# Check sync status and current operation
argocd app get myapp --show-operation

# View resources with their sync status and health
argocd app resources myapp --output wide

# Force hard refresh to clear caches
argocd app get myapp --hard-refresh

# Perform dry-run sync to see what would be applied
argocd app sync myapp --dry-run

# Sync specific resource only
argocd app sync myapp --resource :Deployment:api-server

# View application manifests with wave annotations
argocd app manifests myapp | grep -B5 "sync-wave"
```

### Debugging Hook Failures

```bash
# List all hooks and their status
kubectl get jobs -n myapp-production \
  -l argocd.argoproj.io/hook

# Check hook job logs
kubectl logs job/db-migration -n myapp-production

# Describe job for events and failure details
kubectl describe job db-migration -n myapp-production

# Check if hook pod is stuck
kubectl get pods -n myapp-production -l job-name=db-migration
kubectl describe pod -n myapp-production -l job-name=db-migration
```

### Sync Wave Order Issues

```yaml
# Common mistake: Missing sync-wave annotation
# Resources without annotation default to wave 0

# Fix: Always set explicit wave numbers
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  annotations:
    # Explicitly set wave to ensure correct ordering
    argocd.argoproj.io/sync-wave: "-1"
```

## Best Practices Summary

1. **Plan your wave strategy**: Use negative waves for prerequisites (CRDs, namespaces), wave 0 for configuration, positive waves for workloads in dependency order.

2. **Always set hook delete policies**: Prevent hook accumulation by specifying `HookSucceeded`, `HookFailed`, or `BeforeHookCreation`.

3. **Use readiness probes**: ArgoCD uses Kubernetes health checks to determine when to proceed to the next wave.

4. **Keep hooks idempotent**: Hooks may run multiple times; ensure they are safe to re-run.

5. **Set appropriate backoff limits**: Configure `backoffLimit` on jobs to control retry behavior.

6. **Use TTL for job cleanup**: Set `ttlSecondsAfterFinished` to automatically clean up completed jobs.

7. **Monitor your deployments**: Use [OneUptime](https://oneuptime.com) to track deployment health and receive alerts on failures.

---

Sync waves and hooks transform ArgoCD from a simple deployment tool into a powerful orchestration platform. Start with basic wave ordering for your resources, add PreSync hooks for migrations, and PostSync hooks for verification. The investment in proper sync orchestration pays dividends in reliable, repeatable deployments.
