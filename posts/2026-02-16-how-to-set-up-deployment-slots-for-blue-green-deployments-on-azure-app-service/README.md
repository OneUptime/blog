# How to Set Up Deployment Slots for Blue-Green Deployments on Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Deployment Slots, Blue-Green Deployment, Zero Downtime, DevOps

Description: Learn how to use Azure App Service deployment slots for blue-green deployments with zero downtime swaps and instant rollback capability.

---

Deploying directly to a production web app means your users experience the deployment in real time. Files are being replaced, the app restarts, and for a few seconds (or longer), requests either fail or hit a partially deployed application. Deployment slots fix this by giving you a separate environment to deploy to, verify, and then swap into production instantly.

The swap operation is near-instantaneous because it changes the routing at the load balancer level rather than moving files. Your users do not notice a thing. And if something goes wrong, you can swap back just as quickly.

## How Deployment Slots Work

A deployment slot is a live instance of your App Service with its own hostname, configuration, and content. The production slot runs at `myapp.azurewebsites.net`, and a staging slot runs at `myapp-staging.azurewebsites.net`.

When you swap, Azure switches the routing so the staging slot's content is now served on the production URL and the old production content is now on the staging URL. The VMs behind each slot are not changed - only the network routing is updated.

This is essentially blue-green deployment built into the platform.

## Creating Deployment Slots

Deployment slots require the Standard tier (S1) or higher. Free, Shared, and Basic tiers do not support slots.

```bash
# Create a staging deployment slot
az webapp deployment slot create \
  --resource-group myAppRG \
  --name myapp \
  --slot staging

# Create additional slots if needed
az webapp deployment slot create \
  --resource-group myAppRG \
  --name myapp \
  --slot canary
```

After creation, the staging slot is accessible at `myapp-staging.azurewebsites.net`.

List your current slots:

```bash
# List all deployment slots
az webapp deployment slot list \
  --resource-group myAppRG \
  --name myapp \
  --query "[].{Name:name, State:state, DefaultHostName:defaultHostName}" \
  -o table
```

## Deploying to a Slot

Deploy your new version to the staging slot instead of production:

```bash
# Deploy a zip package to the staging slot
az webapp deploy \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --src-path app.zip \
  --type zip

# Or deploy from a Git repository
az webapp deployment source config \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --repo-url https://github.com/myorg/myapp \
  --branch main \
  --manual-integration
```

For GitHub Actions deployments, target the slot in your workflow:

```yaml
      - name: Deploy to staging slot
        uses: azure/webapps-deploy@v3
        with:
          app-name: myapp
          slot-name: staging
          package: .
```

## Configuring Slot Settings

Each slot can have its own application settings. Some settings should be specific to a slot (like database connection strings for a staging database), while others should swap with the content (like feature flags).

### Slot-Sticky Settings

Settings marked as "slot setting" (also called sticky) stay with the slot and do not move during a swap:

```bash
# Set a slot-sticky setting on the staging slot
az webapp config appsettings set \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --settings \
    DATABASE_URL="postgresql://staging-db:5432/myapp" \
    SLOT_NAME="staging" \
  --slot-settings DATABASE_URL SLOT_NAME
```

### Non-Sticky Settings

Settings without the slot-setting flag swap with the content. If production has `FEATURE_NEW_UI=false` and staging has `FEATURE_NEW_UI=true`, after a swap, production will have `FEATURE_NEW_UI=true`.

```bash
# Set a non-sticky setting (swaps with content)
az webapp config appsettings set \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --settings FEATURE_NEW_UI=true

# Mark specific settings as slot-sticky
az webapp config appsettings set \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --slot-settings DATABASE_URL REDIS_URL SLOT_NAME
```

## Performing a Swap

### Basic Swap

```bash
# Swap staging to production
az webapp deployment slot swap \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --target-slot production
```

The swap typically completes in a few seconds. During the swap:

1. Azure applies the production slot's sticky settings to the staging slot's instances.
2. The staging instances restart with the production settings.
3. Azure waits for the staging instances to complete their restart and warm up.
4. Azure swaps the routing rules.
5. The old production instances (now in the staging slot) get the staging sticky settings applied.

### Swap with Preview (Multi-Phase Swap)

For extra safety, use swap with preview. This applies the target slot's settings to the source slot but does not change the routing, letting you test before completing the swap:

```bash
# Start the swap preview (applies production settings to staging)
az webapp deployment slot swap \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --target-slot production \
  --action preview

# Test the staging slot - it now has production settings
# Visit https://myapp-staging.azurewebsites.net and verify

# If everything looks good, complete the swap
az webapp deployment slot swap \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --target-slot production \
  --action swap

# If something is wrong, cancel the swap
az webapp deployment slot swap \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --target-slot production \
  --action reset
```

## Rolling Back

The beauty of slot swaps is that rollback is just another swap. The old production version is sitting in the staging slot, ready to be swapped back:

```bash
# Rollback by swapping staging (old production) back to production
az webapp deployment slot swap \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --target-slot production
```

This is instantaneous because both versions are already running on warm instances. No deployment, no build, no wait.

## Traffic Routing for Canary Deployments

Deployment slots also support traffic splitting, which lets you route a percentage of production traffic to a slot for canary testing:

```bash
# Route 10% of traffic to the staging slot
az webapp traffic-routing set \
  --resource-group myAppRG \
  --name myapp \
  --distribution staging=10
```

With this configuration, 10% of users hitting `myapp.azurewebsites.net` will be served by the staging slot. This is transparent to the users - they hit the same URL.

Gradually increase the traffic percentage as you gain confidence:

```bash
# Increase to 25%
az webapp traffic-routing set \
  --resource-group myAppRG \
  --name myapp \
  --distribution staging=25

# Increase to 50%
az webapp traffic-routing set \
  --resource-group myAppRG \
  --name myapp \
  --distribution staging=50

# When satisfied, complete the swap
az webapp deployment slot swap \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --target-slot production

# Reset traffic routing
az webapp traffic-routing clear \
  --resource-group myAppRG \
  --name myapp
```

This is a canary deployment - gradually exposing the new version to more users while monitoring for errors.

## Auto-Swap

For non-critical environments (dev, test), you can configure auto-swap. When a deployment to a slot completes, it automatically swaps to a target slot:

```bash
# Enable auto-swap on the staging slot
az webapp config set \
  --resource-group myAppRG \
  --name myapp \
  --slot staging \
  --auto-swap-slot-name production
```

I would not recommend auto-swap for production environments. The whole point of the staging slot is to verify before swapping, and auto-swap bypasses that verification step.

## Slot Warm-Up

When a slot swap happens, instances need to be warmed up before receiving traffic. Configure warm-up in your web.config (Windows) or through application initialization:

```json
{
  "applicationInitialization": {
    "remapManagedRequestsTo": "/loading.html",
    "customInitializationActions": [
      { "initializationPage": "/health" },
      { "initializationPage": "/api/warmup" }
    ]
  }
}
```

For Linux App Service, your application should handle warm-up during startup. Azure sends a GET request to the root path and waits for a response before directing traffic to the instance.

## CI/CD Pipeline with Slots

Here is a complete GitHub Actions workflow that deploys to staging, runs verification tests, and then swaps to production:

```yaml
name: Deploy with Slot Swap

on:
  push:
    branches: [main]

jobs:
  deploy-and-swap:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Install and Build
        run: |
          npm ci
          npm run build

      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to Staging
        uses: azure/webapps-deploy@v3
        with:
          app-name: myapp
          slot-name: staging
          package: .

      - name: Run Smoke Tests Against Staging
        run: |
          sleep 30
          npm run test:smoke -- --base-url=https://myapp-staging.azurewebsites.net

      - name: Swap Staging to Production
        run: |
          az webapp deployment slot swap \
            --resource-group myAppRG \
            --name myapp \
            --slot staging \
            --target-slot production

      - name: Verify Production
        run: |
          sleep 10
          npm run test:smoke -- --base-url=https://myapp.azurewebsites.net
```

## Monitoring Swap Operations

Track swap operations to understand deployment patterns and catch issues:

```bash
# View swap events in the activity log
az monitor activity-log list \
  --resource-group myAppRG \
  --offset 7d \
  --query "[?contains(operationName.value, 'Swap')].{Time:eventTimestamp, Status:status.localizedValue, Description:description}" \
  -o table
```

Feed deployment and swap events into OneUptime to correlate them with application performance metrics. A performance regression that starts exactly at the time of a swap clearly points to the new deployment as the cause.

## Wrapping Up

Deployment slots on Azure App Service give you zero-downtime deployments, instant rollback, and canary testing out of the box. The workflow is simple: deploy to staging, verify, swap to production. If something goes wrong, swap back. Traffic splitting adds gradual rollout capability for cautious releases. Make deployment slots part of every production App Service deployment and you will never have another deployment-caused outage.
