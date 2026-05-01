# How to Deploy a PHP Application with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, PHP, Kubernetes, PaaS, Composer

Description: Deploy a PHP application to Kubernetes using Epinio's PHP buildpack with Composer dependency management.

## Introduction

How to Deploy a PHP Application with Epinio demonstrates how Epinio simplifies application deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on code while the platform handles containerization, deployment, and routing automatically.

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

For this example, we'll create a simple PHP application with Composer metadata:

```bash
# Create Composer metadata
cat > composer.json << 'EOF'
{
  "name": "example/my-app",
  "description": "Minimal PHP app for Epinio",
  "require": {
    "php": ">=8.1"
  }
}
EOF
```

For the application itself:

```bash
# PHP example
cat > index.php << 'EOF'
<?php
declare(strict_types=1);

header('Content-Type: application/json');

echo json_encode([
    'message' => 'Application deployed via Epinio',
    'runtime' => PHP_VERSION,
    'timestamp' => date(DATE_ATOM),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
EOF
```

## Step 3: Target Your Namespace

```bash
# Target the namespace for deployment
epinio target my-apps

# Verify the targeted namespace
epinio target

# Inspect the namespace
epinio namespace show my-apps
```

## Step 4: Deploy the Application

```bash
# Push the application (Epinio auto-detects the PHP runtime)
epinio push --name my-app

# Or specify options explicitly
epinio push \
  --name my-app \
  --instances 2 \
  --route my-app.<your-system-domain>
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

# View the application route shown under Active Routes
epinio app show my-app --no-colors | grep 'Active Routes' -A 1
```

## Step 6: Test the Application

```bash
# Get the first application route from Active Routes
APP_HOST=$(epinio app show my-app --no-colors | awk -F'|' '/Active Routes/{getline; gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3); print $3; exit}')
APP_URL="https://${APP_HOST}"

# Test with curl
curl "$APP_URL"

# Or open the URL in your browser
```

## Step 7: View Application Logs

```bash
# View recent logs
epinio app logs my-app

# Follow live logs
epinio app logs my-app --follow
```

## Step 8: Update the Application

```bash
# Make changes to your application code
# Then re-push to update
epinio push --name my-app

# Epinio deploys the updated application
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

How to Deploy a PHP Application with Epinio with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy supported PHP applications to Kubernetes without writing YAML or understanding container orchestration. Epinio's buildpack system automatically detects the PHP runtime, installs Composer dependencies, and creates an optimized container image.
