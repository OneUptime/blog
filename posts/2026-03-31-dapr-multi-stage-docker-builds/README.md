# How to Use Multi-Stage Docker Builds for Dapr Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker, Multi-Stage Build, Container, CI/CD

Description: Learn how to use Docker multi-stage builds to produce small, secure production images for Dapr applications without polluting the final image with build tools.

---

## What Are Multi-Stage Builds?

Multi-stage builds use multiple `FROM` instructions in one Dockerfile. Earlier stages compile or install dependencies, and the final stage copies only the artifacts needed at runtime. This keeps the production image small and free of compilers, test tools, and development dependencies.

## Multi-Stage Build for a Go Dapr Service

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS builder
WORKDIR /build

# Download dependencies first for cache efficiency
COPY go.mod go.sum ./
RUN go mod download

# Build the binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o order-service ./cmd/server

# Stage 2: Run tests (optional, useful in CI)
FROM builder AS tester
RUN go test ./... -race -count=1

# Stage 3: Production image
FROM gcr.io/distroless/static:nonroot AS production
COPY --from=builder /build/order-service /order-service
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/order-service"]
```

Build only the production stage:

```bash
docker build --target production -t order-service:1.0.0 .
```

Run tests in CI before building the final image. Tests execute during the build step itself — if the build succeeds, the tests passed:

```bash
docker build --target tester -t order-service:test .
docker build --target production -t order-service:1.0.0 .
```

## Multi-Stage Build for a Java Dapr Service

```dockerfile
# Stage 1: Build with Maven
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src/ ./src/
RUN mvn package -DskipTests -q

# Stage 2: Production with JRE only
FROM eclipse-temurin:21-jre-alpine AS production
WORKDIR /app
COPY --from=builder /build/target/order-service-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Multi-Stage Build for a Node.js Dapr Service

```dockerfile
# Stage 1: Install all dependencies and build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

# Stage 2: Production with only runtime deps
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Using Build Arguments Across Stages

Pass build-time configuration to the right stage:

```dockerfile
ARG APP_VERSION=dev

FROM golang:1.22-alpine AS builder
ARG APP_VERSION
WORKDIR /build
COPY . .
RUN go build -ldflags="-X main.Version=${APP_VERSION}" -o server .

FROM gcr.io/distroless/static:nonroot AS production
ARG APP_VERSION
LABEL version="${APP_VERSION}"
COPY --from=builder /build/server /server
```

Build with the version argument:

```bash
docker build \
  --target production \
  --build-arg APP_VERSION=1.2.3 \
  -t order-service:1.2.3 .
```

## Summary

Multi-stage Docker builds are the standard way to produce small production images for Dapr services. Build tools, compilers, and test dependencies stay in early stages and never reach the final image. This results in faster pulls, smaller attack surfaces, and cleaner separation between the build process and the runtime environment.
