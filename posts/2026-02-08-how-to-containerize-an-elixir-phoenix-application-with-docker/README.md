# How to Containerize an Elixir Phoenix Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Elixir, Phoenix, BEAM, Containerization, DevOps, Production

Description: Build production Docker images for Elixir Phoenix applications using Mix releases with minimal Alpine-based containers.

---

Elixir Phoenix applications run on the BEAM virtual machine, the same runtime that powers Erlang's legendary reliability. Containerizing Phoenix properly means building a Mix release, packaging it in a minimal image, and configuring the BEAM for container environments. This guide takes you from development to a production-ready Docker image.

## Why Releases for Docker

Phoenix applications can run in two modes: with Mix (the build tool) or as a compiled release. For Docker, always use releases. Releases are self-contained packages that include your compiled application, the Erlang runtime, and all dependencies. No source code, no build tools, no Mix needed at runtime.

Benefits of releases in Docker:
- Smaller images (no source code, no build tools, no hex packages)
- Faster startup (code is pre-compiled)
- Better security (no compiler or build tools in the production image)

## A Basic Phoenix Application

Here is the key configuration for a Phoenix app prepared for releases:

```elixir
# config/runtime.exs - Runtime configuration for releases
import Config

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise "DATABASE_URL environment variable is not set"

  config :my_app, MyApp.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10")

  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise "SECRET_KEY_BASE environment variable is not set"

  host = System.get_env("PHX_HOST") || "example.com"
  port = String.to_integer(System.get_env("PORT") || "4000")

  config :my_app, MyAppWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      ip: {0, 0, 0, 0},
      port: port
    ],
    secret_key_base: secret_key_base,
    server: true
end
```

## The Multi-Stage Dockerfile

This Dockerfile builds the Elixir release and packages it in a minimal Alpine image:

```dockerfile
# Dockerfile - Elixir Phoenix production build

# === Stage 1: Build the release ===
FROM elixir:1.16-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    git \
    nodejs \
    npm

# Set build environment
ENV MIX_ENV=prod

WORKDIR /app

# Install Hex and Rebar (Elixir build tools)
RUN mix local.hex --force && \
    mix local.rebar --force

# Install Elixir dependencies first for layer caching
COPY mix.exs mix.lock ./
RUN mix deps.get --only prod
RUN mix deps.compile

# Install and build frontend assets
COPY assets/package.json assets/package-lock.json ./assets/
RUN npm --prefix assets ci

COPY priv ./priv
COPY assets ./assets

# Build frontend assets (CSS, JavaScript)
RUN mix assets.deploy

# Copy the rest of the application source
COPY config ./config
COPY lib ./lib

# Compile the application
RUN mix compile

# Build the release
RUN mix release

# === Stage 2: Runtime image ===
FROM alpine:3.19

# Install runtime dependencies
# libstdc++ is needed for the BEAM VM
# openssl is needed for crypto operations
# ncurses is needed for the remote console
RUN apk add --no-cache \
    libstdc++ \
    openssl \
    ncurses-libs \
    curl

# Create a non-root user
RUN addgroup -S elixir && adduser -S elixir -G elixir

WORKDIR /app

# Copy the release from the build stage
COPY --from=builder --chown=elixir:elixir /app/_build/prod/rel/my_app ./

USER elixir

# Expose the Phoenix port
EXPOSE 4000

# Health check against the Phoenix endpoint
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=15s \
  CMD curl -f http://localhost:4000/health || exit 1

# Set environment variables for the release
ENV PHX_HOST=localhost
ENV PORT=4000

# Start the Phoenix server
CMD ["bin/my_app", "start"]
```

## Building and Running

Build the image:

```bash
# Build the Phoenix Docker image
docker build -t my-phoenix-app:1.0 .
```

Check the image size:

```bash
# A Phoenix release image is typically 30-50MB
docker images my-phoenix-app
```

Run the container:

```bash
# Run with required environment variables
docker run -d \
  --name phoenix-app \
  -p 4000:4000 \
  -e DATABASE_URL="ecto://user:pass@db-host:5432/myapp" \
  -e SECRET_KEY_BASE="$(mix phx.gen.secret)" \
  -e PHX_HOST="app.example.com" \
  -e PORT=4000 \
  my-phoenix-app:1.0
```

Test it:

```bash
# Verify the application is running
curl http://localhost:4000/
curl http://localhost:4000/health
```

## Adding a Health Check Endpoint

Add a simple health check to your Phoenix router:

```elixir
# lib/my_app_web/router.ex
scope "/", MyAppWeb do
  pipe_through :api

  get "/health", HealthController, :index
end
```

```elixir
# lib/my_app_web/controllers/health_controller.ex
defmodule MyAppWeb.HealthController do
  use MyAppWeb, :controller

  def index(conn, _params) do
    # Check database connectivity
    db_status =
      try do
        Ecto.Adapters.SQL.query!(MyApp.Repo, "SELECT 1")
        "ok"
      rescue
        _ -> "failed"
      end

    status = if db_status == "ok", do: 200, else: 503

    json(conn, %{
      status: if(status == 200, do: "UP", else: "DOWN"),
      checks: %{database: db_status}
    })
  end
end
```

## BEAM VM Configuration for Containers

The BEAM VM needs specific settings for container environments. Create a `rel/vm.args.eex` file:

```
# rel/vm.args.eex - BEAM VM arguments for containers

# Set the node name using the hostname
-name my_app@127.0.0.1

# Set the cookie for distributed Erlang
-setcookie ${RELEASE_COOKIE}

# Memory settings
+MBas aobf

# Scheduler settings - use the container's CPU count
+S ${SCHEDULERS}:${SCHEDULERS}

# Enable kernel polling for better I/O performance
+K true

# Set the async thread pool size
+A 64

# Set the maximum number of ports (file descriptors)
+Q 65536

# Set the maximum number of processes
+P 1048576

# Garbage collection settings - full sweep after 20 generations
-env ERL_FULLSWEEP_AFTER 20
```

Configure the release in `mix.exs`:

```elixir
# mix.exs - Release configuration
def project do
  [
    app: :my_app,
    version: "1.0.0",
    elixir: "~> 1.16",
    releases: [
      my_app: [
        include_executables_for: [:unix],
        applications: [runtime_tools: :permanent],
        strip_beams: true  # Remove debug info for smaller releases
      ]
    ]
  ]
end
```

## Docker Compose for Development

```yaml
# docker-compose.yml - Phoenix development environment
version: "3.9"

services:
  app:
    build:
      context: .
      target: builder  # Use the builder stage for development
    ports:
      - "4000:4000"
    volumes:
      - .:/app
      - deps:/app/deps
      - build:/app/_build
    environment:
      MIX_ENV: dev
      DATABASE_URL: ecto://postgres:postgres@db:5432/my_app_dev
      SECRET_KEY_BASE: dev-secret-key-base-that-is-at-least-64-characters-long-for-development
      PHX_HOST: localhost
      PORT: 4000
    command: mix phx.server
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: my_app_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
      retries: 5

volumes:
  pgdata:
  deps:
  build:
```

## Docker Compose for Production

```yaml
# docker-compose.prod.yml - Phoenix production deployment
version: "3.9"

services:
  app:
    image: my-phoenix-app:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      PHX_HOST: ${PHX_HOST}
      PORT: 4000
      POOL_SIZE: 20
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 15s

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: my_app_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "${DB_USER}"]
      interval: 10s
      retries: 5

volumes:
  pgdata:
```

## Running Migrations

Run Ecto migrations as part of the release:

```elixir
# lib/my_app/release.ex - Release tasks
defmodule MyApp.Release do
  @app :my_app

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
```

Run migrations from the container:

```bash
# Run database migrations
docker exec phoenix-app bin/my_app eval "MyApp.Release.migrate()"

# Or run migrations during deployment
docker run --rm \
  -e DATABASE_URL="${DATABASE_URL}" \
  -e SECRET_KEY_BASE="${SECRET_KEY_BASE}" \
  my-phoenix-app:1.0 \
  bin/my_app eval "MyApp.Release.migrate()"
```

## Connecting to a Running Container

One of the BEAM's best features is the ability to connect a remote console to a running application:

```bash
# Open a remote IEx console to the running application
docker exec -it phoenix-app bin/my_app remote
```

This gives you a live interactive Elixir shell connected to the running application, invaluable for debugging production issues.

## Performance Notes

Phoenix on the BEAM is already fast and handles concurrency well. A few container-specific tips:

1. **Set POOL_SIZE based on container resources.** A good starting point is 2x the number of CPU cores allocated to the container.

2. **Enable the BEAM's kernel poll.** The `+K true` flag in vm.args enables epoll/kqueue for efficient I/O handling.

3. **Use `strip_beams: true`.** This removes debug information from compiled BEAM files, reducing the release size by 30-50%.

4. **The BEAM handles concurrency natively.** Unlike PHP or Ruby, you do not need multiple processes or workers for concurrent request handling. A single Phoenix container handles thousands of simultaneous connections.

Elixir Phoenix and Docker fit together naturally. The release system produces self-contained artifacts, the BEAM runtime is container-friendly, and the small Alpine-based images start quickly. This combination gives you a production deployment that is both reliable and resource-efficient.
