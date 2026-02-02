# How to Deploy Phoenix Applications to Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elixir, Phoenix, Deployment, Production, DevOps

Description: A comprehensive guide to deploying Phoenix applications to production. Learn about releases, Docker containerization, database migrations, environment configuration, load balancing, and monitoring strategies.

---

Deploying a Phoenix application to production requires understanding Elixir releases, proper configuration management, database migrations, and infrastructure setup. This guide covers everything you need to take your Phoenix app from development to a production-ready deployment.

Phoenix applications benefit from the BEAM virtual machine's fault tolerance and hot code upgrades. Combined with OTP releases, you get a deployment model that is reliable, efficient, and straightforward once you understand the fundamentals.

## Deployment Architecture Overview

Before diving into implementation, let's understand how the pieces fit together in a typical production deployment.

```mermaid
flowchart TB
    subgraph Internet
        Users[Users]
    end

    subgraph LoadBalancer[Load Balancer]
        LB[Nginx / HAProxy]
    end

    subgraph AppServers[Application Servers]
        App1[Phoenix Node 1]
        App2[Phoenix Node 2]
        App3[Phoenix Node 3]
    end

    subgraph DataLayer[Data Layer]
        DB[(PostgreSQL)]
        Cache[(Redis)]
    end

    subgraph Monitoring[Monitoring]
        Logs[Log Aggregation]
        Metrics[Metrics/APM]
    end

    Users --> LB
    LB --> App1
    LB --> App2
    LB --> App3
    App1 --> DB
    App2 --> DB
    App3 --> DB
    App1 --> Cache
    App2 --> Cache
    App3 --> Cache
    App1 --> Logs
    App2 --> Logs
    App3 --> Logs
    App1 --> Metrics
    App2 --> Metrics
    App3 --> Metrics
```

## Building Releases with Mix

Elixir releases bundle your application, the Erlang runtime, and all dependencies into a self-contained directory. This eliminates the need to install Elixir or Erlang on your production servers.

Phoenix 1.6 and later include release configuration by default. The release is configured in `mix.exs` and customized through `rel/` directory files.

### Configuring Your Release

First, verify your `mix.exs` has the release configuration. The default Phoenix generator includes this, but here is what it should look like.

```elixir
# mix.exs
defmodule MyApp.MixProject do
  use Mix.Project

  def project do
    [
      app: :my_app,
      version: "0.1.0",
      elixir: "~> 1.14",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps(),
      # Release configuration
      releases: [
        my_app: [
          include_executables_for: [:unix],
          applications: [runtime_tools: :permanent]
        ]
      ]
    ]
  end

  # Configuration for the OTP application
  def application do
    [
      mod: {MyApp.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies which paths to compile per environment
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      {:phoenix, "~> 1.7.0"},
      {:phoenix_ecto, "~> 4.4"},
      {:ecto_sql, "~> 3.10"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix_html, "~> 3.3"},
      {:phoenix_live_reload, "~> 1.2", only: :dev},
      {:phoenix_live_view, "~> 0.20.0"},
      {:telemetry_metrics, "~> 0.6"},
      {:telemetry_poller, "~> 1.0"},
      {:jason, "~> 1.2"},
      {:plug_cowboy, "~> 2.5"}
    ]
  end

  defp aliases do
    [
      setup: ["deps.get", "ecto.setup", "assets.setup"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"],
      "assets.setup": ["tailwind.install --if-missing", "esbuild.install --if-missing"],
      "assets.build": ["tailwind default", "esbuild default"],
      "assets.deploy": ["tailwind default --minify", "esbuild default --minify", "phx.digest"]
    ]
  end
end
```

### Runtime Configuration

Production configuration should use runtime environment variables, not compile-time values. Phoenix uses `config/runtime.exs` for this purpose.

```elixir
# config/runtime.exs
import Config

# This file is executed at runtime, not compile time
# Environment variables are read when the application starts

if config_env() == :prod do
  # Database configuration from environment variables
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :my_app, MyApp.Repo,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    socket_options: maybe_ipv6

  # Secret key base for signing cookies and tokens
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  # Host and port configuration
  host = System.get_env("PHX_HOST") || "example.com"
  port = String.to_integer(System.get_env("PORT") || "4000")

  config :my_app, MyAppWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      ip: {0, 0, 0, 0, 0, 0, 0, 0},
      port: port
    ],
    secret_key_base: secret_key_base

  # Enable server mode for releases
  config :my_app, MyAppWeb.Endpoint, server: true

  # Optional: Configure release node name for clustering
  config :my_app, MyApp.Repo,
    # Use longer timeout for production databases
    timeout: 60_000,
    queue_target: 5_000
end
```

### Building the Release

With configuration in place, build your release using these commands.

```bash
# Set environment to production
export MIX_ENV=prod

# Get dependencies
mix deps.get --only prod

# Compile the application
mix compile

# Build static assets (JavaScript, CSS)
mix assets.deploy

# Create the release
mix release
```

The release is created in `_build/prod/rel/my_app/`. This directory contains everything needed to run your application.

---

## Docker Containerization

Docker provides consistent deployments across environments. Here is a production-ready Dockerfile using multi-stage builds to minimize image size.

```dockerfile
# Dockerfile
# Build stage - compiles the application
FROM hexpm/elixir:1.15.7-erlang-26.1.2-alpine-3.18.4 AS builder

# Install build dependencies
RUN apk add --no-cache build-base git npm

# Set working directory
WORKDIR /app

# Install hex and rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Set build environment
ENV MIX_ENV=prod

# Copy dependency files first for better caching
COPY mix.exs mix.lock ./
COPY config config

# Install and compile dependencies
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# Copy compile-time config
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix deps.compile

# Copy application code
COPY priv priv
COPY lib lib
COPY assets assets

# Build assets
RUN mix assets.deploy

# Compile application
RUN mix compile

# Copy runtime configuration
COPY config/runtime.exs config/

# Create release
COPY rel rel
RUN mix release

# Runtime stage - minimal image for running the application
FROM alpine:3.18.4 AS runner

# Install runtime dependencies
RUN apk add --no-cache libstdc++ openssl ncurses-libs

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -S myapp && adduser -S myapp -G myapp
USER myapp

# Copy release from builder stage
COPY --from=builder --chown=myapp:myapp /app/_build/prod/rel/my_app ./

# Set environment variables
ENV HOME=/app
ENV MIX_ENV=prod
ENV PHX_SERVER=true

# Expose the application port
EXPOSE 4000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Start the application
CMD ["bin/my_app", "start"]
```

### Docker Compose for Local Testing

Use Docker Compose to test your production build locally with all dependencies.

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: ecto://postgres:postgres@db/my_app_prod
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      PHX_HOST: localhost
      PORT: 4000
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: my_app_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Build and run with Docker Compose.

```bash
# Generate secret key base
export SECRET_KEY_BASE=$(mix phx.gen.secret)

# Build the image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f app
```

---

## Database Migrations in Production

Running migrations in production requires careful handling. Releases include a special command for this purpose.

### Creating a Migration Module

Phoenix releases need a custom module to run migrations. Create this file in your application.

```elixir
# lib/my_app/release.ex
defmodule MyApp.Release do
  @moduledoc """
  Functions for running migrations and other release tasks.

  These are used via the release commands:
    bin/my_app eval "MyApp.Release.migrate"
  """

  @app :my_app

  # Run all pending migrations
  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  # Rollback the last migration
  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  # Get the current migration status
  def migration_status do
    load_app()

    for repo <- repos() do
      {:ok, status, _} = Ecto.Migrator.with_repo(repo, fn repo ->
        Ecto.Migrator.migrations(repo)
      end)

      IO.puts("Migrations for #{inspect(repo)}:")

      Enum.each(status, fn {status, version, name} ->
        IO.puts("  #{status} #{version} #{name}")
      end)
    end
  end

  # Seed the database
  def seed do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, fn _repo ->
        # Run seed file
        seed_path = priv_path_for(repo, "seeds.exs")

        if File.exists?(seed_path) do
          Code.eval_file(seed_path)
        end
      end)
    end
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end

  defp priv_path_for(repo, filename) do
    app = Keyword.get(repo.config(), :otp_app)
    priv_dir = "#{:code.priv_dir(app)}"
    Path.join([priv_dir, "repo", filename])
  end
end
```

### Running Migrations

With the release module in place, run migrations using these commands.

```bash
# Run migrations in production release
bin/my_app eval "MyApp.Release.migrate"

# Check migration status
bin/my_app eval "MyApp.Release.migration_status"

# Rollback to a specific version
bin/my_app eval "MyApp.Release.rollback(MyApp.Repo, 20231001000000)"

# Seed the database
bin/my_app eval "MyApp.Release.seed"
```

### Migration Best Practices

Follow these practices for safe production migrations.

| Practice | Description |
|----------|-------------|
| Backward compatible | Old code should work with new schema |
| Separate deploy from migrate | Deploy first, migrate second |
| Avoid locks | Use concurrent indexes |
| Test rollbacks | Verify rollback works before deploying |
| Keep migrations fast | Split large data migrations |

```elixir
# Example: Safe concurrent index migration
defmodule MyApp.Repo.Migrations.AddUserEmailIndex do
  use Ecto.Migration

  # Disable transaction for concurrent index creation
  @disable_ddl_transaction true
  @disable_migration_lock true

  def change do
    # Create index concurrently to avoid locking the table
    create index(:users, [:email], concurrently: true)
  end
end
```

---

## Environment Configuration

Production applications need different configurations than development. Here is how to structure environment-specific settings.

### Configuration Files Structure

```mermaid
flowchart LR
    subgraph CompileTime[Compile Time]
        config[config/config.exs]
        dev[config/dev.exs]
        prod[config/prod.exs]
        test[config/test.exs]
    end

    subgraph Runtime[Runtime]
        runtime[config/runtime.exs]
        env[Environment Variables]
    end

    config --> dev
    config --> prod
    config --> test
    runtime --> env

    style runtime fill:#90EE90
    style env fill:#90EE90
```

### Production Configuration File

The production config should be minimal since most values come from runtime configuration.

```elixir
# config/prod.exs
import Config

# Do not print debug messages in production
config :logger, level: :info

# Disable code reloading
config :phoenix, :serve_endpoints, true

# Configure your endpoint for production
config :my_app, MyAppWeb.Endpoint,
  cache_static_manifest: "priv/static/cache_manifest.json"

# Configure SSL if terminating at the app level
# config :my_app, MyAppWeb.Endpoint,
#   https: [
#     port: 443,
#     cipher_suite: :strong,
#     keyfile: System.get_env("SSL_KEY_PATH"),
#     certfile: System.get_env("SSL_CERT_PATH")
#   ]
```

### Environment Variables Checklist

Ensure these environment variables are set in production.

```bash
# Required for Phoenix
export SECRET_KEY_BASE="your-64-character-secret-key"
export DATABASE_URL="ecto://user:pass@host/database"
export PHX_HOST="your-domain.com"
export PORT="4000"

# Optional but recommended
export POOL_SIZE="20"
export ECTO_IPV6="false"

# For clustering (if using distributed Elixir)
export RELEASE_NODE="my_app@10.0.0.1"
export RELEASE_COOKIE="your-erlang-cookie"

# Application-specific
export SMTP_HOST="smtp.example.com"
export REDIS_URL="redis://localhost:6379"
```

---

## Load Balancer Configuration

Production deployments typically use a reverse proxy like Nginx or a cloud load balancer.

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/my_app
upstream phoenix {
    # Add multiple servers for load balancing
    server 127.0.0.1:4000;
    server 127.0.0.1:4001;
    server 127.0.0.1:4002;

    # Enable keepalive connections
    keepalive 32;
}

server {
    listen 80;
    server_name example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Proxy settings
    location / {
        proxy_pass http://phoenix;
        proxy_http_version 1.1;

        # Required for WebSocket support (Phoenix Channels/LiveView)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Forward client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-polling
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Serve static files directly
    location /assets {
        alias /var/www/my_app/priv/static/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://phoenix;
        proxy_http_version 1.1;
    }
}
```

### Health Check Endpoint

Add a health check endpoint for load balancers and container orchestrators.

```elixir
# lib/my_app_web/controllers/health_controller.ex
defmodule MyAppWeb.HealthController do
  use MyAppWeb, :controller

  @doc """
  Basic health check - returns 200 if the app is running.
  Used by load balancers and container health checks.
  """
  def index(conn, _params) do
    conn
    |> put_status(:ok)
    |> json(%{status: "ok"})
  end

  @doc """
  Deep health check - verifies database connectivity.
  Use for readiness probes in Kubernetes.
  """
  def ready(conn, _params) do
    case check_database() do
      :ok ->
        conn
        |> put_status(:ok)
        |> json(%{status: "ok", database: "connected"})

      {:error, reason} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{status: "error", database: reason})
    end
  end

  defp check_database do
    try do
      Ecto.Adapters.SQL.query!(MyApp.Repo, "SELECT 1", [])
      :ok
    rescue
      e -> {:error, Exception.message(e)}
    end
  end
end
```

Add the routes to your router.

```elixir
# lib/my_app_web/router.ex
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  # Health check routes - no authentication required
  scope "/", MyAppWeb do
    pipe_through [:api]

    get "/health", HealthController, :index
    get "/health/ready", HealthController, :ready
  end

  # ... rest of your routes
end
```

---

## Systemd Service Configuration

For deployments on traditional Linux servers, systemd manages the application lifecycle.

```ini
# /etc/systemd/system/my_app.service
[Unit]
Description=My Phoenix Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/my_app
ExecStart=/opt/my_app/bin/my_app start
ExecStop=/opt/my_app/bin/my_app stop
Restart=on-failure
RestartSec=5
SyslogIdentifier=my_app

# Environment configuration
Environment=MIX_ENV=prod
Environment=PORT=4000
Environment=LANG=en_US.UTF-8

# Load secrets from a separate file
EnvironmentFile=/opt/my_app/.env

# Process limits
LimitNOFILE=65536

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/my_app

[Install]
WantedBy=multi-user.target
```

Enable and manage the service.

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable my_app

# Start the service
sudo systemctl start my_app

# Check status
sudo systemctl status my_app

# View logs
sudo journalctl -u my_app -f
```

---

## Monitoring and Observability

Production applications need comprehensive monitoring. Phoenix integrates well with various observability tools.

### Telemetry Setup

Phoenix uses Telemetry for instrumentation. Configure it to export metrics.

```elixir
# lib/my_app/telemetry.ex
defmodule MyApp.Telemetry do
  use Supervisor
  import Telemetry.Metrics

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  @impl true
  def init(_arg) do
    children = [
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  def metrics do
    [
      # Phoenix Metrics
      summary("phoenix.endpoint.start.system_time",
        unit: {:native, :millisecond}
      ),
      summary("phoenix.endpoint.stop.duration",
        unit: {:native, :millisecond}
      ),
      summary("phoenix.router_dispatch.start.system_time",
        tags: [:route],
        unit: {:native, :millisecond}
      ),
      summary("phoenix.router_dispatch.stop.duration",
        tags: [:route],
        unit: {:native, :millisecond}
      ),

      # Database Metrics
      summary("my_app.repo.query.total_time",
        unit: {:native, :millisecond},
        description: "Total time spent on database queries"
      ),
      summary("my_app.repo.query.queue_time",
        unit: {:native, :millisecond},
        description: "Time queries spend waiting for a connection"
      ),

      # VM Metrics
      summary("vm.memory.total", unit: {:byte, :megabyte}),
      summary("vm.total_run_queue_lengths.total"),
      summary("vm.total_run_queue_lengths.cpu"),
      summary("vm.total_run_queue_lengths.io")
    ]
  end

  defp periodic_measurements do
    [
      {MyApp.Telemetry, :measure_users, []},
      {MyApp.Telemetry, :measure_connections, []}
    ]
  end

  # Custom measurements
  def measure_users do
    :telemetry.execute(
      [:my_app, :users],
      %{total: MyApp.Accounts.count_users()},
      %{}
    )
  end

  def measure_connections do
    :telemetry.execute(
      [:my_app, :connections],
      %{active: Phoenix.Tracker.list(MyAppWeb.Presence, "users") |> length()},
      %{}
    )
  end
end
```

### Prometheus Metrics Export

Add Prometheus metrics export for scraping by monitoring systems.

```elixir
# Add to mix.exs dependencies
{:telemetry_metrics_prometheus, "~> 1.1"}
```

```elixir
# lib/my_app/application.ex
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      MyApp.Repo,
      MyAppWeb.Telemetry,
      MyAppWeb.Endpoint,
      # Add Prometheus exporter
      {TelemetryMetricsPrometheus, metrics: MyApp.Telemetry.metrics()}
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

### Logging Configuration

Configure structured logging for production log aggregation.

```elixir
# config/prod.exs
config :logger,
  level: :info,
  backends: [:console]

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id, :user_id]

# For JSON logging (recommended for log aggregation)
# Add {:logger_json, "~> 5.0"} to dependencies
config :logger_json, :backend,
  metadata: [:request_id, :user_id, :module, :function],
  json_encoder: Jason
```

---

## Deployment Strategies

Choose a deployment strategy based on your requirements for downtime and risk tolerance.

```mermaid
flowchart TD
    subgraph Rolling[Rolling Deployment]
        R1[Server 1: v1] --> R2[Server 1: v2]
        R3[Server 2: v1] --> R4[Server 2: v2]
        R5[Server 3: v1] --> R6[Server 3: v2]
    end

    subgraph BlueGreen[Blue-Green Deployment]
        BG1[Blue: v1 Active]
        BG2[Green: v2 Ready]
        BG1 --> BG3[Switch Traffic]
        BG3 --> BG4[Green: v2 Active]
    end

    subgraph Canary[Canary Deployment]
        C1[90% Traffic: v1]
        C2[10% Traffic: v2]
        C1 --> C3[Gradual Shift]
        C2 --> C3
        C3 --> C4[100% Traffic: v2]
    end
```

### Rolling Deployment Script

A simple rolling deployment script for multiple servers.

```bash
#!/bin/bash
# deploy.sh - Rolling deployment script

set -e

SERVERS="server1.example.com server2.example.com server3.example.com"
APP_DIR="/opt/my_app"
RELEASE_TAR="my_app.tar.gz"

echo "Starting rolling deployment..."

for SERVER in $SERVERS; do
    echo "Deploying to $SERVER..."

    # Upload new release
    scp $RELEASE_TAR deploy@$SERVER:/tmp/

    # Deploy on server
    ssh deploy@$SERVER << 'EOF'
        set -e

        # Extract new release
        cd /opt/my_app
        tar -xzf /tmp/my_app.tar.gz

        # Run migrations
        bin/my_app eval "MyApp.Release.migrate"

        # Restart the application
        sudo systemctl restart my_app

        # Wait for health check
        sleep 5

        for i in {1..30}; do
            if curl -s http://localhost:4000/health | grep -q "ok"; then
                echo "Health check passed"
                break
            fi
            echo "Waiting for health check..."
            sleep 2
        done

        # Cleanup
        rm /tmp/my_app.tar.gz
EOF

    echo "Successfully deployed to $SERVER"

    # Wait before deploying to next server
    sleep 10
done

echo "Rolling deployment complete!"
```

---

## Kubernetes Deployment

For Kubernetes environments, here are the essential manifests.

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-registry/my-app:latest
          ports:
            - containerPort: 4000
          env:
            - name: PORT
              value: "4000"
            - name: PHX_HOST
              value: "example.com"
            - name: SECRET_KEY_BASE
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: secret-key-base
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: database-url
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 4000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - example.com
      secretName: my-app-tls
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

### Kubernetes Migration Job

Run migrations as a Kubernetes Job before deployment.

```yaml
# kubernetes/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-app-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: my-registry/my-app:latest
          command: ["bin/my_app", "eval", "MyApp.Release.migrate"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: my-app-secrets
                  key: database-url
      restartPolicy: Never
  backoffLimit: 3
```

---

## Production Checklist

Before deploying to production, verify these items.

| Category | Item | Status |
|----------|------|--------|
| Security | SECRET_KEY_BASE is set and secure | Required |
| Security | SSL/TLS configured | Required |
| Security | Database credentials are not in code | Required |
| Database | Migrations tested | Required |
| Database | Backup strategy configured | Required |
| Database | Connection pool sized appropriately | Required |
| Monitoring | Health check endpoint working | Required |
| Monitoring | Logging configured | Required |
| Monitoring | Error tracking set up | Recommended |
| Performance | Static assets compiled and digested | Required |
| Performance | Gzip compression enabled | Recommended |
| Performance | CDN configured for static assets | Recommended |
| Operations | Deployment rollback plan tested | Required |
| Operations | On-call procedures documented | Recommended |

---

## Common Deployment Issues

### Issue: Application Fails to Start

Check environment variables and database connectivity.

```bash
# Debug startup issues
bin/my_app eval "IO.inspect(System.get_env())"

# Test database connection
bin/my_app eval "MyApp.Repo.query!(\"SELECT 1\")"
```

### Issue: WebSocket Connections Fail

Ensure your load balancer supports WebSocket upgrades.

```bash
# Test WebSocket connectivity
wscat -c wss://example.com/live/websocket
```

### Issue: Static Assets Not Loading

Verify the digest was generated and files are accessible.

```bash
# Check static files exist
ls -la priv/static/assets/

# Verify cache manifest
cat priv/static/cache_manifest.json
```

---

## Conclusion

Deploying Phoenix applications to production involves several interconnected pieces: building releases, configuring the runtime environment, managing database migrations, setting up load balancing, and implementing monitoring. The BEAM virtual machine and OTP provide excellent foundations for reliable production systems.

Key takeaways for successful Phoenix deployments:

- Use releases for self-contained deployments without runtime dependencies
- Keep secrets in environment variables, not configuration files
- Run migrations separately from deployments
- Implement health checks for load balancer integration
- Set up comprehensive logging and monitoring
- Test your rollback procedures before you need them

With these practices in place, your Phoenix application will be well-prepared for production traffic.

---

*Need to monitor your Phoenix application in production? [OneUptime](https://oneuptime.com) provides comprehensive monitoring, alerting, and observability for your Elixir applications.*

**Related Reading:**
- [How to Use Phoenix LiveView for Real-Time UIs](https://oneuptime.com/blog/post/2026-01-26-phoenix-liveview-realtime/view)
- [How to Build REST APIs with Phoenix and Elixir](https://oneuptime.com/blog/post/2026-01-26-phoenix-elixir-rest-api/view)
