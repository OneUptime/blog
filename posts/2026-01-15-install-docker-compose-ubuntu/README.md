# How to Install Docker Compose on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Docker, Docker Compose, Containers, DevOps, Tutorial

Description: Step-by-step guide to installing Docker Compose on Ubuntu for managing multi-container Docker applications.

---

Docker Compose is a tool for defining and running multi-container Docker applications. With a YAML file, you configure your application's services, networks, and volumes, then create and start all services with a single command.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Docker installed and running
- Root or sudo access

## Install Docker First

If Docker isn't installed:

```bash
# Install Docker
sudo apt update
sudo apt install docker.io -y

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Install Docker Compose

### Method 1: Docker Compose Plugin (Recommended)

Modern versions of Docker include Compose as a plugin:

```bash
# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify installation
docker compose version
```

### Method 2: Standalone Binary

```bash
# Download latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### Method 3: Via pip

```bash
# Install Python pip
sudo apt install python3-pip -y

# Install Docker Compose
pip3 install docker-compose

# Verify
docker-compose --version
```

## Docker Compose Basics

### Create docker-compose.yml

```bash
mkdir ~/myapp && cd ~/myapp
nano docker-compose.yml
```

### Basic Example

```yaml
version: '3.8'

services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: myapp
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppassword
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  db_data:
```

### Start Services

```bash
# Start all services (detached)
docker compose up -d

# View running services
docker compose ps

# View logs
docker compose logs

# Follow logs
docker compose logs -f

# Logs for specific service
docker compose logs web
```

### Stop Services

```bash
# Stop services (keep containers)
docker compose stop

# Stop and remove containers
docker compose down

# Stop, remove containers, and volumes
docker compose down -v

# Stop, remove containers, volumes, and images
docker compose down -v --rmi all
```

## Docker Compose Commands

### Service Management

```bash
# Start specific service
docker compose up -d web

# Restart service
docker compose restart web

# Stop specific service
docker compose stop db

# Remove stopped containers
docker compose rm

# Scale service
docker compose up -d --scale web=3
```

### Build and Pull

```bash
# Build images defined in compose file
docker compose build

# Build without cache
docker compose build --no-cache

# Pull latest images
docker compose pull

# Build and start
docker compose up -d --build
```

### Execute Commands

```bash
# Run command in service
docker compose exec web bash

# Run one-off command
docker compose run --rm web npm install

# View service configuration
docker compose config
```

## Advanced Configuration

### Web Application Stack

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - frontend
    restart: always

  app:
    build: ./app
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/myapp
    depends_on:
      - db
      - redis
    networks:
      - frontend
      - backend
    restart: always

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend
    restart: always

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data
    networks:
      - backend
    restart: always

networks:
  frontend:
  backend:

volumes:
  postgres_data:
  redis_data:
```

### Using Environment Files

Create `.env` file:

```bash
# .env
POSTGRES_USER=myuser
POSTGRES_PASSWORD=secretpassword
POSTGRES_DB=myapp
APP_PORT=3000
```

Reference in docker-compose.yml:

```yaml
version: '3.8'

services:
  app:
    image: myapp
    ports:
      - "${APP_PORT}:3000"
    environment:
      - DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
```

### Multiple Compose Files

```bash
# Base configuration
# docker-compose.yml

# Override for development
# docker-compose.dev.yml

# Override for production
# docker-compose.prod.yml

# Use multiple files
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Health Checks

```yaml
services:
  web:
    image: nginx
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### Resource Limits

```yaml
services:
  app:
    image: myapp
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Networking

### Custom Networks

```yaml
version: '3.8'

services:
  web:
    networks:
      - frontend
      - backend

  api:
    networks:
      backend:
        aliases:
          - api-service

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

### External Networks

```bash
# Create external network
docker network create shared-network
```

```yaml
networks:
  shared:
    external: true
    name: shared-network
```

## Volumes

### Named Volumes

```yaml
volumes:
  db_data:
    driver: local

  backup_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/on/host
```

### Bind Mounts

```yaml
services:
  app:
    volumes:
      - ./src:/app/src:ro        # Read-only
      - ./config:/app/config     # Read-write
      - type: bind
        source: ./logs
        target: /app/logs
```

## Secrets

```yaml
version: '3.8'

services:
  db:
    image: postgres
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Profiles

```yaml
version: '3.8'

services:
  web:
    image: nginx
    profiles: []  # Always runs

  debug:
    image: busybox
    profiles:
      - debug

  test:
    image: myapp-test
    profiles:
      - testing
```

```bash
# Start only default services
docker compose up -d

# Start with debug profile
docker compose --profile debug up -d

# Start with multiple profiles
docker compose --profile debug --profile testing up -d
```

## Troubleshooting

### View Logs

```bash
# All services
docker compose logs

# Specific service with timestamps
docker compose logs -t web

# Last 100 lines
docker compose logs --tail 100
```

### Inspect Services

```bash
# Show service details
docker compose ps -a

# Validate compose file
docker compose config

# Show container stats
docker compose top
```

### Common Issues

```bash
# Port already in use
# Change the port in compose file or stop conflicting container

# Volume permission issues
# Use user: "1000:1000" in service definition

# Network conflicts
# Remove old networks: docker network prune
```

## Update Docker Compose

### Plugin Version

```bash
# Update via apt
sudo apt update
sudo apt upgrade docker-compose-plugin
```

### Standalone Version

```bash
# Remove old version
sudo rm /usr/local/bin/docker-compose

# Download new version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

Docker Compose simplifies multi-container deployments and is essential for local development and testing. For production container orchestration at scale, consider Kubernetes or Docker Swarm.
