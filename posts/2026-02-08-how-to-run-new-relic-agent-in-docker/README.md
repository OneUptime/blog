# How to Run New Relic Agent in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, New Relic, APM, Monitoring, Observability, DevOps, Infrastructure

Description: Deploy the New Relic infrastructure agent and APM in Docker to monitor your containerized applications and infrastructure.

---

New Relic is a full-stack observability platform that monitors applications, infrastructure, and user experiences. Running its agents in Docker lets you collect infrastructure metrics from your host, monitor container performance, and instrument your applications for distributed tracing. New Relic's approach uses two main components: the infrastructure agent for host and container metrics, and language-specific APM agents embedded in your applications.

This guide walks through deploying both the New Relic infrastructure agent and APM-instrumented applications in Docker.

## Prerequisites

You need a New Relic account and a license key. New Relic offers a generous free tier with 100GB of data ingestion per month. Get your license key from the New Relic UI under Account Settings > API Keys.

```bash
# Store your New Relic license key
export NEW_RELIC_LICENSE_KEY="your-license-key-here"

# Verify Docker is available
docker --version
docker compose version
```

## Infrastructure Agent Deployment

The New Relic infrastructure agent collects system-level metrics: CPU, memory, disk, network, and process information. It also discovers and monitors Docker containers automatically.

```bash
# Run the New Relic infrastructure agent
docker run -d \
  --name newrelic-infra \
  --network=host \
  --cap-add=SYS_PTRACE \
  --privileged \
  --pid=host \
  -e NRIA_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY} \
  -e NRIA_DISPLAY_NAME="docker-host-01" \
  -v /:/host:ro \
  -v /var/run/docker.sock:/var/run/docker.sock \
  newrelic/infrastructure:latest
```

Within a few minutes, your host will appear in the New Relic Infrastructure section with full metrics.

## Docker Compose Setup

Here is a complete stack with the infrastructure agent, a Node.js application instrumented with New Relic APM, and supporting services.

```yaml
# docker-compose.yml - New Relic monitoring stack
version: "3.8"

services:
  # New Relic Infrastructure Agent
  newrelic-infra:
    image: newrelic/infrastructure:latest
    container_name: newrelic-infra
    network_mode: host
    privileged: true
    pid: host
    cap_add:
      - SYS_PTRACE
    environment:
      - NRIA_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY}
      - NRIA_DISPLAY_NAME=docker-compose-host
      # Enable Docker container monitoring
      - NRIA_DOCKER_ENABLED=true
      # Enable process monitoring
      - NRIA_ENABLE_PROCESS_METRICS=true
    volumes:
      - /:/host:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - ./newrelic-infra.yml:/etc/newrelic-infra.yml

  # Node.js app with New Relic APM agent
  node-app:
    build:
      context: ./node-app
      dockerfile: Dockerfile
    environment:
      - NEW_RELIC_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY}
      - NEW_RELIC_APP_NAME=docker-node-app
      - NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
      - NEW_RELIC_LOG_LEVEL=info
      - NEW_RELIC_APPLICATION_LOGGING_ENABLED=true
      - NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED=true
      - REDIS_HOST=redis
    ports:
      - "3000:3000"
    depends_on:
      - redis
    networks:
      - app-net

  # Python Flask app with New Relic APM
  python-app:
    build:
      context: ./python-app
      dockerfile: Dockerfile
    environment:
      - NEW_RELIC_LICENSE_KEY=${NEW_RELIC_LICENSE_KEY}
      - NEW_RELIC_APP_NAME=docker-python-app
      - NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
    ports:
      - "5000:5000"
    depends_on:
      - redis
    networks:
      - app-net

  # Redis backend
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
```

## Instrumenting a Node.js Application

Create the Node.js application directory and files.

```dockerfile
# node-app/Dockerfile - Node.js app with New Relic APM
FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# New Relic must be the first module loaded
CMD ["node", "-r", "newrelic", "server.js"]
```

```javascript
// node-app/newrelic.js - New Relic agent configuration
'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'docker-node-app'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  distributed_tracing: {
    enabled: true
  },
  logging: {
    level: 'info'
  },
  application_logging: {
    forwarding: {
      enabled: true
    }
  },
  // Track slow transactions
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f'
  },
  // Track slow SQL queries
  slow_sql: {
    enabled: true,
    max_samples: 10
  }
};
```

```json
{
  "name": "docker-node-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "newrelic": "^11.0.0",
    "redis": "^4.6.0"
  }
}
```

```javascript
// node-app/server.js - Sample Express app
const express = require('express');
const redis = require('redis');

const app = express();
const client = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:6379`
});

client.connect().catch(console.error);

app.get('/', async (req, res) => {
  // Increment a visit counter in Redis
  const visits = await client.incr('page:visits');
  res.json({ message: 'Hello from Docker', visits: parseInt(visits) });
});

app.get('/slow', async (req, res) => {
  // Simulate a slow endpoint for New Relic to flag
  await new Promise(resolve => setTimeout(resolve, 2000));
  res.json({ message: 'This was slow on purpose' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Instrumenting a Python Application

Create the Python application directory.

```dockerfile
# python-app/Dockerfile - Python app with New Relic APM
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use newrelic-admin to wrap the application
CMD ["newrelic-admin", "run-program", "python", "app.py"]
```

```
# python-app/requirements.txt
flask==3.0.0
newrelic==9.6.0
redis==5.0.0
```

```python
# python-app/app.py - Flask app with New Relic instrumentation
import os
import time
import newrelic.agent
from flask import Flask, jsonify
import redis

# Initialize New Relic (happens automatically with newrelic-admin, but explicit init is fine too)
newrelic.agent.initialize()

app = Flask(__name__)
cache = redis.Redis(host=os.environ.get('REDIS_HOST', 'localhost'), port=6379)

@app.route('/')
def index():
    visits = cache.incr('python:visits')
    return jsonify({'service': 'python-app', 'visits': visits})

@app.route('/error')
def trigger_error():
    # New Relic will capture this error automatically
    raise ValueError("Intentional error for monitoring demonstration")

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Custom Attributes and Events

Add custom attributes to your transactions for better filtering in New Relic.

```javascript
// Adding custom attributes in Node.js
const newrelic = require('newrelic');

app.use((req, res, next) => {
  // Add custom attributes to every transaction
  newrelic.addCustomAttribute('userId', req.headers['x-user-id'] || 'anonymous');
  newrelic.addCustomAttribute('requestSource', req.headers['x-source'] || 'direct');
  next();
});

// Record a custom event
newrelic.recordCustomEvent('OrderPlaced', {
  orderId: '12345',
  amount: 99.99,
  currency: 'USD'
});
```

## Infrastructure Agent Configuration

For advanced infrastructure monitoring, create a configuration file.

```yaml
# newrelic-infra.yml - Infrastructure agent configuration
license_key: ${NRIA_LICENSE_KEY}
display_name: docker-compose-host

# Custom attributes added to all infrastructure events
custom_attributes:
  environment: production
  team: platform
  region: us-east-1

# Enable Docker container monitoring
docker:
  enabled: true

# Configure process monitoring
process:
  enabled: true
  # Only monitor processes matching these patterns
  include_matching_metrics:
    - process.name: "node"
    - process.name: "python"
    - process.name: "nginx"

# Log forwarding to New Relic
log:
  forward: true
  include_filters:
    - name: "docker-logs"
      file: /var/lib/docker/containers/*/*.log
```

## Verifying Data Flow

After starting the stack, generate some traffic and verify data appears in New Relic.

```bash
# Start the stack
docker compose up -d

# Generate traffic to the Node.js app
for i in $(seq 1 50); do
  curl -s http://localhost:3000/ > /dev/null
  curl -s http://localhost:3000/slow > /dev/null &
done

# Generate traffic to the Python app
for i in $(seq 1 50); do
  curl -s http://localhost:5000/ > /dev/null
done

# Check the infrastructure agent status
docker exec newrelic-infra newrelic-infra -validate
```

Data should appear in the New Relic UI within 2-3 minutes. Check the APM section for application metrics and the Infrastructure section for host and container data.

## Cleanup

```bash
docker compose down -v
```

## Conclusion

Running New Relic agents in Docker gives you full-stack visibility into your containerized applications. The infrastructure agent handles system and container metrics automatically, while the APM agents provide deep application-level insights including distributed tracing and error tracking. For teams evaluating alternatives, [OneUptime](https://oneuptime.com) offers open-source monitoring with similar APM and infrastructure capabilities without the complexity of per-host licensing.
