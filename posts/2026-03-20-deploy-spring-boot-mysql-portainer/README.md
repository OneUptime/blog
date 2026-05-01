# How to Deploy a Spring Boot + MySQL Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Spring Boot, MySQL, Java, Docker Compose, Microservice

Description: Learn how to deploy a Spring Boot application with MySQL via Portainer, including database health checks, environment variable configuration, and JAR deployment.

---

Spring Boot with MySQL is a standard Java enterprise stack. In Portainer on Docker Standalone, Portainer provides a clean interface for managing the multi-container deployment with log streaming and container lifecycle management.

## Compose Stack

```yaml
services:
  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpass       # Change this
      MYSQL_DATABASE: springapp
      MYSQL_USER: spring
      MYSQL_PASSWORD: springpass          # Change this
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h localhost -u root -p\"$${MYSQL_ROOT_PASSWORD}\""]
      interval: 10s
      timeout: 5s
      retries: 10

  app:
    image: eclipse-temurin:21-jre-alpine
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy       # Wait for the MySQL health check on initial startup
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/springapp?sslMode=DISABLED&allowPublicKeyRetrieval=true
      SPRING_DATASOURCE_USERNAME: spring
      SPRING_DATASOURCE_PASSWORD: springpass
      SPRING_JPA_HIBERNATE_DDL_AUTO: update
      SERVER_PORT: 8080
    volumes:
      - /opt/spring-portainer/app.jar:/app/app.jar    # Copy your built JAR to this path on the Docker host
    command: java -jar /app/app.jar

volumes:
  mysql_data:
```

## Spring Boot application.properties

```properties
# src/main/resources/application.properties

# These can be overridden by environment variables in the container
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:mysql://localhost:3306/springapp?sslMode=DISABLED&allowPublicKeyRetrieval=true}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:spring}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:springpass}
spring.jpa.hibernate.ddl-auto=${SPRING_JPA_HIBERNATE_DDL_AUTO:update}

# Health actuator endpoint
# Requires spring-boot-starter-actuator on the classpath
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=always
```

## Building and Deploying

```bash
# Build the Spring Boot JAR
./mvnw clean package -DskipTests

# Create the Docker host path used by the bind mount
mkdir -p /opt/spring-portainer

# Copy the JAR to the Docker host path used by the stack
cp target/myapp-0.0.1-SNAPSHOT.jar /opt/spring-portainer/app.jar  # Replace with your built JAR name

# Deploy via Portainer
```

## Monitoring

Use OneUptime to monitor `http://<host>:8080/actuator/health`. With Spring Boot Actuator on the classpath and `management.endpoint.health.show-details=always`, the endpoint returns an overall `status` plus component details such as database health. Alert on any non-`UP` status to catch database connection failures.
