# How to Use Custom Buildpacks with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Custom Buildpacks, Kubernetes, PaaS, Configuration

Description: Extend Epinio with custom buildpacks to support specialized runtimes and build processes.

## Introduction

How to Use Custom Buildpacks with Epinio demonstrates how Epinio simplifies application deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on code while the platform handles containerization, deployment, and routing automatically. Because Epinio uses the Cloud Native Buildpacks lifecycle directly, custom buildpacks are used through a custom builder image selected with `--builder-image`.

## Prerequisites

- Epinio installed and accessible
- Epinio CLI installed and logged in
- An Epinio namespace created (`epinio namespace create my-apps`)
- `pack` CLI and Docker installed
- Access to a container registry reachable from your cluster
- Application source code ready

## Step 1: Prepare Your Application

```bash
# Create application directory

mkdir my-app && cd my-app

# Initialize the application
# (Language-specific initialization commands here)
```

## Step 2: Create the Application

For this example, we'll create a simple Node.js web application. The same custom-builder workflow works with other buildpacks; you would replace the Node.js buildpack in the builder configuration with the buildpack(s) your application needs.

```bash
cat > server.js << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    message: 'Application deployed via Epinio with a custom builder image',
    runtime: process.version,
    timestamp: new Date().toISOString()
  }));
});
server.listen(process.env.PORT || 8080, () => {
  console.log('Server started');
});
EOF
```

## Step 3: Target Your Namespace

```bash
# Target the namespace for deployment
epinio target my-apps

# Verify the currently targeted namespace
epinio target
```

## Step 4: Create and Publish a Custom Builder Image

```bash
# Create a custom builder definition.
# This example includes only the Paketo Node.js buildpack.
cat > builder.toml << 'EOF'
description = "Custom Jammy full builder with the Paketo Node.js buildpack"

[build]
image = "docker.io/paketobuildpacks/build-jammy-full:0.1.154"

[lifecycle]
version = "0.21.8"

[run]
[[run.images]]
image = "docker.io/paketobuildpacks/run-jammy-full:latest"

[stack]
id = "io.buildpacks.stacks.jammy"

[[buildpacks]]
uri = "docker://docker.io/paketobuildpacks/nodejs:10.2.7"
version = "10.2.7"

[[order]]
  [[order.group]]
  id = "paketo-buildpacks/nodejs"
  version = "10.2.7"
EOF

# Build the custom builder image
pack builder create ghcr.io/<username>/epinio-custom-builder:latest --config builder.toml

# Push it to a registry reachable from your cluster
docker push ghcr.io/<username>/epinio-custom-builder:latest
```

## Step 5: Deploy the Application

```bash
# Push the application with the custom builder image
epinio push \
  --name my-app \
  --path . \
  --builder-image ghcr.io/<username>/epinio-custom-builder:latest \
  --route my-app.<your-system-domain>
```

During push, Epinio will:
1. Upload source code
2. Detect the application using the buildpacks in your custom builder image
3. Run the appropriate buildpack
4. Build a container image
5. Deploy to Kubernetes
6. Configure routing and TLS

## Step 6: Verify the Deployment

```bash
# Check application status
epinio app show my-app

# List all applications in namespace
epinio app list
```

## Step 7: Test the Application

```bash
# Test with curl.
# Replace the route if you used a different custom domain.
curl -k https://my-app.<your-system-domain>
```

Open the application URL shown in the `Active Routes` section of `epinio app show my-app` in your browser.

## Step 8: View Application Logs

```bash
# View staging logs for the custom builder workflow
epinio app logs my-app --staging

# Follow live runtime logs
epinio app logs my-app --follow
```

## Step 9: Update the Application

```bash
# Make changes to your application code
# Then re-push to update with the same custom builder image
epinio push \
  --name my-app \
  --path . \
  --builder-image ghcr.io/<username>/epinio-custom-builder:latest

# Epinio restages the application and updates the deployment
epinio app show my-app
```

## Step 10: Configure Environment Variables

```bash
# Set environment variables
epinio app env set my-app DATABASE_URL "postgres://user:pass@host:5432/db"
epinio app env set my-app LOG_LEVEL "info"

# List environment variables
epinio app env list my-app
```

## Step 11: Scale the Application

```bash
# Scale to more instances
epinio app update my-app --instances 3

# Verify scaling
epinio app show my-app
```

## Cleanup

```bash
# Delete the application
epinio app delete my-app
```

## Conclusion

How to Use Custom Buildpacks with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy applications supported by the buildpacks in their builder image to Kubernetes without writing YAML or understanding container orchestration. By creating a custom builder image and selecting it with `--builder-image`, you can control the buildpacks Epinio uses for staging and image creation.
