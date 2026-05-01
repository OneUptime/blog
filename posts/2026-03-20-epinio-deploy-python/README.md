# How to Deploy a Python Application with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Python, Kubernetes, PaaS, Flask

Description: Push a Python application to Kubernetes using Epinio with automatic dependency installation and runtime configuration.

## Introduction

How to Deploy a Python Application with Epinio demonstrates how Epinio simplifies application deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on code while the platform handles containerization, deployment, and routing automatically.

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

For this example, we'll create a simple Flask web application:

```bash
# Create main application file
cat > app.py << 'EOF'
import os

from flask import Flask

app = Flask(__name__)


@app.route("/")
def hello():
    return {
        "message": "Application deployed via Epinio",
        "platform": "Epinio",
    }


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
EOF
```

Add the Python dependencies and a Procfile so Epinio can install Flask and start the app correctly:

```bash
cat > requirements.txt << 'EOF'
Flask
EOF

cat > Procfile << 'EOF'
web: python app.py
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
epinio push --name my-app

# Or specify options explicitly
epinio push \
  --name my-app \
  --instances 2 \
  --route my-app.epinio.example.com
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

# View the first application route
epinio app show my-app | awk '/Routes:/{getline; print $2}'
```

## Step 6: Test the Application

```bash
# Get the application URL
APP_URL=$(epinio app show my-app | awk '/Routes:/{getline; print $2}')

# Test with curl
curl "$APP_URL"

# Or open the URL in your browser
python3 -m webbrowser "$APP_URL"
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

# Epinio performs a rolling update
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

How to Deploy a Python Application with Epinio with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy any application to Kubernetes without writing YAML or understanding container orchestration. Epinio's buildpack system automatically detects the runtime, installs dependencies, and creates an optimized container image.
