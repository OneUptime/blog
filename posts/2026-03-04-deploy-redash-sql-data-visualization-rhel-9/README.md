# How to Deploy Redash for SQL-Based Data Visualization on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Redash, SQL, Data Visualization, Analytics, Linux

Description: Deploy Redash on RHEL 9 to provide your team with a SQL-first data visualization tool for querying databases and sharing dashboards.

---

Redash is an open-source tool built around SQL queries. Analysts write SQL, Redash visualizes the results, and teams share the dashboards. It supports over 35 data sources and makes it simple to collaborate on data analysis. This guide covers deploying Redash on RHEL 9 using Docker Compose.

## Prerequisites

- RHEL 9 with at least 4 GB RAM
- Docker and Docker Compose installed
- Root or sudo access

## Architecture Overview

```mermaid
graph TD
    A[Web Browser] --> B[Nginx]
    B --> C[Redash Web Server]
    C --> D[PostgreSQL - Metadata]
    C --> E[Redis - Cache/Queue]
    C --> F[Redash Celery Workers]
    F --> G[Data Sources]
    G --> H[PostgreSQL DBs]
    G --> I[MySQL DBs]
    G --> J[BigQuery / Snowflake]
```

## Step 1: Install Docker and Docker Compose

```bash
# Install Docker
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl enable --now docker

# Add your user to the docker group
sudo usermod -aG docker $USER
```

## Step 2: Create the Redash Directory Structure

```bash
# Create the working directory
sudo mkdir -p /opt/redash
cd /opt/redash

# Generate a secret key for cookie encryption
echo "REDASH_COOKIE_SECRET=$(openssl rand -base64 32)" | sudo tee .env

# Add additional environment variables
sudo tee -a .env <<EOF
REDASH_DATABASE_URL=postgresql://redash:redash@postgres:5432/redash
REDASH_REDIS_URL=redis://redis:6379/0
REDASH_LOG_LEVEL=INFO
REDASH_MAIL_SERVER=smtp.example.com
REDASH_MAIL_PORT=587
REDASH_MAIL_USE_TLS=true
REDASH_MAIL_USERNAME=redash@example.com
REDASH_MAIL_PASSWORD=email_password
REDASH_MAIL_DEFAULT_SENDER=redash@example.com
PYTHONUNBUFFERED=0
EOF
```

## Step 3: Create the Docker Compose File

```yaml
# /opt/redash/docker-compose.yml
version: '3.8'

services:
  # Redash web server handles the UI and API
  server:
    image: redash/redash:latest
    depends_on:
      - postgres
      - redis
    ports:
      - "5000:5000"
    env_file: .env
    command: server
    restart: unless-stopped

  # Celery worker processes scheduled queries and background tasks
  worker:
    image: redash/redash:latest
    depends_on:
      - server
    env_file: .env
    command: worker
    restart: unless-stopped

  # Celery scheduler triggers periodic query execution
  scheduler:
    image: redash/redash:latest
    depends_on:
      - server
    env_file: .env
    command: scheduler
    restart: unless-stopped

  # PostgreSQL stores Redash metadata (queries, dashboards, users)
  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: redash
      POSTGRES_PASSWORD: redash
      POSTGRES_DB: redash
    restart: unless-stopped

  # Redis serves as cache and message broker for Celery
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
```

## Step 4: Initialize the Database and Start Redash

```bash
cd /opt/redash

# Create the database tables
sudo docker compose run --rm server create_db

# Start all services in the background
sudo docker compose up -d

# Check that all containers are running
sudo docker compose ps
```

## Step 5: Configure the Firewall

```bash
# Allow access to Redash
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

## Step 6: Complete Initial Setup

Open `http://your-server:5000` in a browser. You will be prompted to:

1. Create an admin account
2. Set up your organization name

## Step 7: Add Data Sources

Navigate to Settings > Data Sources > New Data Source. Common configurations:

```
# PostgreSQL
Type: PostgreSQL
Host: your-db-host.example.com
Port: 5432
Database: analytics
User: redash_reader
Password: secure_password

# MySQL
Type: MySQL
Host: mysql.example.com
Port: 3306
Database: sales
User: redash_reader
Password: secure_password
```

## Step 8: Create Your First Query and Dashboard

Write a SQL query to test your data source:

```sql
-- Example: Monthly active users
-- This query calculates unique users per month
SELECT
    DATE_TRUNC('month', login_date) AS month,
    COUNT(DISTINCT user_id) AS active_users
FROM user_logins
WHERE login_date >= NOW() - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1;
```

After running the query:

1. Click "New Visualization" to create a chart
2. Choose your chart type (line, bar, pie, etc.)
3. Save the query
4. Create a new dashboard and add the visualization to it

## Step 9: Schedule Automatic Query Refresh

Redash can automatically refresh queries on a schedule:

1. Open any saved query
2. Click the schedule icon next to the "Execute" button
3. Set the refresh interval (every 5 minutes, hourly, daily, etc.)
4. Scheduled results are cached and served instantly to dashboard viewers

## Step 10: Set Up Alerts

Create alerts that notify your team when query results meet certain conditions:

```sql
-- Alert query: Detect high error rate
-- Fires when error count exceeds threshold
SELECT COUNT(*) AS error_count
FROM application_logs
WHERE level = 'ERROR'
  AND created_at >= NOW() - INTERVAL '1 hour';
```

Then set an alert condition: "When error_count is above 100, send notification."

## Backup and Maintenance

```bash
# Backup the Redash PostgreSQL database
sudo docker compose exec postgres pg_dump -U redash redash | gzip > redash_backup_$(date +%Y%m%d).sql.gz

# Update Redash to the latest version
cd /opt/redash
sudo docker compose pull
sudo docker compose up -d
```

## Conclusion

Redash is now running on your RHEL 9 server, ready for your team to write SQL queries, build visualizations, and share dashboards. Its SQL-first approach makes it particularly well suited for teams with analysts who are comfortable writing queries. Set up scheduled refreshes for your most important dashboards and configure alerts to stay on top of critical business metrics.
