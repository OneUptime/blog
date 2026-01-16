# How to Set Up Docker with Nginx as a Reverse Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Nginx, Reverse Proxy, DevOps, Containers

Description: Learn how to configure Nginx as a reverse proxy for Docker containers, including load balancing, SSL termination, and automatic container discovery with docker-compose.

---

Running multiple services in Docker often requires a reverse proxy to route traffic, handle SSL, and load balance requests. Nginx is the most popular choice for this role, and it integrates seamlessly with Docker containers.

## Why Use a Reverse Proxy?

A reverse proxy sits in front of your services and provides:

- **Single entry point** - One public IP/port for multiple services
- **SSL termination** - Handle HTTPS in one place
- **Load balancing** - Distribute traffic across multiple containers
- **Path-based routing** - Route `/api` to one service, `/` to another
- **Caching** - Reduce load on backend services
- **Security** - Hide internal service topology

## Basic Nginx Reverse Proxy Setup

### Project Structure

```
project/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── app/
    └── (your application)
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web
    networks:
      - app-network

  web:
    image: my-frontend
    # No ports exposed - only accessible through nginx
    networks:
      - app-network

  api:
    image: my-api
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Nginx Configuration

The following configuration routes traffic to different services based on the URL path.

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    # Upstream definitions for load balancing
    upstream web_servers {
        server web:3000;
    }

    upstream api_servers {
        server api:8080;
    }

    server {
        listen 80;
        server_name example.com;

        # Frontend routes
        location / {
            proxy_pass http://web_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API routes
        location /api/ {
            proxy_pass http://api_servers/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint
        location /health {
            return 200 'healthy';
            add_header Content-Type text/plain;
        }
    }
}
```

## Load Balancing Multiple Containers

Scale your services and let Nginx distribute traffic.

### Docker Compose with Replicas

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    networks:
      - app-network

  api:
    image: my-api
    deploy:
      replicas: 3
    networks:
      - app-network

networks:
  app-network:
```

### Nginx Load Balancing Configuration

```nginx
http {
    upstream api_servers {
        # Default is round-robin
        server api:8080;

        # With health checks (nginx plus only)
        # server api:8080 max_fails=3 fail_timeout=30s;
    }

    # Alternative load balancing methods:

    # Least connections - send to server with fewest active connections
    upstream api_least_conn {
        least_conn;
        server api:8080;
    }

    # IP hash - same client always goes to same server (session affinity)
    upstream api_ip_hash {
        ip_hash;
        server api:8080;
    }

    # Weighted - distribute based on server capacity
    upstream api_weighted {
        server api1:8080 weight=3;
        server api2:8080 weight=1;
    }

    server {
        listen 80;

        location /api/ {
            proxy_pass http://api_servers/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## SSL/TLS Termination

Handle HTTPS at the Nginx layer so your backend services can use plain HTTP.

### With Self-Signed Certificates (Development)

```bash
# Generate self-signed certificate
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/nginx.key \
  -out nginx/ssl/nginx.crt \
  -subj "/C=US/ST=State/L=City/O=Org/CN=localhost"
```

### Docker Compose with SSL

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - app-network

  api:
    image: my-api
    networks:
      - app-network

networks:
  app-network:
```

### Nginx SSL Configuration

```nginx
events {
    worker_connections 1024;
}

http {
    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name example.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name example.com;

        # SSL certificates
        ssl_certificate /etc/nginx/ssl/nginx.crt;
        ssl_certificate_key /etc/nginx/ssl/nginx.key;

        # SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;

        location / {
            proxy_pass http://api:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Let's Encrypt with Certbot

Automate free SSL certificates with Let's Encrypt.

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    networks:
      - app-network

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

  api:
    image: my-api
    networks:
      - app-network

networks:
  app-network:
```

### Nginx Configuration for Let's Encrypt

```nginx
server {
    listen 80;
    server_name example.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect everything else to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Initial Certificate Generation

```bash
# First run - get initial certificate
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d example.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email
```

## WebSocket Support

Configure Nginx to proxy WebSocket connections.

```nginx
http {
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    server {
        listen 80;

        # WebSocket endpoint
        location /ws {
            proxy_pass http://api:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_read_timeout 86400;  # Keep connection alive
        }

        # Regular HTTP
        location / {
            proxy_pass http://api:8080;
            proxy_set_header Host $host;
        }
    }
}
```

## Virtual Hosts (Multiple Domains)

Route different domains to different services.

```nginx
http {
    # First domain
    server {
        listen 80;
        server_name app1.example.com;

        location / {
            proxy_pass http://app1:3000;
            proxy_set_header Host $host;
        }
    }

    # Second domain
    server {
        listen 80;
        server_name app2.example.com;

        location / {
            proxy_pass http://app2:3000;
            proxy_set_header Host $host;
        }
    }

    # Default - reject unknown hosts
    server {
        listen 80 default_server;
        return 444;  # Close connection without response
    }
}
```

## Caching Static Assets

Reduce load on backend services by caching at the proxy layer.

```nginx
http {
    # Cache configuration
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m max_size=1g inactive=60m;

    server {
        listen 80;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            proxy_pass http://web:3000;
            proxy_cache app_cache;
            proxy_cache_valid 200 1d;
            proxy_cache_use_stale error timeout updating;
            add_header X-Cache-Status $upstream_cache_status;
        }

        # Don't cache API responses
        location /api/ {
            proxy_pass http://api:8080/;
            proxy_no_cache 1;
            proxy_cache_bypass 1;
        }
    }
}
```

## Reloading Configuration Without Downtime

```bash
# Test configuration
docker exec nginx nginx -t

# Reload configuration
docker exec nginx nginx -s reload

# Or with docker-compose
docker-compose exec nginx nginx -s reload
```

## Summary

A typical production setup includes:

1. **Nginx as the only exposed service** on ports 80/443
2. **SSL termination** with Let's Encrypt certificates
3. **Path-based routing** to different backend services
4. **Load balancing** across multiple container replicas
5. **Health checks** for reliability

Nginx reverse proxy is a battle-tested pattern that scales well and provides the flexibility needed for complex container deployments. For even more automation, consider tools like Traefik or nginx-proxy that can automatically discover and configure routes for Docker containers.
