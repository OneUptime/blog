# How to Deploy Your First Application with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Kubernetes, PaaS, Developer Experience, Deployment

Description: Deploy your first application to Kubernetes using Epinio's simple push workflow, from source code to running application in minutes.

## Introduction

Epinio provides a Heroku-like push experience on top of Kubernetes. You point it at your source code, and Epinio handles building the container, creating Kubernetes resources, and setting up routing. This guide walks through deploying your first application from source code.

## Prerequisites

- Epinio installed and accessible
- Epinio CLI installed and logged in
- An application to deploy (we'll create one)

## Understanding the Epinio Push Workflow

```mermaid
flowchart LR
    A[Source Code] -->|epinio push| B[Epinio API]
    B --> C[Buildpack Detection]
    C --> D[Container Build]
    D --> E[Image Push to Registry]
    E --> F[Kubernetes Deployment]
    F --> G[Ingress Route Created]
    G --> H[App Running at URL]
```

## Step 1: Create a Simple Application

Let's create a Node.js application:

```bash
mkdir my-first-app && cd my-first-app

# Create the application file

cat > server.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(`Hello from Epinio!\nHostname: ${require('os').hostname()}\n`);
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "my-first-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": ">=18"
  }
}
EOF
```

## Step 2: Configure Epinio Namespace

```bash
# Create a namespace for your app
epinio namespace create my-apps

# Switch to the namespace
epinio target my-apps

# Verify the namespace
epinio namespace show my-apps
```

## Step 3: Push the Application

```bash
# Push from the application directory
epinio push --name my-first-app

# With specific options
# The custom route must resolve to your cluster's ingress IP
epinio push \
  --name my-first-app \
  --instances 2 \
  --route my-first-app.epinio.example.com
```

The push process will:
1. Upload source code to Epinio
2. Auto-detect the runtime (Node.js)
3. Build a container using buildpacks
4. Deploy to Kubernetes
5. Configure routing

## Step 4: Check Deployment Status

```bash
# List all applications
epinio app list

# Show detailed info about your app
epinio app show my-first-app

# Look for the status, route, and desired instance count in the output.
```

## Step 5: Access the Application

```bash
# Show the application details and note the route in the output
epinio app show my-first-app

# Test the application using that route
curl https://<your-app-route>

# Expected output:
# Hello from Epinio!
# Hostname: my-first-app-7d9f8b-xpqrt
```

## Step 6: View Application Logs

```bash
# Follow live logs
epinio app logs --follow my-first-app

# Show application logs
epinio app logs my-first-app
```

## Step 7: Update the Application

```bash
# Modify the application
cat > server.js << 'EOF'
const http = require('http');
const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    message: 'Hello from Epinio v2!',
    hostname: require('os').hostname(),
    timestamp: new Date().toISOString()
  }));
});

server.listen(port);
EOF

# Push the update
epinio push --name my-first-app
```

## Step 8: Scale the Application

```bash
# Scale to 3 instances
epinio app update my-first-app --instances 3

# Verify scaling
epinio app show my-first-app
```

## Step 9: Clean Up

```bash
# Delete the application
epinio app delete my-first-app

# Delete the namespace (removes all apps in it)
# Confirm the prompt, or add --force to skip confirmation
epinio namespace delete my-apps
```

## Conclusion

Epinio's push workflow makes deploying applications to Kubernetes as simple as pushing to a PaaS platform. Developers don't need to write Kubernetes manifests or understand container building - just point Epinio at source code and it handles the rest. This dramatically reduces the Kubernetes learning curve while maintaining the scalability and reliability of Kubernetes.
