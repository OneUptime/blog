# How to Deploy Apache Superset for Data Visualization on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Apache Superset, Data Visualization, Business Intelligence, Python, Linux

Description: Deploy Apache Superset on RHEL 9 to create interactive dashboards and explore data through a powerful web-based visualization platform.

---

Apache Superset is an open-source data exploration and visualization platform that connects to a wide range of databases and lets you build rich, interactive dashboards. This guide walks through deploying Superset on RHEL 9 with production-ready settings.

## Prerequisites

- RHEL 9 with at least 4 GB RAM and 2 CPU cores
- Python 3.9 or later
- A database backend (PostgreSQL recommended)
- Root or sudo access

## Architecture Overview

```mermaid
graph TD
    A[Web Browser] --> B[Nginx Reverse Proxy]
    B --> C[Superset Web Server - Gunicorn]
    C --> D[Superset Metadata DB - PostgreSQL]
    C --> E[Redis Cache / Celery Broker]
    C --> F[Data Sources]
    F --> G[MySQL]
    F --> H[PostgreSQL]
    F --> I[ClickHouse]
    F --> J[Other Databases]
    E --> K[Celery Workers]
    K --> F
```

## Step 1: Install System Dependencies

```bash
# Install required development libraries and tools
sudo dnf install -y gcc gcc-c++ python3-devel python3-pip \
    openssl-devel libffi-devel cyrus-sasl-devel \
    openldap-devel postgresql-devel mariadb-devel \
    redis

# Enable and start Redis for caching and Celery
sudo systemctl enable --now redis
```

## Step 2: Install and Configure PostgreSQL

Superset needs a metadata database to store dashboard definitions and user information.

```bash
# Install PostgreSQL
sudo dnf install -y postgresql-server postgresql

# Initialize the database cluster
sudo postgresql-setup --initdb

# Start and enable PostgreSQL
sudo systemctl enable --now postgresql

# Create a database and user for Superset
sudo -u postgres psql <<EOF
CREATE USER superset WITH PASSWORD 'StrongPassword123';
CREATE DATABASE superset OWNER superset;
GRANT ALL PRIVILEGES ON DATABASE superset TO superset;
EOF
```

## Step 3: Create a Python Virtual Environment

```bash
# Create a dedicated user for Superset
sudo useradd -r -m -s /bin/bash superset

# Create the virtual environment
sudo -u superset python3 -m venv /home/superset/venv

# Activate the environment and upgrade pip
sudo -u superset bash -c "
source /home/superset/venv/bin/activate
pip install --upgrade pip setuptools wheel
"
```

## Step 4: Install Apache Superset

```bash
# Install Superset with database drivers
sudo -u superset bash -c "
source /home/superset/venv/bin/activate

# Install Superset
pip install apache-superset

# Install database drivers for common data sources
pip install psycopg2-binary    # PostgreSQL
pip install mysqlclient        # MySQL
pip install clickhouse-connect # ClickHouse
pip install redis              # Redis for caching
pip install gevent             # Async worker support
"
```

## Step 5: Configure Superset

Create the Superset configuration file.

```python
# /home/superset/superset_config.py

import os
from datetime import timedelta

# Generate a strong secret key for session management
# Run this to generate: openssl rand -base64 42
SECRET_KEY = 'YOUR_GENERATED_SECRET_KEY_HERE'

# PostgreSQL metadata database connection
SQLALCHEMY_DATABASE_URI = 'postgresql://superset:StrongPassword123@localhost:5432/superset'

# Redis configuration for caching
CACHE_CONFIG = {
    'CACHE_TYPE': 'RedisCache',
    'CACHE_DEFAULT_TIMEOUT': 300,
    'CACHE_KEY_PREFIX': 'superset_',
    'CACHE_REDIS_HOST': 'localhost',
    'CACHE_REDIS_PORT': 6379,
    'CACHE_REDIS_DB': 1,
}

# Celery configuration for async queries
class CeleryConfig:
    broker_url = 'redis://localhost:6379/0'
    result_backend = 'redis://localhost:6379/0'
    worker_prefetch_multiplier = 1
    task_acks_late = True

CELERY_CONFIG = CeleryConfig

# Enable feature flags
FEATURE_FLAGS = {
    'DASHBOARD_NATIVE_FILTERS': True,
    'DASHBOARD_CROSS_FILTERS': True,
    'ENABLE_TEMPLATE_PROCESSING': True,
}

# Session and security settings
WTF_CSRF_ENABLED = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
PERMANENT_SESSION_LIFETIME = timedelta(hours=8)

# Row limit for SQL queries
ROW_LIMIT = 50000
SQL_MAX_ROW = 100000

# Web server settings
SUPERSET_WEBSERVER_PORT = 8088
SUPERSET_WEBSERVER_TIMEOUT = 120
```

```bash
# Set the configuration path as an environment variable
echo 'export SUPERSET_CONFIG_PATH=/home/superset/superset_config.py' | \
    sudo tee -a /home/superset/.bashrc
```

## Step 6: Initialize the Database

```bash
# Run Superset initialization commands
sudo -u superset bash -c "
source /home/superset/venv/bin/activate
export SUPERSET_CONFIG_PATH=/home/superset/superset_config.py

# Upgrade the metadata database schema
superset db upgrade

# Create an admin user
superset fab create-admin \
    --username admin \
    --firstname Admin \
    --lastname User \
    --email admin@example.com \
    --password admin123

# Load example dashboards (optional, useful for testing)
superset load-examples

# Initialize default roles and permissions
superset init
"
```

## Step 7: Create Systemd Services

Create a service for the Superset web server.

```ini
# /etc/systemd/system/superset.service
[Unit]
Description=Apache Superset Web Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=superset
Group=superset
Environment="SUPERSET_CONFIG_PATH=/home/superset/superset_config.py"
Environment="PATH=/home/superset/venv/bin:/usr/local/bin:/usr/bin"
ExecStart=/home/superset/venv/bin/gunicorn \
    --bind 127.0.0.1:8088 \
    --workers 4 \
    --worker-class gevent \
    --timeout 120 \
    --limit-request-line 0 \
    --limit-request-field_size 0 \
    "superset.app:create_app()"
WorkingDirectory=/home/superset
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create a service for the Celery worker.

```ini
# /etc/systemd/system/superset-celery.service
[Unit]
Description=Apache Superset Celery Worker
After=network.target redis.service

[Service]
Type=simple
User=superset
Group=superset
Environment="SUPERSET_CONFIG_PATH=/home/superset/superset_config.py"
Environment="PATH=/home/superset/venv/bin:/usr/local/bin:/usr/bin"
ExecStart=/home/superset/venv/bin/celery \
    --app=superset.tasks.celery_app:app \
    worker \
    --pool=prefork \
    --concurrency=4 \
    --loglevel=info
WorkingDirectory=/home/superset
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start both services
sudo systemctl daemon-reload
sudo systemctl enable --now superset superset-celery

# Check status
sudo systemctl status superset
sudo systemctl status superset-celery
```

## Step 8: Configure Nginx Reverse Proxy

```bash
sudo dnf install -y nginx
```

```nginx
# /etc/nginx/conf.d/superset.conf
server {
    listen 80;
    server_name superset.example.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120;
    }
}
```

```bash
# Enable and start Nginx
sudo systemctl enable --now nginx

# Open the firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 9: Connect a Data Source

After logging in to Superset at `http://your-server:80`, add a database connection:

1. Go to Settings > Database Connections
2. Click "+ Database"
3. Choose your database type
4. Enter the connection string, for example:

```
# PostgreSQL
postgresql://user:password@dbhost:5432/mydatabase

# MySQL
mysql://user:password@dbhost:3306/mydatabase

# ClickHouse
clickhousedb://user:password@dbhost:8123/mydatabase
```

## Troubleshooting

```bash
# Check Superset logs
sudo journalctl -u superset -f

# Check Celery worker logs
sudo journalctl -u superset-celery -f

# Test the configuration manually
sudo -u superset bash -c "
source /home/superset/venv/bin/activate
export SUPERSET_CONFIG_PATH=/home/superset/superset_config.py
superset run -h 0.0.0.0 -p 8088 --with-threads --debugger
"
```

## Conclusion

Apache Superset is now running on your RHEL 9 server with PostgreSQL as the metadata backend, Redis for caching, and Celery for asynchronous query execution. You can start connecting your data sources and building interactive dashboards. For enhanced security, add SSL certificates with certbot and restrict database connection permissions to only the tables your analysts need.
