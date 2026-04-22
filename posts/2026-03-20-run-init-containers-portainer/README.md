# How to Run Init Containers Using Portainer - Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Init Container, Kubernetes, DevOps, Service Ordering

Description: Implement init containers in Docker Compose stacks and Kubernetes via Portainer to perform setup tasks like database migrations and config generation before main application containers start.

---

Init containers run and complete before the main application containers start. They're commonly used for database migrations, configuration generation, file permission fixes, and dependency verification.

## Docker Compose Pattern (via Portainer Stacks)

Docker Compose doesn't have a native init container concept, but you can implement the same behavior using `depends_on` with `condition: service_completed_successfully`:

```yaml
# init-container-stack.yml

services:
  # Init container: runs database migrations before the app starts
  db-migrate:
    image: flyway/flyway:10
    command: migrate
    environment:
      - FLYWAY_URL=jdbc:postgresql://postgres:5432/mydb
      - FLYWAY_USER=myapp
      - FLYWAY_PASSWORD=db_password
    volumes:
      - ./migrations:/flyway/sql:ro
    depends_on:
      postgres:
        condition: service_healthy
    # The app will not start until this exits with code 0

  app:
    image: myapp:1.2.3
    ports:
      - "8080:8080"
    depends_on:
      # Wait for the init container to successfully complete
      db-migrate:
        condition: service_completed_successfully
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=myapp
      - POSTGRES_PASSWORD=db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Multiple Init Steps

Chain multiple init steps using sequential dependencies:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=myapp
      - POSTGRES_PASSWORD=db_password

  # Step 1: Wait for database
  db-wait:
    image: postgres:16-alpine
    command: sh -c "until pg_isready -h postgres -U myapp; do sleep 2; done"
    depends_on:
      - postgres

  # Step 2: Run migrations (requires database to be ready)
  db-migrate:
    image: flyway/flyway:10
    command: migrate
    environment:
      - FLYWAY_URL=jdbc:postgresql://postgres:5432/mydb
      - FLYWAY_USER=myapp
      - FLYWAY_PASSWORD=db_password
    volumes:
      - ./migrations:/flyway/sql:ro
    depends_on:
      db-wait:
        condition: service_completed_successfully

  # Step 3: Seed initial data (requires migrations to complete)
  db-seed:
    image: myapp:1.2.3
    command: python manage.py seed_data
    depends_on:
      db-migrate:
        condition: service_completed_successfully

  # Main app (requires all init steps to complete)
  app:
    image: myapp:1.2.3
    depends_on:
      db-seed:
        condition: service_completed_successfully
```

## Kubernetes Init Containers via Portainer

For Kubernetes environments, use native init containers:

```yaml
# k8s-with-init-containers.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      # Init containers run in order and must all succeed before app starts
      initContainers:
        - name: db-migrate
          image: flyway/flyway:10
          command: ["flyway", "migrate"]
          env:
            - name: FLYWAY_URL
              value: "jdbc:postgresql://postgres:5432/mydb"
            - name: FLYWAY_USER
              value: "myapp"
            - name: FLYWAY_PASSWORD
              value: "db_password"

        - name: config-generator
          image: myapp-config-gen:1.0
          command: ["generate-config", "--output=/config/app.json"]
          volumeMounts:
            - name: config-volume
              mountPath: /config

      containers:
        - name: app
          image: myapp:1.2.3
          volumeMounts:
            - name: config-volume
              mountPath: /app/config

      volumes:
        - name: config-volume
          emptyDir: {}
```

Deploy this via Portainer's Kubernetes manifest deployment: **Applications > Create from code > Manifest > Web editor**.

## Summary

Init containers ensure setup tasks complete before your application starts. In Docker Compose via Portainer, use `depends_on` with `service_completed_successfully`. In Kubernetes, use native `initContainers`. Both approaches prevent the common problem of an application starting before its dependencies (like database schemas) are ready.
