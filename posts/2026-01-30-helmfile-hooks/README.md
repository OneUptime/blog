# How to Implement Helmfile Hooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Helmfile, Helm, Kubernetes, Lifecycle

Description: Learn how to use Helmfile hooks to execute custom scripts and commands at different stages of your Helm release lifecycle.

---

Helmfile hooks let you run custom actions before and after Helm operations. They are essential for tasks like database migrations, backups, notifications, and validation checks that need to happen at specific points in your deployment workflow.

## What Are Helmfile Hooks?

Helmfile hooks are lifecycle events that trigger custom scripts or commands during Helmfile operations. Unlike Helm hooks (which run inside Kubernetes), Helmfile hooks run on the machine executing Helmfile.

The following diagram shows when each hook type executes during a Helmfile sync operation.

```mermaid
flowchart TD
    Start[helmfile sync] --> Prepare[prepare hook]
    Prepare --> PreSync[presync hook]
    PreSync --> HelmDiff[Helm Diff]
    HelmDiff --> Sync[Helm Upgrade/Install]
    Sync --> PostSync[postsync hook]
    PostSync --> Cleanup[cleanup hook]
    Cleanup --> End[Complete]

    Sync -->|On Failure| PostSyncFail[postsync hook with error]
    PostSyncFail --> CleanupFail[cleanup hook]
    CleanupFail --> EndFail[Failed]
```

## Available Hook Types

Helmfile supports several hook types that execute at different lifecycle stages.

| Hook Type | When It Runs |
|-----------|--------------|
| `prepare` | Before Helmfile reads release files |
| `presync` | Before each release is synced |
| `preapply` | Before helm upgrade/install |
| `postapply` | After helm upgrade/install |
| `postsync` | After each release is synced |
| `cleanup` | After all releases are processed |

## Basic Hook Configuration

Hooks are defined in your `helmfile.yaml` under each release. Here is a simple example that prints messages before and after syncing a release.

```yaml
releases:
  - name: myapp
    namespace: production
    chart: ./charts/myapp
    hooks:
      - events: ["presync"]
        showlogs: true
        command: "echo"
        args: ["Starting deployment of {{ .Release.Name }}"]
      - events: ["postsync"]
        showlogs: true
        command: "echo"
        args: ["Finished deployment of {{ .Release.Name }}"]
```

## Using Shell Scripts in Hooks

For complex operations, you can execute shell scripts. This example runs a pre-deployment validation script.

```yaml
releases:
  - name: api-server
    namespace: production
    chart: ./charts/api-server
    hooks:
      - events: ["presync"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            echo "Running pre-deployment checks..."
            ./scripts/validate-config.sh
            ./scripts/check-dependencies.sh
```

Create the validation script at `scripts/validate-config.sh`:

```bash
#!/bin/bash
set -e

echo "Validating configuration..."

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set"
    exit 1
fi

# Validate Kubernetes connectivity
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "ERROR: Cannot connect to Kubernetes cluster"
    exit 1
fi

echo "Configuration validation passed"
```

## Database Migration Hook

One of the most common use cases for hooks is running database migrations before deploying a new application version. The migration must complete successfully before the new code starts running.

```yaml
releases:
  - name: backend-api
    namespace: production
    chart: ./charts/backend-api
    hooks:
      - events: ["preapply"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            echo "Running database migrations..."

            # Get database credentials from Kubernetes secret
            DB_PASSWORD=$(kubectl get secret db-credentials -n production \
              -o jsonpath='{.data.password}' | base64 -d)

            # Run migrations using a migration tool
            DATABASE_URL="postgres://app:${DB_PASSWORD}@db.production:5432/myapp" \
              ./migrate up

            echo "Migrations completed successfully"
```

## Backup Before Deployment Hook

Create a backup of critical data before deploying updates. This provides a rollback point if something goes wrong.

```yaml
releases:
  - name: database
    namespace: production
    chart: bitnami/postgresql
    hooks:
      - events: ["presync"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            BACKUP_NAME="pre-deploy-$(date +%Y%m%d-%H%M%S)"
            echo "Creating backup: ${BACKUP_NAME}"

            # Create a database dump
            kubectl exec -n production postgresql-0 -- \
              pg_dump -U postgres mydb > "/backups/${BACKUP_NAME}.sql"

            # Upload to object storage
            aws s3 cp "/backups/${BACKUP_NAME}.sql" \
              "s3://my-backups/database/${BACKUP_NAME}.sql"

            echo "Backup completed: ${BACKUP_NAME}"
```

## Notification Hooks

Send notifications to your team when deployments start and finish. This example sends Slack messages.

```yaml
releases:
  - name: frontend
    namespace: production
    chart: ./charts/frontend
    hooks:
      - events: ["presync"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            curl -X POST "$SLACK_WEBHOOK_URL" \
              -H "Content-Type: application/json" \
              -d '{
                "text": "Deployment starting: {{ .Release.Name }} to {{ .Release.Namespace }}"
              }'
      - events: ["postsync"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            curl -X POST "$SLACK_WEBHOOK_URL" \
              -H "Content-Type: application/json" \
              -d '{
                "text": "Deployment completed: {{ .Release.Name }} to {{ .Release.Namespace }}"
              }'
```

## Health Check Hook

Wait for the application to be healthy after deployment before proceeding to the next release.

```yaml
releases:
  - name: api-gateway
    namespace: production
    chart: ./charts/api-gateway
    hooks:
      - events: ["postapply"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            echo "Waiting for deployment to be ready..."

            kubectl rollout status deployment/api-gateway \
              -n production --timeout=300s

            echo "Running health checks..."

            # Wait for service endpoint
            for i in {1..30}; do
              if curl -sf http://api-gateway.production.svc/health; then
                echo "Health check passed"
                exit 0
              fi
              echo "Attempt $i: Service not ready, waiting..."
              sleep 10
            done

            echo "Health check failed after 30 attempts"
            exit 1
```

## Hook Execution Flow

The following diagram illustrates the complete hook execution order when syncing multiple releases.

```mermaid
sequenceDiagram
    participant User
    participant Helmfile
    participant Hook as Hook Runner
    participant Helm
    participant K8s as Kubernetes

    User->>Helmfile: helmfile sync
    Helmfile->>Hook: Execute prepare hooks

    loop For each release
        Helmfile->>Hook: Execute presync hook
        Hook-->>Helmfile: Success
        Helmfile->>Hook: Execute preapply hook
        Hook-->>Helmfile: Success
        Helmfile->>Helm: helm upgrade --install
        Helm->>K8s: Apply manifests
        K8s-->>Helm: Resources created
        Helm-->>Helmfile: Release deployed
        Helmfile->>Hook: Execute postapply hook
        Hook-->>Helmfile: Success
        Helmfile->>Hook: Execute postsync hook
        Hook-->>Helmfile: Success
    end

    Helmfile->>Hook: Execute cleanup hooks
    Helmfile-->>User: Sync complete
```

## Conditional Hook Execution

Run hooks only when specific conditions are met. This example only runs migrations when the release includes database changes.

```yaml
releases:
  - name: backend
    namespace: production
    chart: ./charts/backend
    hooks:
      - events: ["preapply"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            # Check if migrations are needed
            MIGRATION_FILES=$(find ./migrations -name "*.sql" -newer .last-migration 2>/dev/null | wc -l)

            if [ "$MIGRATION_FILES" -gt 0 ]; then
              echo "Found $MIGRATION_FILES new migration files"
              ./run-migrations.sh
              touch .last-migration
            else
              echo "No new migrations to run"
            fi
```

## Environment-Specific Hooks

Use Helmfile's templating to run different hooks based on the environment.

```yaml
environments:
  production:
    values:
      - environment: production
        runBackup: true
  staging:
    values:
      - environment: staging
        runBackup: false

releases:
  - name: myapp
    namespace: {{ .Values.environment }}
    chart: ./charts/myapp
    hooks:
      {{ if .Values.runBackup }}
      - events: ["presync"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            echo "Creating pre-deployment backup..."
            ./scripts/backup.sh
      {{ end }}
      - events: ["postsync"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            echo "Deployment to {{ .Values.environment }} completed"
```

## Error Handling in Hooks

Handle errors gracefully and provide useful output when hooks fail.

```yaml
releases:
  - name: critical-service
    namespace: production
    chart: ./charts/critical-service
    hooks:
      - events: ["preapply"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            set -e
            trap 'echo "Hook failed at line $LINENO"; exit 1' ERR

            echo "Step 1: Validating prerequisites..."
            if ! ./scripts/check-prerequisites.sh; then
              echo "ERROR: Prerequisites check failed"
              echo "Please ensure all dependencies are available"
              exit 1
            fi

            echo "Step 2: Creating backup..."
            if ! ./scripts/backup.sh; then
              echo "ERROR: Backup failed"
              echo "Aborting deployment to prevent data loss"
              exit 1
            fi

            echo "All pre-deployment checks passed"
```

## Using Hooks with Multiple Releases

When you have dependencies between releases, use hooks to coordinate their deployment order.

```yaml
releases:
  - name: database
    namespace: production
    chart: bitnami/postgresql
    hooks:
      - events: ["postsync"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            echo "Waiting for database to be ready..."
            kubectl wait --for=condition=ready pod \
              -l app.kubernetes.io/name=postgresql \
              -n production --timeout=300s
            echo "Database is ready"

  - name: backend
    namespace: production
    chart: ./charts/backend
    needs:
      - production/database
    hooks:
      - events: ["presync"]
        showlogs: true
        command: "/bin/bash"
        args:
          - "-c"
          - |
            echo "Verifying database connectivity..."
            kubectl exec -n production postgresql-0 -- \
              pg_isready -U postgres
            echo "Database connection verified"
```

## Global Hooks

Define hooks that run for all releases using Helmfile's global hooks feature.

```yaml
hooks:
  - events: ["prepare"]
    showlogs: true
    command: "/bin/bash"
    args:
      - "-c"
      - |
        echo "Starting Helmfile sync at $(date)"
        echo "Environment: ${HELMFILE_ENVIRONMENT:-default}"

  - events: ["cleanup"]
    showlogs: true
    command: "/bin/bash"
    args:
      - "-c"
      - |
        echo "Helmfile sync completed at $(date)"

        # Send summary notification
        RELEASES_COUNT=$(helmfile list --output json | jq length)
        echo "Processed ${RELEASES_COUNT} releases"

releases:
  - name: app1
    chart: ./charts/app1
  - name: app2
    chart: ./charts/app2
```

## Hook Best Practices

Follow these practices to make your hooks reliable and maintainable.

### 1. Always Set Error Handling

Start your scripts with proper error handling to catch failures early.

```bash
#!/bin/bash
set -euo pipefail
```

### 2. Add Timeouts

Prevent hooks from running indefinitely by adding timeouts.

```yaml
hooks:
  - events: ["postapply"]
    showlogs: true
    command: "timeout"
    args:
      - "300"
      - "/bin/bash"
      - "-c"
      - |
        ./scripts/health-check.sh
```

### 3. Use Idempotent Operations

Make sure hooks can be run multiple times without causing issues.

```bash
# Good: Check before creating
if ! kubectl get configmap my-config -n production > /dev/null 2>&1; then
  kubectl create configmap my-config -n production --from-file=config.yaml
fi

# Bad: Will fail on second run
kubectl create configmap my-config -n production --from-file=config.yaml
```

### 4. Log Everything

Include timestamps and context in your log output for debugging.

```bash
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Starting pre-deployment hook for ${RELEASE_NAME}"
log "Namespace: ${NAMESPACE}"
log "Chart version: ${CHART_VERSION}"
```

## Debugging Hooks

When hooks fail, use these techniques to debug them.

Run Helmfile with debug output to see hook execution details.

```bash
helmfile --debug sync
```

Test hooks independently before running them through Helmfile.

```bash
# Set environment variables that Helmfile would set
export RELEASE_NAME=myapp
export NAMESPACE=production

# Run the hook script directly
./scripts/pre-deploy.sh
```

Check Helmfile logs for hook output.

```bash
helmfile sync 2>&1 | tee helmfile.log
```

---

Helmfile hooks provide a powerful way to integrate custom logic into your deployment workflow. Start with simple notification and logging hooks, then gradually add more complex operations like database migrations and health checks as your needs grow. Always test hooks in a non-production environment first to ensure they work correctly.
