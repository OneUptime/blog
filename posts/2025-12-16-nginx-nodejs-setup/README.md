# How to Set Up Nginx with Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Nginx, NodeJS, Reverse Proxy, DevOps, JavaScript

Description: Learn how to configure Nginx as a reverse proxy for Node.js applications, including load balancing, WebSocket support, SSL termination, and production deployment best practices.

---

Node.js applications run on a single thread and are not designed to handle multiple domains, SSL termination, or static file serving efficiently. Nginx complements Node.js by handling these concerns, allowing your application to focus on business logic.

## Architecture Overview

```mermaid
graph LR
    Client[Client] --> Nginx[Nginx :80/:443]
    Nginx --> |Proxy Pass| Node1[Node.js :3000]
    Nginx --> |Load Balance| Node2[Node.js :3001]
    Nginx --> |Static Files| Static[/var/www/static]

    style Nginx fill:#009639
    style Node1 fill:#68a063
    style Node2 fill:#68a063
```

## Basic Nginx Configuration

### Simple Reverse Proxy

```nginx
upstream nodejs_app {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://nodejs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Node.js Application Setup

```javascript
// app.js
const express = require('express');
const app = express();

// Trust proxy - important for getting real client IP
app.set('trust proxy', true);

app.get('/', (req, res) => {
    res.json({
        message: 'Hello World',
        ip: req.ip,
        protocol: req.protocol
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on port ${PORT}`);
});
```

## Load Balancing Multiple Node.js Instances

### Nginx Configuration

```nginx
upstream nodejs_cluster {
    least_conn;  # Load balancing method

    server 127.0.0.1:3000 weight=3;
    server 127.0.0.1:3001 weight=2;
    server 127.0.0.1:3002 weight=1;

    keepalive 64;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://nodejs_cluster;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Using PM2 for Process Management

```bash
# Install PM2
npm install -g pm2

# Start multiple instances
pm2 start app.js -i max --name "nodejs-app"

# Or with ecosystem file
pm2 start ecosystem.config.js
```

### ecosystem.config.js

```javascript
module.exports = {
    apps: [{
        name: 'nodejs-app',
        script: './app.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        env_production: {
            NODE_ENV: 'production'
        }
    }]
};
```

## WebSocket Support

### Nginx Configuration for WebSocket

```nginx
upstream nodejs_ws {
    server 127.0.0.1:3000;
    keepalive 64;
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://nodejs_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Dedicated WebSocket endpoint
    location /socket.io/ {
        proxy_pass http://nodejs_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Node.js WebSocket Example

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('message', (data) => {
        socket.broadcast.emit('message', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## SSL/TLS Configuration

### Full HTTPS Configuration

```nginx
upstream nodejs_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL settings
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://nodejs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Static File Serving

### Efficient Static File Configuration

```nginx
upstream nodejs_app {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name example.com;

    # Static files with long cache
    location /static/ {
        alias /var/www/myapp/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Assets with hash in filename
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /var/www/myapp/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;

        # Fallback to Node.js if file not found
        try_files $uri @nodejs;
    }

    # API requests to Node.js
    location /api/ {
        proxy_pass http://nodejs_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Everything else to Node.js
    location / {
        proxy_pass http://nodejs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location @nodejs {
        proxy_pass http://nodejs_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Caching and Compression

### Response Caching

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=nodejs_cache:10m max_size=1g inactive=60m use_temp_path=off;

upstream nodejs_app {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name example.com;

    # Enable gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    location / {
        proxy_pass http://nodejs_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Caching
        proxy_cache nodejs_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
        proxy_cache_lock on;

        # Cache status header
        add_header X-Cache-Status $upstream_cache_status;
    }

    # Skip cache for API calls
    location /api/ {
        proxy_pass http://nodejs_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }
}
```

## Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./static:/var/www/static:ro
    depends_on:
      - nodejs
    restart: unless-stopped

  nodejs:
    build: .
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "app.js"]
```

### nginx.conf for Docker

```nginx
upstream nodejs {
    server nodejs:3000;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://nodejs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Systemd Service

### /etc/systemd/system/nodejs-app.service

```ini
[Unit]
Description=Node.js Application
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/var/www/myapp
ExecStart=/usr/bin/node app.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=nodejs-app
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Node.js app not running
   ```bash
   # Check if Node.js is running
   curl http://127.0.0.1:3000/health

   # Check process
   pm2 status
   ```

2. **WebSocket connection failures**:
   ```nginx
   # Ensure proper headers are set
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

3. **Real IP not forwarded**:
   ```javascript
   // In Node.js
   app.set('trust proxy', true);
   ```

### Testing

```bash
# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo nginx -s reload

# Check logs
tail -f /var/log/nginx/error.log
```

## Summary

Setting up Nginx with Node.js provides production-ready infrastructure with load balancing, SSL termination, and static file serving. Key configurations include proper proxy headers, WebSocket support, and caching strategies. Use PM2 or Docker for process management and ensure your Node.js application trusts the proxy for accurate client information.
