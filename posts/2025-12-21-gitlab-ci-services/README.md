# How to Use Services in GitLab CI Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Services, Docker, Testing, CI/CD, Databases

Description: Learn how to use services in GitLab CI jobs to run databases, message queues, and other dependencies during testing. This guide covers service configuration, networking, health checks, and common service patterns.

> Services in GitLab CI allow you to run additional containers alongside your job, providing databases, caches, and other dependencies needed for testing without complex setup scripts.

GitLab CI services are Docker containers that run alongside your job's main container. They are perfect for integration testing when you need a database, cache, message queue, or any other service that your application depends on.

## Understanding Services

When you define a service in a job, GitLab Runner starts that service container and connects it to your job container via a network. The service is accessible by its hostname, which is derived from the image name.

```mermaid
flowchart LR
    subgraph "GitLab Runner"
        A[Job Container] <-->|Network| B[Service: postgres]
        A <-->|Network| C[Service: redis]
        A <-->|Network| D[Service: elasticsearch]
    end
```

## Basic Service Configuration

Add services to a job using the `services` keyword.

```yaml
# .gitlab-ci.yml
stages:
  - test

test:
  stage: test
  image: node:20
  services:
    - postgres:15
    - redis:7
  variables:
    # PostgreSQL configuration
    POSTGRES_DB: test_db
    POSTGRES_USER: test_user
    POSTGRES_PASSWORD: test_password
    # Application configuration
    DATABASE_URL: postgresql://test_user:test_password@postgres:5432/test_db
    REDIS_URL: redis://redis:6379
  script:
    - npm ci
    - npm test
```

## Service Hostnames

The service hostname is derived from the image name. The default hostname removes the registry and replaces special characters with dashes.

```yaml
# Image name to hostname mapping
services:
  - postgres:15                    # hostname: postgres
  - redis:7-alpine                 # hostname: redis
  - mysql:8.0                      # hostname: mysql
  - elasticsearch:8.10.0           # hostname: elasticsearch
  - registry.example.com/myimage   # hostname: registry-example-com-myimage
```

You can also specify a custom alias.

```yaml
services:
  - name: postgres:15
    alias: db
  - name: redis:7
    alias: cache

test:
  script:
    # Access services by alias
    - psql -h db -U postgres -c "SELECT 1"
    - redis-cli -h cache PING
```

## Service Configuration Options

Services support additional configuration options.

```yaml
services:
  - name: postgres:15
    alias: db
    # Pass command to the container
    command: ["postgres", "-c", "max_connections=200"]
    # Environment variables for the service
    variables:
      POSTGRES_DB: myapp_test
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: secret
    # Override entrypoint
    entrypoint: ["docker-entrypoint.sh"]
```

## Waiting for Services to be Ready

Services may take time to start. Use wait scripts or tools to ensure services are ready before running tests.

```yaml
test:
  image: node:20
  services:
    - postgres:15
  variables:
    POSTGRES_DB: test_db
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  before_script:
    # Install PostgreSQL client
    - apt-get update && apt-get install -y postgresql-client
    # Wait for PostgreSQL to be ready
    - |
      until pg_isready -h postgres -U postgres; do
        echo "Waiting for PostgreSQL..."
        sleep 2
      done
    - echo "PostgreSQL is ready"
  script:
    - npm ci
    - npm test
```

## Common Service Patterns

### PostgreSQL

```yaml
test_postgres:
  image: node:20
  services:
    - name: postgres:15
      alias: db
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://test:test@db:5432/test
  before_script:
    - apt-get update && apt-get install -y postgresql-client
    - until pg_isready -h db -U test; do sleep 1; done
  script:
    - npm ci
    - npm run db:migrate
    - npm test
```

### MySQL

```yaml
test_mysql:
  image: node:20
  services:
    - name: mysql:8.0
      alias: db
      command: ["--default-authentication-plugin=mysql_native_password"]
  variables:
    MYSQL_DATABASE: test
    MYSQL_ROOT_PASSWORD: root
    MYSQL_USER: test
    MYSQL_PASSWORD: test
    DATABASE_URL: mysql://test:test@db:3306/test
  before_script:
    - apt-get update && apt-get install -y default-mysql-client
    - until mysqladmin ping -h db --silent; do sleep 1; done
  script:
    - npm ci
    - npm test
```

### MongoDB

```yaml
test_mongodb:
  image: node:20
  services:
    - name: mongo:6
      alias: mongodb
  variables:
    MONGO_INITDB_ROOT_USERNAME: root
    MONGO_INITDB_ROOT_PASSWORD: password
    MONGODB_URL: mongodb://root:password@mongodb:27017
  script:
    - npm ci
    - npm test
```

### Redis

```yaml
test_redis:
  image: node:20
  services:
    - name: redis:7
      alias: cache
  variables:
    REDIS_URL: redis://cache:6379
  before_script:
    - apt-get update && apt-get install -y redis-tools
    - until redis-cli -h cache ping; do sleep 1; done
  script:
    - npm ci
    - npm test
```

### Elasticsearch

```yaml
test_elasticsearch:
  image: node:20
  services:
    - name: elasticsearch:8.10.0
      alias: es
      command: ["bin/elasticsearch", "-Expack.security.enabled=false", "-Ediscovery.type=single-node"]
  variables:
    ELASTICSEARCH_URL: http://es:9200
  before_script:
    - |
      until curl -s http://es:9200/_cluster/health | grep -q '"status":"green\|yellow"'; do
        echo "Waiting for Elasticsearch..."
        sleep 5
      done
  script:
    - npm ci
    - npm test
```

### RabbitMQ

```yaml
test_rabbitmq:
  image: node:20
  services:
    - name: rabbitmq:3-management
      alias: mq
  variables:
    RABBITMQ_DEFAULT_USER: guest
    RABBITMQ_DEFAULT_PASS: guest
    AMQP_URL: amqp://guest:guest@mq:5672
  before_script:
    - apt-get update && apt-get install -y curl
    - |
      until curl -s http://mq:15672/api/overview > /dev/null; do
        echo "Waiting for RabbitMQ..."
        sleep 5
      done
  script:
    - npm ci
    - npm test
```

## Multiple Services

Run multiple services together for complex integration tests.

```yaml
integration_test:
  image: node:20
  services:
    - name: postgres:15
      alias: db
    - name: redis:7
      alias: cache
    - name: elasticsearch:8.10.0
      alias: search
      command: ["bin/elasticsearch", "-Expack.security.enabled=false", "-Ediscovery.type=single-node"]
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://test:test@db:5432/test
    REDIS_URL: redis://cache:6379
    ELASTICSEARCH_URL: http://search:9200
  before_script:
    - apt-get update && apt-get install -y postgresql-client redis-tools curl
    # Wait for all services
    - until pg_isready -h db -U test; do sleep 1; done
    - until redis-cli -h cache ping; do sleep 1; done
    - until curl -s http://search:9200 > /dev/null; do sleep 2; done
    - echo "All services ready"
  script:
    - npm ci
    - npm run db:migrate
    - npm test
```

## Docker-in-Docker as a Service

Use Docker-in-Docker (dind) as a service to build Docker images.

```yaml
build:
  image: docker:24
  services:
    - name: docker:24-dind
      alias: docker
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  script:
    - docker info
    - docker build -t myimage .
```

## Service with Custom Image

Use your own images as services for testing.

```yaml
# Build custom service image first
build_test_service:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE/test-service:latest -f Dockerfile.test-service .
    - docker push $CI_REGISTRY_IMAGE/test-service:latest

# Use custom image as service
test_with_custom_service:
  stage: test
  image: node:20
  services:
    - name: $CI_REGISTRY_IMAGE/test-service:latest
      alias: testservice
  script:
    - npm ci
    - npm test
```

## Service Health Checks Script

Create a reusable health check script for your services.

```yaml
.wait_for_services:
  before_script:
    - |
      wait_for_postgres() {
        echo "Waiting for PostgreSQL..."
        until pg_isready -h $1 -U postgres 2>/dev/null; do sleep 1; done
        echo "PostgreSQL ready"
      }

      wait_for_redis() {
        echo "Waiting for Redis..."
        until redis-cli -h $1 ping 2>/dev/null; do sleep 1; done
        echo "Redis ready"
      }

      wait_for_http() {
        echo "Waiting for $1..."
        until curl -sf $1 > /dev/null 2>&1; do sleep 2; done
        echo "$1 ready"
      }

test:
  extends: .wait_for_services
  services:
    - postgres:15
    - redis:7
  before_script:
    - !reference [.wait_for_services, before_script]
    - apt-get update && apt-get install -y postgresql-client redis-tools curl
    - wait_for_postgres postgres
    - wait_for_redis redis
  script:
    - npm test
```

## Complete Service Testing Pipeline

Here is a complete pipeline with multiple test configurations.

```yaml
stages:
  - build
  - test
  - deploy

variables:
  POSTGRES_DB: test
  POSTGRES_USER: test
  POSTGRES_PASSWORD: test

.test_template:
  stage: test
  image: node:20
  before_script:
    - npm ci

unit_tests:
  extends: .test_template
  script:
    - npm run test:unit

integration_tests:
  extends: .test_template
  services:
    - name: postgres:15
      alias: db
    - name: redis:7
      alias: cache
  variables:
    DATABASE_URL: postgresql://test:test@db:5432/test
    REDIS_URL: redis://cache:6379
  before_script:
    - apt-get update && apt-get install -y postgresql-client redis-tools
    - npm ci
    - until pg_isready -h db -U test; do sleep 1; done
    - until redis-cli -h cache ping; do sleep 1; done
    - npm run db:migrate
  script:
    - npm run test:integration

e2e_tests:
  extends: .test_template
  services:
    - name: postgres:15
      alias: db
    - name: redis:7
      alias: cache
    - name: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
      alias: app
  variables:
    DATABASE_URL: postgresql://test:test@db:5432/test
    REDIS_URL: redis://cache:6379
    APP_URL: http://app:3000
  before_script:
    - npm ci
    - until curl -s http://app:3000/health; do sleep 2; done
  script:
    - npm run test:e2e
  needs:
    - build
```

## Best Practices

Always wait for services to be ready before running tests. Use aliases to make service hostnames predictable and readable. Set appropriate resource limits for services to avoid runner issues. Use service-specific environment variables documented in the image's documentation. Consider using a shared template for common service configurations. Clean up test data between test runs to ensure isolation.

Services transform GitLab CI from a simple script runner into a complete integration testing platform. By running real databases and services alongside your tests, you catch issues that unit tests miss while keeping your pipeline fully automated.
