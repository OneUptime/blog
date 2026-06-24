# How to Deploy a Ruby Application with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Ruby, Kubernetes, PaaS, Rails

Description: Deploy a Ruby on Rails application to Kubernetes using Epinio with Bundler dependency management.

## Introduction

How to Deploy a Ruby Application with Epinio demonstrates how Epinio simplifies application deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on code while the platform handles containerization, deployment, and routing automatically.

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

For this example, we'll create a simple Ruby web application:

```bash
# Create Gemfile
cat > Gemfile << 'EOF'
source "https://rubygems.org"

ruby "~> 3.3"

gem "puma"
gem "sinatra"
EOF

# Create main application file
cat > app.rb << 'EOF'
require "json"
require "sinatra"
require "time"

set :bind, "0.0.0.0"
set :port, ENV.fetch("PORT", "8080").to_i

get "/" do
  content_type :json
  {
    message: "Application deployed via Epinio",
    runtime: RUBY_VERSION,
    timestamp: Time.now.utc.iso8601
  }.to_json
end
EOF

# Create Rack configuration
cat > config.ru << 'EOF'
require "./app"

run Sinatra::Application
EOF
```

## Step 3: Target Your Namespace

```bash
# Target the namespace for deployment
epinio target my-apps

# Show the current target namespace
epinio target
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

# View the application route
epinio app show my-app | grep -E 'https?://'
```

## Step 6: Test the Application

```bash
# Get the application URL
APP_URL=$(epinio app show my-app | grep -Eo 'https?://[^[:space:]]+' | head -n1)

# Test with curl
curl "${APP_URL}"

# Print the URL for testing in a browser
printf '%s\n' "${APP_URL}"
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

# Verify the updated application
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

How to Deploy a Ruby Application with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy supported applications to Kubernetes without writing YAML or managing the container orchestration details directly. Epinio's buildpack system automatically detects the runtime, installs dependencies, and creates an optimized container image.
