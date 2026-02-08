# How to Run Apache Superset in Docker for Data Visualization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Apache Superset, Data Visualization, Dashboards, Analytics, Docker Compose, BI

Description: Deploy Apache Superset in Docker to create interactive dashboards and data visualizations connected to your databases and data warehouses.

---

Apache Superset is an open-source business intelligence platform that lets you build interactive dashboards and explore data visually. It connects to virtually any SQL database, supports dozens of chart types, and provides a modern web interface for data exploration. Running Superset in Docker is the recommended approach for both development and production, since the project itself maintains official Docker Compose configurations.

## What Superset Offers

Superset covers the full spectrum of data visualization needs:

- Interactive dashboards with drill-down capabilities
- A SQL editor (SQL Lab) for ad-hoc queries
- 40+ chart types out of the box
- Role-based access control for multi-tenant environments
- Support for PostgreSQL, MySQL, ClickHouse, BigQuery, Snowflake, and many more databases
- Scheduled report delivery via email or Slack

## Quick Start with Docker Compose

The Superset project provides an official Docker Compose setup. Clone the repository and start it:

```bash
# Clone the official Superset repository
git clone https://github.com/apache/superset.git
cd superset

# Launch Superset with all dependencies
docker compose -f docker-compose-non-dev.yml up -d
```

This starts Superset along with PostgreSQL (metadata store), Redis (caching and Celery broker), and a Celery worker for async queries. Once the containers are running, open `http://localhost:8088` and log in with the default credentials: `admin` / `admin`.

## Custom Docker Compose Setup

For more control over the configuration, build your own Docker Compose file:

```yaml
# docker-compose.yml - Apache Superset with PostgreSQL and Redis
version: "3.8"

x-superset-common: &superset-common
  image: apache/superset:latest
  environment: &superset-env
    SUPERSET_SECRET_KEY: your-secret-key-change-this-in-production
    DATABASE_HOST: postgres
    DATABASE_PORT: 5432
    DATABASE_USER: superset
    DATABASE_PASSWORD: superset
    DATABASE_DB: superset
    REDIS_HOST: redis
    REDIS_PORT: 6379
    SQLALCHEMY_DATABASE_URI: postgresql+psycopg2://superset:superset@postgres:5432/superset
    CELERY_BROKER_URL: redis://redis:6379/0
    CELERY_RESULT_BACKEND: redis://redis:6379/0
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  networks:
    - superset-net

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: superset
      POSTGRES_PASSWORD: superset
      POSTGRES_DB: superset
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U superset"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - superset-net

  redis:
    image: redis:7
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - superset-net

  superset-init:
    <<: *superset-common
    command: >
      bash -c "
        superset db upgrade &&
        superset fab create-admin --username admin --firstname Admin --lastname User --email admin@example.com --password admin &&
        superset init &&
        echo 'Superset initialized successfully'
      "
    restart: "no"

  superset:
    <<: *superset-common
    ports:
      - "8088:8088"
    command: >
      bash -c "
        superset db upgrade &&
        gunicorn --bind 0.0.0.0:8088 --workers 4 --timeout 120 'superset.app:create_app()'
      "
    restart: unless-stopped

  superset-worker:
    <<: *superset-common
    command: celery --app=superset.tasks.celery_app:app worker --pool=prefork --concurrency=4
    restart: unless-stopped

  superset-beat:
    <<: *superset-common
    command: celery --app=superset.tasks.celery_app:app beat --schedule=/tmp/celerybeat-schedule
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:

networks:
  superset-net:
    driver: bridge
```

Start the stack and initialize:

```bash
# Start all services
docker compose up -d

# Run the initialization (creates admin user and sets up metadata)
docker compose run --rm superset-init

# Check that all services are healthy
docker compose ps
```

## Adding Data Sources

Connect Superset to your databases through the UI or via the CLI.

Through the UI: Navigate to Settings > Database Connections > + Database, then enter your connection string.

Through the CLI:

```bash
# Add a PostgreSQL database connection via the Superset CLI
docker compose exec superset superset set-database-uri \
  --database_name "Analytics DB" \
  --uri "postgresql://analyst:password@analytics-db:5432/analytics"
```

Common connection string formats:

```
# PostgreSQL
postgresql+psycopg2://user:password@host:5432/database

# MySQL
mysql+pymysql://user:password@host:3306/database

# ClickHouse
clickhousedb+connect://user:password@host:8123/database

# SQLite (for testing)
sqlite:///path/to/database.db
```

## Installing Database Drivers

Superset needs Python database drivers for each database type. Build a custom image to include the drivers you need:

```dockerfile
# Dockerfile - Superset with additional database drivers
FROM apache/superset:latest

USER root

# Install database drivers for various backends
RUN pip install --no-cache-dir \
    clickhouse-connect \
    mysqlclient \
    snowflake-sqlalchemy \
    sqlalchemy-bigquery \
    sqlalchemy-redshift \
    pymssql

USER superset
```

Update your Docker Compose to use this custom image:

```yaml
x-superset-common: &superset-common
  build:
    context: .
    dockerfile: Dockerfile
  # ... rest of configuration
```

## Custom Superset Configuration

Create a `superset_config.py` file for advanced settings:

```python
# superset_config.py - Custom Superset configuration
import os

# Secret key for session signing (change in production)
SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY", "change-me")

# Database connection for Superset metadata
SQLALCHEMY_DATABASE_URI = os.environ.get(
    "SQLALCHEMY_DATABASE_URI",
    "postgresql+psycopg2://superset:superset@postgres:5432/superset"
)

# Redis configuration for caching and Celery
CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_HOST": os.environ.get("REDIS_HOST", "redis"),
    "CACHE_REDIS_PORT": int(os.environ.get("REDIS_PORT", 6379)),
    "CACHE_REDIS_DB": 1,
}

# Enable asynchronous query execution
FEATURE_FLAGS = {
    "ENABLE_TEMPLATE_PROCESSING": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "ENABLE_EXPLORE_DRAG_AND_DROP": True,
    "ALERT_REPORTS": True,
}

# Row limit for SQL Lab queries
SQL_MAX_ROW = 100000
SUPERSET_WEBSERVER_TIMEOUT = 120

# Celery configuration for async queries and scheduled reports
class CeleryConfig:
    broker_url = os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0")
    result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
    worker_prefetch_multiplier = 1
    task_acks_late = True

CELERY_CONFIG = CeleryConfig

# Email configuration for scheduled reports
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.example.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_STARTTLS = True
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_MAIL_FROM = os.environ.get("SMTP_MAIL_FROM", "superset@example.com")
```

Mount the config file in Docker Compose:

```yaml
  superset:
    <<: *superset-common
    volumes:
      - ./superset_config.py:/app/pythonpath/superset_config.py
    environment:
      <<: *superset-env
      SUPERSET_CONFIG_PATH: /app/pythonpath/superset_config.py
```

## Loading Example Data

Superset includes sample datasets for learning:

```bash
# Load example dashboards and datasets into Superset
docker compose exec superset superset load-examples
```

This adds several datasets and pre-built dashboards that demonstrate different chart types and dashboard layouts.

## Importing and Exporting Dashboards

Export dashboards for version control or migration:

```bash
# Export all dashboards as a ZIP file
docker compose exec superset superset export-dashboards -f /tmp/dashboards.zip

# Copy the export to your host machine
docker compose cp superset:/tmp/dashboards.zip ./dashboards.zip
```

Import dashboards on a different instance:

```bash
# Copy the dashboard export into the container
docker compose cp ./dashboards.zip superset:/tmp/dashboards.zip

# Import the dashboards
docker compose exec superset superset import-dashboards -p /tmp/dashboards.zip
```

## Setting Up Scheduled Reports

With the Celery worker and beat services running, you can schedule email or Slack reports:

1. Create a dashboard or chart in the Superset UI
2. Click the three-dot menu and select "Schedule Email Report"
3. Configure the schedule, recipients, and format
4. The Celery beat service will trigger report generation according to the schedule

Verify that the Celery worker and beat services are running:

```bash
# Check Celery worker status
docker compose logs superset-worker --tail 20

# Check Celery beat status
docker compose logs superset-beat --tail 20
```

## Wrapping Up

Apache Superset in Docker gives you a full-featured business intelligence platform in minutes. The Docker Compose setup handles the complex multi-service architecture - web server, async workers, metadata database, and caching layer - so you can focus on building dashboards and exploring data. Custom database drivers extend connectivity to virtually any data source, and the export/import functionality enables version-controlled dashboard management. For teams that need self-hosted analytics without the cost of commercial BI tools, Superset delivers impressive capabilities.
