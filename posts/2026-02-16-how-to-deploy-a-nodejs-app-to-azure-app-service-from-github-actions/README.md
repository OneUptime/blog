# How to Deploy a Node.js App to Azure App Service from GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Node.js, GitHub Actions, CI/CD, Deployment, DevOps

Description: A step-by-step guide to setting up automated deployments of a Node.js application to Azure App Service using GitHub Actions.

---

Deploying a Node.js application to Azure App Service manually through the portal or CLI works fine for the first time. But by the fifth deployment, you are tired of repeating the same steps, and by the fiftieth, you have made at least one mistake that caused an outage. GitHub Actions eliminates the repetition and the mistakes by automating the build and deployment process. Every push to your main branch triggers a build, runs your tests, and deploys to App Service automatically.

This guide walks through the entire setup from creating the App Service to writing the GitHub Actions workflow, with attention to the details that matter for production deployments.

## Prerequisites

You need:
- An Azure subscription
- A GitHub repository with a Node.js application
- Azure CLI installed locally (for initial setup)
- Node.js 18 or 20 (LTS versions supported by App Service)

## Step 1: Create the Azure App Service

Start by creating the App Service resources:

```bash
# Create a resource group
az group create --name myAppRG --location eastus

# Create an App Service plan (B1 tier for production-like testing)
az appservice plan create \
  --resource-group myAppRG \
  --name myAppPlan \
  --sku B1 \
  --is-linux

# Create the web app with Node.js 20 runtime
az webapp create \
  --resource-group myAppRG \
  --plan myAppPlan \
  --name my-nodejs-app \
  --runtime "NODE:20-lts"
```

The `--is-linux` flag creates a Linux-based App Service plan. For Node.js apps, Linux is generally the better choice - it is cheaper, starts faster, and has better Node.js support.

## Step 2: Configure App Service Settings

Set up the application settings that your app needs:

```bash
# Configure the Node.js startup command
az webapp config set \
  --resource-group myAppRG \
  --name my-nodejs-app \
  --startup-file "node server.js"

# Set environment variables
az webapp config appsettings set \
  --resource-group myAppRG \
  --name my-nodejs-app \
  --settings \
    NODE_ENV=production \
    PORT=8080
```

App Service runs your app on port 8080 by default (exposed as port 80/443 externally), but your app should read the PORT environment variable:

```javascript
// server.js - Express app configured for App Service
const express = require('express');
const app = express();

// App Service sets the PORT environment variable
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Hello from App Service', environment: process.env.NODE_ENV });
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

## Step 3: Set Up Authentication for GitHub Actions

GitHub Actions needs permission to deploy to your App Service. There are two approaches:

### Option A: Publish Profile (Simpler)

Download the publish profile from App Service and store it as a GitHub secret:

```bash
# Download the publish profile
az webapp deployment list-publishing-profiles \
  --resource-group myAppRG \
  --name my-nodejs-app \
  --xml > publish-profile.xml
```

Then in your GitHub repository:
1. Go to Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Name it `AZURE_WEBAPP_PUBLISH_PROFILE`
4. Paste the contents of publish-profile.xml as the value

### Option B: Service Principal (More Secure, Recommended)

Create a service principal with limited permissions:

```bash
# Create a service principal with Contributor access to the resource group
az ad sp create-for-rbac \
  --name "github-actions-deploy" \
  --role Contributor \
  --scopes /subscriptions/<sub-id>/resourceGroups/myAppRG \
  --sdk-auth
```

This outputs a JSON object. Store the entire JSON as a GitHub secret named `AZURE_CREDENTIALS`.

## Step 4: Write the GitHub Actions Workflow

Create the workflow file in your repository:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure App Service

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AZURE_WEBAPP_NAME: my-nodejs-app
  NODE_VERSION: '20.x'

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      # Check out the repository code
      - name: Checkout code
        uses: actions/checkout@v4

      # Set up Node.js
      - name: Set up Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      # Install dependencies
      - name: Install dependencies
        run: npm ci

      # Run linting
      - name: Lint
        run: npm run lint --if-present

      # Run tests
      - name: Test
        run: npm test --if-present

      # Build the application (if there is a build step)
      - name: Build
        run: npm run build --if-present

      # Upload the build artifact for the deploy job
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: node-app
          path: |
            .
            !node_modules
            !.git

  deploy:
    runs-on: ubuntu-latest
    needs: build-and-test
    # Only deploy on push to main, not on PRs
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    environment:
      name: production
      url: ${{ steps.deploy.outputs.webapp-url }}

    steps:
      # Download the build artifact
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: node-app

      # Install production dependencies
      - name: Install production dependencies
        run: npm ci --production

      # Log in to Azure
      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      # Deploy to App Service
      - name: Deploy to Azure App Service
        id: deploy
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          package: .

      # Verify the deployment
      - name: Health check
        run: |
          echo "Waiting for deployment to stabilize..."
          sleep 30
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${{ env.AZURE_WEBAPP_NAME }}.azurewebsites.net/health)
          if [ "$HTTP_STATUS" -ne 200 ]; then
            echo "Health check failed with status $HTTP_STATUS"
            exit 1
          fi
          echo "Health check passed with status $HTTP_STATUS"
```

## Step 5: Understanding the Workflow

Let me walk through the key decisions in this workflow:

**Two-job structure**: The `build-and-test` job runs on every push and PR. The `deploy` job only runs on pushes to main. This means PRs get tested but not deployed, and merges to main automatically deploy.

**npm ci vs npm install**: `npm ci` is used instead of `npm install`. It is faster, stricter (installs exactly what is in package-lock.json), and appropriate for CI/CD environments.

**Artifact upload/download**: The build artifact is passed between jobs using GitHub's artifact system. This ensures the deploy job uses exactly what was tested.

**Production dependencies only**: The deploy step installs only production dependencies (`npm ci --production`) to reduce the deployment package size. Dev dependencies (test frameworks, linters) are not needed in production.

**Health check**: After deployment, the workflow verifies the application is responding. If the health check fails, the workflow fails, making the deployment failure visible.

## Handling Environment Variables and Secrets

For applications that need environment-specific configuration, use App Service application settings and GitHub environment secrets:

```yaml
      # Set environment-specific configuration during deployment
      - name: Configure App Settings
        uses: azure/appservice-settings@v1
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          app-settings-json: |
            [
              {
                "name": "DATABASE_URL",
                "value": "${{ secrets.DATABASE_URL }}",
                "slotSetting": false
              },
              {
                "name": "REDIS_URL",
                "value": "${{ secrets.REDIS_URL }}",
                "slotSetting": false
              },
              {
                "name": "API_KEY",
                "value": "${{ secrets.API_KEY }}",
                "slotSetting": false
              }
            ]
```

## Adding Staging Deployments

For production applications, deploy to a staging slot first, verify, then swap:

```yaml
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: node-app

      - name: Install production dependencies
        run: npm ci --production

      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      # Deploy to staging slot
      - name: Deploy to staging
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          slot-name: staging
          package: .

      # Verify staging
      - name: Verify staging deployment
        run: |
          sleep 30
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://${{ env.AZURE_WEBAPP_NAME }}-staging.azurewebsites.net/health)
          if [ "$HTTP_STATUS" -ne 200 ]; then
            echo "Staging health check failed"
            exit 1
          fi

      # Swap staging to production
      - name: Swap to production
        run: |
          az webapp deployment slot swap \
            --resource-group myAppRG \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --slot staging \
            --target-slot production
```

## Caching for Faster Builds

Speed up your builds by caching npm dependencies:

```yaml
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
```

The `cache: 'npm'` parameter in the setup-node action automatically caches the npm global cache directory. Subsequent builds that have the same package-lock.json will skip downloading packages from the registry.

## Monitoring Deployments

After setting up the pipeline, monitor your deployments:

```bash
# Check deployment logs
az webapp log deployment show \
  --resource-group myAppRG \
  --name my-nodejs-app

# Stream application logs
az webapp log tail \
  --resource-group myAppRG \
  --name my-nodejs-app
```

Connect your App Service to OneUptime for continuous monitoring. Set up health check monitors on your `/health` endpoint to detect when deployments cause issues. Correlate deployment timestamps from GitHub Actions with application performance metrics to quickly identify if a deployment caused a regression.

## Wrapping Up

Deploying a Node.js app to Azure App Service from GitHub Actions gives you a reliable, automated pipeline that tests before deploying and verifies after deploying. Start with the basic two-job workflow, add staging slot deployments when you need zero-downtime updates, and use environment secrets for sensitive configuration. The initial setup takes about 30 minutes, and then every subsequent deployment is automatic and consistent.
