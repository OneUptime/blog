# How to implement ArgoCD PreSync and PostSync resource hooks for deployment workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, DevOps, Deployment

Description: Learn how to implement ArgoCD PreSync and PostSync resource hooks to execute tasks before and after deployments, including database migrations, health checks, and cleanup operations in Kubernetes environments.

---

ArgoCD resource hooks let you execute specific tasks at different phases of the synchronization process. PreSync hooks run before applying application resources, while PostSync hooks execute after successful sync completion. These hooks enable sophisticated deployment workflows including database migrations, validation checks, and cleanup operations.

## Understanding Resource Hooks

Resource hooks are standard Kubernetes resources with special annotations that tell ArgoCD when to execute them. Unlike regular application resources, hooks run as jobs or pods at specific sync phases and can block deployment progression until completion.

ArgoCD supports multiple hook types: PreSync, Sync, PostSync, SyncFail, and Skip. This guide focuses on PreSync and PostSync hooks, the most commonly used for deployment workflows.

## Basic PreSync Hook

A PreSync hook runs before ArgoCD applies any application resources. Use PreSync hooks for database migrations, configuration validation, or pre-deployment checks:

```yaml
# presync-migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: PreSync  # Run before sync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded  # Clean up after success
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: your-app:latest
          command: ["./migrate.sh"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
      # Use init containers for setup tasks
      initContainers:
        - name: wait-for-db
          image: busybox:1.35
          command: ['sh', '-c', 'until nc -z postgres 5432; do sleep 2; done']
```

ArgoCD creates this job before applying any other resources. The sync operation waits for the job to complete successfully before proceeding.

## Basic PostSync Hook

PostSync hooks execute after ArgoCD successfully applies all application resources. Use them for verification, notifications, or cleanup tasks:

```yaml
# postsync-verification-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: verify-deployment
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: PostSync  # Run after sync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: verify
          image: curlimages/curl:latest
          command:
            - sh
            - -c
            - |
              # Wait for service to be ready
              sleep 10
              # Verify application health endpoint
              response=$(curl -s -o /dev/null -w "%{http_code}" http://demo-app:8080/health)
              if [ "$response" -eq 200 ]; then
                echo "Application is healthy"
                exit 0
              else
                echo "Application health check failed with status $response"
                exit 1
              fi
```

If this verification fails, ArgoCD marks the sync as failed, even though the resources deployed successfully.

## Hook Deletion Policies

Control when ArgoCD deletes hook resources using deletion policies:

```yaml
# hook-with-deletion-policies.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: presync-backup
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: PreSync
    # Available policies: HookSucceeded, HookFailed, BeforeHookCreation
    argocd.argoproj.io/hook-delete-policy: HookSucceeded,HookFailed
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: backup
          image: your-backup-tool:latest
          command: ["./backup-database.sh"]
          env:
            - name: BACKUP_LOCATION
              value: "s3://backups/pre-deployment"
```

Multiple deletion policies separated by commas give you flexibility. `HookSucceeded` removes the job on success, while `HookFailed` cleans up failed attempts. `BeforeHookCreation` deletes previous instances before creating new ones.

## Database Migration Workflow

Implement a complete database migration workflow using PreSync hooks:

```yaml
# database-migration-presync.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-{{ .Values.version }}  # Unique per version
  namespace: production
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "1"  # Run in first wave
spec:
  backoffLimit: 3  # Retry failed migrations
  template:
    metadata:
      labels:
        app: migration
    spec:
      restartPolicy: Never
      serviceAccountName: migration-sa
      containers:
        - name: migrate
          image: migrate/migrate:v4.15.2
          command:
            - sh
            - -c
            - |
              # Run database migrations
              migrate -path /migrations \
                -database "$DATABASE_URL" \
                up

              # Verify migration success
              if [ $? -eq 0 ]; then
                echo "Migration completed successfully"
                exit 0
              else
                echo "Migration failed"
                exit 1
              fi
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: connection-string
          volumeMounts:
            - name: migrations
              mountPath: /migrations
              readOnly: true
      volumes:
        - name: migrations
          configMap:
            name: database-migrations
```

This job runs migrations before deploying application changes, ensuring database schema matches application expectations.

## Multi-Phase Deployment with Hooks

Combine PreSync and PostSync hooks with sync waves for complex deployments:

```yaml
# presync-prepare.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: prepare-environment
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    argocd.argoproj.io/sync-wave: "0"  # Run first
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: prepare
          image: your-tool:latest
          command: ["./prepare-environment.sh"]
---
# deployment.yaml (sync wave 1, runs after PreSync)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: demo
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: app
          image: your-app:v2.0.0
          ports:
            - containerPort: 8080
---
# postsync-notify.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: notify-deployment
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - sh
            - -c
            - |
              curl -X POST https://api.slack.com/webhooks/YOUR_WEBHOOK \
                -H 'Content-Type: application/json' \
                -d '{"text":"Deployment completed successfully for demo-app"}'
```

This setup executes tasks in order: prepare environment, deploy application, send notification.

## Conditional Hook Execution

Use environment variables and conditionals within hooks to control execution:

```yaml
# conditional-presync.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: conditional-backup
  namespace: production
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: conditional-backup
          image: your-backup-tool:latest
          command:
            - sh
            - -c
            - |
              # Only run backup for major version changes
              CURRENT_VERSION=$(kubectl get deploy app -n production \
                -o jsonpath='{.spec.template.spec.containers[0].image}' \
                | cut -d: -f2)

              NEW_VERSION="${TARGET_VERSION}"

              # Extract major version numbers
              CURRENT_MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
              NEW_MAJOR=$(echo $NEW_VERSION | cut -d. -f1)

              if [ "$NEW_MAJOR" -gt "$CURRENT_MAJOR" ]; then
                echo "Major version change detected, running backup"
                ./backup-database.sh
              else
                echo "Minor/patch update, skipping backup"
              fi
          env:
            - name: TARGET_VERSION
              value: "2.0.0"
```

This approach lets you implement sophisticated logic within hooks based on deployment context.

## Health Check PostSync Hook

Verify application health after deployment with comprehensive checks:

```yaml
# postsync-health-check.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: health-check
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: health-check
          image: curlimages/curl:latest
          command:
            - sh
            - -c
            - |
              # Wait for pods to be ready
              echo "Waiting for pods to be ready..."
              kubectl wait --for=condition=ready pod \
                -l app=demo \
                -n demo \
                --timeout=300s

              # Check health endpoint
              for i in $(seq 1 10); do
                echo "Health check attempt $i/10"

                response=$(curl -s -o /dev/null -w "%{http_code}" \
                  http://demo-app:8080/health)

                if [ "$response" -eq 200 ]; then
                  echo "Health check passed"

                  # Run smoke tests
                  ./run-smoke-tests.sh

                  if [ $? -eq 0 ]; then
                    echo "All checks passed"
                    exit 0
                  else
                    echo "Smoke tests failed"
                    exit 1
                  fi
                fi

                sleep 5
              done

              echo "Health check failed after 10 attempts"
              exit 1
```

This job ensures the application is not only deployed but also healthy and functional before marking the sync successful.

## Hook Failure Handling

Configure hooks to handle failures gracefully:

```yaml
# presync-with-fallback.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migration-with-fallback
  namespace: demo
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  backoffLimit: 2  # Retry twice
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: migrate
          image: your-app:latest
          command:
            - sh
            - -c
            - |
              # Try migration with fallback
              if ./migrate.sh; then
                echo "Migration successful"
                exit 0
              else
                echo "Migration failed, checking if already applied"
                if ./check-migration-state.sh; then
                  echo "Migration already applied, continuing"
                  exit 0
                else
                  echo "Migration failed and not applied"
                  exit 1
                fi
              fi
```

This pattern prevents deployment failures when migrations have already been applied or when idempotent operations can safely retry.

## Monitoring Hook Execution

Track hook execution through ArgoCD and Kubernetes:

```bash
# View application with hook status
argocd app get demo-app

# Check hook job status
kubectl get jobs -n demo -l app=demo

# View hook logs
kubectl logs -n demo job/db-migration

# Describe hook job for detailed information
kubectl describe job -n demo db-migration

# List all hook resources
kubectl get all -n demo -l argocd.argoproj.io/instance=demo-app
```

Monitor these outputs to troubleshoot hook failures and verify successful execution.

## Best Practices

Always set appropriate timeouts for hook jobs to prevent hanging syncs. Use `activeDeadlineSeconds` in job specs to enforce time limits.

Make hooks idempotent whenever possible. Failed syncs may retry hooks, so ensure repeated execution produces the same result.

Use separate service accounts for hooks with minimal required permissions. Don't reuse application service accounts.

Log extensively within hook scripts for troubleshooting. Include timestamps and contextual information.

Test hooks thoroughly in development environments before enabling in production. Hook failures block deployments.

Keep hooks lightweight and focused on single tasks. Complex workflows should use multiple hooks with sync waves.

Store hook logs externally for audit trails. Kubernetes job logs may not persist after deletion policies remove hooks.

## Conclusion

ArgoCD PreSync and PostSync hooks enable sophisticated deployment workflows beyond simple resource application. By running migrations before deployments and verifying health afterward, you ensure safe, reliable deployments. Combined with sync waves and proper error handling, hooks provide the flexibility needed for production-grade GitOps workflows while maintaining the declarative principles that make ArgoCD powerful.
