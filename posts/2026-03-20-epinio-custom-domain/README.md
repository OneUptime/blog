# How to Set Up a Custom Domain for Epinio Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Custom Domain, Kubernetes, SSL, PaaS

Description: Configure custom domains and SSL certificates for Epinio applications using ingress and cert-manager.

## Introduction

How to Set Up a Custom Domain for Epinio Applications demonstrates how Epinio simplifies application deployment to Kubernetes. Once Epinio, DNS, and cert-manager are in place, assigning a custom domain is as simple as pushing the app with a custom route. Epinio abstracts away Kubernetes complexity, letting developers focus on code while the platform handles containerization, deployment, and routing automatically.

## Prerequisites

- Epinio installed and accessible
- Epinio CLI installed and logged in
- An Epinio namespace created (`epinio namespace create my-apps`)
- A custom domain or subdomain pointing to the cluster ingress controller
- cert-manager installed and configured for the cluster
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
# Create main application file
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

# Or specify options explicitly, including a custom route
epinio push \
  --name my-app \
  --path . \
  --instances 2 \
  --route my-app.example.com
```

During push, Epinio will:
1. Upload source code
2. Detect the application runtime/language
3. Run the appropriate buildpack
4. Build a container image
5. Deploy to Kubernetes
6. Configure routing and, when cert-manager is available and the route resolves to the ingress controller, request TLS certificates for the route

## Step 5: Verify the Deployment

```bash
# Check application status
epinio app show my-app

# List all applications in namespace
epinio app list

# View the application route(s)
epinio app show my-app | awk '/Routes:/{flag=1; next} flag && /^[[:space:]]*[0-9]+: / {print}'
```

## Step 6: Test the Application

```bash
# Get the application URL
APP_URL=$(epinio app show my-app | awk '/Routes:/{flag=1; next} flag && /^[[:space:]]*[0-9]+: https?:\\/\\// {print $2; exit}')

# Test with curl
curl "${APP_URL}"

# Or open the URL in your browser
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

# Epinio rebuilds and redeploys the application
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

How to Set Up a Custom Domain for Epinio Applications with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy applications to Kubernetes without writing YAML or understanding container orchestration, while custom routes let those applications answer on domains you control. When DNS and cert-manager are configured correctly, Epinio can also request certificates for those routes so the application is available over HTTPS.
