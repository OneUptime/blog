# How to Set Up a Java/Spring Boot Development Environment with Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Java, Spring Boot, Development, Maven, Gradle

Description: Build a complete Java Spring Boot development environment with hot-reload, remote debugging, and supporting services using Docker and Portainer.

## Introduction

Containerized Java development eliminates the "works on my machine" problem and ensures all developers use the same JDK version and tools. This guide covers building a Spring Boot development environment with automatic restarts via Spring DevTools after classpath recompilation, remote debugging, and a full supporting services stack managed through Portainer. It assumes your application already includes the Spring Boot dependencies required for DevTools, Actuator, PostgreSQL, and Redis.

## Step 1: Create the Development Dockerfile

```dockerfile
# Dockerfile.dev - Java Spring Boot development image

FROM eclipse-temurin:21-jdk-alpine

# Install development tools
RUN apk add --no-cache \
    git \
    curl \
    bash \
    maven \
    unzip

# Install Gradle
RUN curl -L https://services.gradle.org/distributions/gradle-8.5-bin.zip -o /tmp/gradle.zip \
    && unzip /tmp/gradle.zip -d /opt \
    && ln -s /opt/gradle-8.5/bin/gradle /usr/local/bin/gradle \
    && rm /tmp/gradle.zip

# Set working directory
WORKDIR /app

# Copy build files for dependency caching
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# Pre-download dependencies (Docker layer caching optimization)
RUN ./mvnw dependency:go-offline -q

# Copy source code
COPY src ./src

# Expose ports
EXPOSE 8080   # Application
EXPOSE 5005   # JDWP remote debugger
```

Build the development image before deploying the stack in Portainer: `docker build -f Dockerfile.dev -t spring-app-dev:latest .`

## Step 2: Deploy Spring Boot Stack in Portainer

In Portainer, the relative bind mounts shown below require a Git-based stack deployment with relative path support enabled in Business Edition; otherwise replace them with absolute host paths. If Portainer targets a remote Docker environment, push the `spring-app-dev:latest` image to a registry that the environment can pull from.

```yaml
# docker-compose.yml - Spring Boot Development Stack
version: "3.8"

networks:
  java_dev:
    driver: bridge

volumes:
  maven_repo:
  postgres_data:
  redis_data:

services:
  # Spring Boot application
  app:
    image: spring-app-dev:latest
    container_name: spring_app
    restart: unless-stopped
    ports:
      - "8080:8080"   # Application
      - "5005:5005"   # Remote debugger
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/devdb
      - SPRING_DATASOURCE_USERNAME=devuser
      - SPRING_DATASOURCE_PASSWORD=devpassword
      - SPRING_DATA_REDIS_HOST=redis
      - SPRING_DATA_REDIS_PORT=6379
    volumes:
      # Mount source code; DevTools restarts after recompilation updates the classpath
      - ./src:/app/src
      # Cache Maven repository
      - maven_repo:/root/.m2
    # Run with Maven; DevTools restarts after classpath recompilation
    command: ./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 -Xmx512m -Dspring.devtools.restart.enabled=true"
    networks:
      - java_dev
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # PostgreSQL database
  postgres:
    image: postgres:15-alpine
    container_name: java_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=devdb
      - POSTGRES_USER=devuser
      - POSTGRES_PASSWORD=devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devuser -d devdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - java_dev

  # Redis for caching
  redis:
    image: redis:7-alpine
    container_name: java_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - java_dev

  # Kafka for event streaming (optional)
  kafka:
    image: confluentinc/cp-server:8.2.0
    container_name: java_kafka
    ports:
      - "9092:9092"
    environment:
      - KAFKA_NODE_ID=1
      - KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      - KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1
      - KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0
      - KAFKA_CONFLUENT_LICENSE_TOPIC_REPLICATION_FACTOR=1
      - KAFKA_CONFLUENT_BALANCER_TOPIC_REPLICATION_FACTOR=1
      - KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1
      - KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1
      - KAFKA_PROCESS_ROLES=broker,controller
      - KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka:29093
      - KAFKA_LISTENERS=PLAINTEXT://:29092,CONTROLLER://:29093,PLAINTEXT_HOST://0.0.0.0:9092
      - KAFKA_INTER_BROKER_LISTENER_NAME=PLAINTEXT
      - KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_LOG_DIRS=/tmp/kraft-combined-logs
      - CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk
      - CONFLUENT_METRICS_ENABLE=false
      - CONFLUENT_SUPPORT_CUSTOMER_ID=anonymous
    networks:
      - java_dev

  # Adminer for database management
  adminer:
    image: adminer:latest
    container_name: java_adminer
    restart: unless-stopped
    ports:
      - "8081:8080"
    networks:
      - java_dev
```

## Step 3: Spring Boot Application Configuration

```yaml
# src/main/resources/application-dev.yml
spring:
  # Database
  datasource:
    url: jdbc:postgresql://postgres:5432/devdb
    username: devuser
    password: devpassword
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5

  # JPA
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.PostgreSQLDialect

  # Redis
  data:
    redis:
      host: redis
      port: 6379
      timeout: 2000ms

  # DevTools - automatic restart after recompilation
  devtools:
    restart:
      enabled: true
      poll-interval: 1s
      quiet-period: 400ms

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,loggers,env
  endpoint:
    health:
      show-details: always

# Logging
logging:
  level:
    root: INFO
    com.yourapp: DEBUG
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG
```

## Step 4: Configure VS Code/IntelliJ Remote Debug

```json
// VS Code .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Debug Spring Boot (Docker)",
      "request": "attach",
      "hostName": "localhost",
      "port": 5005
    }
  ]
}
```

For IntelliJ IDEA:
1. Go to **Run** > **Edit Configurations**
2. Click **+** > **Remote JVM Debug**
3. Set host to `localhost`, port to `5005`
4. Click **Debug** to connect

## Step 5: Build and Test Commands

```bash
# Run tests in container
docker exec spring_app ./mvnw test

# Run specific test class
docker exec spring_app ./mvnw test -Dtest=UserServiceTest

# Build JAR
docker exec spring_app ./mvnw package -DskipTests

# Run database migrations with Flyway, if configured
docker exec spring_app ./mvnw flyway:migrate

# Check application health
curl http://localhost:8080/actuator/health
```

## Step 6: Multi-Stage Production Dockerfile

```dockerfile
# Dockerfile - Production build
# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN ./mvnw dependency:go-offline -q

COPY src ./src
RUN ./mvnw package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy built JAR
COPY --from=builder /app/target/*.jar app.jar

# Run as non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Conclusion

Your Java Spring Boot development environment is now containerized and managed through Portainer. Spring DevTools provides automatic restarts after recompilation for rapid development, the JDWP debugger allows debugging from IntelliJ or VS Code, and all supporting services are pre-configured. Portainer gives you visibility into all services, easy log access, and one-click restarts when needed. When you're ready to deploy to production, the multi-stage Dockerfile produces a lean, optimized image.
