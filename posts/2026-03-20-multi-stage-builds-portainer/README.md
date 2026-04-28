# How to Use Multi-Stage Builds and Deploy via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Multi-Stage Build, Image, DevOps

Description: Create optimized Docker images using multi-stage builds and deploy them via Portainer for smaller, more secure containers.

## Introduction

Create optimized Docker images using multi-stage builds and deploy them via Portainer for smaller, more secure containers. This comprehensive guide walks through deployment, configuration, and maintenance using Portainer's visual management interface.

## Prerequisites

- Portainer installed (CE or BE)
- Docker environment connected to Portainer
- Appropriate hardware resources
- Basic Docker and networking knowledge

## Step 1: Prepare the Environment

Before deploying, ensure your environment is ready:

```bash
# Check available resources

free -h          # Memory
df -h            # Disk space
nproc            # CPU cores

# Verify Docker is running
docker info
```

## Step 2: Create the Portainer Stack

Navigate to **Stacks** > **Add Stack** in Portainer:

```yaml
# docker-compose.yml
version: "3.8"

services:
  # Main application service
  app:
    image: app-image:latest
    container_name: app
    restart: always
    ports:
      - "8080:8080"
    volumes:
      - app-data:/app/data
      - app-config:/app/config
    environment:
      - NODE_ENV=production
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=postgresql://appuser:${DB_PASSWORD}@postgres:5432/appdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
    logging:
      driver: json-file
      options:
        max-size: "100m"
        max-file: "5"
    networks:
      - app-net

  postgres:
    image: postgres:15-alpine
    container_name: app-postgres
    restart: always
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-net

  redis:
    image: redis:7-alpine
    container_name: app-redis
    restart: always
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - app-net

volumes:
  app-data:
  app-config:
  postgres-data:
  redis-data:

networks:
  app-net:
    driver: bridge
```

## Step 3: Configure Environment Variables

Set these environment variables in Portainer's stack editor:

```bash
SECRET_KEY=generate-a-strong-random-key-here
DB_PASSWORD=strong-database-password
APP_URL=https://app.example.com
ADMIN_EMAIL=admin@example.com
```

## Step 4: Initialize the Application

After deployment, run the initial setup:

```bash
# Access via Portainer container console

# Run database migrations
docker exec app ./manage.py migrate

# Create initial admin user
docker exec -it app ./manage.py createsuperuser

# Verify deployment
curl http://localhost:8080/api/health
```

## Step 5: Configure SSL/TLS

Set up HTTPS via reverse proxy:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - app-net
```

```nginx
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name app.example.com;
    
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    location / {
        proxy_pass http://app:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Step 6: Configure Automated Backups

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/app"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR/$DATE"

# Backup PostgreSQL database
docker exec app-postgres pg_dump -U appuser appdb |   gzip > "$BACKUP_DIR/$DATE/database.sql.gz"

# Backup application data volumes
for volume in app-data app-config; do
  docker run --rm     -v ${volume}:/source:ro     -v "$BACKUP_DIR/$DATE":/backup     alpine tar czf "/backup/${volume}.tar.gz" -C /source .
done

echo "Backup complete in $BACKUP_DIR/$DATE"

# Clean up old backups (keep 7 days)
find $BACKUP_DIR -maxdepth 1 -type d -mtime +7 | xargs rm -rf
```

## Step 7: Monitoring and Alerting

View application health in Portainer:

1. **Container Stats**: Portainer > Containers > app > Stats
2. **Logs**: Portainer > Containers > app > Logs
3. **Health Status**: Green indicator in container list

Set up external monitoring:

```yaml
services:
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    restart: always
    ports:
      - "3001:3001"
    volumes:
      - uptime-data:/app/data
```

## Updating to New Versions

Safely update the application:

1. Backup your data first (run backup.sh)
2. Edit the stack in Portainer
3. Update the image tag to new version
4. Click **Update the stack**
5. Monitor logs for successful startup
6. Verify functionality

## Troubleshooting Common Issues

```bash
# Container fails to start
docker logs app --tail 100

# Database connection issues
docker exec app pg_isready -h postgres -U appuser

# Permission issues
docker exec app ls -la /app/data

# Network connectivity
docker exec app nc -zv postgres 5432
```

## Conclusion

Deploying Multi-Stage Builds and Deploy via Portainer provides a streamlined, manageable approach to running this application in your infrastructure. With persistent storage for data, automated backups, SSL termination, and Portainer's visual management capabilities, this deployment is production-ready. The modular docker-compose structure makes it easy to customize and scale as your needs evolve.
