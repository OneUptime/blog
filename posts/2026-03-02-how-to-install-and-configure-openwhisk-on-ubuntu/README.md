# How to Install and Configure OpenWhisk on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Serverless, OpenWhisk, Docker, Functions

Description: Learn how to install and configure Apache OpenWhisk on Ubuntu using Docker Compose for a self-hosted serverless computing platform.

---

Apache OpenWhisk is an open-source serverless platform developed by IBM and donated to the Apache Software Foundation. It allows you to execute code in response to events - HTTP requests, database changes, message queue events - without managing servers. Unlike cloud-based serverless offerings, running OpenWhisk on Ubuntu gives you complete control over the infrastructure, data residency, and cost structure.

OpenWhisk uses Docker containers to execute functions ("actions" in OpenWhisk terminology) and supports virtually any language through custom runtime containers.

## Architecture Overview

OpenWhisk has several components:

- **Controller** - receives API calls and coordinates execution
- **Invoker** - executes actions in Docker containers
- **Kafka** - message broker between controller and invokers
- **CouchDB** - stores actions, activations, and namespaces
- **API Gateway** - routes HTTP traffic to actions
- **Nginx** - SSL termination and load balancing

For development and small production workloads, all components run on a single host with Docker Compose.

## Prerequisites

Install Docker and Docker Compose:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git curl

# Add your user to the docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker is running
docker run hello-world
```

Ensure Docker has enough resources (at least 4GB RAM for the host):

```bash
# Check available memory
free -h
```

## Cloning and Configuring OpenWhisk

```bash
# Clone the OpenWhisk Docker Compose deployment
git clone https://github.com/apache/openwhisk-deploy-kube.git
# For local Docker Compose deployment, use the standalone setup:
git clone https://github.com/apache/openwhisk.git
cd openwhisk

# Alternative: use the docker-compose project
git clone https://github.com/apache/openwhisk-devtools.git
cd openwhisk-devtools/docker-compose
```

The docker-compose approach is simplest for getting started:

```bash
cd openwhisk-devtools/docker-compose

# Review the configuration
cat docker-compose.yml
```

## Configuring OpenWhisk

Create a configuration file:

```bash
# Create configuration directory
mkdir -p /etc/openwhisk

# Configure the deployment
cat > .env << 'EOF'
# OpenWhisk configuration
WHISK_AUTH=23bc46b1-71f6-4ed5-8c54-816aa4f8c502:123zO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP
DOCKER_COMPOSE_PROJECT_NAME=openwhisk
# Limit containers per invoker
LIMITS_CONCURRENCY=100
EOF
```

## Starting OpenWhisk

```bash
# Start all OpenWhisk services
docker compose up -d

# This takes a few minutes on first run as images are pulled
# Monitor the startup
docker compose logs -f

# Check that all services are running
docker compose ps
```

Wait until the system is ready:

```bash
# The edge service indicates readiness
docker compose logs edge | grep -i "ready"

# Alternatively, poll the health endpoint
until curl -sk https://localhost/api/v1/info > /dev/null 2>&1; do
    echo "Waiting for OpenWhisk..."
    sleep 5
done
echo "OpenWhisk is ready"
```

## Installing the wsk CLI

```bash
# Download the wsk CLI
curl -Lo wsk https://github.com/apache/openwhisk-cli/releases/download/1.2.0/OpenWhisk_CLI-1.2.0-linux-amd64.tgz

# Extract and install
tar xzf OpenWhisk_CLI-1.2.0-linux-amd64.tgz
sudo mv wsk /usr/local/bin/
chmod +x /usr/local/bin/wsk

# Configure the CLI to connect to your instance
wsk property set \
    --apihost localhost \
    --auth 23bc46b1-71f6-4ed5-8c54-816aa4f8c502:123zO3xZCLrMN6v2BKK1dXYFpXlPkccOFqm12CdAsMgRU4VrNZ9lyGVCGuMDGIwP

# Disable TLS verification for local development (don't do this in production)
wsk property set --apihost https://localhost -i

# Test the connection
wsk namespace list
```

## Creating Your First Action

Actions are the functions executed by OpenWhisk. Start with a simple JavaScript action:

```bash
# Create a JavaScript action
cat > hello.js << 'EOF'
// hello.js - OpenWhisk action
function main(params) {
    // params contains the invocation parameters
    const name = params.name || 'World';
    const greeting = `Hello, ${name}!`;

    // Return an object - OpenWhisk serializes this as JSON
    return { greeting: greeting, timestamp: new Date().toISOString() };
}
EOF

# Create the action
wsk action create hello hello.js

# Invoke the action
wsk action invoke hello --result

# Invoke with parameters
wsk action invoke hello --param name Ubuntu --result
```

## Python Actions

```bash
# Create a Python action
cat > process.py << 'EOF'
# process.py - Python action example
import json
import hashlib

def main(args):
    """
    Main function - OpenWhisk entry point for Python actions
    args: dict of parameters passed at invocation
    """
    text = args.get('text', 'Hello OpenWhisk')
    algorithm = args.get('algorithm', 'sha256')

    # Compute hash of the input text
    h = hashlib.new(algorithm)
    h.update(text.encode())
    digest = h.hexdigest()

    return {
        'input': text,
        'algorithm': algorithm,
        'hash': digest
    }
EOF

# Create the action
wsk action create process-text process.py --kind python:3

# Test it
wsk action invoke process-text --param text "Hello World" --result
wsk action invoke process-text --param text "OpenWhisk" --param algorithm md5 --result
```

## Web Actions (HTTP Endpoints)

Convert actions to web-accessible endpoints:

```bash
# Create an action that handles HTTP requests
cat > http-handler.js << 'EOF'
function main(params) {
    // Web actions receive HTTP request details in params
    const method = params.__ow_method || 'unknown';
    const headers = params.__ow_headers || {};
    const query = params.__ow_query || '';
    const body = params.__ow_body || '';

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: 'Request received',
            method: method,
            userAgent: headers['user-agent'] || 'none',
            query: query
        })
    };
}
EOF

# Create as a web action
wsk action create http-handler http-handler.js --web true

# Get the web action URL
wsk action get http-handler --url

# Test the web action
curl -s $(wsk action get http-handler --url | tail -1)
```

## Setting Up Triggers and Rules

OpenWhisk's event model connects event sources (triggers) to actions through rules:

```bash
# Create a trigger (event source)
wsk trigger create hourly-trigger \
    --feed /whisk.system/alarms/alarm \
    --param cron "0 * * * *"

# Create an action for the trigger
cat > scheduled-task.js << 'EOF'
function main(params) {
    console.log('Scheduled task running at:', new Date().toISOString());
    // Perform periodic work here
    return { executed: true, time: new Date().toISOString() };
}
EOF
wsk action create scheduled-task scheduled-task.js

# Create a rule connecting trigger to action
wsk rule create run-scheduled-task hourly-trigger scheduled-task

# Manually fire the trigger to test
wsk trigger fire hourly-trigger

# Check the activation log
wsk activation list | head -10

# View activation result
wsk activation result <activation-id>
```

## Monitoring and Logs

```bash
# List recent activations
wsk activation list

# Get details of a specific activation
wsk activation get <activation-id>

# Poll for new activations in real time
wsk activation poll

# Get action logs
wsk activation logs <activation-id>

# Check action execution statistics
wsk activation list --limit 20 | awk '{print $3}' | sort | uniq -c
```

## Managing Resources

```bash
# List all actions
wsk action list

# Delete an action
wsk action delete hello

# Update an action
wsk action update hello hello.js --timeout 10000 --memory 256

# Set default parameters for an action
wsk action update hello hello.js --param-file defaults.json
```

OpenWhisk is a mature, production-grade serverless platform used by IBM Cloud (as IBM Cloud Functions). Running it yourself gives you the same event-driven programming model without the per-invocation costs or vendor lock-in that come with commercial serverless offerings.
