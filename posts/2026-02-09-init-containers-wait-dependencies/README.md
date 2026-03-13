# How to Use Init Containers to Wait for Service Dependencies Before App Startup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Init Containers, Dependencies, Service Discovery, Container Orchestration

Description: Master the use of Kubernetes init containers to ensure service dependencies are ready before your application starts, preventing startup failures and race conditions in distributed systems.

---

Applications rarely run in isolation. They depend on databases, caches, message queues, and other services. When you deploy to Kubernetes, these dependencies might not be ready when your application starts, leading to startup failures and crash loops.

Init containers solve this problem by running before your main application containers. They can wait for dependencies, verify connectivity, and ensure prerequisites are met before your application even attempts to start.

## Understanding Init Container Execution

Init containers run sequentially in the order they're defined. Each init container must complete successfully before the next one starts. Only after all init containers finish does Kubernetes start your main application containers.

This sequential execution makes init containers perfect for dependency checking. Your first init container might wait for a database, the second for a cache, and the third for an external API. Your application only starts when everything is ready.

If an init container fails, Kubernetes restarts the pod, running the init containers again. The main containers never start until all init containers succeed.

## Basic Dependency Waiting with Init Containers

Let's start with a simple example that waits for a database:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  initContainers:
  # Wait for database to be ready
  - name: wait-for-db
    image: busybox:1.36
    command:
    - sh
    - -c
    - |
      echo "Waiting for database..."
      until nc -z postgres-service 5432; do
        echo "Database not ready, waiting..."
        sleep 2
      done
      echo "Database is ready!"

  containers:
  - name: app
    image: myapp:latest
    ports:
    - containerPort: 8080
    env:
    - name: DATABASE_URL
      value: "postgres://postgres-service:5432/mydb"
```

This init container uses netcat (`nc`) to check if the database port is accepting connections. The main app only starts after the database is reachable.

## Advanced Multi-Service Dependency Checking

Real applications often depend on multiple services. Here's a more sophisticated approach:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-application
  template:
    metadata:
      labels:
        app: web-application
    spec:
      initContainers:
      # Check database connectivity
      - name: wait-for-postgres
        image: postgres:16-alpine
        command:
        - sh
        - -c
        - |
          echo "Checking PostgreSQL connection..."
          until pg_isready -h postgres-service -p 5432 -U postgres; do
            echo "PostgreSQL not ready - waiting..."
            sleep 3
          done
          echo "PostgreSQL is ready!"
        env:
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password

      # Check Redis connectivity
      - name: wait-for-redis
        image: redis:7-alpine
        command:
        - sh
        - -c
        - |
          echo "Checking Redis connection..."
          until redis-cli -h redis-service -p 6379 ping | grep -q PONG; do
            echo "Redis not ready - waiting..."
            sleep 2
          done
          echo "Redis is ready!"

      # Check message queue
      - name: wait-for-rabbitmq
        image: curlimages/curl:8.5.0
        command:
        - sh
        - -c
        - |
          echo "Checking RabbitMQ connection..."
          until curl -f -s http://rabbitmq-service:15672/api/healthchecks/node; do
            echo "RabbitMQ not ready - waiting..."
            sleep 3
          done
          echo "RabbitMQ is ready!"

      # Check external API availability
      - name: wait-for-external-api
        image: curlimages/curl:8.5.0
        command:
        - sh
        - -c
        - |
          echo "Checking external API..."
          until curl -f -s https://api.example.com/health; do
            echo "External API not ready - waiting..."
            sleep 5
          done
          echo "External API is ready!"

      containers:
      - name: app
        image: web-application:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          value: "postgres://postgres-service:5432/mydb"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: RABBITMQ_URL
          value: "amqp://rabbitmq-service:5672"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Custom Dependency Checker Script

For complex dependency checking logic, create a custom script:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dependency-checker
  namespace: production
data:
  check-dependencies.sh: |
    #!/bin/sh
    set -e

    # Colors for output
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m' # No Color

    log_info() {
        echo "${GREEN}[INFO]${NC} $1"
    }

    log_warn() {
        echo "${YELLOW}[WARN]${NC} $1"
    }

    log_error() {
        echo "${RED}[ERROR]${NC} $1"
    }

    # Check database with retry logic
    check_database() {
        local host=$1
        local port=$2
        local max_attempts=${3:-30}
        local attempt=0

        log_info "Checking database at $host:$port..."

        while [ $attempt -lt $max_attempts ]; do
            if pg_isready -h "$host" -p "$port" > /dev/null 2>&1; then
                log_info "Database is ready!"
                return 0
            fi

            attempt=$((attempt + 1))
            log_warn "Database not ready (attempt $attempt/$max_attempts)"
            sleep 2
        done

        log_error "Database failed to become ready after $max_attempts attempts"
        return 1
    }

    # Check HTTP endpoint with retry
    check_http_endpoint() {
        local url=$1
        local max_attempts=${2:-30}
        local attempt=0

        log_info "Checking HTTP endpoint $url..."

        while [ $attempt -lt $max_attempts ]; do
            if curl -f -s --max-time 5 "$url" > /dev/null 2>&1; then
                log_info "HTTP endpoint is ready!"
                return 0
            fi

            attempt=$((attempt + 1))
            log_warn "HTTP endpoint not ready (attempt $attempt/$max_attempts)"
            sleep 2
        done

        log_error "HTTP endpoint failed to become ready"
        return 1
    }

    # Check TCP port
    check_tcp_port() {
        local host=$1
        local port=$2
        local max_attempts=${3:-30}
        local attempt=0

        log_info "Checking TCP port $host:$port..."

        while [ $attempt -lt $max_attempts ]; do
            if nc -z -w 5 "$host" "$port" > /dev/null 2>&1; then
                log_info "TCP port is ready!"
                return 0
            fi

            attempt=$((attempt + 1))
            log_warn "TCP port not ready (attempt $attempt/$max_attempts)"
            sleep 2
        done

        log_error "TCP port failed to become ready"
        return 1
    }

    # Main execution
    log_info "Starting dependency checks..."

    # Check all required services
    check_database "${DB_HOST}" "${DB_PORT}" || exit 1
    check_tcp_port "${REDIS_HOST}" "${REDIS_PORT}" || exit 1
    check_tcp_port "${RABBITMQ_HOST}" "${RABBITMQ_PORT}" || exit 1
    check_http_endpoint "${EXTERNAL_API_URL}/health" || exit 1

    log_info "All dependencies are ready!"
    exit 0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-with-checker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      initContainers:
      - name: check-dependencies
        image: postgres:16-alpine  # Has pg_isready, curl, nc
        command: ["/bin/sh", "/scripts/check-dependencies.sh"]
        env:
        - name: DB_HOST
          value: "postgres-service"
        - name: DB_PORT
          value: "5432"
        - name: REDIS_HOST
          value: "redis-service"
        - name: REDIS_PORT
          value: "6379"
        - name: RABBITMQ_HOST
          value: "rabbitmq-service"
        - name: RABBITMQ_PORT
          value: "5672"
        - name: EXTERNAL_API_URL
          value: "https://api.example.com"
        volumeMounts:
        - name: scripts
          mountPath: /scripts

      containers:
      - name: app
        image: web-app:latest
        ports:
        - containerPort: 8080

      volumes:
      - name: scripts
        configMap:
          name: dependency-checker
          defaultMode: 0755
```

## Go-Based Dependency Checker

For more complex logic, create a dedicated Go binary:

```go
// dependency-checker/main.go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "net"
    "net/http"
    "os"
    "time"

    _ "github.com/lib/pq"
    "github.com/go-redis/redis/v8"
)

type DependencyChecker struct {
    maxAttempts int
    retryDelay  time.Duration
}

func NewDependencyChecker() *DependencyChecker {
    return &DependencyChecker{
        maxAttempts: 30,
        retryDelay:  2 * time.Second,
    }
}

func (dc *DependencyChecker) CheckDatabase(host, port, user, password, dbname string) error {
    connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        host, port, user, password, dbname)

    fmt.Printf("Checking database connection to %s:%s...\n", host, port)

    for attempt := 1; attempt <= dc.maxAttempts; attempt++ {
        db, err := sql.Open("postgres", connStr)
        if err == nil {
            defer db.Close()

            ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
            defer cancel()

            if err := db.PingContext(ctx); err == nil {
                fmt.Println("Database is ready!")
                return nil
            }
        }

        fmt.Printf("Database not ready (attempt %d/%d): %v\n", attempt, dc.maxAttempts, err)
        if attempt < dc.maxAttempts {
            time.Sleep(dc.retryDelay)
        }
    }

    return fmt.Errorf("database failed to become ready after %d attempts", dc.maxAttempts)
}

func (dc *DependencyChecker) CheckRedis(host, port string) error {
    addr := fmt.Sprintf("%s:%s", host, port)
    fmt.Printf("Checking Redis connection to %s...\n", addr)

    client := redis.NewClient(&redis.Options{
        Addr: addr,
    })
    defer client.Close()

    for attempt := 1; attempt <= dc.maxAttempts; attempt++ {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        _, err := client.Ping(ctx).Result()
        cancel()

        if err == nil {
            fmt.Println("Redis is ready!")
            return nil
        }

        fmt.Printf("Redis not ready (attempt %d/%d): %v\n", attempt, dc.maxAttempts, err)
        if attempt < dc.maxAttempts {
            time.Sleep(dc.retryDelay)
        }
    }

    return fmt.Errorf("Redis failed to become ready")
}

func (dc *DependencyChecker) CheckTCPPort(host, port string) error {
    addr := fmt.Sprintf("%s:%s", host, port)
    fmt.Printf("Checking TCP port %s...\n", addr)

    for attempt := 1; attempt <= dc.maxAttempts; attempt++ {
        conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
        if err == nil {
            conn.Close()
            fmt.Printf("TCP port %s is ready!\n", addr)
            return nil
        }

        fmt.Printf("TCP port not ready (attempt %d/%d): %v\n", attempt, dc.maxAttempts, err)
        if attempt < dc.maxAttempts {
            time.Sleep(dc.retryDelay)
        }
    }

    return fmt.Errorf("TCP port failed to become ready")
}

func (dc *DependencyChecker) CheckHTTPEndpoint(url string) error {
    fmt.Printf("Checking HTTP endpoint %s...\n", url)

    client := &http.Client{
        Timeout: 5 * time.Second,
    }

    for attempt := 1; attempt <= dc.maxAttempts; attempt++ {
        resp, err := client.Get(url)
        if err == nil && resp.StatusCode == 200 {
            resp.Body.Close()
            fmt.Println("HTTP endpoint is ready!")
            return nil
        }

        if resp != nil {
            resp.Body.Close()
        }

        fmt.Printf("HTTP endpoint not ready (attempt %d/%d)\n", attempt, dc.maxAttempts)
        if attempt < dc.maxAttempts {
            time.Sleep(dc.retryDelay)
        }
    }

    return fmt.Errorf("HTTP endpoint failed to become ready")
}

func main() {
    checker := NewDependencyChecker()

    // Check database
    if err := checker.CheckDatabase(
        getEnv("DB_HOST", "postgres"),
        getEnv("DB_PORT", "5432"),
        getEnv("DB_USER", "postgres"),
        getEnv("DB_PASSWORD", ""),
        getEnv("DB_NAME", "postgres"),
    ); err != nil {
        fmt.Fprintf(os.Stderr, "Database check failed: %v\n", err)
        os.Exit(1)
    }

    // Check Redis
    if err := checker.CheckRedis(
        getEnv("REDIS_HOST", "redis"),
        getEnv("REDIS_PORT", "6379"),
    ); err != nil {
        fmt.Fprintf(os.Stderr, "Redis check failed: %v\n", err)
        os.Exit(1)
    }

    // Check RabbitMQ
    if err := checker.CheckTCPPort(
        getEnv("RABBITMQ_HOST", "rabbitmq"),
        getEnv("RABBITMQ_PORT", "5672"),
    ); err != nil {
        fmt.Fprintf(os.Stderr, "RabbitMQ check failed: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("All dependencies are ready!")
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

Build and use this checker:

```dockerfile
# Dockerfile for dependency-checker
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o dependency-checker .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /build/dependency-checker /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/dependency-checker"]
```

Use in your deployment:

```yaml
initContainers:
- name: wait-for-dependencies
  image: myregistry/dependency-checker:latest
  env:
  - name: DB_HOST
    value: "postgres-service"
  - name: DB_PORT
    value: "5432"
  - name: DB_USER
    value: "postgres"
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres-credentials
        key: password
  - name: DB_NAME
    value: "myapp"
  - name: REDIS_HOST
    value: "redis-service"
  - name: REDIS_PORT
    value: "6379"
  - name: RABBITMQ_HOST
    value: "rabbitmq-service"
  - name: RABBITMQ_PORT
    value: "5672"
```

## Timeout and Failure Handling

Configure appropriate timeouts for init containers:

```yaml
spec:
  initContainers:
  - name: wait-for-db
    image: busybox:1.36
    command: ["/bin/sh", "-c"]
    args:
    - |
      timeout=300  # 5 minutes
      elapsed=0

      while [ $elapsed -lt $timeout ]; do
        if nc -z postgres-service 5432; then
          echo "Database is ready!"
          exit 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
      done

      echo "Timeout waiting for database"
      exit 1
```

Init containers provide a robust mechanism for ensuring service dependencies are ready before your application starts. By waiting for dependencies explicitly, you eliminate race conditions and improve the reliability of your Kubernetes deployments.
