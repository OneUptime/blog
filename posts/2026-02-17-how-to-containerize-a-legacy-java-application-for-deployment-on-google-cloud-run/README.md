# How to Containerize a Legacy Java Application for Deployment on Google Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Java, Containers, Docker

Description: A hands-on guide to containerizing a legacy Java application and deploying it on Google Cloud Run with optimized startup and resource usage.

---

Legacy Java applications - the kind built with Spring Boot, Java EE, or even plain servlets running on Tomcat - are everywhere in enterprise environments. Moving these to Cloud Run gives you serverless scaling without rewriting the application. Cloud Run can scale your Java app to zero when there is no traffic and spin up instances when requests arrive. The catch is that Java applications are traditionally slow to start, which matters in a serverless context. Here is how to containerize a Java app for Cloud Run and optimize it for that environment.

## Assess Your Java Application

Before containerizing, understand what your application needs:

```bash
# Check the Java version your application uses
java -version

# Check the application server or framework
# Look for framework-specific files
ls -la WEB-INF/web.xml          # Java EE / Servlet
ls -la pom.xml                   # Maven project
ls -la build.gradle              # Gradle project
ls -la src/main/resources/application.properties  # Spring Boot

# Check how the application is currently deployed
# WAR file on Tomcat? JAR file? EAR on WebSphere?
file my-application.war
```

## Step 1 - Create a Dockerfile

### For Spring Boot Applications (JAR)

Most modern Spring Boot apps build as executable JARs:

```dockerfile
# Dockerfile for a Spring Boot application
# Use Eclipse Temurin JDK - well-maintained and free
FROM eclipse-temurin:17-jre-jammy

# Set working directory
WORKDIR /app

# Copy the built JAR file
COPY target/my-application-1.0.0.jar app.jar

# Cloud Run sets the PORT environment variable
# Configure the app to listen on that port
ENV SERVER_PORT=${PORT:-8080}

# JVM optimization flags for containers
# -XX:+UseContainerSupport ensures JVM respects container memory limits
# -XX:MaxRAMPercentage sets heap as percentage of available memory
ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=50.0 \
  -Djava.security.egd=file:/dev/./urandom"

# Expose the port
EXPOSE 8080

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar --server.port=$SERVER_PORT"]
```

### For WAR Files on Tomcat

Legacy applications packaged as WAR files need a Tomcat container:

```dockerfile
# Dockerfile for a WAR-based Java application on Tomcat
FROM tomcat:10-jre17-temurin-jammy

# Remove the default Tomcat webapps
RUN rm -rf /usr/local/tomcat/webapps/*

# Copy the WAR file to the Tomcat webapps directory
# Naming it ROOT.war deploys it at the root context path
COPY target/my-legacy-app.war /usr/local/tomcat/webapps/ROOT.war

# Configure Tomcat to use the PORT environment variable from Cloud Run
RUN sed -i 's/port="8080"/port="${PORT:-8080}"/' \
  /usr/local/tomcat/conf/server.xml

# JVM settings for container environment
ENV CATALINA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:InitialRAMPercentage=50.0"

EXPOSE 8080

CMD ["catalina.sh", "run"]
```

### Multi-Stage Build for Building and Packaging

If you want to build the application inside Docker:

```dockerfile
# Multi-stage build - build and package in one Dockerfile
# Stage 1: Build the application
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build
COPY pom.xml .
# Download dependencies first (cached layer)
RUN mvn dependency:go-offline -B

COPY src ./src
# Build the JAR, skip tests for the container build
RUN mvn package -DskipTests -B

# Stage 2: Create the runtime image
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app
# Copy only the built JAR from the builder stage
COPY --from=builder /build/target/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar --server.port=${PORT:-8080}"]
```

## Step 2 - Build and Push the Image

```bash
# Build the Docker image locally
docker build -t my-java-app:v1 .

# Test locally before deploying to Cloud Run
docker run -p 8080:8080 -e PORT=8080 my-java-app:v1

# Verify the application starts and responds
curl http://localhost:8080/health

# Tag and push to Artifact Registry
gcloud artifacts repositories create my-repo \
  --repository-format docker \
  --location us-central1

docker tag my-java-app:v1 us-central1-docker.pkg.dev/my-project/my-repo/my-java-app:v1
docker push us-central1-docker.pkg.dev/my-project/my-repo/my-java-app:v1
```

## Step 3 - Deploy to Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy my-java-app \
  --image us-central1-docker.pkg.dev/my-project/my-repo/my-java-app:v1 \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 10 \
  --port 8080 \
  --set-env-vars "SPRING_PROFILES_ACTIVE=production" \
  --allow-unauthenticated

# For applications that need a database
gcloud run deploy my-java-app \
  --image us-central1-docker.pkg.dev/my-project/my-repo/my-java-app:v1 \
  --platform managed \
  --region us-central1 \
  --memory 1Gi \
  --cpu 2 \
  --add-cloudsql-instances my-project:us-central1:my-database \
  --set-env-vars "SPRING_DATASOURCE_URL=jdbc:postgresql:///mydb?socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlInstance=my-project:us-central1:my-database"
```

## Step 4 - Optimize Startup Time

Java startup time is the biggest challenge on Cloud Run. A cold start that takes 30 seconds on a traditional server is unacceptable when Cloud Run is scaling from zero.

### Use Spring Boot's Lazy Initialization

```properties
# application.properties - enable lazy initialization
# Beans are created only when first accessed, not at startup
spring.main.lazy-initialization=true

# Reduce startup logging
logging.level.org.springframework=WARN
```

### Use Cloud Run's Startup CPU Boost

```bash
# Enable startup CPU boost - gives extra CPU during startup
gcloud run deploy my-java-app \
  --image us-central1-docker.pkg.dev/my-project/my-repo/my-java-app:v1 \
  --cpu-boost \
  --memory 1Gi \
  --cpu 2
```

### Keep Minimum Instances

For latency-sensitive applications, keep at least one instance warm:

```bash
# Set minimum instances to avoid cold starts for the first request
gcloud run services update my-java-app \
  --min-instances 1 \
  --region us-central1
```

### Use GraalVM Native Image (Advanced)

For Spring Boot 3.x applications, compile to a native image for near-instant startup:

```dockerfile
# Build a native image using GraalVM
FROM ghcr.io/graalvm/graalvm-community:17 AS builder

WORKDIR /build
COPY . .
# Build the native executable - takes several minutes but produces a fast binary
RUN ./mvnw -Pnative native:compile -DskipTests

# Runtime image - no JVM needed
FROM debian:bookworm-slim

WORKDIR /app
COPY --from=builder /build/target/my-application /app/my-application

EXPOSE 8080
ENTRYPOINT ["/app/my-application"]
```

Native images typically start in under 1 second compared to 5-30 seconds for JVM-based startup.

### Use CDS (Class Data Sharing)

For JVM-based deployments, Application Class Data Sharing reduces startup time:

```dockerfile
# Generate CDS archive during build
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app
COPY target/app.jar app.jar

# Generate the CDS archive
RUN java -Xshare:off -XX:DumpLoadedClassList=classes.lst -jar app.jar --exit || true
RUN java -Xshare:dump -XX:SharedClassListFile=classes.lst -XX:SharedArchiveFile=app-cds.jsa -jar app.jar --exit || true

ENV JAVA_OPTS="-XX:SharedArchiveFile=app-cds.jsa -Xshare:on"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar --server.port=${PORT:-8080}"]
```

## Step 5 - Handle Configuration

Legacy Java apps often read configuration from files. Cloud Run uses environment variables:

```bash
# Set environment variables for the service
gcloud run services update my-java-app \
  --set-env-vars "DB_HOST=10.0.0.5,DB_NAME=myapp,CACHE_URL=redis://10.0.0.10:6379"

# For secrets, use Secret Manager
gcloud run services update my-java-app \
  --set-secrets "DB_PASSWORD=db-password:latest,API_KEY=api-key:latest"
```

Spring Boot reads environment variables automatically:

```properties
# application.properties - reference environment variables
spring.datasource.url=jdbc:postgresql://${DB_HOST}/${DB_NAME}
spring.datasource.password=${DB_PASSWORD}
```

## Step 6 - Connect to Databases

Cloud Run connects to Cloud SQL through the Unix socket proxy:

```yaml
# Spring Boot application.properties for Cloud SQL
spring.datasource.url=jdbc:postgresql:///${DB_NAME}?socketFactory=com.google.cloud.sql.postgres.SocketFactory&cloudSqlInstance=${CLOUD_SQL_INSTANCE}
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver
```

Add the Cloud SQL socket factory dependency:

```xml
<!-- pom.xml dependency for Cloud SQL connectivity -->
<dependency>
    <groupId>com.google.cloud.sql</groupId>
    <artifactId>postgres-socket-factory</artifactId>
    <version>1.14.0</version>
</dependency>
```

## Common Issues

- **Memory limits.** Java applications are memory-hungry. Start with 1 GB and monitor. If you see OOM kills, increase memory or tune the JVM heap.
- **Connection pooling.** Cloud Run instances are ephemeral. Configure connection pools with reasonable timeouts and validate connections on borrow.
- **File system writes.** Cloud Run provides a writable /tmp directory but it is stored in memory. If your app writes large temp files, increase the memory allocation.
- **Session state.** If your app uses HTTP sessions stored in memory, you need to externalize them (Memorystore Redis, Firestore, or Cloud SQL) because Cloud Run instances are stateless.

Containerizing a legacy Java app for Cloud Run is less about the containerization itself and more about adapting to the serverless model - fast startup, stateless design, and environment-based configuration. Get those right, and your legacy Java app gets a second life with modern scaling capabilities.
