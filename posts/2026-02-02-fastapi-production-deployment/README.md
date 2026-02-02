# How to Deploy FastAPI to Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, FastAPI, Deployment, Production, DevOps

Description: A comprehensive guide to deploying FastAPI applications to production, covering Gunicorn, Docker, Nginx, SSL, and cloud platform deployments.

---

> FastAPI is fast to develop with, but getting it into production requires some thought. This guide walks through the key pieces you need - from running with Gunicorn to containerizing with Docker and putting Nginx in front.

Running `uvicorn main:app --reload` works great for development. But in production, you need process management, proper configuration, and a reverse proxy to handle the rough edges of the real world.

---

## Deployment Options Comparison

| Method | Best For | Complexity | Scalability |
|--------|----------|------------|-------------|
| Uvicorn standalone | Development, small apps | Low | Limited |
| Gunicorn + Uvicorn | Single server production | Medium | Good |
| Docker + Gunicorn | Container orchestration | Medium | Excellent |
| Kubernetes | Large scale deployments | High | Excellent |

---

## Setting Up Gunicorn with Uvicorn Workers

Gunicorn acts as a process manager, spawning multiple Uvicorn workers to handle requests. This gives you process supervision, graceful restarts, and better resource utilization.

```python
# gunicorn_conf.py
# Gunicorn configuration for production FastAPI deployment

import multiprocessing
import os

# Bind to all interfaces on port 8000
bind = os.getenv("BIND", "0.0.0.0:8000")

# Calculate workers based on CPU cores
# Rule of thumb: (2 x CPU cores) + 1
workers = int(os.getenv("WORKERS", multiprocessing.cpu_count() * 2 + 1))

# Use Uvicorn's async worker class for ASGI support
worker_class = "uvicorn.workers.UvicornWorker"

# Timeout for worker processes (seconds)
# Increase if you have slow endpoints
timeout = int(os.getenv("TIMEOUT", 120))

# Restart workers after this many requests to prevent memory leaks
max_requests = int(os.getenv("MAX_REQUESTS", 1000))
max_requests_jitter = int(os.getenv("MAX_REQUESTS_JITTER", 50))

# Graceful timeout - time to finish current requests before force kill
graceful_timeout = 30

# Keep-alive connections
keepalive = 5

# Logging configuration
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr
loglevel = os.getenv("LOG_LEVEL", "info")

# Process naming for easier identification in ps/htop
proc_name = "fastapi-app"

# Preload application code before forking workers
# Saves memory through copy-on-write but means code changes require full restart
preload_app = True
```

Run your application with this configuration:

```bash
# Start Gunicorn with the config file
gunicorn main:app -c gunicorn_conf.py

# Or specify options directly
gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120
```

---

## Docker Deployment

A proper Dockerfile uses multi-stage builds to keep the final image small. We install dependencies in a build stage, then copy only what we need to the runtime image.

```dockerfile
# Dockerfile
# Multi-stage build for production FastAPI deployment

# Build stage - install dependencies
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# Runtime stage - minimal image
FROM python:3.11-slim as runtime

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Copy application code
COPY --chown=appuser:appuser . .

# Expose the application port
EXPOSE 8000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Start the application with Gunicorn
CMD ["gunicorn", "main:app", "-c", "gunicorn_conf.py"]
```

Your `requirements.txt` should include the production dependencies:

```text
# requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
gunicorn==21.2.0
python-dotenv==1.0.0
```

Build and run the Docker image:

```bash
# Build the image
docker build -t fastapi-app:latest .

# Run with environment variables
docker run -d \
    --name fastapi-app \
    -p 8000:8000 \
    -e DATABASE_URL="postgresql://user:pass@db:5432/mydb" \
    -e LOG_LEVEL="info" \
    fastapi-app:latest
```

---

## Nginx Reverse Proxy Configuration

Nginx sits in front of your application to handle SSL termination, load balancing, static files, and request buffering. This keeps your Python workers focused on application logic.

```nginx
# /etc/nginx/sites-available/fastapi-app

# Upstream configuration - your FastAPI servers
upstream fastapi_backend {
    # Use least connections for better load distribution
    least_conn;

    # Add multiple servers for load balancing
    server 127.0.0.1:8000 weight=1;
    # server 127.0.0.1:8001 weight=1;  # Add more workers as needed

    # Keep connections alive to reduce overhead
    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL certificate paths (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Request size limits
    client_max_body_size 10M;

    # Proxy settings
    location / {
        proxy_pass http://fastapi_backend;
        proxy_http_version 1.1;

        # Headers for proper client IP forwarding
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check endpoint - don't log these
    location /health {
        proxy_pass http://fastapi_backend;
        access_log off;
    }

    # Static files (if any)
    location /static {
        alias /var/www/fastapi-app/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## SSL Certificates with Let's Encrypt

Get free SSL certificates using Certbot:

```bash
# Install Certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Obtain certificate (Nginx plugin handles configuration)
certbot --nginx -d api.example.com

# Test automatic renewal
certbot renew --dry-run
```

Certbot adds a cron job for automatic renewal. Certificates are valid for 90 days and will be renewed when they have less than 30 days remaining.

---

## Environment Variables and Configuration

Never hardcode secrets. Use environment variables and a configuration module to manage settings across environments.

```python
# config.py
# Application configuration from environment variables

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    app_name: str = "FastAPI App"
    debug: bool = False
    environment: str = "production"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4

    # Database
    database_url: str
    db_pool_size: int = 5
    db_max_overflow: int = 10

    # Redis (optional)
    redis_url: Optional[str] = None

    # Security
    secret_key: str
    allowed_hosts: list[str] = ["*"]
    cors_origins: list[str] = []

    # Observability
    log_level: str = "INFO"

    class Config:
        # Load from .env file if present
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    """Cache settings instance for performance"""
    return Settings()
```

Create a `.env.example` file for documentation:

```bash
# .env.example
# Copy to .env and fill in values

# Application
APP_NAME=FastAPI App
DEBUG=false
ENVIRONMENT=production

# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Security (required - generate with: openssl rand -hex 32)
SECRET_KEY=your-secret-key-here

# Optional
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=INFO
```

---

## Health Check Endpoints

Production deployments need health checks for load balancers and container orchestration. Include both a simple liveness check and a more thorough readiness check.

```python
# health.py
# Health check endpoints for production monitoring

from fastapi import APIRouter, Response, status
from datetime import datetime
import asyncpg

router = APIRouter(tags=["Health"])

# Track application state
app_ready = False
startup_time = None

async def set_ready():
    """Call this after startup completes"""
    global app_ready, startup_time
    app_ready = True
    startup_time = datetime.utcnow()

@router.get("/health")
async def health_check():
    """
    Liveness probe - is the process running?
    Keep this simple and fast.
    """
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@router.get("/ready")
async def readiness_check(response: Response):
    """
    Readiness probe - can we handle traffic?
    Check critical dependencies here.
    """
    if not app_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "reason": "Application starting"}

    # Add dependency checks as needed
    # Example: check database connection
    # if not await check_database():
    #     response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    #     return {"status": "not_ready", "reason": "Database unavailable"}

    uptime = (datetime.utcnow() - startup_time).total_seconds()
    return {"status": "ready", "uptime_seconds": uptime}

@router.get("/health/detailed")
async def detailed_health():
    """
    Detailed health for debugging - don't expose publicly
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {
            "app_ready": app_ready,
            "uptime_seconds": (datetime.utcnow() - startup_time).total_seconds() if startup_time else 0
        }
    }
```

Wire it into your main application:

```python
# main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from health import router as health_router, set_ready

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize connections, warm caches
    # await init_database()
    # await warm_cache()
    await set_ready()
    yield
    # Shutdown: close connections gracefully
    # await close_database()

app = FastAPI(lifespan=lifespan)
app.include_router(health_router)

@app.get("/")
async def root():
    return {"message": "Hello World"}
```

---

## Systemd Service (Non-Docker Deployments)

For deployments without containers, use systemd to manage your application:

```ini
# /etc/systemd/system/fastapi-app.service

[Unit]
Description=FastAPI Application
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=notify
User=appuser
Group=appuser
WorkingDirectory=/opt/fastapi-app
Environment="PATH=/opt/fastapi-app/venv/bin"
EnvironmentFile=/opt/fastapi-app/.env
ExecStart=/opt/fastapi-app/venv/bin/gunicorn main:app -c gunicorn_conf.py
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=5
KillMode=mixed
TimeoutStopSec=30

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/fastapi-app/logs

[Install]
WantedBy=multi-user.target
```

Enable and manage the service:

```bash
# Reload systemd and enable the service
systemctl daemon-reload
systemctl enable fastapi-app
systemctl start fastapi-app

# Check status and logs
systemctl status fastapi-app
journalctl -u fastapi-app -f
```

---

## Production Checklist

Before deploying, verify these items:

- [ ] Debug mode is disabled (`DEBUG=false`)
- [ ] Secret key is set and not committed to version control
- [ ] Database connections use connection pooling
- [ ] Health check endpoints are implemented
- [ ] Logging is configured for production (JSON format, appropriate level)
- [ ] CORS is configured for your frontend domains only
- [ ] Rate limiting is in place for public endpoints
- [ ] SSL/TLS is enabled with valid certificates
- [ ] Environment variables are set (not hardcoded)
- [ ] Container runs as non-root user
- [ ] Resource limits are set (memory, CPU)

---

## Conclusion

Deploying FastAPI to production is straightforward once you have the pieces in place. Start with Gunicorn for process management, wrap it in Docker for portability, and put Nginx in front for SSL and load balancing. Add proper health checks so your infrastructure knows when something goes wrong.

The patterns here work whether you are deploying to a single server or a Kubernetes cluster. Start simple, and add complexity only when you need it.

---

*Need to monitor your FastAPI application in production? [OneUptime](https://oneuptime.com) provides comprehensive monitoring with health check tracking, alerting, and incident management.*

**Related Reading:**
- [How to Build Health Checks in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [How to Add Rate Limiting to FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
