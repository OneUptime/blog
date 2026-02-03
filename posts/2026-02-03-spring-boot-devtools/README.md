# How to Use Spring Boot DevTools for Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, DevTools, Development, Productivity

Description: Learn how to use Spring Boot DevTools for faster development. This guide covers automatic restarts, live reload, and remote debugging.

---

Spring Boot DevTools is a module designed to make development faster and more productive. It provides features like automatic application restarts, live reload of browser resources, sensible development-time property defaults, and remote development capabilities. This guide covers everything you need to know to leverage DevTools effectively in your Spring Boot projects.

## Why Use Spring Boot DevTools

Traditional Java development involves a slow cycle of writing code, compiling, packaging, and restarting the application. DevTools breaks this cycle by providing:

- **Automatic Restart**: Application restarts automatically when classpath files change
- **Live Reload**: Browser refreshes automatically when static resources change
- **Property Defaults**: Sensible defaults for development (like disabling template caching)
- **Remote Development**: Develop locally while running the application on a remote server

These features can reduce your development feedback loop from minutes to seconds.

## Adding DevTools to Your Project

### Maven Configuration

Add the DevTools dependency to your `pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>devtools-demo</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-thymeleaf</artifactId>
        </dependency>

        <!-- DevTools dependency -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludeDevtools>true</excludeDevtools>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

The `optional` flag ensures DevTools is not transitively included in projects that depend on yours. The `excludeDevtools` configuration in the build plugin ensures DevTools is excluded from production builds.

### Gradle Configuration

For Gradle projects, add DevTools to your `build.gradle`:

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.4'
}

group = 'com.example'
version = '1.0.0'

java {
    sourceCompatibility = '21'
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-thymeleaf'

    // DevTools dependency
    developmentOnly 'org.springframework.boot:spring-boot-devtools'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

The `developmentOnly` configuration ensures DevTools is only available during development and not included in production builds.

### Gradle Kotlin DSL

For Kotlin DSL (`build.gradle.kts`):

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "com.example"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-thymeleaf")

    // DevTools dependency
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

## Automatic Restart

The automatic restart feature is the core functionality of DevTools. When files on the classpath change, DevTools automatically restarts the application.

### How Automatic Restart Works

DevTools uses two classloaders:

1. **Base Classloader**: Loads classes that do not change (third-party JARs)
2. **Restart Classloader**: Loads classes that you are actively developing

When a restart is triggered, only the restart classloader is discarded and recreated. This approach is much faster than a cold restart because the base classloader (and JVM) remains running.

### Sample Application

Create a simple REST controller to test automatic restart:

```java
package com.example.devtools.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api")
public class DemoController {

    @GetMapping("/hello")
    public Map<String, Object> hello() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Hello from Spring Boot DevTools!");
        response.put("timestamp", LocalDateTime.now());
        response.put("version", "1.0.0");
        return response;
    }

    @GetMapping("/greet/{name}")
    public Map<String, Object> greet(@PathVariable String name) {
        Map<String, Object> response = new HashMap<>();
        response.put("greeting", "Hello, " + name + "!");
        response.put("timestamp", LocalDateTime.now());
        return response;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "running");
        response.put("uptime", getUptime());
        response.put("javaVersion", System.getProperty("java.version"));
        response.put("springBootVersion", getSpringBootVersion());
        return response;
    }

    private String getUptime() {
        long uptimeMillis = java.lang.management.ManagementFactory
            .getRuntimeMXBean()
            .getUptime();
        long seconds = uptimeMillis / 1000;
        long minutes = seconds / 60;
        long hours = minutes / 60;
        return String.format("%dh %dm %ds", hours, minutes % 60, seconds % 60);
    }

    private String getSpringBootVersion() {
        return org.springframework.boot.SpringBootVersion.getVersion();
    }
}
```

### Main Application Class

```java
package com.example.devtools;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@SpringBootApplication
public class DevToolsDemoApplication {

    private static final Logger logger = LoggerFactory.getLogger(DevToolsDemoApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(DevToolsDemoApplication.class, args);
        logger.info("DevTools Demo Application started successfully!");
    }
}
```

### Triggering Restart

In most IDEs, saving a file triggers a restart. However, the exact behavior depends on your IDE configuration:

**IntelliJ IDEA**: By default, IntelliJ does not automatically compile on save. You need to either:
- Press `Ctrl+F9` (Windows/Linux) or `Cmd+F9` (Mac) to build
- Enable automatic build: Settings > Build, Execution, Deployment > Compiler > Build project automatically

**Eclipse/Spring Tool Suite**: Eclipse compiles automatically on save, so DevTools restarts work out of the box.

**VS Code with Java Extension Pack**: Configure automatic build in settings.

### Configuring Restart Behavior

Configure restart behavior in `application.properties`:

```properties
# Enable or disable automatic restart (default: true)
spring.devtools.restart.enabled=true

# Poll interval for classpath changes (default: 1s)
spring.devtools.restart.poll-interval=1s

# Quiet period after last change before triggering restart (default: 400ms)
spring.devtools.restart.quiet-period=400ms

# Log restart conditions
spring.devtools.restart.log-condition-evaluation-delta=true
```

Or in `application.yml`:

```yaml
spring:
  devtools:
    restart:
      enabled: true
      poll-interval: 1s
      quiet-period: 400ms
      log-condition-evaluation-delta: true
```

### Excluding Resources from Restart

Some file changes should not trigger a restart. Configure exclusions:

```properties
# Default exclusions
spring.devtools.restart.exclude=META-INF/maven/**,META-INF/resources/**,resources/**,static/**,public/**,templates/**,**/*Test.class,**/*Tests.class,git.properties,META-INF/build-info.properties

# Add additional exclusions (keeps defaults)
spring.devtools.restart.additional-exclude=scripts/**,styles/**

# Add additional paths to watch
spring.devtools.restart.additional-paths=src/main/resources/additional
```

### Watching Additional Paths

DevTools only watches classpath entries by default. To watch additional paths:

```properties
# Watch additional directories
spring.devtools.restart.additional-paths=src/main/resources/config,src/main/resources/templates
```

### Programmatic Restart Control

You can control restart programmatically:

```java
package com.example.devtools.config;

import org.springframework.boot.devtools.restart.Restarter;
import org.springframework.stereotype.Component;

@Component
public class RestartController {

    public void triggerRestart() {
        // Trigger a manual restart
        Restarter.getInstance().restart();
    }

    public void disableRestart() {
        // Disable automatic restart
        System.setProperty("spring.devtools.restart.enabled", "false");
    }
}
```

### Restart vs. Reload

Understanding the difference:

- **Restart**: JVM remains running, restart classloader is recreated
- **Reload**: Code changes are applied without restart (requires additional tools like JRebel)

DevTools provides restart capability, not true hot reload. For hot reload, consider:
- JRebel (commercial)
- DCEVM with HotswapAgent (open source)

## Live Reload

DevTools includes an embedded LiveReload server that triggers browser refresh when resources change.

### How Live Reload Works

1. DevTools starts a LiveReload server on port 35729
2. A browser extension connects to this server
3. When static resources change, the server notifies the browser
4. The browser refreshes automatically

### Installing LiveReload Browser Extension

Install the LiveReload extension for your browser:

- **Chrome**: LiveReload extension from Chrome Web Store
- **Firefox**: LiveReload extension from Firefox Add-ons
- **Safari**: Enable from preferences after installing Safari extension

### Configuring Live Reload

```properties
# Enable or disable LiveReload (default: true)
spring.devtools.livereload.enabled=true

# LiveReload server port (default: 35729)
spring.devtools.livereload.port=35729
```

### Static Resources for Live Reload

Create static resources that will trigger live reload:

**src/main/resources/static/css/styles.css**:

```css
/* Main application styles */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
}

.status-indicator {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 8px;
}

.status-running {
    background-color: #27ae60;
}

.status-stopped {
    background-color: #e74c3c;
}

.api-response {
    background-color: #ecf0f1;
    padding: 15px;
    border-radius: 4px;
    font-family: 'Courier New', Courier, monospace;
    overflow-x: auto;
}

button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
}

button:hover {
    background-color: #2980b9;
}

.card {
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 20px;
    margin: 15px 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-header {
    font-weight: bold;
    font-size: 18px;
    margin-bottom: 10px;
    color: #2c3e50;
}

.timestamp {
    color: #7f8c8d;
    font-size: 12px;
}
```

**src/main/resources/static/js/app.js**:

```javascript
// Application JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Application loaded');
    initializeApp();
});

function initializeApp() {
    loadStatus();
    setupEventListeners();
}

function setupEventListeners() {
    const refreshButton = document.getElementById('refreshStatus');
    if (refreshButton) {
        refreshButton.addEventListener('click', loadStatus);
    }

    const greetButton = document.getElementById('greetButton');
    if (greetButton) {
        greetButton.addEventListener('click', handleGreet);
    }
}

async function loadStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        displayStatus(data);
    } catch (error) {
        console.error('Failed to load status:', error);
        displayError('Failed to load status');
    }
}

function displayStatus(data) {
    const statusContainer = document.getElementById('statusContainer');
    if (statusContainer) {
        statusContainer.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="status-indicator status-${data.status}"></span>
                    Application Status
                </div>
                <p><strong>Status:</strong> ${data.status}</p>
                <p><strong>Uptime:</strong> ${data.uptime}</p>
                <p><strong>Java Version:</strong> ${data.javaVersion}</p>
                <p><strong>Spring Boot:</strong> ${data.springBootVersion}</p>
                <p class="timestamp">Last updated: ${new Date().toLocaleTimeString()}</p>
            </div>
        `;
    }
}

async function handleGreet() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput ? nameInput.value.trim() : 'World';

    if (!name) {
        displayError('Please enter a name');
        return;
    }

    try {
        const response = await fetch(`/api/greet/${encodeURIComponent(name)}`);
        const data = await response.json();
        displayGreeting(data);
    } catch (error) {
        console.error('Failed to greet:', error);
        displayError('Failed to send greeting');
    }
}

function displayGreeting(data) {
    const greetingContainer = document.getElementById('greetingContainer');
    if (greetingContainer) {
        greetingContainer.innerHTML = `
            <div class="card">
                <div class="card-header">Greeting Response</div>
                <p class="api-response">${JSON.stringify(data, null, 2)}</p>
            </div>
        `;
    }
}

function displayError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="card" style="border-color: #e74c3c;">
                <div class="card-header" style="color: #e74c3c;">Error</div>
                <p>${message}</p>
            </div>
        `;

        setTimeout(() => {
            errorContainer.innerHTML = '';
        }, 5000);
    }
}
```

### Thymeleaf Template with Live Reload

**src/main/resources/templates/index.html**:

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevTools Demo</title>
    <link rel="stylesheet" th:href="@{/css/styles.css}">
</head>
<body>
    <div class="container">
        <h1>Spring Boot DevTools Demo</h1>

        <div id="errorContainer"></div>

        <section>
            <h2>Application Status</h2>
            <div id="statusContainer">
                <p>Loading status...</p>
            </div>
            <button id="refreshStatus">Refresh Status</button>
        </section>

        <section>
            <h2>Greeting Service</h2>
            <div style="margin: 15px 0;">
                <input type="text"
                       id="nameInput"
                       placeholder="Enter your name"
                       style="padding: 10px; font-size: 14px; border: 1px solid #ddd; border-radius: 4px; width: 200px;">
                <button id="greetButton">Send Greeting</button>
            </div>
            <div id="greetingContainer"></div>
        </section>

        <section>
            <h2>DevTools Features</h2>
            <div class="card">
                <div class="card-header">Active Features</div>
                <ul>
                    <li><strong>Automatic Restart</strong> - Application restarts when Java files change</li>
                    <li><strong>Live Reload</strong> - Browser refreshes when static resources change</li>
                    <li><strong>Property Defaults</strong> - Caching disabled for templates</li>
                </ul>
            </div>
        </section>
    </div>

    <script th:src="@{/js/app.js}"></script>
</body>
</html>
```

### Controller for HTML Page

```java
package com.example.devtools.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {

    @GetMapping("/")
    public String index() {
        return "index";
    }
}
```

### Disabling Live Reload for Specific Browsers

If LiveReload causes issues, disable it:

```properties
# Disable LiveReload globally
spring.devtools.livereload.enabled=false
```

Or disable per session by not activating the browser extension.

## Property Defaults

DevTools applies sensible defaults for development that differ from production settings.

### Default Property Overrides

DevTools automatically applies these properties in development:

```properties
# Template caching disabled
spring.thymeleaf.cache=false
spring.freemarker.cache=false
spring.groovy.template.cache=false
spring.mustache.cache=false

# Web caching disabled
spring.resources.cache.period=0
spring.resources.chain.cache=false

# HTTP response caching disabled
spring.web.resources.cache.period=0
spring.web.resources.chain.cache=false

# Server error details shown
server.error.include-binding-errors=always
server.error.include-message=always
server.error.include-stacktrace=always

# H2 console enabled
spring.h2.console.enabled=true
```

### Custom Development Properties

Create a dedicated configuration for development:

**src/main/resources/application-dev.properties**:

```properties
# Development profile configuration

# Server settings
server.port=8080
server.error.include-message=always
server.error.include-stacktrace=always
server.error.include-binding-errors=always

# DevTools settings
spring.devtools.restart.enabled=true
spring.devtools.livereload.enabled=true
spring.devtools.restart.poll-interval=1s
spring.devtools.restart.quiet-period=400ms

# Logging
logging.level.root=INFO
logging.level.com.example.devtools=DEBUG
logging.level.org.springframework.web=DEBUG
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# Template settings
spring.thymeleaf.cache=false
spring.thymeleaf.prefix=file:src/main/resources/templates/
spring.web.resources.static-locations=file:src/main/resources/static/

# Database
spring.datasource.url=jdbc:h2:mem:devdb
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=create-drop
```

### Production Properties

**src/main/resources/application-prod.properties**:

```properties
# Production profile configuration

# Server settings
server.port=8080
server.error.include-message=never
server.error.include-stacktrace=never
server.error.include-binding-errors=never

# Caching enabled
spring.thymeleaf.cache=true
spring.web.resources.cache.period=31536000
spring.web.resources.chain.cache=true

# Logging
logging.level.root=WARN
logging.level.com.example.devtools=INFO

# Database (configure your production database)
spring.datasource.url=${DATABASE_URL}
spring.jpa.show-sql=false
spring.jpa.hibernate.ddl-auto=validate
```

### Profile-Specific Configuration Class

```java
package com.example.devtools.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class ProfileConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(ProfileConfiguration.class);

    @Configuration
    @Profile("dev")
    public static class DevelopmentConfig {

        @Bean
        public String environmentInfo() {
            logger.info("Running in DEVELOPMENT mode with DevTools enabled");
            return "development";
        }
    }

    @Configuration
    @Profile("prod")
    public static class ProductionConfig {

        @Bean
        public String environmentInfo() {
            logger.info("Running in PRODUCTION mode");
            return "production";
        }
    }
}
```

## Remote Development

DevTools supports remote development, allowing you to run your application on a remote server while developing locally.

### Enabling Remote DevTools

First, configure the remote application. In `application.properties`:

```properties
# Enable remote DevTools (use a strong secret in production)
spring.devtools.remote.secret=mysecret123
```

### Building for Remote Development

Modify your build configuration to include DevTools in the packaged application:

**Maven**:

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <configuration>
                <!-- Include DevTools in the package -->
                <excludeDevtools>false</excludeDevtools>
            </configuration>
        </plugin>
    </plugins>
</build>
```

**Gradle**:

```groovy
bootJar {
    // DevTools is included by default when using developmentOnly
    // For remote development, add it as implementation instead
}

// For remote development, change:
// developmentOnly 'org.springframework.boot:spring-boot-devtools'
// To:
// implementation 'org.springframework.boot:spring-boot-devtools'
```

### Remote DevTools Configuration

Create a comprehensive remote configuration:

**src/main/resources/application-remote.properties**:

```properties
# Remote DevTools Configuration

# Secret for remote connection (REQUIRED - use strong secret)
spring.devtools.remote.secret=${DEVTOOLS_REMOTE_SECRET:change-me-in-production}

# Remote restart settings
spring.devtools.remote.restart.enabled=true

# Proxy configuration (if behind a proxy)
spring.devtools.remote.proxy.host=
spring.devtools.remote.proxy.port=

# Debug settings
spring.devtools.remote.debug.enabled=true
spring.devtools.remote.debug.local-port=8000
```

### Running the Remote Client

Start the remote client from your IDE to connect to the remote application:

**Using Maven**:

```bash
# Start the remote client
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.devtools.remote.url=http://remote-server:8080"
```

**Using Java directly**:

```bash
# Run the remote client
java -cp target/classes:target/dependency/* \
  org.springframework.boot.devtools.RemoteSpringApplication \
  http://remote-server:8080
```

### IntelliJ IDEA Remote Client Configuration

Create a run configuration for the remote client:

1. Go to Run > Edit Configurations
2. Click + and select Application
3. Configure:
   - Main class: `org.springframework.boot.devtools.RemoteSpringApplication`
   - Program arguments: `http://remote-server:8080`
   - Use classpath of module: your-project

### Remote Development Security

Remote DevTools exposes your application to potential security risks. Follow these practices:

```java
package com.example.devtools.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
@ConditionalOnProperty(name = "spring.devtools.remote.secret")
public class RemoteDevToolsSecurityConfig {

    private static final Logger logger = LoggerFactory.getLogger(RemoteDevToolsSecurityConfig.class);

    private final Environment environment;

    public RemoteDevToolsSecurityConfig(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validateRemoteSecret() {
        String secret = environment.getProperty("spring.devtools.remote.secret");

        if (secret == null || secret.length() < 20) {
            logger.warn("Remote DevTools secret is weak. Use a strong secret of at least 20 characters.");
        }

        if ("mysecret123".equals(secret) || "change-me-in-production".equals(secret)) {
            throw new IllegalStateException(
                "Default remote DevTools secret detected. " +
                "Set a secure secret using DEVTOOLS_REMOTE_SECRET environment variable."
            );
        }

        logger.info("Remote DevTools security validated");
    }

    @Bean
    public RemoteSecurityInfo remoteSecurityInfo() {
        return new RemoteSecurityInfo(
            "Remote DevTools is enabled. Ensure the secret is strong and HTTPS is used."
        );
    }

    public static class RemoteSecurityInfo {
        private final String warning;

        public RemoteSecurityInfo(String warning) {
            this.warning = warning;
        }

        public String getWarning() {
            return warning;
        }
    }
}
```

### Docker Configuration for Remote Development

**Dockerfile.dev**:

```dockerfile
FROM eclipse-temurin:21-jdk

WORKDIR /app

# Copy Maven wrapper
COPY mvnw .
COPY .mvn .mvn

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN ./mvnw dependency:go-offline

# Copy source code
COPY src ./src

# Expose application port and debug port
EXPOSE 8080 8000

# Environment variable for remote secret
ENV DEVTOOLS_REMOTE_SECRET=secure-random-secret-here

# Run with dev profile and remote DevTools enabled
CMD ["./mvnw", "spring-boot:run", "-Dspring-boot.run.profiles=dev,remote"]
```

**docker-compose.dev.yml**:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
      - "8000:8000"  # Debug port
    environment:
      - SPRING_PROFILES_ACTIVE=dev,remote
      - DEVTOOLS_REMOTE_SECRET=${DEVTOOLS_REMOTE_SECRET:-change-me}
    volumes:
      - ./src:/app/src  # Mount source for faster iteration
    networks:
      - dev-network

networks:
  dev-network:
    driver: bridge
```

## IDE Configuration

### IntelliJ IDEA Setup

Configure IntelliJ for optimal DevTools experience:

**Settings for Automatic Build**:

1. Go to Settings > Build, Execution, Deployment > Compiler
2. Enable "Build project automatically"
3. Go to Settings > Advanced Settings
4. Enable "Allow auto-make to start even if developed application is currently running"

**Run Configuration**:

```xml
<!-- .idea/runConfigurations/DevToolsDemo.xml -->
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="DevToolsDemo" type="SpringBootApplicationConfigurationType" factoryName="Spring Boot">
    <module name="devtools-demo"/>
    <option name="SPRING_BOOT_MAIN_CLASS" value="com.example.devtools.DevToolsDemoApplication"/>
    <option name="ACTIVE_PROFILES" value="dev"/>
    <option name="ALTERNATIVE_JRE_PATH"/>
    <envs>
      <env name="SPRING_OUTPUT_ANSI_ENABLED" value="always"/>
    </envs>
    <method v="2">
      <option name="Make" enabled="true"/>
    </method>
  </configuration>
</component>
```

### Eclipse/Spring Tool Suite Setup

Eclipse works well with DevTools out of the box. For additional configuration:

**Window > Preferences > Java > Compiler**:
- Enable "Build automatically"

**Spring Tool Suite (STS)**:
- Boot Dashboard provides DevTools status indicators
- Right-click on application > Enable/Disable Automatic Restart

### VS Code Setup

**settings.json**:

```json
{
    "java.autobuild.enabled": true,
    "java.compile.nullAnalysis.mode": "automatic",
    "spring-boot.ls.javahome": "/path/to/jdk21",
    "java.configuration.updateBuildConfiguration": "automatic"
}
```

**launch.json**:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "java",
            "name": "DevTools Demo",
            "request": "launch",
            "mainClass": "com.example.devtools.DevToolsDemoApplication",
            "projectName": "devtools-demo",
            "args": "--spring.profiles.active=dev",
            "env": {
                "SPRING_OUTPUT_ANSI_ENABLED": "always"
            }
        }
    ]
}
```

## Advanced Configuration

### Custom Restart Trigger File

Instead of restarting on every classpath change, use a trigger file:

```properties
# Only restart when this file is modified
spring.devtools.restart.trigger-file=.reloadtrigger
```

Create a script to touch the trigger file:

```bash
#!/bin/bash
# reload.sh - Touch the trigger file to restart the application
touch .reloadtrigger
echo "Restart triggered at $(date)"
```

### Custom Classloader Configuration

Configure which classes use the restart classloader:

**META-INF/spring-devtools.properties**:

```properties
# Classes matching these patterns use the restart classloader
restart.include.my-library=/mycompany-[\\w-]+\\.jar

# Classes matching these patterns use the base classloader (no restart)
restart.exclude.my-library=/mycompany-common-[\\w-]+\\.jar
```

### Global DevTools Configuration

Create a global DevTools configuration that applies to all Spring Boot projects:

**~/.config/spring-boot/spring-boot-devtools.properties** (Linux/Mac):

```properties
# Global DevTools settings
spring.devtools.restart.poll-interval=2s
spring.devtools.restart.quiet-period=1s
spring.devtools.livereload.enabled=true
```

**%USERPROFILE%\.config\spring-boot\spring-boot-devtools.properties** (Windows):

```properties
# Global DevTools settings
spring.devtools.restart.poll-interval=2s
spring.devtools.restart.quiet-period=1s
spring.devtools.livereload.enabled=true
```

### Conditional DevTools Configuration

```java
package com.example.devtools.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class ConditionalDevToolsConfig {

    private static final Logger logger = LoggerFactory.getLogger(ConditionalDevToolsConfig.class);

    @Bean
    @ConditionalOnClass(name = "org.springframework.boot.devtools.restart.Restarter")
    @ConditionalOnProperty(name = "spring.devtools.restart.enabled", havingValue = "true", matchIfMissing = true)
    public DevToolsStatus devToolsStatus() {
        logger.info("DevTools restart is enabled");
        return new DevToolsStatus(true, true);
    }

    public static class DevToolsStatus {
        private final boolean restartEnabled;
        private final boolean liveReloadEnabled;

        public DevToolsStatus(boolean restartEnabled, boolean liveReloadEnabled) {
            this.restartEnabled = restartEnabled;
            this.liveReloadEnabled = liveReloadEnabled;
        }

        public boolean isRestartEnabled() {
            return restartEnabled;
        }

        public boolean isLiveReloadEnabled() {
            return liveReloadEnabled;
        }
    }
}
```

## Troubleshooting

### Common Issues and Solutions

**Issue: DevTools not restarting automatically**

Check these common causes:

```java
package com.example.devtools.diagnostic;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.devtools.restart.Restarter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class DevToolsDiagnostic {

    private static final Logger logger = LoggerFactory.getLogger(DevToolsDiagnostic.class);

    @Bean
    public CommandLineRunner checkDevToolsStatus() {
        return args -> {
            logger.info("=== DevTools Diagnostic ===");

            // Check if DevTools is present
            try {
                Class.forName("org.springframework.boot.devtools.restart.Restarter");
                logger.info("DevTools classes: PRESENT");
            } catch (ClassNotFoundException e) {
                logger.warn("DevTools classes: MISSING - add spring-boot-devtools dependency");
                return;
            }

            // Check restart status
            Restarter restarter = Restarter.getInstance();
            if (restarter != null) {
                logger.info("Restarter initialized: YES");
            } else {
                logger.warn("Restarter initialized: NO - application may not have started with DevTools");
            }

            // Check for common issues
            String restartEnabled = System.getProperty("spring.devtools.restart.enabled");
            if ("false".equals(restartEnabled)) {
                logger.warn("Restart is disabled via system property");
            }

            // Check if running in debug mode that might interfere
            boolean debugMode = java.lang.management.ManagementFactory
                .getRuntimeMXBean()
                .getInputArguments()
                .stream()
                .anyMatch(arg -> arg.contains("-agentlib:jdwp"));

            if (debugMode) {
                logger.info("Debug mode: ENABLED (this is fine, DevTools works with debugging)");
            }

            logger.info("=== End Diagnostic ===");
        };
    }
}
```

**Issue: LiveReload not working**

```properties
# Verify LiveReload settings
spring.devtools.livereload.enabled=true
spring.devtools.livereload.port=35729

# If port conflict, change the port
# spring.devtools.livereload.port=35730
```

Check browser extension is connected:
1. Open browser developer tools
2. Check Network tab for WebSocket connection to localhost:35729

**Issue: Slow restart times**

Optimize restart by excluding unnecessary paths:

```properties
# Exclude test classes and resources
spring.devtools.restart.exclude=META-INF/maven/**,META-INF/resources/**,resources/**,static/**,public/**,templates/**,**/*Test.class,**/*Tests.class

# Exclude large directories
spring.devtools.restart.additional-exclude=data/**,logs/**,uploads/**
```

**Issue: Restart loop**

If the application keeps restarting in a loop:

```properties
# Increase quiet period
spring.devtools.restart.quiet-period=1000ms

# Check if generated files are in classpath
spring.devtools.restart.exclude=generated/**
```

### Logging DevTools Events

Enable detailed DevTools logging:

```properties
# DevTools logging
logging.level.org.springframework.boot.devtools=DEBUG
logging.level.org.springframework.boot.devtools.restart=TRACE
logging.level.org.springframework.boot.devtools.livereload=DEBUG
```

### Performance Optimization

```properties
# Optimize for larger projects
spring.devtools.restart.poll-interval=2s
spring.devtools.restart.quiet-period=1s

# Disable features you don't need
spring.devtools.livereload.enabled=false  # If not using LiveReload

# Use trigger file for manual control
spring.devtools.restart.trigger-file=.reloadtrigger
```

## Complete Example Application

Here is a complete example bringing together all DevTools features:

### Project Structure

```
devtools-demo/
├── pom.xml
├── src/
│   └── main/
│       ├── java/
│       │   └── com/example/devtools/
│       │       ├── DevToolsDemoApplication.java
│       │       ├── config/
│       │       │   ├── DevToolsConfig.java
│       │       │   └── WebConfig.java
│       │       ├── controller/
│       │       │   ├── ApiController.java
│       │       │   └── WebController.java
│       │       ├── model/
│       │       │   └── Task.java
│       │       ├── repository/
│       │       │   └── TaskRepository.java
│       │       └── service/
│       │           └── TaskService.java
│       └── resources/
│           ├── application.properties
│           ├── application-dev.properties
│           ├── static/
│           │   ├── css/styles.css
│           │   └── js/app.js
│           └── templates/
│               ├── index.html
│               └── tasks.html
└── .reloadtrigger
```

### Task Model

```java
package com.example.devtools.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String description;

    private boolean completed;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Task() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Task(String title, String description) {
        this();
        this.title = title;
        this.description = description;
        this.completed = false;
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
        this.updatedAt = LocalDateTime.now();
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
        this.updatedAt = LocalDateTime.now();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
```

### Task Repository

```java
package com.example.devtools.repository;

import com.example.devtools.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByCompletedFalse();

    List<Task> findByCompletedTrue();

    @Query("SELECT COUNT(t) FROM Task t WHERE t.completed = false")
    long countPendingTasks();

    @Query("SELECT COUNT(t) FROM Task t WHERE t.completed = true")
    long countCompletedTasks();
}
```

### Task Service

```java
package com.example.devtools.service;

import com.example.devtools.model.Task;
import com.example.devtools.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    public List<Task> getPendingTasks() {
        return taskRepository.findByCompletedFalse();
    }

    public List<Task> getCompletedTasks() {
        return taskRepository.findByCompletedTrue();
    }

    public Optional<Task> getTaskById(Long id) {
        return taskRepository.findById(id);
    }

    public Task createTask(String title, String description) {
        Task task = new Task(title, description);
        return taskRepository.save(task);
    }

    public Optional<Task> updateTask(Long id, String title, String description) {
        return taskRepository.findById(id).map(task -> {
            task.setTitle(title);
            task.setDescription(description);
            return taskRepository.save(task);
        });
    }

    public Optional<Task> toggleTaskCompletion(Long id) {
        return taskRepository.findById(id).map(task -> {
            task.setCompleted(!task.isCompleted());
            return taskRepository.save(task);
        });
    }

    public boolean deleteTask(Long id) {
        if (taskRepository.existsById(id)) {
            taskRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public TaskStats getStats() {
        return new TaskStats(
            taskRepository.count(),
            taskRepository.countPendingTasks(),
            taskRepository.countCompletedTasks()
        );
    }

    public static class TaskStats {
        private final long total;
        private final long pending;
        private final long completed;

        public TaskStats(long total, long pending, long completed) {
            this.total = total;
            this.pending = pending;
            this.completed = completed;
        }

        public long getTotal() {
            return total;
        }

        public long getPending() {
            return pending;
        }

        public long getCompleted() {
            return completed;
        }
    }
}
```

### API Controller

```java
package com.example.devtools.controller;

import com.example.devtools.model.Task;
import com.example.devtools.service.TaskService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/tasks")
public class ApiController {

    private final TaskService taskService;

    public ApiController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public List<Task> getAllTasks(@RequestParam(required = false) String filter) {
        if ("pending".equals(filter)) {
            return taskService.getPendingTasks();
        } else if ("completed".equals(filter)) {
            return taskService.getCompletedTasks();
        }
        return taskService.getAllTasks();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTask(@PathVariable Long id) {
        return taskService.getTaskById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@RequestBody Map<String, String> request) {
        String title = request.get("title");
        String description = request.get("description");

        if (title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Task task = taskService.createTask(title, description);
        return ResponseEntity.status(HttpStatus.CREATED).body(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        String title = request.get("title");
        String description = request.get("description");

        return taskService.updateTask(id, title, description)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<Task> toggleTask(@PathVariable Long id) {
        return taskService.toggleTaskCompletion(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        if (taskService.deleteTask(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        TaskService.TaskStats stats = taskService.getStats();
        Map<String, Object> response = new HashMap<>();
        response.put("total", stats.getTotal());
        response.put("pending", stats.getPending());
        response.put("completed", stats.getCompleted());
        return response;
    }
}
```

### DevTools Configuration

```java
package com.example.devtools.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import java.util.Arrays;

@Configuration
public class DevToolsConfig {

    private static final Logger logger = LoggerFactory.getLogger(DevToolsConfig.class);

    @Bean
    @Profile("dev")
    public CommandLineRunner devToolsInfo(Environment environment) {
        return args -> {
            logger.info("========================================");
            logger.info("DevTools Demo Application Started");
            logger.info("========================================");
            logger.info("Active profiles: {}", Arrays.toString(environment.getActiveProfiles()));
            logger.info("Server port: {}", environment.getProperty("server.port", "8080"));
            logger.info("DevTools restart enabled: {}",
                environment.getProperty("spring.devtools.restart.enabled", "true"));
            logger.info("LiveReload enabled: {}",
                environment.getProperty("spring.devtools.livereload.enabled", "true"));
            logger.info("H2 Console: http://localhost:{}/h2-console",
                environment.getProperty("server.port", "8080"));
            logger.info("========================================");
        };
    }
}
```

### Running the Application

```bash
# Run with Maven
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Run with Gradle
./gradlew bootRun --args='--spring.profiles.active=dev'

# Package and run
./mvnw package
java -jar target/devtools-demo-1.0.0.jar --spring.profiles.active=dev
```

## Summary

Spring Boot DevTools provides essential features for improving development productivity:

| Feature | Description | Default |
|---------|-------------|---------|
| **Automatic Restart** | Restarts application when classpath changes | Enabled |
| **Live Reload** | Refreshes browser when resources change | Enabled, port 35729 |
| **Property Defaults** | Disables caching, shows error details | Applied automatically |
| **Remote Development** | Develop locally, run remotely | Disabled by default |

Best practices for using DevTools:

1. **Always use DevTools in development** - The productivity gains are significant
2. **Configure your IDE** for automatic builds to maximize DevTools benefits
3. **Exclude DevTools from production** builds using the appropriate build plugin configuration
4. **Use a trigger file** for large projects where automatic restart is too frequent
5. **Enable verbose logging** when troubleshooting DevTools issues
6. **Secure remote DevTools** with a strong secret and use only in controlled environments

DevTools transforms the Spring Boot development experience from a slow compile-restart cycle to a rapid feedback loop, allowing you to focus on writing code rather than waiting for restarts.

## Monitor Your Spring Boot Applications with OneUptime

Once you have optimized your development workflow with DevTools, ensure your production Spring Boot applications are always performing at their best. OneUptime provides comprehensive monitoring for your Java applications:

- **Application Performance Monitoring**: Track response times, throughput, and error rates for your Spring Boot endpoints
- **Real-time Alerting**: Get notified immediately when your application experiences issues
- **Distributed Tracing**: Trace requests across your microservices architecture
- **Log Management**: Centralize and search logs from all your Spring Boot instances
- **Uptime Monitoring**: Ensure your services are always available to your users
- **Status Pages**: Keep your users informed about the health of your services

Start monitoring your Spring Boot applications today with OneUptime at [https://oneuptime.com](https://oneuptime.com).
