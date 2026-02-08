# How to Set Up a Spring Boot + MySQL + Redis Stack with Docker Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Spring Boot, MySQL, Redis, Java, Microservices, Backend

Description: A complete guide to containerizing a Spring Boot application with MySQL and Redis using Docker Compose for local development and production.

---

Running a Spring Boot application alongside MySQL and Redis on your local machine can quickly become a headache. Different team members end up with different versions of MySQL, Redis configurations drift, and onboarding new developers takes half a day just setting up dependencies. Docker Compose solves all of this by defining your entire stack in a single file.

This guide walks you through building a production-ready Spring Boot + MySQL + Redis stack with Docker Compose. By the end, you will have a fully containerized application that any developer can spin up with a single command.

## Prerequisites

You need Docker Engine 20.10+ and Docker Compose V2 installed on your machine. You also need Java 17+ and Maven for building the Spring Boot application locally (though the Docker build handles this too).

Verify your Docker installation:

```bash
# Check Docker and Compose versions
docker --version
docker compose version
```

## Project Structure

Here is how the project directory should look:

```
spring-redis-mysql/
├── docker-compose.yml
├── Dockerfile
├── src/
│   └── main/
│       ├── java/com/example/demo/
│       │   ├── DemoApplication.java
│       │   ├── config/
│       │   │   └── RedisConfig.java
│       │   ├── controller/
│       │   │   └── UserController.java
│       │   ├── model/
│       │   │   └── User.java
│       │   ├── repository/
│       │   │   └── UserRepository.java
│       │   └── service/
│       │       └── UserService.java
│       └── resources/
│           └── application.yml
└── pom.xml
```

## The Dockerfile

Start with a multi-stage Dockerfile that builds the JAR and then runs it in a minimal image.

```dockerfile
# Stage 1: Build the application using Maven
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Download dependencies first for better layer caching
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Run the application in a slim JRE image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar
# Run as a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

The multi-stage approach keeps your final image small. The build stage pulls in Maven and all dependencies, compiles the code, and produces a JAR. The runtime stage only includes the JRE and your application.

## Docker Compose Configuration

This is the core of the stack. The `docker-compose.yml` file ties Spring Boot, MySQL, and Redis together.

```yaml
# Docker Compose file for Spring Boot + MySQL + Redis stack
version: "3.8"

services:
  # Spring Boot application service
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/appdb?useSSL=false&allowPublicKeyRetrieval=true
      SPRING_DATASOURCE_USERNAME: appuser
      SPRING_DATASOURCE_PASSWORD: apppassword
      SPRING_REDIS_HOST: redis
      SPRING_REDIS_PORT: 6379
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  # MySQL database service
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: appdb
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppassword
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Redis caching service
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    networks:
      - app-network

# Persistent volumes for data
volumes:
  mysql-data:
  redis-data:

# Shared network for inter-service communication
networks:
  app-network:
    driver: bridge
```

Several things are worth noting here. The `depends_on` directive with `condition: service_healthy` ensures Spring Boot does not start before MySQL and Redis are ready. The health checks test actual connectivity, not just whether the container is running. The Redis command enables append-only persistence and sets a 256MB memory limit with LRU eviction.

## Spring Boot Configuration

Your `application.yml` should reference environment variables so the same image works across environments.

```yaml
# Spring Boot application configuration
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:mysql://localhost:3306/appdb}
    username: ${SPRING_DATASOURCE_USERNAME:appuser}
    password: ${SPRING_DATASOURCE_PASSWORD:apppassword}
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
  redis:
    host: ${SPRING_REDIS_HOST:localhost}
    port: ${SPRING_REDIS_PORT:6379}
  cache:
    type: redis
    redis:
      time-to-live: 600000
```

The `${VAR:default}` syntax gives you sensible defaults for local development outside Docker while still allowing Docker Compose to inject the correct values.

## Redis Configuration Class

Set up Spring's caching abstraction to use Redis.

```java
// Redis cache configuration with custom serialization
@Configuration
@EnableCaching
public class RedisConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer()
                )
            );

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(config)
            .build();
    }
}
```

## Running the Stack

Bring everything up with a single command:

```bash
# Build and start all services in detached mode
docker compose up --build -d
```

Watch the logs to make sure everything starts correctly:

```bash
# Follow logs from all services
docker compose logs -f
```

You should see MySQL initialize, Redis start accepting connections, and then Spring Boot connect to both services.

## Verifying the Setup

Test that each service is accessible:

```bash
# Check if the Spring Boot app is running
curl http://localhost:8080/actuator/health

# Connect to MySQL from your host
docker compose exec mysql mysql -u appuser -papppassword appdb -e "SHOW TABLES;"

# Test Redis connectivity
docker compose exec redis redis-cli ping
```

## Environment Variables and Secrets

For production, never hardcode passwords in your compose file. Use a `.env` file instead.

```bash
# .env file - do NOT commit this to version control
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_USER=appuser
MYSQL_PASSWORD=your_secure_password
REDIS_PASSWORD=your_redis_password
```

Then reference these in your compose file:

```yaml
# Reference .env variables in the MySQL service
mysql:
  image: mysql:8.0
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    MYSQL_DATABASE: appdb
    MYSQL_USER: ${MYSQL_USER}
    MYSQL_PASSWORD: ${MYSQL_PASSWORD}
```

## Performance Tuning

For development, the default settings work fine. For staging or production-like environments, consider tuning MySQL and Redis.

```yaml
# MySQL with custom configuration for better performance
mysql:
  image: mysql:8.0
  command: >
    --innodb-buffer-pool-size=512M
    --max-connections=200
    --slow-query-log=1
    --long-query-time=2
```

```yaml
# Redis with memory and persistence tuning
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --appendonly yes
    --appendfsync everysec
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
    --tcp-keepalive 300
```

## Common Troubleshooting

If Spring Boot fails to connect to MySQL, the most common cause is that MySQL has not finished initializing. The healthcheck approach should prevent this, but if you still see connection errors, increase the retry count or interval.

If Redis connections are refused, check that the hostname matches the service name in your compose file. Inside the Docker network, services reach each other by their service names, not `localhost`.

To reset everything and start fresh:

```bash
# Stop all services and remove volumes
docker compose down -v

# Rebuild without cache
docker compose build --no-cache

# Start fresh
docker compose up -d
```

## Summary

This stack gives you a solid foundation for Spring Boot development with MySQL for persistent storage and Redis for caching. The health checks ensure services start in the right order, the named volumes persist your data across restarts, and the multi-stage Dockerfile keeps your images lean. Every developer on your team can run `docker compose up` and have an identical environment in minutes.
