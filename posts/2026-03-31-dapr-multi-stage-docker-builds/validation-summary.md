# Validation Summary: How to Use Multi-Stage Docker Builds for Dapr Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker (multi-stage builds)
- Go (golang:1.22-alpine)
- Java (Maven 3.9, Eclipse Temurin JDK/JRE 21)
- Node.js 20 (TypeScript, npm)
- Google Distroless images
- Dapr (as the application framework context)

## Sources Consulted
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Docker ARG scope documentation: https://docs.docker.com/reference/dockerfile/#arg
- npm CLI documentation for `--omit` flag: https://docs.npmjs.com/cli/v10/commands/npm-install
- npm 7 deprecation notes for `--only` flag: https://docs.npmjs.com/cli/v7/using-npm/config#only
- Official golang Docker image Dockerfile (includes gcc/musl-dev on alpine variants)
- Google Distroless image documentation: https://github.com/GoogleContainerTools/distroless

## Issues Found

### 1. Deprecated npm flag `--only=production`
- **What was wrong:** The Node.js Dockerfile used `npm ci --only=production`. The `--only` flag was deprecated in npm 7+ (Node 20 ships with npm 10).
- **What was changed:** Replaced with `npm ci --omit=dev`, which is the current supported equivalent.
- **Why:** Using deprecated flags can cause warnings and may be removed in future npm versions.

### 2. Misleading `docker run` command for tester stage
- **What was wrong:** The CI test commands included `docker run --rm order-service:test` after building the tester stage. Since tests execute during `docker build` via the `RUN` instruction, `docker run` does not re-run the tests — it would just start a shell from the base golang image and immediately exit.
- **What was changed:** Removed the `docker run` line and added a clarifying note that tests execute during the build step.
- **Why:** The command was misleading and would not produce the intended behavior.

### 3. Missing WORKDIR and COPY in build arguments example
- **What was wrong:** The "Using Build Arguments Across Stages" Dockerfile example had `go build -o server .` without a `WORKDIR` or `COPY` instruction. The binary would be created at `/server` (root), but the production stage referenced `COPY --from=builder /build/server /server`, which would fail because `/build/server` does not exist.
- **What was changed:** Added `WORKDIR /build` and `COPY . .` to the builder stage so the path `/build/server` is correct.
- **Why:** Without these instructions, the Dockerfile would fail to build due to missing source files, and the COPY path would not match.

## Review Notes
- The Go race detector (`-race`) in the tester stage requires CGo. The `golang:1.22-alpine` image includes gcc and musl-dev so this works, but the race detector on musl has historically had edge-case issues. If reliability problems arise, switching to the Debian-based `golang:1.22` image for testing would be more robust.
- The `COPY --from=builder /build/target/order-service-*.jar app.jar` glob in the Java example works for a single matching file but will fail if multiple JARs match the pattern. This is standard practice but worth noting.
- The post title references Dapr but the Dockerfiles are general-purpose multi-stage patterns — they don't include Dapr-specific configuration (e.g., Dapr sidecar annotations, daprd setup). This is fine since Dapr apps are standard apps at the container level, but readers looking for Dapr sidecar container setup won't find it here.
