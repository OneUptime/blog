# How to View Application Logs in Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Logging, Kubernetes, PaaS, Debugging

Description: Access and stream application logs from Epinio-deployed applications for debugging and monitoring.

## Introduction

How to View Application Logs in Epinio demonstrates how Epinio simplifies application deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on code while the platform handles containerization, deployment, and routing automatically.

## Prerequisites

- Epinio installed and accessible
- Epinio CLI installed and logged in
- An Epinio namespace created (`epinio namespace create my-apps`)
- Application source code ready

## Step 1: Prepare Your Application

```bash
# Create application directory

mkdir my-app && cd my-app

# Initialize the application
# (Language-specific initialization commands here)
```

## Step 2: Create the Application

For this example, we'll create a simple web application:

```bash
# Create package definition
cat > package.json << 'EOF'
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  }
}
EOF
```

For a language-specific example relevant to this guide:

```bash
# Node.js example
cat > server.js << 'EOF'
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    message: 'Application deployed via Epinio',
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

# Verify namespace is active
epinio namespace show my-apps
```

## Step 4: Deploy the Application

```bash
# Push the application (Epinio auto-detects the runtime)
epinio push --name my-app --path .

# Or specify options explicitly
epinio push \
  --name my-app \
  --path . \
  --instances 2
```

During push, Epinio will:
1. Upload source code
2. Detect the application runtime/language
3. Run the appropriate buildpack
4. Build a container image
5. Deploy to Kubernetes
6. Configure routing and TLS

## Step 5: Verify the Deployment

```bash
# Check application status
epinio app show my-app

# List all applications in namespace
epinio app list

# View the application route
epinio app show my-app | grep "Active Routes" -A 1
```

## Step 6: Test the Application

```bash
# Get the application hostname from the Active Routes section
APP_HOST=$(epinio app show my-app | awk -F'|' '/Active Routes/{getline; gsub(/^ +| +$/, "", $3); print $3}')

# Build the application URL
APP_URL="https://${APP_HOST}"

# Test with curl
curl "${APP_URL}"

# Or open in browser on macOS
open "${APP_URL}"
```

## Step 7: View Application Logs

```bash
# View recent logs
epinio app logs my-app

# Follow live logs
epinio app logs --follow my-app
```

## Step 8: Update the Application

```bash
# Make changes to your application code
# Then re-push to update
epinio push --name my-app --path .

# Epinio restages and redeploys the application
epinio app show my-app
```

## Step 9: Configure Environment Variables

```bash
# Set environment variables
epinio app env set my-app DATABASE_URL "postgres://user:pass@host:5432/db"
epinio app env set my-app LOG_LEVEL "info"

# List environment variables
epinio app env list my-app
```

## Step 10: Scale the Application

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

How to View Application Logs in Epinio with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy supported applications to Kubernetes without writing YAML or understanding container orchestration. Epinio's buildpack system automatically detects the runtime, installs dependencies, and creates an optimized container image.
