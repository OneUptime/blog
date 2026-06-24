# How to Deploy a .NET Application with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, .NET, Kubernetes, PaaS, CSharp

Description: Build and deploy a .NET Core application to Kubernetes using Epinio's .NET buildpack.

## Introduction

How to Deploy a .NET Application with Epinio demonstrates how Epinio simplifies application deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on code while the platform handles containerization, deployment, and routing automatically.

## Prerequisites

- Epinio installed and accessible
- Epinio CLI installed and logged in
- A .NET SDK installed locally
- An Epinio namespace created (`epinio namespace create my-apps`)

## Step 1: Prepare Your Application

```bash
# Create application directory

mkdir my-app && cd my-app

# Initialize a minimal ASP.NET Core app
dotnet new web
```

## Step 2: Create the Application

For this example, we'll create a simple web application:

```bash
# Replace Program.cs with a minimal API
cat > Program.cs << 'EOF'
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => new
{
  message = "Application deployed via Epinio",
  framework = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
  timestamp = System.DateTimeOffset.UtcNow
});

app.Run("http://0.0.0.0:8080");
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
# Push the application (Epinio auto-detects the .NET app)
epinio push --name my-app --path .

# Or specify options explicitly
# Make sure the custom route resolves to your Epinio ingress.
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
6. Configure routing and the related TLS resources

## Step 5: Verify the Deployment

```bash
# Check application status
epinio app show my-app

# List all applications in namespace
epinio app list

# Print the first application route
epinio app show my-app | awk '/^[[:space:]]*[0-9]+: https?:\\/\\// {print $2; exit}'
```

## Step 6: Test the Application

```bash
# Get the application URL
APP_URL=$(epinio app show my-app | awk '/^[[:space:]]*[0-9]+: https?:\\/\\// {print $2; exit}')

# Test with curl
curl "${APP_URL}"

# Print the URL so you can open it in a browser
echo "${APP_URL}"
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

How to Deploy a .NET Application with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy supported applications to Kubernetes without writing YAML or understanding container orchestration. Epinio uses Cloud Native Buildpacks to detect the application type, install dependencies, and build a container image.
