# How to Configure Nginx Unit in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Nginx Unit, Web Servers, Application Server, DevOps, Python, Node.js

Description: Deploy Nginx Unit in Docker as a universal application server with dynamic configuration for Python, Node.js, and more

---

Nginx Unit is a lightweight application server from the Nginx team. Unlike traditional Nginx, which primarily handles static files and reverse proxying, Unit runs application code directly. It supports Python, Node.js, PHP, Go, Java, Ruby, and Perl, all from a single server process. Configuration happens through a RESTful JSON API, and changes take effect without restarts or downtime. Docker gives you a clean environment to run Unit with any combination of language runtimes.

## How Nginx Unit Differs from Nginx

Standard Nginx is a web server and reverse proxy. It does not run your application code. You need a separate process like Gunicorn, uWSGI, or PM2 to run your Python or Node.js app, and then configure Nginx to proxy to it.

Nginx Unit eliminates the middleman. It runs your application code inside its own process management system, handles connections directly, and serves static files too. One process replaces both Nginx and your application server.

The dynamic reconfiguration is the real standout feature. You send a JSON payload to the configuration API, and Unit applies the change instantly. No restart, no dropped connections, no downtime.

## Quick Start

Run Nginx Unit with Python support.

```bash
# Start Unit with Python 3 support
docker run -d \
  --name unit \
  -p 8080:8080 \
  -p 8443:8443 \
  -v $(pwd)/app:/www \
  -v unit_state:/var/lib/unit \
  unit:1.32.1-python3.12
```

The control socket is inside the container at `/var/run/control.unit.sock`.

## Docker Compose Setup

A complete configuration with multiple language runtimes.

```yaml
# docker-compose.yml
version: "3.8"

services:
  unit:
    image: unit:1.32.1-python3.12
    container_name: nginx-unit
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      # Application code
      - ./app:/www:ro
      # Unit state (persists configuration across restarts)
      - unit_state:/var/lib/unit
      # Initial configuration loaded on first start
      - ./config.json:/docker-entrypoint.d/config.json:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080"]
      interval: 15s
      timeout: 5s
      retries: 3

volumes:
  unit_state:
```

## Deploying a Python Application

Create a simple Flask-like ASGI application.

```python
# app/wsgi.py
def application(environ, start_response):
    """A simple WSGI application."""
    path = environ.get('PATH_INFO', '/')

    if path == '/':
        status = '200 OK'
        body = b'Hello from Nginx Unit with Python!'
    elif path == '/health':
        status = '200 OK'
        body = b'{"status": "healthy"}'
    elif path == '/api/users':
        import json
        users = [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"},
        ]
        status = '200 OK'
        body = json.dumps(users).encode()
    else:
        status = '404 Not Found'
        body = b'Not Found'

    headers = [('Content-Type', 'application/json'), ('Content-Length', str(len(body)))]
    start_response(status, headers)
    return [body]
```

Configure Unit to run this application.

```json
{
    "listeners": {
        "*:8080": {
            "pass": "applications/python_app"
        }
    },
    "applications": {
        "python_app": {
            "type": "python",
            "path": "/www",
            "module": "wsgi",
            "callable": "application",
            "processes": {
                "max": 4,
                "spare": 1
            }
        }
    }
}
```

Save this as `config.json` and mount it to `/docker-entrypoint.d/`. Unit loads files from this directory on first startup.

```bash
docker compose up -d

# Test the application
curl http://localhost:8080/
curl http://localhost:8080/api/users
```

## Dynamic Configuration via API

The most powerful feature of Unit is its configuration API. Changes apply immediately without restarting.

```bash
# View the current configuration
docker exec nginx-unit curl --unix-socket /var/run/control.unit.sock http://localhost/config

# Update the application's process count
docker exec nginx-unit curl -X PUT \
  --unix-socket /var/run/control.unit.sock \
  -d '{"max": 8, "spare": 2}' \
  http://localhost/config/applications/python_app/processes

# Add a new route without affecting existing traffic
docker exec nginx-unit curl -X PUT \
  --unix-socket /var/run/control.unit.sock \
  -d '"applications/python_app"' \
  http://localhost/config/listeners/*:8081/pass
```

## Adding Routes and Static File Serving

Unit supports a routing system for directing traffic based on URL patterns.

```bash
# Apply a complete configuration with routes and static files
docker exec nginx-unit curl -X PUT \
  --unix-socket /var/run/control.unit.sock \
  -d '{
    "listeners": {
        "*:8080": {
            "pass": "routes"
        }
    },
    "routes": [
        {
            "match": {
                "uri": "/api/*"
            },
            "action": {
                "pass": "applications/python_app"
            }
        },
        {
            "match": {
                "uri": "/static/*"
            },
            "action": {
                "share": "/www/static/$uri"
            }
        },
        {
            "action": {
                "share": "/www/public/$uri",
                "fallback": {
                    "pass": "applications/python_app"
                }
            }
        }
    ],
    "applications": {
        "python_app": {
            "type": "python",
            "path": "/www",
            "module": "wsgi",
            "callable": "application",
            "processes": 4
        }
    }
  }' \
  http://localhost/config
```

This configuration routes `/api/*` to the Python app, serves static files from `/www/static/`, and falls back to the Python app for everything else.

## Deploying a Node.js Application

Unit also runs Node.js applications. Use the Node.js variant of the image.

```dockerfile
# Dockerfile.node
FROM unit:1.32.1-node20

# Copy Node.js application
COPY node-app /www

# Install dependencies
WORKDIR /www
RUN npm install

# Copy Unit configuration
COPY config-node.json /docker-entrypoint.d/config.json
```

```javascript
// node-app/app.js
const http = require('http');

// Unit passes requests through the Node.js http module
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Hello from Node.js on Nginx Unit' }));
    } else if (req.url === '/health') {
        res.writeHead(200);
        res.end('ok');
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// Unit manages the server lifecycle
module.exports = server;
```

```json
{
    "listeners": {
        "*:8080": {
            "pass": "applications/node_app"
        }
    },
    "applications": {
        "node_app": {
            "type": "external",
            "working_directory": "/www",
            "executable": "/usr/bin/env",
            "arguments": ["node", "--loader", "unit-http/loader.mjs", "--require", "unit-http/loader", "app.js"],
            "processes": 2
        }
    }
}
```

## Running Multiple Applications

Unit can run different language applications simultaneously. Use a multi-runtime image or build a custom one.

```dockerfile
# Dockerfile.multi
FROM unit:1.32.1-python3.12

# Add Node.js runtime
RUN apt-get update && apt-get install -y nodejs npm && \
    npm install -g unit-http && \
    apt-get clean

COPY python-app /www/python
COPY node-app /www/node
```

```json
{
    "listeners": {
        "*:8080": {
            "pass": "routes"
        }
    },
    "routes": [
        {
            "match": { "uri": "/api/v1/*" },
            "action": { "pass": "applications/python_api" }
        },
        {
            "match": { "uri": "/api/v2/*" },
            "action": { "pass": "applications/node_api" }
        }
    ],
    "applications": {
        "python_api": {
            "type": "python",
            "path": "/www/python",
            "module": "wsgi",
            "callable": "application",
            "processes": 4
        },
        "node_api": {
            "type": "external",
            "working_directory": "/www/node",
            "executable": "/usr/bin/env",
            "arguments": ["node", "--loader", "unit-http/loader.mjs", "--require", "unit-http/loader", "app.js"],
            "processes": 2
        }
    }
}
```

## TLS Configuration

Configure HTTPS through the API.

```bash
# Upload a certificate bundle
cat cert.pem ca-chain.pem key.pem > bundle.pem

docker exec -i nginx-unit curl -X PUT \
  --unix-socket /var/run/control.unit.sock \
  --data-binary @- \
  http://localhost/certificates/main < bundle.pem

# Configure a TLS listener
docker exec nginx-unit curl -X PUT \
  --unix-socket /var/run/control.unit.sock \
  -d '{
    "pass": "applications/python_app",
    "tls": {
        "certificate": "main"
    }
  }' \
  http://localhost/config/listeners/*:8443
```

## Monitoring

```bash
# View current configuration
docker exec nginx-unit curl --unix-socket /var/run/control.unit.sock http://localhost/config

# Check application status
docker exec nginx-unit curl --unix-socket /var/run/control.unit.sock http://localhost/status

# View container logs
docker logs nginx-unit --tail 50

# Resource usage
docker stats nginx-unit --no-stream
```

## Summary

Nginx Unit in Docker gives you a single application server that runs Python, Node.js, PHP, and other languages without separate process managers. Configure everything through a JSON API, and changes apply instantly without downtime. Use routes for URL-based traffic splitting, combine multiple language runtimes in one server, and serve static files alongside dynamic applications. The Docker deployment keeps everything portable, and the state volume preserves your configuration across container restarts.
