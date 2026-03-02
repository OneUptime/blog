# How to Run Database Migrations as PreSync Hooks in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Database Migration, PreSync Hooks

Description: Learn how to configure ArgoCD PreSync hooks to run database migrations before application deployment ensuring schema compatibility with new code.

---

Database migrations are one of the trickiest parts of application deployment. The new code expects the new schema, but if you deploy the code before running migrations, the application crashes. If you run migrations after deployment, there is a window where new code runs against an old schema.

ArgoCD PreSync hooks solve this elegantly. By running database migrations as PreSync hooks, ArgoCD ensures the migration completes before any application resources are updated. If the migration fails, the deployment stops, and your application keeps running on the previous version.

## Why PreSync Is the Right Phase for Migrations

The PreSync phase runs before the Sync phase where your Deployments and Services are updated. This means:

1. Old application code is still running (healthy, serving traffic)
2. PreSync hook starts the migration Job
3. Migration modifies the database schema
4. Migration completes successfully
5. Only then does ArgoCD update your Deployment to the new image
6. New code starts running against the new schema

If the migration fails at step 4, ArgoCD stops. Your old code keeps running, and the database either rolled back the migration or is in a state where old code still works (if you follow backward-compatible migration practices).

## Basic Migration Hook

Here is a simple migration hook for a Python/Django application:

```yaml
# db-migration-hook.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-v42
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    metadata:
      labels:
        app: db-migrate
    spec:
      containers:
        - name: migrate
          # Use the SAME image as your application
          image: myorg/api:v42
          command: ["python", "manage.py", "migrate", "--no-input"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      restartPolicy: Never
  backoffLimit: 3
  activeDeadlineSeconds: 300
```

Key decisions in this configuration:

- **Same image as application**: The migration uses the same Docker image as the application. This ensures the migration code matches the application code.
- **HookSucceeded delete policy**: The Job is cleaned up after it succeeds. If it fails, it remains for debugging.
- **backoffLimit: 3**: Kubernetes retries the migration up to 3 times if it fails.
- **activeDeadlineSeconds: 300**: The entire Job must complete within 5 minutes.

## Node.js with Prisma Migrations

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: prisma-migrate-v18
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myorg/api:v18
          command:
            - /bin/sh
            - -c
            - |
              echo "Running Prisma migrations..."
              npx prisma migrate deploy
              echo "Migrations complete"
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
      restartPolicy: Never
  backoffLimit: 2
  activeDeadlineSeconds: 180
```

## Go with golang-migrate

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: go-migrate-v7
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: migrate/migrate:latest
          command:
            - /bin/sh
            - -c
            - |
              migrate -path=/migrations \
                -database "postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}?sslmode=require" \
                up
          env:
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: host
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: user
            - name: DB_PASS
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
            - name: DB_NAME
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: name
          volumeMounts:
            - name: migrations
              mountPath: /migrations
      volumes:
        - name: migrations
          configMap:
            name: db-migrations
      restartPolicy: Never
  backoffLimit: 1
```

## Handling Migration Failures

When a migration fails, ArgoCD stops the sync. The Job stays in the cluster (because `HookSucceeded` only deletes on success), so you can debug:

```bash
# Check why the migration failed
kubectl describe job db-migrate-v42 -n my-app

# View migration logs
kubectl logs -n my-app -l app=db-migrate --tail=100

# Check Pod events
kubectl get pods -n my-app -l job-name=db-migrate-v42
kubectl describe pod <pod-name> -n my-app
```

After fixing the issue, you have two choices:

1. **Delete the failed Job and retry sync**: ArgoCD recreates the hook Job
2. **Fix the migration in Git and push a new commit**: ArgoCD runs the updated migration

```bash
# Delete the failed Job
kubectl delete job db-migrate-v42 -n my-app

# Retry the sync
argocd app sync my-app
```

## Backup Before Migration

For critical databases, back up before migrating. Use sync waves to order the backup before the migration:

```yaml
# Wave 0: Backup the database
apiVersion: batch/v1
kind: Job
metadata:
  name: db-backup-before-v42
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/sync-wave: "0"
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: backup
          image: postgres:15
          command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
                -F c -f /backup/pre-deploy-${TIMESTAMP}.dump
              echo "Backup completed: pre-deploy-${TIMESTAMP}.dump"
          env:
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: host
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: user
            - name: DB_NAME
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: name
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
          volumeMounts:
            - name: backup-volume
              mountPath: /backup
      volumes:
        - name: backup-volume
          persistentVolumeClaim:
            claimName: db-backups
      restartPolicy: Never
  backoffLimit: 1
---
# Wave 1: Run the migration (after backup)
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-v42
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/sync-wave: "1"
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myorg/api:v42
          command: ["python", "manage.py", "migrate", "--no-input"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
      restartPolicy: Never
  backoffLimit: 3
```

## Unique Job Names

Since Kubernetes Job names must be unique, you need to change the Job name with each deployment. There are several strategies:

**Version in name** (works with manual version tracking):
```yaml
metadata:
  name: db-migrate-v42
```

**Generate name** (ArgoCD generates a unique suffix):
```yaml
metadata:
  generateName: db-migrate-
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
```

Using `BeforeHookCreation` delete policy with `generateName` is often the cleanest approach. ArgoCD deletes the previous hook resource before creating the new one.

## Backward-Compatible Migration Strategy

The safest migration approach follows the expand-and-contract pattern:

1. **Expand**: Add new columns/tables but do not remove old ones
2. **Deploy**: New code uses new schema, old code still works
3. **Contract**: Remove old columns/tables in a future release

```yaml
# Version N: Expand migration (adds new column, keeps old)
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate-expand-v42
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myorg/api:v42
          command:
            - /bin/sh
            - -c
            - |
              # Add new column without removing old one
              # Both old and new code can work with this schema
              python manage.py migrate --no-input
      restartPolicy: Never
```

This ensures that even if you need to roll back the deployment, the old code still works with the migrated database.

## Summary

Running database migrations as ArgoCD PreSync hooks is the standard pattern for GitOps-managed applications. It ensures migrations complete before code deployment, stops the deployment if migrations fail, and keeps your application running on the old version when things go wrong. Always use the same Docker image for migration hooks as your application, set appropriate timeouts and retry limits, and consider backup hooks for critical databases.
