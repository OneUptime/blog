# How to Deploy Apache Superset via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Apache Superset, Business Intelligence, Self-Hosted, Data Visualization

Description: Deploy Apache Superset, the modern data exploration and visualization platform, as a Docker stack through Portainer for self-hosted business intelligence.

## Introduction

Apache Superset is an open-source business intelligence and data visualization platform that connects to dozens of databases and provides a drag-and-drop chart builder, interactive dashboards, and a SQL editor. Deploying it via Portainer makes it easy to manage in your self-hosted infrastructure.

## Prerequisites

- Portainer CE or BE installed
- Host with at least 4 GB RAM
- Docker Engine 20.10+
- A database to connect to (PostgreSQL, MySQL, Snowflake, etc.)

## Step 1: Generate a Secret Key

```bash
# Generate a secure secret key for Superset

openssl rand -base64 42
```

## Step 2: Create the Stack in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor**:

```yaml
version: "3.8"

services:
  # Redis - Superset's cache and async query backend
  superset-redis:
    image: redis:7.2-alpine
    container_name: superset-redis
    restart: unless-stopped
    volumes:
      - superset_redis_data:/data
    networks:
      - superset-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # PostgreSQL - Superset's metadata database
  superset-db:
    image: postgres:16-alpine
    container_name: superset-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: superset
      POSTGRES_USER: superset
      POSTGRES_PASSWORD: supersetpassword
    volumes:
      - superset_db_data:/var/lib/postgresql/data
    networks:
      - superset-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U superset -d superset"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Superset init - applies migrations and creates the admin user
  superset-init:
    image: apache/superset:4.0.2
    container_name: superset-init
    depends_on:
      superset-db:
        condition: service_healthy
      superset-redis:
        condition: service_healthy
    environment:
      # Must be a long random string
      SUPERSET_SECRET_KEY: "your_generated_secret_key_here"
      SQLALCHEMY_DATABASE_URI: postgresql+psycopg2://superset:supersetpassword@superset-db:5432/superset
      REDIS_HOST: superset-redis
      REDIS_PORT: 6379
      REDIS_RESULTS_DB: 1
      CELERY_BROKER_URL: redis://superset-redis:6379/0
      CELERY_RESULT_BACKEND: redis://superset-redis:6379/1
    volumes:
      - superset_home:/app/superset_home
    networks:
      - superset-net
    command: >
      sh -c "
        cat >/app/pythonpath/superset_config.py <<'EOF'
        import os
        from flask_caching.backends.rediscache import RedisCache

        SECRET_KEY = os.environ['SUPERSET_SECRET_KEY']
        SQLALCHEMY_DATABASE_URI = os.environ['SQLALCHEMY_DATABASE_URI']

        class CeleryConfig:
            broker_url = os.environ['CELERY_BROKER_URL']
            imports = ('superset.sql_lab',)
            result_backend = os.environ['CELERY_RESULT_BACKEND']
            worker_prefetch_multiplier = 1
            task_acks_late = False

        CELERY_CONFIG = CeleryConfig
        RESULTS_BACKEND = RedisCache(
            host=os.environ['REDIS_HOST'],
            port=int(os.environ.get('REDIS_PORT', '6379')),
            db=int(os.environ.get('REDIS_RESULTS_DB', '1')),
            key_prefix='superset_results',
        )
        CACHE_CONFIG = {
            'CACHE_TYPE': 'RedisCache',
            'CACHE_DEFAULT_TIMEOUT': 300,
            'CACHE_KEY_PREFIX': 'superset_',
            'CACHE_REDIS_HOST': os.environ['REDIS_HOST'],
            'CACHE_REDIS_PORT': int(os.environ.get('REDIS_PORT', '6379')),
            'CACHE_REDIS_DB': int(os.environ.get('REDIS_RESULTS_DB', '1')),
        }
        DATA_CACHE_CONFIG = CACHE_CONFIG
        EOF
        superset db upgrade &&
        superset fab create-admin \
          --username admin \
          --firstname Superset \
          --lastname Admin \
          --email admin@superset.com \
          --password admin &&
        superset init
      "

  # Superset - main application
  superset-app:
    image: apache/superset:4.0.2
    container_name: superset-app
    restart: unless-stopped
    depends_on:
      superset-init:
        condition: service_completed_successfully
    ports:
      - "8088:8088"
    environment:
      # Must be a long random string
      SUPERSET_SECRET_KEY: "your_generated_secret_key_here"
      SQLALCHEMY_DATABASE_URI: postgresql+psycopg2://superset:supersetpassword@superset-db:5432/superset
      REDIS_HOST: superset-redis
      REDIS_PORT: 6379
      REDIS_RESULTS_DB: 1
      CELERY_BROKER_URL: redis://superset-redis:6379/0
      CELERY_RESULT_BACKEND: redis://superset-redis:6379/1
    volumes:
      - superset_home:/app/superset_home
    networks:
      - superset-net
    command: >
      sh -c "
        cat >/app/pythonpath/superset_config.py <<'EOF'
        import os
        from flask_caching.backends.rediscache import RedisCache

        SECRET_KEY = os.environ['SUPERSET_SECRET_KEY']
        SQLALCHEMY_DATABASE_URI = os.environ['SQLALCHEMY_DATABASE_URI']

        class CeleryConfig:
            broker_url = os.environ['CELERY_BROKER_URL']
            imports = ('superset.sql_lab',)
            result_backend = os.environ['CELERY_RESULT_BACKEND']
            worker_prefetch_multiplier = 1
            task_acks_late = False

        CELERY_CONFIG = CeleryConfig
        RESULTS_BACKEND = RedisCache(
            host=os.environ['REDIS_HOST'],
            port=int(os.environ.get('REDIS_PORT', '6379')),
            db=int(os.environ.get('REDIS_RESULTS_DB', '1')),
            key_prefix='superset_results',
        )
        CACHE_CONFIG = {
            'CACHE_TYPE': 'RedisCache',
            'CACHE_DEFAULT_TIMEOUT': 300,
            'CACHE_KEY_PREFIX': 'superset_',
            'CACHE_REDIS_HOST': os.environ['REDIS_HOST'],
            'CACHE_REDIS_PORT': int(os.environ.get('REDIS_PORT', '6379')),
            'CACHE_REDIS_DB': int(os.environ.get('REDIS_RESULTS_DB', '1')),
        }
        DATA_CACHE_CONFIG = CACHE_CONFIG
        EOF
        exec /usr/bin/run-server.sh
      "

  # Celery worker for async queries
  superset-worker:
    image: apache/superset:4.0.2
    container_name: superset-worker
    restart: unless-stopped
    depends_on:
      superset-init:
        condition: service_completed_successfully
    environment:
      SUPERSET_SECRET_KEY: "your_generated_secret_key_here"
      SQLALCHEMY_DATABASE_URI: postgresql+psycopg2://superset:supersetpassword@superset-db:5432/superset
      REDIS_HOST: superset-redis
      REDIS_PORT: 6379
      REDIS_RESULTS_DB: 1
      CELERY_BROKER_URL: redis://superset-redis:6379/0
      CELERY_RESULT_BACKEND: redis://superset-redis:6379/1
    volumes:
      - superset_home:/app/superset_home
    networks:
      - superset-net
    command: >
      sh -c "
        cat >/app/pythonpath/superset_config.py <<'EOF'
        import os
        from flask_caching.backends.rediscache import RedisCache

        SECRET_KEY = os.environ['SUPERSET_SECRET_KEY']
        SQLALCHEMY_DATABASE_URI = os.environ['SQLALCHEMY_DATABASE_URI']

        class CeleryConfig:
            broker_url = os.environ['CELERY_BROKER_URL']
            imports = ('superset.sql_lab',)
            result_backend = os.environ['CELERY_RESULT_BACKEND']
            worker_prefetch_multiplier = 1
            task_acks_late = False

        CELERY_CONFIG = CeleryConfig
        RESULTS_BACKEND = RedisCache(
            host=os.environ['REDIS_HOST'],
            port=int(os.environ.get('REDIS_PORT', '6379')),
            db=int(os.environ.get('REDIS_RESULTS_DB', '1')),
            key_prefix='superset_results',
        )
        CACHE_CONFIG = {
            'CACHE_TYPE': 'RedisCache',
            'CACHE_DEFAULT_TIMEOUT': 300,
            'CACHE_KEY_PREFIX': 'superset_',
            'CACHE_REDIS_HOST': os.environ['REDIS_HOST'],
            'CACHE_REDIS_PORT': int(os.environ.get('REDIS_PORT', '6379')),
            'CACHE_REDIS_DB': int(os.environ.get('REDIS_RESULTS_DB', '1')),
        }
        DATA_CACHE_CONFIG = CACHE_CONFIG
        EOF
        exec celery --app=superset.tasks.celery_app:app worker -O fair -l INFO
      "

volumes:
  superset_redis_data:
  superset_db_data:
  superset_home:

networks:
  superset-net:
    driver: bridge
```

## Step 3: Deploy the Stack

1. Name the stack `superset`
2. Click **Deploy the stack**
3. Wait 2-4 minutes for the initialization to complete

## Step 4: Access Superset

1. Open `http://your-host:8088`
2. Log in with `admin` / `admin`
3. **Immediately change the admin password** under the user icon → **Profile**

## Step 5: Connect a Database

1. Go to **Settings** → **Data: Database Connections** → **+ Database**
2. Select your database type (PostgreSQL, MySQL, BigQuery, etc.)
3. For PostgreSQL:
   ```text
   postgresql://username:password@your-db-host:5432/dbname
   ```
4. Click **Test Connection** → **Connect**

## Step 6: Create a Dataset

1. **Datasets** → **+ Dataset**
2. Select the database and schema
3. Choose a table. For a virtual dataset, create the SQL in **SQL Lab** and save it as a dataset
4. Click **Add**

## Step 7: Build a Chart

1. Go to **Charts** → **+ Chart**
2. Select your dataset
3. Choose a chart type (Bar, Line, Pie, Table, etc.)
4. Drag metrics and dimensions into the configuration
5. Click **Run** → **Save**

## Step 8: Create a Dashboard

1. **Dashboards** → **+ Dashboard**
2. Drag and drop charts onto the canvas
3. Set the refresh interval for auto-updating dashboards
4. Click **Save**

## Step 9: Add Custom Database Drivers

For databases not included in the base image:

```bash
# Temporary until the container is recreated
docker exec -u 0 -it superset-app pip install oracledb

# Or add to a custom Dockerfile
FROM apache/superset:4.0.2
USER root
RUN pip install oracledb pydruid
USER superset
```

## Step 10: Enable Async Queries

SQL Lab async execution is already handled by the Celery worker in the stack above. To enable global async queries for dashboards and Explore in Superset 4.0.2, add this to `superset_config.py`:

```python
FEATURE_FLAGS = {
    "GLOBAL_ASYNC_QUERIES": True,
}
GLOBAL_ASYNC_QUERIES_REDIS_CONFIG = {
    "port": 6379,
    "host": "superset-redis",
    "db": 0,
}
```

Write this into the same `/app/pythonpath/superset_config.py` file used by the stack above.

## Conclusion

Apache Superset deployed via Portainer provides your team with enterprise-grade business intelligence capabilities - SQL lab, interactive charts, and shareable dashboards - all self-hosted. Portainer makes it straightforward to monitor the Celery workers, view application logs, and update to new versions as they're released.
