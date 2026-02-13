# How to Deploy a Spring Boot App to AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Spring Boot, Java, Deployment, ECS

Description: Step-by-step instructions for deploying Spring Boot applications to AWS using Elastic Beanstalk, ECS Fargate, and EC2 with real-world configuration examples.

---

Spring Boot makes building Java applications straightforward, and AWS provides several reliable ways to run them in production. Whether you prefer managed services or want full control of your infrastructure, there's a deployment strategy here that'll work for you. Let's walk through the most practical approaches.

## Preparing Your Spring Boot App

Before deploying anywhere, make sure your application is production-ready. Here's a typical `application.yml` configuration that works well on AWS.

This sets up profiles for different environments and configures the embedded server:

```yaml
# src/main/resources/application.yml
server:
  port: 8080

spring:
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized

logging:
  level:
    root: INFO
    com.yourapp: DEBUG
```

Add a health check controller if you don't have one already. Load balancers and container orchestrators rely on these:

```java
// src/main/java/com/yourapp/controller/HealthController.java
@RestController
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(status);
    }
}
```

Build your JAR file before deploying:

```bash
# Build the application using Maven
./mvnw clean package -DskipTests

# Or with Gradle
./gradlew bootJar
```

## Option 1: Elastic Beanstalk

This is the fastest way to get a Spring Boot app running on AWS. Elastic Beanstalk handles load balancing, scaling, and health monitoring out of the box.

### Configure the Procfile

Create a Procfile in your project root. This tells Elastic Beanstalk how to start your app:

```
web: java -jar target/myapp-0.0.1-SNAPSHOT.jar --server.port=5000
```

Elastic Beanstalk uses port 5000 by default for its reverse proxy, so we override the port here.

### Deploy with the EB CLI

```bash
# Initialize Elastic Beanstalk
eb init -p corretto-17 my-spring-app --region us-east-1

# Create an environment
eb create spring-production --instance-type t3.medium --single

# Deploy updates
eb deploy
```

### Configure JVM Memory

Java apps are memory-hungry. Set JVM options in an `.ebextensions` config:

```yaml
# .ebextensions/jvm.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    JAVA_TOOL_OPTIONS: "-Xms256m -Xmx512m -XX:+UseG1GC"
    SERVER_PORT: "5000"
    SPRING_PROFILES_ACTIVE: "production"
```

## Option 2: Docker on ECS Fargate

For teams that want container-based deployments without managing servers, ECS Fargate is the way to go. You define your container and AWS runs it.

### Create a Dockerfile

This multi-stage Dockerfile keeps the final image small by separating the build and runtime stages:

```dockerfile
# Dockerfile - Multi-stage build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# JVM settings for container environments
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### Push to ECR and Create Task Definition

Build, tag, and push your image to Amazon ECR:

```bash
# Create ECR repository
aws ecr create-repository --repository-name spring-app

# Build and push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker build -t spring-app .
docker tag spring-app:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/spring-app:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/spring-app:latest
```

Here's a task definition that allocates 1 vCPU and 2GB of memory, which is a reasonable starting point for most Spring Boot apps:

```json
{
  "family": "spring-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "spring-app",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/spring-app:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "SPRING_PROFILES_ACTIVE",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/spring-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### Create the ECS Service

Use the CLI to register the task and create a service:

```bash
# Register the task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create the ECS cluster
aws ecs create-cluster --cluster-name spring-cluster

# Create the service with a load balancer
aws ecs create-service \
  --cluster spring-cluster \
  --service-name spring-service \
  --task-definition spring-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Option 3: EC2 with Auto Scaling

Sometimes you need direct control over your instances. This approach gives you full access to the underlying server.

Create a user data script that installs Java and runs your application on boot:

```bash
#!/bin/bash
# EC2 User Data Script
yum update -y
yum install -y java-17-amazon-corretto

# Create app user
useradd -r -s /bin/false springapp

# Download the JAR from S3
aws s3 cp s3://my-deploy-bucket/spring-app/app.jar /opt/spring-app/app.jar
chown springapp:springapp /opt/spring-app/app.jar

# Create a systemd service
cat > /etc/systemd/system/spring-app.service << 'EOF'
[Unit]
Description=Spring Boot Application
After=network.target

[Service]
User=springapp
ExecStart=/usr/bin/java -Xms512m -Xmx1024m -jar /opt/spring-app/app.jar
SuccessExitStatus=143
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable spring-app
systemctl start spring-app
```

## Database Configuration with RDS

Most Spring Boot apps need a database. Here's how to configure your app to connect to RDS.

Use environment variables so the same code works across all environments:

```yaml
# application-production.yml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
```

## CI/CD with CodePipeline

Automate your deployments using AWS CodePipeline. Create a `buildspec.yml` for CodeBuild:

```yaml
# buildspec.yml
version: 0.2

phases:
  install:
    runtime-versions:
      java: corretto17
  build:
    commands:
      - echo "Building Spring Boot application"
      - ./mvnw clean package -DskipTests
  post_build:
    commands:
      - echo "Build completed on $(date)"

artifacts:
  files:
    - target/*.jar
    - Procfile
    - .ebextensions/**/*
```

## Monitoring and Observability

Regardless of deployment method, you need solid monitoring. Spring Boot Actuator gives you metrics that integrate well with CloudWatch.

Add the Micrometer CloudWatch dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-cloudwatch2</artifactId>
</dependency>
```

Then configure it to push metrics:

```yaml
# application-production.yml
management:
  metrics:
    export:
      cloudwatch:
        namespace: SpringApp
        step: 1m
        enabled: true
```

For deeper application monitoring, you can integrate with [external monitoring tools](https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view) that provide richer alerting and incident management capabilities.

## Choosing the Right Approach

If you want simplicity and fast iteration, go with Elastic Beanstalk. It's the lowest effort option and works surprisingly well for most use cases. If your team already uses containers and you want fine-grained scaling control, ECS Fargate is your best bet. Direct EC2 deployment makes sense when you have specific OS-level requirements or need to run background processes alongside your app.

Spring Boot apps tend to need more memory than apps built with lighter frameworks, so keep that in mind when choosing instance sizes. Start with at least 1GB of RAM and monitor from there. Whatever you choose, make sure you've got health checks, structured logging, and proper secrets management in place before going to production.
