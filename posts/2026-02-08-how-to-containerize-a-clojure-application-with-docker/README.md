# How to Containerize a Clojure Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Clojure, Containerization, DevOps, JVM, Functional Programming

Description: A practical guide to containerizing Clojure applications with Docker, covering Leiningen projects, uberjars, and multi-stage builds for production.

---

Clojure runs on the JVM, which makes it both powerful and resource-hungry. Containerizing a Clojure application brings consistency across development and production environments while keeping resource consumption predictable. This guide walks through the entire process, from a basic Dockerfile to a production-optimized multi-stage build.

## Prerequisites

You need Docker installed on your machine and a working Clojure project. If you don't have a project yet, we will create a simple one. You should also have Leiningen installed locally for initial project scaffolding.

## Creating a Sample Clojure Project

Let's start with a simple web application using Ring and Compojure.

Generate a new project with Leiningen:

```bash
# Create a new Clojure app project
lein new app clojure-docker-demo
cd clojure-docker-demo
```

Update the `project.clj` to include web dependencies:

```clojure
;; project.clj - defines project metadata, dependencies, and build config
(defproject clojure-docker-demo "0.1.0"
  :description "A simple Clojure web app for Docker demo"
  :dependencies [[org.clojure/clojure "1.11.1"]
                 [ring/ring-core "1.10.0"]
                 [ring/ring-jetty-adapter "1.10.0"]
                 [compojure "1.7.0"]]
  :main ^:skip-aot clojure-docker-demo.core
  :uberjar-name "app.jar"
  :profiles {:uberjar {:aot :all}})
```

Replace the contents of `src/clojure_docker_demo/core.clj`:

```clojure
;; core.clj - main application entry point with a simple HTTP server
(ns clojure-docker-demo.core
  (:require [ring.adapter.jetty :refer [run-jetty]]
            [compojure.core :refer [defroutes GET]]
            [compojure.route :as route])
  (:gen-class))

(defroutes app-routes
  (GET "/" [] "Hello from Clojure in Docker!")
  (GET "/health" [] {:status 200 :body "OK"})
  (route/not-found "Not Found"))

(defn -main [& args]
  (let [port (Integer/parseInt (or (System/getenv "PORT") "3000"))]
    (println (str "Starting server on port " port))
    (run-jetty app-routes {:port port :join? true})))
```

## Writing the Basic Dockerfile

A straightforward approach uses the official Clojure image directly:

```dockerfile
# Basic Dockerfile - simple but produces a large image
FROM clojure:temurin-21-lein-2.11.2-jammy

WORKDIR /app

# Copy dependency definitions first for better caching
COPY project.clj /app/
RUN lein deps

# Copy source code and build the uberjar
COPY . /app
RUN lein uberjar

EXPOSE 3000

# Run the standalone uberjar
CMD ["java", "-jar", "target/app.jar"]
```

This works, but the resulting image is over 1 GB because it includes the entire Clojure/Leiningen toolchain plus all build artifacts.

## Multi-Stage Build for Production

A multi-stage build separates the build environment from the runtime, producing a much smaller image.

```dockerfile
# Stage 1: Build the uberjar with Leiningen
FROM clojure:temurin-21-lein-2.11.2-jammy AS builder

WORKDIR /app

# Download dependencies first (cached layer)
COPY project.clj /app/
RUN lein deps

# Copy source and build the uberjar
COPY src/ /app/src/
COPY resources/ /app/resources/
RUN lein uberjar

# Stage 2: Run with a minimal JRE image
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy only the compiled uberjar from the builder stage
COPY --from=builder /app/target/app.jar /app/app.jar

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

# JVM tuning flags for containers
CMD ["java", \
     "-XX:+UseContainerSupport", \
     "-XX:MaxRAMPercentage=75.0", \
     "-jar", "/app/app.jar"]
```

The final image drops to around 200 MB, a significant reduction.

## Understanding the Layer Caching Strategy

The order of COPY instructions matters. By copying `project.clj` before the source code, Docker caches the dependency download layer. When you change your source code, Docker skips the slow `lein deps` step and reuses the cached layer. This cuts rebuild times from minutes to seconds during active development.

## Adding a .dockerignore File

Keep the build context clean with a `.dockerignore` file:

```text
# .dockerignore - exclude files that shouldn't be in the Docker build context
target/
.lein-*
.nrepl-port
.git/
.gitignore
README.md
*.swp
*.swo
```

## JVM Tuning for Containers

The JVM historically had trouble detecting container memory limits. Modern JVMs handle this better with `UseContainerSupport`, but you still want to set sensible defaults.

```bash
# Run with explicit memory limits
docker run -m 512m -e JAVA_OPTS="-XX:MaxRAMPercentage=75.0" clojure-docker-demo
```

The `-XX:MaxRAMPercentage=75.0` flag tells the JVM to use at most 75% of available container memory, leaving headroom for off-heap allocations.

## Docker Compose for Development

During development, you want live reloading and a REPL. Docker Compose makes this practical:

```yaml
# docker-compose.yml - development setup with volume mounts for live reloading
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "7888:7888"  # nREPL port
    volumes:
      - ./src:/app/src
      - ./resources:/app/resources
    environment:
      - PORT=3000
      - NREPL_PORT=7888
```

Create a separate `Dockerfile.dev` for development:

```dockerfile
# Dockerfile.dev - development image with REPL support
FROM clojure:temurin-21-lein-2.11.2-jammy

WORKDIR /app

COPY project.clj /app/
RUN lein deps

COPY . /app

EXPOSE 3000 7888

# Start with a REPL that also launches the web server
CMD ["lein", "run"]
```

Start the development environment:

```bash
# Build and run the development environment
docker compose up --build
```

You can connect your editor's nREPL client to `localhost:7888` and evaluate code directly inside the running container.

## Health Checks

Add a health check to your Dockerfile so Docker knows when your application is ready:

```dockerfile
# Health check that hits the /health endpoint every 30 seconds
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

## Building and Running

Build the production image:

```bash
# Build the Docker image with a tag
docker build -t clojure-docker-demo:latest .
```

Run it:

```bash
# Run the container with memory limits and port mapping
docker run -d \
  --name clojure-app \
  -p 3000:3000 \
  -m 512m \
  clojure-docker-demo:latest
```

Verify it is running:

```bash
# Check the container status and logs
docker ps
docker logs clojure-app
curl http://localhost:3000
```

## GraalVM Native Image Alternative

For even smaller images and faster startup, consider compiling your Clojure app to a native binary with GraalVM:

```dockerfile
# Stage 1: Build native image with GraalVM
FROM ghcr.io/graalvm/native-image:ol9-java21 AS builder

WORKDIR /app

# Install Leiningen
RUN curl -o /usr/local/bin/lein https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein && \
    chmod +x /usr/local/bin/lein

COPY project.clj /app/
RUN lein deps

COPY . /app
RUN lein uberjar

# Build the native image from the uberjar
RUN native-image -jar target/app.jar \
    --no-fallback \
    --initialize-at-build-time \
    -o app

# Stage 2: Minimal runtime
FROM gcr.io/distroless/base-debian12

COPY --from=builder /app/app /app

EXPOSE 3000
CMD ["/app"]
```

This approach produces an image under 50 MB with startup times measured in milliseconds instead of seconds. The trade-off is longer build times and some Clojure libraries that rely on runtime reflection may need additional configuration.

## Monitoring Your Containerized Clojure App

Once your application is running in production, you need visibility into its health and performance. Tools like [OneUptime](https://oneuptime.com) provide monitoring, alerting, and incident management for containerized applications. Set up health check monitoring against your `/health` endpoint to catch issues before your users do.

## Summary

Containerizing a Clojure application follows a predictable pattern: build the uberjar in a build stage, copy it to a minimal JRE runtime stage, and configure JVM flags for container awareness. The multi-stage approach keeps images small, and Docker Compose gives you a comfortable development workflow with REPL integration. For performance-critical services, GraalVM native images offer dramatic improvements in image size and startup time.
