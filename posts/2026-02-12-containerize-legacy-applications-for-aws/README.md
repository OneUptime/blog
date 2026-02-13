# How to Containerize Legacy Applications for AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Docker, Containers, ECS, Fargate, Legacy, Modernization

Description: Learn how to containerize legacy applications for deployment on AWS using Docker, ECS Fargate, and practical strategies for handling stateful and monolithic apps.

---

Containerizing a legacy application is often the first step toward modernizing it for the cloud. But "just put it in Docker" is advice that glosses over the real challenges: legacy apps have dependencies on specific OS versions, rely on local file systems, expect persistent processes, and sometimes have installation procedures that predate package managers. This guide tackles the practical challenges of containerizing legacy applications for deployment on AWS.

## Should You Containerize?

Not every legacy application should be containerized. Start with this decision framework:

```mermaid
graph TD
    A[Legacy Application] --> B{Runs on Linux or Windows?}
    B -->|Linux| C{Stateless or can be made stateless?}
    B -->|Windows| D{.NET Framework or Core?}
    C -->|Stateless| E[Good container candidate]
    C -->|Stateful with local files| F[Needs refactoring first]
    D -->|.NET Core| G[Good container candidate]
    D -->|.NET Framework| H[Consider Windows containers or replatform]
    F --> I{Worth the effort?}
    I -->|Yes| J[Externalize state, then containerize]
    I -->|No| K[Rehost to EC2 instead]
```

Applications that are good candidates:
- Stateless web applications and APIs
- Background workers that read from queues
- Microservices (even if they are part of a monolith deployment)

Applications that need work first:
- Apps that write to local disk (need to use S3 or EFS instead)
- Apps with hardcoded paths or IP addresses
- Apps that depend on specific host configurations

## Step 1: Analyze the Application

Before writing a Dockerfile, understand what the application needs:

```bash
# On the current server, document the runtime environment
# Operating system and version
cat /etc/os-release

# Running processes related to the application
ps aux | grep your-app

# Listening ports
ss -tlnp

# Installed packages
dpkg -l > installed-packages.txt  # Debian/Ubuntu
rpm -qa > installed-packages.txt  # RHEL/CentOS

# Environment variables the app uses
env | grep -i "app\|db\|redis\|api\|secret" > env-vars.txt

# File system dependencies
lsof -p $(pgrep your-app) | grep -E "REG|DIR" > file-dependencies.txt

# Network connections
ss -tnp | grep $(pgrep your-app) > network-connections.txt
```

## Step 2: Handle Dependencies

Legacy applications often depend on specific library versions, system packages, or configuration files.

### Base Image Selection

Choose a base image that matches the application's OS requirements:

```dockerfile
# For applications requiring Ubuntu 18.04 specifically
FROM ubuntu:18.04

# For applications requiring specific CentOS/RHEL versions
FROM centos:7

# For Java applications with a specific JDK
FROM eclipse-temurin:11-jre

# For Python 2 applications (yes, they still exist)
FROM python:2.7-slim
```

### Installing System Dependencies

```dockerfile
# Install system packages the legacy app requires
FROM ubuntu:20.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install all system dependencies
RUN apt-get update && apt-get install -y \
    libssl1.1 \
    libpq5 \
    libxml2 \
    imagemagick \
    ghostscript \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

# If the app needs specific library versions
RUN wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.0.0_1.0.2g-1ubuntu4_amd64.deb \
    && dpkg -i libssl1.0.0_1.0.2g-1ubuntu4_amd64.deb \
    && rm libssl1.0.0_1.0.2g-1ubuntu4_amd64.deb
```

## Step 3: Externalize State

Legacy apps frequently write to local files. These need to be externalized for containers.

### File System Access

Map local file paths to EFS or S3:

```dockerfile
# Create mount points for external storage
RUN mkdir -p /app/data /app/uploads /app/logs

# These will be mounted as EFS volumes or S3 via s3fs
VOLUME ["/app/data", "/app/uploads", "/app/logs"]
```

In your ECS task definition:

```json
{
  "containerDefinitions": [{
    "name": "legacy-app",
    "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/legacy-app:latest",
    "mountPoints": [
      {
        "sourceVolume": "app-data",
        "containerPath": "/app/data"
      }
    ]
  }],
  "volumes": [
    {
      "name": "app-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-abc123",
        "rootDirectory": "/legacy-app-data",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

### Session State

If the application stores sessions in memory or on disk, move them to ElastiCache Redis:

```python
# Before: Local file-based sessions
# session.save_handler = files
# session.save_path = /tmp/sessions

# After: Redis-based sessions (update application config)
# session.save_handler = redis
# session.save_path = tcp://redis-cluster.abc123.cache.amazonaws.com:6379
```

## Step 4: Write the Dockerfile

Here is a complete example for a legacy PHP application:

```dockerfile
# Dockerfile for a legacy PHP application
FROM php:7.4-apache

# Install PHP extensions the app needs
RUN docker-php-ext-install \
    pdo_mysql \
    mysqli \
    gd \
    zip \
    opcache

# Install additional system dependencies
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libzip-dev \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install gd \
    && rm -rf /var/lib/apt/lists/*

# Copy Apache configuration
COPY apache-vhost.conf /etc/apache2/sites-available/000-default.conf
RUN a2enmod rewrite headers

# Copy application code
COPY --chown=www-data:www-data . /var/www/html/

# Set runtime configuration from environment variables
RUN echo 'PassEnv DATABASE_URL REDIS_URL APP_SECRET' >> /etc/apache2/conf-enabled/env.conf

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

EXPOSE 80
CMD ["apache2-foreground"]
```

For a legacy Java application:

```dockerfile
# Dockerfile for a legacy Java WAR application
FROM tomcat:9-jdk11

# Remove default applications
RUN rm -rf /usr/local/tomcat/webapps/*

# Copy the WAR file
COPY target/myapp.war /usr/local/tomcat/webapps/ROOT.war

# Copy custom Tomcat configuration
COPY server.xml /usr/local/tomcat/conf/server.xml
COPY context.xml /usr/local/tomcat/conf/context.xml

# Add custom JDBC drivers
COPY lib/mysql-connector-java-8.0.28.jar /usr/local/tomcat/lib/

# JVM tuning - let the container runtime control memory
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080
CMD ["catalina.sh", "run"]
```

## Step 5: Handle Configuration

Legacy applications often use configuration files instead of environment variables. Bridge the gap:

```dockerfile
# Use envsubst to template configuration files at startup
COPY config.template /app/config.template

# Create an entrypoint script that generates config from env vars
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["start-app"]
```

The entrypoint script:

```bash
#!/bin/bash
# entrypoint.sh - Generate config from environment variables

# Replace placeholders in config template
envsubst < /app/config.template > /app/config.properties

# Handle database connection string
cat > /app/database.properties << EOF
db.host=${DATABASE_HOST:-localhost}
db.port=${DATABASE_PORT:-3306}
db.name=${DATABASE_NAME:-myapp}
db.user=${DATABASE_USER:-root}
db.password=${DATABASE_PASSWORD}
EOF

# Execute the main command
exec "$@"
```

## Step 6: Deploy to ECS Fargate

```python
# Create ECS task definition for the containerized legacy app
import boto3
import json

ecs = boto3.client('ecs')

ecs.register_task_definition(
    family='legacy-app',
    networkMode='awsvpc',
    requiresCompatibilities=['FARGATE'],
    cpu='1024',
    memory='2048',
    executionRoleArn='arn:aws:iam::123456789:role/ecsTaskExecutionRole',
    taskRoleArn='arn:aws:iam::123456789:role/ecsTaskRole',
    containerDefinitions=[
        {
            'name': 'legacy-app',
            'image': '123456789.dkr.ecr.us-east-1.amazonaws.com/legacy-app:latest',
            'portMappings': [{'containerPort': 80, 'protocol': 'tcp'}],
            'secrets': [
                {
                    'name': 'DATABASE_URL',
                    'valueFrom': 'arn:aws:secretsmanager:us-east-1:123456789:secret:db-url'
                },
                {
                    'name': 'DATABASE_PASSWORD',
                    'valueFrom': 'arn:aws:secretsmanager:us-east-1:123456789:secret:db-password'
                }
            ],
            'environment': [
                {'name': 'APP_ENV', 'value': 'production'},
                {'name': 'DATABASE_HOST', 'value': 'mydb.abc123.us-east-1.rds.amazonaws.com'}
            ],
            'logConfiguration': {
                'logDriver': 'awslogs',
                'options': {
                    'awslogs-group': '/ecs/legacy-app',
                    'awslogs-region': 'us-east-1',
                    'awslogs-stream-prefix': 'app'
                }
            },
            'healthCheck': {
                'command': ['CMD-SHELL', 'curl -f http://localhost/health || exit 1'],
                'interval': 30,
                'timeout': 5,
                'retries': 3
            }
        }
    ],
    volumes=[
        {
            'name': 'app-data',
            'efsVolumeConfiguration': {
                'fileSystemId': 'fs-abc123',
                'transitEncryption': 'ENABLED'
            }
        }
    ]
)
```

## Step 7: Testing

Test the containerized application thoroughly:

```bash
# Build the image
docker build -t legacy-app:test .

# Run locally with environment variables matching production
docker run -p 8080:80 \
  -e DATABASE_URL="mysql://user:pass@host/db" \
  -e REDIS_URL="redis://localhost:6379" \
  -e APP_SECRET="test-secret" \
  legacy-app:test

# Run integration tests
curl http://localhost:8080/health
curl http://localhost:8080/api/status
```

## Common Pitfalls

1. **Missing dependencies**: Use multi-stage builds and test thoroughly
2. **File permission issues**: Run as non-root but ensure the app user has correct permissions
3. **Timezone issues**: Set the timezone explicitly in the Dockerfile
4. **DNS resolution changes**: Container DNS works differently than bare metal
5. **Resource limits**: Containers have memory limits; ensure the app respects them

For monitoring your containerized legacy applications, [OneUptime](https://oneuptime.com/blog/post/2026-02-12-refactor-applications-to-serverless-on-aws/view) provides container-aware monitoring that tracks both application health and infrastructure metrics.

## Wrapping Up

Containerizing legacy applications is rarely a clean lift into Docker. The real work is understanding the application's dependencies, externalizing state, bridging configuration approaches, and testing thoroughly. Start with a thorough analysis of the running application, address state management before writing the Dockerfile, and test in an environment that mirrors production. Once containerized, your legacy application gains the portability and scalability that ECS Fargate provides, and you have a foundation for further modernization.
