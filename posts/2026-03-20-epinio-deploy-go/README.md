# How to Deploy a Go Application with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Go, Kubernetes, PaaS, Golang

Description: Compile and deploy a Go application to Kubernetes using Epinio's buildpack system for compiled languages.

## Introduction

How to Deploy a Go Application with Epinio demonstrates how Epinio simplifies application deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on code while the platform handles containerization, deployment, and routing automatically.

## Prerequisites

- Epinio installed and accessible
- Epinio CLI installed and logged in
- An Epinio namespace created (`epinio namespace create my-apps`)
- Go installed locally
- Application source code ready

## Step 1: Prepare Your Application

```bash
# Create application directory

mkdir my-app && cd my-app

# Initialize the Go module
go mod init example.com/my-app
```

## Step 2: Create the Application

For this example, we'll create a simple web application:

```bash
# Create main application file
cat > main.go << 'EOF'
package main

import (
  "fmt"
  "log"
  "net/http"
  "os"
)

func main() {
  port := os.Getenv("PORT")
  if port == "" {
    port = "8080"
  }

  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/plain; charset=utf-8")
    fmt.Fprintln(w, "Hello from How to Deploy a Go Application with Epinio!")
  })

  log.Printf("listening on :%s", port)
  log.Fatal(http.ListenAndServe(":"+port, nil))
}
EOF
```

## Step 3: Target Your Namespace

```bash
# Target the namespace for deployment
epinio target my-apps

# Verify namespace is active
epinio target
```

## Step 4: Deploy the Application

```bash
# Push the application (Epinio auto-detects the runtime)
epinio push --name my-app

# Or specify options explicitly
# Replace the custom route with a hostname that resolves to your cluster ingress
epinio push \
  --name my-app \
  --instances 2 \
  --route my-app.example.com
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
epinio app show my-app
```

## Step 6: Test the Application

```bash
# Test the default route
curl https://my-app.<your-epinio-domain>

# If you used the custom route example above
curl https://my-app.example.com

# Or open the route shown by epinio app show my-app in your browser
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
epinio push --name my-app

# Verify the updated deployment
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

How to Deploy a Go Application with Epinio with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy any application to Kubernetes without writing YAML or understanding container orchestration. Epinio's buildpack system automatically detects the runtime, installs dependencies, and creates an optimized container image.
