# How to Configure Database Schema Migration Jobs Using Liquibase on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Liquibase, Database, Schema Migration, CI/CD

Description: Learn how to automate database schema migrations using Liquibase on Kubernetes with Job resources, including version control, rollback strategies, and production best practices.

---

Database schema migrations are critical operations that must be executed reliably in Kubernetes environments. Liquibase provides a powerful, database-agnostic approach to managing schema changes through version-controlled changesets. Running Liquibase as Kubernetes Jobs ensures migrations complete before application deployments.

## Understanding Liquibase Architecture

Liquibase tracks database changes using changelog files written in XML, YAML, JSON, or SQL. Each changeset has a unique identifier and author, ensuring changes apply exactly once. The DATABASECHANGELOG table tracks which changesets have been executed.

Unlike manual SQL scripts, Liquibase generates database-specific SQL based on your target database. This abstraction allows the same changelog to work across PostgreSQL, MySQL, Oracle, and other databases.

## Creating Liquibase Changelog Files

Start by organizing your changesets in a structured directory. Here's a sample changelog structure:

```yaml
# db-changelog-master.yaml
databaseChangeLog:
  - include:
      file: db/changelog/001-initial-schema.yaml
  - include:
      file: db/changelog/002-add-user-table.yaml
  - include:
      file: db/changelog/003-add-indexes.yaml
```

Each included file contains specific changesets:

```yaml
# 001-initial-schema.yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: devops-team
      changes:
        - createTable:
            tableName: products
            columns:
              - column:
                  name: id
                  type: uuid
                  constraints:
                    primaryKey: true
                    nullable: false
              - column:
                  name: name
                  type: varchar(255)
                  constraints:
                    nullable: false
              - column:
                  name: price
                  type: decimal(10,2)
              - column:
                  name: created_at
                  type: timestamp
                  defaultValueComputed: CURRENT_TIMESTAMP
```

This declarative approach ensures consistency across all environments. You define what the schema should look like, and Liquibase handles the implementation details.

## Building the Liquibase Container Image

Create a Docker image containing Liquibase and your changelog files:

```dockerfile
# Dockerfile
FROM liquibase/liquibase:4.25

# Copy changelog files
COPY db-changelog-master.yaml /liquibase/changelog/
COPY db/changelog/ /liquibase/changelog/db/changelog/

# Copy database driver if needed (PostgreSQL example)
# Liquibase official images include common drivers

# Set working directory
WORKDIR /liquibase

# Default command runs Liquibase update
ENTRYPOINT ["liquibase"]
CMD ["update", "--changelog-file=changelog/db-changelog-master.yaml"]
```

Build and push the image to your container registry:

```bash
docker build -t myregistry/liquibase-migrations:v1.0 .
docker push myregistry/liquibase-migrations:v1.0
```

## Creating ConfigMap for Liquibase Properties

Store connection details and Liquibase configuration in a ConfigMap:

```yaml
# liquibase-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: liquibase-config
  namespace: production
data:
  liquibase.properties: |
    driver: org.postgresql.Driver
    changeLogFile: changelog/db-changelog-master.yaml
    url: jdbc:postgresql://postgres-service:5432/appdb
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    liquibase.hub.mode: off
    logLevel: INFO
```

Apply the ConfigMap:

```bash
kubectl apply -f liquibase-config.yaml
```

## Defining the Migration Job

Create a Kubernetes Job to run the migration:

```yaml
# liquibase-migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: liquibase-migration
  namespace: production
  labels:
    app: database-migration
    version: v1.0
spec:
  # Only run once, don't retry on failure
  backoffLimit: 0
  # Clean up after 1 hour
  ttlSecondsAfterFinished: 3600
  template:
    metadata:
      labels:
        app: database-migration
    spec:
      restartPolicy: Never
      initContainers:
        # Wait for database to be ready
        - name: wait-for-db
          image: postgres:15
          command:
            - sh
            - -c
            - |
              until pg_isready -h postgres-service -p 5432; do
                echo "Waiting for database..."
                sleep 2
              done
          env:
            - name: PGUSER
              value: postgres
      containers:
        - name: liquibase
          image: myregistry/liquibase-migrations:v1.0
          args:
            - update
            - --changelog-file=changelog/db-changelog-master.yaml
            - --url=jdbc:postgresql://postgres-service:5432/appdb
            - --username=$(DB_USERNAME)
            - --password=$(DB_PASSWORD)
          env:
            - name: DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: password
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
      # Use service account with database access
      serviceAccountName: database-migration-sa
```

## Creating Database Credentials Secret

Store sensitive database credentials in a Secret:

```bash
kubectl create secret generic database-credentials \
  --from-literal=username=appuser \
  --from-literal=password=securepassword123 \
  --namespace=production
```

## Running Migrations in CI/CD Pipelines

Integrate Liquibase migrations into your deployment pipeline. Here's an example for GitLab CI:

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - migrate
  - deploy

liquibase-validate:
  stage: validate
  image: liquibase/liquibase:4.25
  script:
    - liquibase --changelog-file=db-changelog-master.yaml validate
  only:
    - merge_requests

liquibase-migrate:
  stage: migrate
  image: bitnami/kubectl:latest
  script:
    # Apply the migration job
    - kubectl apply -f liquibase-migration-job.yaml
    # Wait for job to complete
    - kubectl wait --for=condition=complete --timeout=300s job/liquibase-migration -n production
    # Check job status
    - kubectl get job liquibase-migration -n production
  only:
    - master
  when: manual

deploy-application:
  stage: deploy
  needs:
    - liquibase-migrate
  script:
    - kubectl apply -f app-deployment.yaml
```

## Handling Migration Failures

Add proper error handling and notification:

```yaml
# liquibase-migration-with-hooks.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: liquibase-migration
  namespace: production
spec:
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: liquibase
          image: myregistry/liquibase-migrations:v1.0
          command:
            - sh
            - -c
            - |
              # Run migration
              liquibase update \
                --changelog-file=changelog/db-changelog-master.yaml \
                --url=jdbc:postgresql://postgres-service:5432/appdb \
                --username=$DB_USERNAME \
                --password=$DB_PASSWORD

              # Check exit code
              if [ $? -eq 0 ]; then
                echo "Migration completed successfully"
                # Send success notification
                curl -X POST $SLACK_WEBHOOK \
                  -H 'Content-Type: application/json' \
                  -d '{"text":"Database migration completed successfully"}'
                exit 0
              else
                echo "Migration failed"
                # Send failure notification
                curl -X POST $SLACK_WEBHOOK \
                  -H 'Content-Type: application/json' \
                  -d '{"text":"Database migration FAILED! Manual intervention required."}'
                exit 1
              fi
          env:
            - name: DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: password
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: notification-config
                  key: slack-webhook
```

## Implementing Rollback Strategies

Liquibase supports rollback operations. Create a rollback job:

```yaml
# liquibase-rollback-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: liquibase-rollback
  namespace: production
spec:
  backoffLimit: 0
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: liquibase
          image: myregistry/liquibase-migrations:v1.0
          args:
            - rollbackCount
            - "1"  # Rollback last changeset
            - --changelog-file=changelog/db-changelog-master.yaml
            - --url=jdbc:postgresql://postgres-service:5432/appdb
            - --username=$(DB_USERNAME)
            - --password=$(DB_PASSWORD)
          env:
            - name: DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: password
```

## Viewing Migration Status

Create a status checking job:

```yaml
# liquibase-status-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: liquibase-status
  namespace: production
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: liquibase
          image: myregistry/liquibase-migrations:v1.0
          args:
            - status
            - --verbose
            - --changelog-file=changelog/db-changelog-master.yaml
            - --url=jdbc:postgresql://postgres-service:5432/appdb
            - --username=$(DB_USERNAME)
            - --password=$(DB_PASSWORD)
          env:
            - name: DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: password
```

Check the status:

```bash
kubectl apply -f liquibase-status-job.yaml
kubectl logs -f job/liquibase-status -n production
```

## Production Best Practices

Always run migrations before application deployments. Use Helm hooks or init containers to enforce this order. Never allow applications to start if migrations fail.

Test all migrations in non-production environments first. Create identical changelog files across all environments to ensure consistency.

Tag your changelog files with Git commits, allowing you to trace which code version corresponds to each schema version. Include both forward migrations and rollback logic in your changesets.

Use Liquibase preconditions to verify database state before applying changes. This prevents migrations from running in unexpected conditions.

Monitor migration job execution times. Increasing duration might indicate performance issues or the need to break up large changesets.

Liquibase on Kubernetes provides reliable, version-controlled database migrations that integrate seamlessly with modern deployment workflows. By treating schema changes as code, you gain the same benefits of testing, review, and automation that application code enjoys.
