# How to Deploy a Java App with Elastic Beanstalk

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Elastic Beanstalk, Java, Deployment

Description: Step-by-step guide to deploying Java applications on AWS Elastic Beanstalk, covering Spring Boot, WAR files, Corretto runtime, and production configuration.

---

Java applications have always been a bit more involved to deploy than their Python or Node counterparts. Between building JARs, configuring Tomcat, and managing JVM memory settings, there's a lot of surface area for things to go wrong. Elastic Beanstalk simplifies this substantially by handling the server provisioning and configuration, leaving you to focus on your application code.

This guide covers deploying both Spring Boot JAR files and traditional WAR files to Elastic Beanstalk. We'll go through project setup, environment configuration, database connections, and the common gotchas that catch Java developers off guard.

## Prerequisites

You'll need:

- An AWS account
- AWS CLI and EB CLI installed
- Java 17 or 21 (Amazon Corretto recommended)
- Maven or Gradle
- A Spring Boot application (or any Java web app)

## Spring Boot JAR Deployment

The simplest path is deploying a Spring Boot application as a standalone JAR. Elastic Beanstalk's Corretto platform runs it directly.

Here's a basic Spring Boot application.

```java
// src/main/java/com/example/demo/DemoApplication.java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }

    // Health check endpoint - Elastic Beanstalk pings this
    @GetMapping("/")
    public String health() {
        return "OK";
    }

    @GetMapping("/api/status")
    public Map<String, String> status() {
        return Map.of(
            "status", "running",
            "version", "1.0.0"
        );
    }
}
```

One important thing - Elastic Beanstalk expects the application to listen on port 5000 by default. Configure this in your `application.properties`.

```properties
# src/main/resources/application.properties
server.port=5000
spring.application.name=my-eb-app
```

## Building the JAR

Build a fat JAR with all dependencies included.

```bash
# Build the application using Maven
mvn clean package -DskipTests

# The JAR file will be in target/
ls -la target/*.jar
```

Your `pom.xml` should include the Spring Boot Maven plugin.

```xml
<!-- pom.xml - Spring Boot Maven plugin for building executable JARs -->
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <mainClass>com.example.demo.DemoApplication</mainClass>
            </configuration>
        </plugin>
    </plugins>
</build>
```

## Initializing and Deploying

Initialize the EB application and create an environment.

```bash
# Initialize with the Corretto 17 platform
eb init -p corretto-17 my-java-app --region us-east-1

# Create the environment
eb create production --instance-type t3.medium --single

# Check deployment status
eb status
```

For JAR deployments, you can also upload directly.

```bash
# Deploy a specific JAR file
eb deploy --staged
```

Or configure the EB CLI to know where your JAR is.

```yaml
# .elasticbeanstalk/config.yml
deploy:
  artifact: target/demo-0.0.1-SNAPSHOT.jar
```

## WAR File Deployment with Tomcat

If you're working with a traditional WAR-based application, Elastic Beanstalk provides a managed Tomcat environment.

First, your Spring Boot app needs to extend `SpringBootServletInitializer`.

```java
// src/main/java/com/example/demo/DemoApplication.java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.builder.SpringApplicationBuilder;

@SpringBootApplication
public class DemoApplication extends SpringBootServletInitializer {

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(DemoApplication.class);
    }

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

Update your `pom.xml` packaging to `war`.

```xml
<!-- Change packaging type to war -->
<packaging>war</packaging>

<!-- Mark the embedded Tomcat as provided -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-tomcat</artifactId>
    <scope>provided</scope>
</dependency>
```

Then build and deploy.

```bash
# Build WAR file
mvn clean package -DskipTests

# Initialize with Tomcat platform
eb init -p tomcat-10-corretto-17 my-java-app --region us-east-1

# Create and deploy
eb create production --instance-type t3.medium
```

## Configuring JVM Options

Java applications need tuned JVM settings in production. You can set these through environment properties.

```bash
# Set JVM options via environment properties
eb setenv JAVA_TOOL_OPTIONS="-Xms512m -Xmx1024m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

Or use `.ebextensions` for more comprehensive configuration.

```yaml
# .ebextensions/jvm.config - JVM and application settings
option_settings:
  aws:elasticbeanstalk:application:environment:
    JAVA_TOOL_OPTIONS: "-Xms512m -Xmx1024m -XX:+UseG1GC"
    SPRING_PROFILES_ACTIVE: production
    SERVER_PORT: 5000
```

A good rule of thumb for JVM heap sizing on Elastic Beanstalk: set max heap to about 75% of your instance's available memory. A `t3.medium` has 4 GB, so 3 GB max heap is reasonable - but account for metaspace and thread stacks too.

## Database Configuration

Spring Boot makes database configuration straightforward with environment variables.

```bash
# Set database connection properties
eb setenv SPRING_DATASOURCE_URL=jdbc:postgresql://mydb.abc123.us-east-1.rds.amazonaws.com:5432/myapp \
         SPRING_DATASOURCE_USERNAME=admin \
         SPRING_DATASOURCE_PASSWORD=secure-password \
         SPRING_JPA_HIBERNATE_DDL_AUTO=validate
```

Your `application.properties` should reference these.

```properties
# application.properties - Database config from environment
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/myapp}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:postgres}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:}
spring.jpa.hibernate.ddl-auto=${SPRING_JPA_HIBERNATE_DDL_AUTO:update}
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

For detailed guidance on environment variable management, see our post on [configuring Elastic Beanstalk environment variables](https://oneuptime.com/blog/post/2026-02-12-configure-elastic-beanstalk-environment-variables/view).

## Health Checks and Monitoring

Elastic Beanstalk checks your application's health by making HTTP requests. Spring Boot Actuator provides great health endpoints.

```xml
<!-- Add Spring Boot Actuator dependency -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```properties
# application.properties - Actuator configuration
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.health.show-details=when-authorized
```

Configure Elastic Beanstalk to use the Actuator health endpoint.

```yaml
# .ebextensions/healthcheck.config
option_settings:
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /actuator/health
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /actuator/health
    HealthCheckInterval: 15
```

## Logging Configuration

Configure Logback to write to stdout so Elastic Beanstalk captures the output.

```xml
<!-- src/main/resources/logback-spring.xml -->
<configuration>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="STDOUT"/>
    </root>

    <logger name="com.example" level="DEBUG"/>
</configuration>
```

## Handling Deployment Timeouts

Java applications take longer to start than most other runtimes. The default health check timeout might not be enough for large Spring applications. Increase it.

```yaml
# .ebextensions/timeout.config - Increase deployment timeout
option_settings:
  aws:elasticbeanstalk:command:
    Timeout: 600
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckTimeout: 10
    HealthCheckInterval: 30
```

## Common Mistakes

A few things I've seen trip up Java developers specifically:

**Wrong port**: Elastic Beanstalk expects port 5000 for Corretto platform. If your app starts on 8080, the health check fails and EB terminates your instance. Always set `server.port=5000` or use the `PORT` environment variable.

**Fat JAR too large**: If your JAR is over 512 MB, deployment will fail. Exclude unnecessary dependencies and consider using the WAR approach with a managed Tomcat.

**Out of memory**: The default JVM settings don't account for your instance size. Always set `-Xmx` explicitly. I've seen t3.micro instances OOM within minutes because the JVM tried to allocate more heap than available.

**Missing .ebignore**: Without it, EB uploads your entire project directory including `.git`, `target/`, and IDE files.

```
# .ebignore - Exclude build artifacts and IDE files
.git
.idea
*.iml
target/
!target/*.jar
node_modules/
```

## Wrapping Up

Deploying Java to Elastic Beanstalk is solid once you get the initial configuration right. The Corretto platform with JAR deployment is the simplest path for Spring Boot apps. For legacy applications, the Tomcat platform works well.

Make sure you tune JVM settings for your instance size, configure health checks with adequate timeouts, and set environment variables for anything sensitive. If you run into deployment issues, check out our guide on [troubleshooting Elastic Beanstalk deployment failures](https://oneuptime.com/blog/post/2026-02-12-troubleshoot-elastic-beanstalk-deployment-failures/view) for common solutions.
