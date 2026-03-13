# How to Use Flagger for Zero-Downtime Database Schema Migrations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Database Migrations, Zero Downtime, Kubernetes, Canary Deployments

Description: Learn how to use Flagger canary deployments to safely perform zero-downtime database schema migrations on Kubernetes.

---

## Introduction

Database schema migrations are among the riskiest operations in application deployment. A bad migration can cause downtime, data corruption, or application errors that affect all users. By combining Flagger's canary deployment strategy with careful migration planning, you can validate schema changes against a subset of traffic before rolling them out to all users.

This guide covers the patterns and practices for using Flagger to perform zero-downtime database schema migrations. You will learn the expand-and-contract migration pattern, how to structure your deployments for safe migrations, and how to configure Flagger to validate migration safety through canary analysis.

## Prerequisites

Before you begin, ensure you have:

- Flagger installed and configured with a mesh provider or ingress controller.
- A Kubernetes cluster with your application deployed.
- A database that supports concurrent schema modifications.
- Understanding of your application's database access patterns.

## Understanding the Expand-and-Contract Pattern

Zero-downtime migrations require that both the old and new versions of your application can work with the database simultaneously. The expand-and-contract pattern achieves this in three phases.

Phase 1 (Expand): Add new columns, tables, or indexes without removing anything. The old version ignores the new schema elements while the new version can use them.

Phase 2 (Migrate): Once the new version is fully deployed, backfill data and switch to using the new schema elements exclusively.

Phase 3 (Contract): Remove the old columns, tables, or indexes that are no longer needed.

Flagger handles the traffic shifting in Phase 1, ensuring the new version works correctly before promoting it.

## Structuring Migrations for Canary Compatibility

Each migration must be backward compatible so that both the primary (old) and canary (new) versions can run simultaneously against the same database.

```yaml
# init-container-migration.yaml
# Deployment with init container for running migrations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      initContainers:
        - name: migrate
          image: myregistry/myapp:v2.0.0
          command:
            - /bin/sh
            - -c
            - |
              /app/migrate --direction up --steps 1
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
      containers:
        - name: myapp
          image: myregistry/myapp:v2.0.0
          ports:
            - containerPort: 8080
              name: http
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
```

## Using Pre-Rollout Webhooks for Migrations

Instead of init containers, you can use Flagger's pre-rollout webhooks to run migrations before the canary analysis begins. This gives you more control over when migrations execute.

```yaml
# canary-with-migration.yaml
# Canary resource with migration webhook
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
  namespace: production
spec:
  provider: istio
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  progressDeadlineSeconds: 300
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 3
    maxWeight: 50
    stepWeight: 10
    webhooks:
      - name: run-migrations
        type: pre-rollout
        url: http://migration-runner.production/migrate
        timeout: 120s
        metadata:
          app: myapp
          version: "{{ .Version }}"
      - name: db-health-check
        type: pre-rollout
        url: http://migration-runner.production/health
        timeout: 30s
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.production/
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://myapp-canary.production/"
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

## Creating a Migration Runner Service

Deploy a migration runner service that Flagger can call via webhooks.

```yaml
# migration-runner.yaml
# Migration runner service for Flagger webhooks
apiVersion: apps/v1
kind: Deployment
metadata:
  name: migration-runner
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: migration-runner
  template:
    metadata:
      labels:
        app: migration-runner
    spec:
      containers:
        - name: migration-runner
          image: myregistry/migration-runner:latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
---
apiVersion: v1
kind: Service
metadata:
  name: migration-runner
  namespace: production
spec:
  selector:
    app: migration-runner
  ports:
    - port: 80
      targetPort: 8080
```

## Adding Custom Database Metrics

Monitor database health during the canary analysis with custom metric templates that check for migration-related issues.

```yaml
# db-metrics.yaml
# Custom metric template for database query error rate
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: db-query-error-rate
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(rate(db_query_errors_total{
      namespace="{{ namespace }}",
      pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
    }[{{ interval }}]))
---
# Custom metric template for database query latency
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: db-query-latency
  namespace: production
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    histogram_quantile(0.99, sum(rate(
      db_query_duration_seconds_bucket{
        namespace="{{ namespace }}",
        pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
      }[{{ interval }}]
    )) by (le))
```

Reference these metrics in your Canary resource to detect migration-related performance issues.

```yaml
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: db-query-error-rate
        templateRef:
          name: db-query-error-rate
        thresholdRange:
          max: 0
        interval: 1m
      - name: db-query-latency
        templateRef:
          name: db-query-latency
        thresholdRange:
          max: 0.1
        interval: 1m
```

## Handling Rollback with Migrations

If Flagger rolls back the canary, the database migration will already have been applied. Since you used the expand-and-contract pattern, the old version of the application can still work with the expanded schema. This is why backward-compatible migrations are essential.

If a rollback occurs, plan for the following scenarios.

For additive changes (new columns, new tables), the old version simply ignores them. No action needed.

For column type changes, use a new column with the desired type while keeping the old column intact. The old version continues using the old column.

For column removals, defer the removal until the new version is fully promoted and stable.

## Example: Adding a New Column Safely

Here is a complete example of adding a new column to a users table.

Migration (expand phase):

```sql
-- Migration: Add display_name column (backward compatible)
ALTER TABLE users ADD COLUMN display_name VARCHAR(255);
-- Set a default value for existing rows
UPDATE users SET display_name = username WHERE display_name IS NULL;
```

The new application version reads and writes the `display_name` column. The old version ignores it. If Flagger promotes the canary, the migration is complete. If Flagger rolls back, the column exists but is unused by the old version, which is harmless.

## Conclusion

Using Flagger for zero-downtime database schema migrations combines the safety of progressive delivery with disciplined migration practices. The expand-and-contract pattern ensures backward compatibility during the canary analysis period, while Flagger's metric-driven analysis validates that the new version with its schema changes performs correctly under real traffic. Custom database metrics provide additional safety by detecting migration-related performance degradation. This approach significantly reduces the risk of database-related deployment failures.
