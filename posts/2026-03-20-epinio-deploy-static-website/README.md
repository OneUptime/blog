# How to Deploy a Static Website with Epinio

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Epinio, Static Site, Kubernetes, PaaS, HTML

Description: Serve a static HTML/CSS/JS website on Kubernetes using Epinio with automatic NGINX configuration.

## Introduction

How to Deploy a Static Website with Epinio demonstrates how Epinio simplifies static site deployment to Kubernetes. Epinio abstracts away Kubernetes complexity, letting developers focus on HTML, CSS, and JavaScript while the platform handles containerization, deployment, and routing automatically. With Paketo's NGINX buildpack, Epinio can also generate the NGINX configuration for the site during the build.

## Prerequisites

- Epinio installed and accessible
- Epinio CLI installed and logged in
- An Epinio namespace created (`epinio namespace create my-apps`)
- Application source code ready

## Step 1: Prepare Your Application

```bash
# Create application directory
mkdir -p my-app/public && cd my-app
```

## Step 2: Create the Application

For this example, we'll create a simple static website. The Paketo NGINX buildpack serves files from `public` by default, so we'll place the site there:

```bash
# Create the main HTML file
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Epinio Static Site</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main>
    <h1>Hello from Epinio</h1>
    <p>This static HTML/CSS/JS site is being served by NGINX on Kubernetes through Epinio.</p>
    <button id="show-time">Show current time</button>
    <pre id="output"></pre>
  </main>
  <script src="app.js"></script>
</body>
</html>
EOF
```

```bash
# Add some basic styling
cat > public/styles.css << 'EOF'
body {
  font-family: sans-serif;
  margin: 0;
  background: #f6f8fa;
  color: #1f2328;
}

main {
  max-width: 40rem;
  margin: 4rem auto;
  padding: 2rem;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

button {
  padding: 0.75rem 1rem;
  border: 0;
  border-radius: 8px;
  background: #0d6efd;
  color: white;
  cursor: pointer;
}

pre {
  margin-top: 1rem;
  white-space: pre-wrap;
}
EOF
```

```bash
# Add a small JavaScript enhancement
cat > public/app.js << 'EOF'
document.getElementById('show-time').addEventListener('click', () => {
  document.getElementById('output').textContent =
    `Rendered at ${new Date().toISOString()}`;
});
EOF
```

## Step 3: Target Your Namespace

```bash
# Target the namespace for deployment
epinio target my-apps

# Verify the namespace is now targeted
epinio target
```

## Step 4: Deploy the Application

```bash
# Push the application and have the buildpack generate nginx.conf
epinio push --name my-app --env BP_WEB_SERVER=nginx

# Or specify options explicitly
epinio push \
  --name my-app \
  --instances 2 \
  --env BP_WEB_SERVER=nginx \
  --route my-app.epinio.example.com
```

During push, Epinio will:
1. Upload source code
2. Apply the appropriate buildpacks
3. Generate an `nginx.conf` because `BP_WEB_SERVER=nginx`
4. Build a container image
5. Deploy to Kubernetes
6. Configure routing

## Step 5: Verify the Deployment

```bash
# Check application status and review the Active Routes entry
epinio app show my-app

# List all applications in namespace
epinio app list
```

## Step 6: Test the Application

```bash
# Get the application URL from the Active Routes entry
APP_URL=$(epinio app show my-app | awk -F'|' '/Active Routes/{getline; gsub(/^[[:space:]]+|[[:space:]]+$/, "", $3); print "https://" $3}')

# Test with curl
curl "${APP_URL}"

# Or print the URL and open it in your browser
echo "${APP_URL}"
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
epinio push --name my-app --env BP_WEB_SERVER=nginx

# Epinio rebuilds and redeploys the application
epinio app show my-app
```

## Step 9: Configure Environment Variables

```bash
# Set a buildpack environment variable
epinio app env set my-app BP_WEB_SERVER_FORCE_HTTPS true

# Restage so the buildpack regenerates nginx.conf with the new setting
epinio app restage my-app

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

How to Deploy a Static Website with Epinio demonstrates how the platform removes barriers between development and deployment. The simple push workflow means developers can deploy a static site to Kubernetes without writing YAML or managing an NGINX container directly. By using `BP_WEB_SERVER=nginx`, Epinio can rely on Paketo buildpacks to generate the web server configuration, build the container image, and publish the application route.
