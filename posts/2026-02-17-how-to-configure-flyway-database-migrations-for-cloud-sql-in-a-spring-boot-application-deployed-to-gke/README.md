# How to Configure Flyway Database Migrations for Cloud SQL in a Spring Boot Application Deployed to GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Flyway, Spring Boot, GKE, Database Migration, Java

Description: Configure Flyway database migrations for Cloud SQL in a Spring Boot application on GKE with Cloud SQL Auth Proxy, migration strategies, and rollback patterns.

---

Database migrations are one of those things that you need to get right from the start. Running schema changes manually against a production Cloud SQL instance is a recipe for trouble. Flyway gives you version-controlled, repeatable migrations that run automatically when your application starts. But when your Spring Boot app runs on GKE and connects to Cloud SQL, there are some specific configuration details you need to handle.

In this post, I will walk through setting up Flyway for Cloud SQL in a GKE-deployed Spring Boot application.

## Project Dependencies

```xml
<!-- Flyway for database migrations -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>

<!-- Flyway MySQL support (use flyway-database-postgresql for PostgreSQL) -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-mysql</artifactId>
</dependency>

<!-- Spring Boot JDBC for datasource configuration -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>

<!-- MySQL driver -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Cloud SQL Socket Factory for direct connection -->
<dependency>
    <groupId>com.google.cloud.sql</groupId>
    <artifactId>mysql-socket-factory-connector-j-8</artifactId>
    <version>1.15.2</version>
</dependency>
```

## Migration File Structure

Flyway migration files go in `src/main/resources/db/migration/`. The naming convention is important:

```
src/main/resources/db/migration/
    V1__create_users_table.sql
    V2__create_orders_table.sql
    V3__add_email_index_to_users.sql
    V4__add_status_column_to_orders.sql
    R__refresh_product_view.sql
```

Files prefixed with `V` are versioned migrations that run once. Files prefixed with `R` are repeatable migrations that run whenever their checksum changes.

## Writing Migrations

Here are some example migration files:

```sql
-- V1__create_users_table.sql
-- Creates the initial users table
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```sql
-- V2__create_orders_table.sql
-- Creates the orders table with a foreign key to users
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

```sql
-- V3__add_email_index_to_users.sql
-- Adds a composite index for search queries
ALTER TABLE users ADD INDEX idx_users_display_email (display_name, email);
```

## Flyway Configuration

Configure Flyway in `application.properties`:

```properties
# Datasource configuration for Cloud SQL via socket factory
spring.datasource.url=jdbc:mysql:///mydb?cloudSqlInstance=my-project:us-central1:my-instance&socketFactory=com.google.cloud.sql.mysql.SocketFactory
spring.datasource.username=app_user
spring.datasource.password=${DB_PASSWORD}

# Flyway configuration
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-on-migrate=true
spring.flyway.baseline-version=0

# Validate that applied migrations match the local files
spring.flyway.validate-on-migrate=true

# Table name for Flyway's metadata
spring.flyway.table=flyway_schema_history

# Connect timeout for migration execution
spring.flyway.connect-retries=5
spring.flyway.connect-retries-interval=10
```

## GKE Deployment with Cloud SQL Auth Proxy

On GKE, you typically use the Cloud SQL Auth Proxy as a sidecar container. This establishes a secure tunnel to Cloud SQL.

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app-sa
      containers:
        # Application container
        - name: app
          image: gcr.io/my-project/my-app:latest
          ports:
            - containerPort: 8080
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
            # Point to the Cloud SQL Proxy sidecar
            - name: SPRING_DATASOURCE_URL
              value: "jdbc:mysql://127.0.0.1:3306/mydb"
            - name: SPRING_DATASOURCE_USERNAME
              value: "app_user"
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"

        # Cloud SQL Auth Proxy sidecar
        - name: cloud-sql-proxy
          image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
          args:
            - "--structured-logs"
            - "--port=3306"
            - "my-project:us-central1:my-instance"
          securityContext:
            runAsNonRoot: true
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
```

When using the Cloud SQL Auth Proxy sidecar, update the datasource URL to connect through localhost:

```properties
# When using Cloud SQL Auth Proxy sidecar
spring.datasource.url=jdbc:mysql://127.0.0.1:3306/mydb
spring.datasource.username=app_user
spring.datasource.password=${DB_PASSWORD}
```

## Handling Migrations with Multiple Replicas

When you have multiple pods starting simultaneously, multiple Flyway instances might try to run migrations at the same time. Flyway handles this with a database lock, but you should still be aware of it.

For cleaner deployments, run migrations as a separate Kubernetes Job before deploying the application:

```yaml
# migration-job.yaml - runs migrations before the app deployment
apiVersion: batch/v1
kind: Job
metadata:
  name: flyway-migrate
spec:
  template:
    spec:
      serviceAccountName: my-app-sa
      restartPolicy: Never
      containers:
        - name: migrate
          image: gcr.io/my-project/my-app:latest
          command: ["java", "-jar", "app.jar", "--spring.main.web-application-type=none"]
          env:
            - name: SPRING_DATASOURCE_URL
              value: "jdbc:mysql://127.0.0.1:3306/mydb"
            - name: SPRING_DATASOURCE_USERNAME
              value: "app_user"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
            # Only run migrations, then exit
            - name: SPRING_FLYWAY_ENABLED
              value: "true"

        - name: cloud-sql-proxy
          image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
          args:
            - "--port=3306"
            - "my-project:us-central1:my-instance"
  backoffLimit: 3
```

Then in your deployment, disable Flyway so the application pods do not run migrations:

```properties
# Disable Flyway in the main application pods
spring.flyway.enabled=false
```

## Environment-Specific Configuration

Use Spring profiles for different environments:

```properties
# application-dev.properties
spring.flyway.clean-disabled=false
spring.flyway.baseline-on-migrate=true

# application-prod.properties
spring.flyway.clean-disabled=true
spring.flyway.baseline-on-migrate=false
spring.flyway.validate-on-migrate=true
```

Never enable `clean-disabled=false` in production. The `clean` operation drops all objects in the schema.

## Java-Based Migrations

For complex migrations that cannot be expressed in SQL, use Java-based migrations:

```java
// V5__populate_default_categories.java
// Java-based migration for complex data operations
public class V5__populate_default_categories extends BaseJavaMigration {

    @Override
    public void migrate(Context context) throws Exception {
        try (Statement stmt = context.getConnection().createStatement()) {
            String[] categories = {"Electronics", "Clothing", "Books", "Home", "Sports"};

            for (String category : categories) {
                stmt.execute(String.format(
                        "INSERT INTO categories (name, slug) VALUES ('%s', '%s')",
                        category, category.toLowerCase()));
            }
        }
    }
}
```

## Wrapping Up

Flyway with Spring Boot on GKE and Cloud SQL gives you automated, version-controlled database migrations. The main decisions are whether to use the Cloud SQL Socket Factory or the Auth Proxy sidecar for connectivity, and whether to run migrations as part of the application startup or as a separate Kubernetes Job. For production deployments with multiple replicas, running migrations as a separate Job before the application rollout is the safer approach. Keep your migrations small, test them in a staging environment that mirrors production, and never use destructive operations like `clean` in production.
