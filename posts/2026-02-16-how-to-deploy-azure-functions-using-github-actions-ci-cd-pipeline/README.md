# How to Deploy Azure Functions Using GitHub Actions CI/CD Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, GitHub Actions, CI/CD, DevOps, Azure, Deployment, Automation

Description: Step-by-step guide to setting up a complete CI/CD pipeline for Azure Functions using GitHub Actions with build, test, and deploy stages.

---

Deploying Azure Functions manually through the Azure Portal or the CLI works fine when you are prototyping. But once your function app is handling real workloads, you need a repeatable, automated deployment pipeline. GitHub Actions is a natural fit for this since your code is already on GitHub and the Azure team maintains official actions for function deployments.

In this post, I will walk through setting up a complete CI/CD pipeline that builds, tests, and deploys an Azure Function app to multiple environments.

## Prerequisites

Before we start, make sure you have the following in place:

- An Azure Function app already created (Consumption or Premium plan)
- A GitHub repository containing your function code
- The Azure CLI installed locally for the initial setup

## Step 1: Create a Service Principal for GitHub

GitHub Actions needs credentials to deploy to your Azure subscription. The cleanest way to handle this is with a service principal and a federated identity credential (OIDC), which avoids storing long-lived secrets in GitHub.

```bash
# Create a service principal with Contributor access to your resource group
# This limits the scope so the credential cannot modify other resource groups
az ad sp create-for-rbac \
  --name "github-deploy-functions" \
  --role Contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/<RESOURCE_GROUP> \
  --sdk-auth
```

Copy the JSON output. You will store this as a GitHub secret in the next step.

Go to your GitHub repository, navigate to Settings, then Secrets and variables, then Actions. Create a new secret called `AZURE_CREDENTIALS` and paste the JSON.

You will also want to store your function app name as a secret or variable. Create a variable called `AZURE_FUNCTION_APP_NAME` with your function app's name.

## Step 2: Set Up the Workflow File for a .NET Function

Create the workflow file in your repository. Here is a complete pipeline for a .NET 8 isolated worker function.

```yaml
# .github/workflows/deploy-functions.yml
# This workflow builds, tests, and deploys the Azure Function app
# Triggers on push to main and on pull requests for validation

name: Deploy Azure Functions

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  DOTNET_VERSION: '8.0.x'
  AZURE_FUNCTION_APP_NAME: ${{ vars.AZURE_FUNCTION_APP_NAME }}
  WORKING_DIRECTORY: 'src/FunctionApp'

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      # Check out the repository code
      - uses: actions/checkout@v4

      # Set up the .NET SDK
      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: ${{ env.DOTNET_VERSION }}

      # Restore NuGet packages
      - name: Restore dependencies
        run: dotnet restore
        working-directory: ${{ env.WORKING_DIRECTORY }}

      # Build in Release mode
      - name: Build
        run: dotnet build --configuration Release --no-restore
        working-directory: ${{ env.WORKING_DIRECTORY }}

      # Run unit tests
      - name: Run tests
        run: dotnet test --configuration Release --no-build --verbosity normal
        working-directory: tests/FunctionApp.Tests

      # Publish the function app for deployment
      - name: Publish
        run: dotnet publish --configuration Release --output ./publish
        working-directory: ${{ env.WORKING_DIRECTORY }}

      # Upload the published output as an artifact for the deploy job
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: function-app
          path: ${{ env.WORKING_DIRECTORY }}/publish

  deploy-staging:
    needs: build-and-test
    runs-on: ubuntu-latest
    # Only deploy on pushes to main, not on PRs
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: staging

    steps:
      # Download the build artifact from the previous job
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: function-app
          path: ./publish

      # Authenticate with Azure using the service principal
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      # Deploy to the staging slot
      - name: Deploy to staging slot
        uses: azure/functions-action@v1
        with:
          app-name: ${{ env.AZURE_FUNCTION_APP_NAME }}
          package: ./publish
          slot-name: staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production

    steps:
      # Authenticate with Azure
      - name: Login to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      # Swap staging slot to production for zero-downtime deployment
      - name: Swap staging to production
        run: |
          az functionapp deployment slot swap \
            --name ${{ env.AZURE_FUNCTION_APP_NAME }} \
            --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }} \
            --slot staging \
            --target-slot production
```

## Step 3: Understanding the Pipeline Stages

This pipeline has three jobs that run sequentially.

The **build-and-test** job runs on every push and pull request. It restores dependencies, compiles the code, runs your unit tests, and produces a deployment artifact. If any step fails, the pipeline stops and you get notified.

The **deploy-staging** job only runs on pushes to the main branch. It downloads the artifact from the build job and deploys it to a staging deployment slot. Using deployment slots gives you a chance to validate the deployment before it hits production.

The **deploy-production** job performs a slot swap. This is a zero-downtime operation because Azure warms up the staging slot first, then swaps the routing. If something goes wrong, you can swap back in seconds.

## Setting Up Deployment Slots

Deployment slots require the Standard plan or higher. If you are on the Consumption plan, you can skip the slot-based deployment and deploy directly to production.

```bash
# Create a staging deployment slot for your function app
az functionapp deployment slot create \
  --name my-function-app \
  --resource-group my-resource-group \
  --slot staging
```

## Adapting the Workflow for Node.js Functions

If your function is written in Node.js, the build job looks slightly different.

```yaml
# Build job for a Node.js function app
build-and-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    # Set up Node.js
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    # Install dependencies
    - name: Install dependencies
      run: npm ci
      working-directory: ${{ env.WORKING_DIRECTORY }}

    # Run tests
    - name: Run tests
      run: npm test
      working-directory: ${{ env.WORKING_DIRECTORY }}

    # Build the project (if using TypeScript)
    - name: Build
      run: npm run build
      working-directory: ${{ env.WORKING_DIRECTORY }}

    # Prune dev dependencies before packaging
    - name: Prune dev dependencies
      run: npm prune --production
      working-directory: ${{ env.WORKING_DIRECTORY }}

    # Upload the entire working directory as the deployment package
    - name: Upload artifact
      uses: actions/upload-artifact@v4
      with:
        name: function-app
        path: ${{ env.WORKING_DIRECTORY }}
```

## Adapting the Workflow for Python Functions

Python function apps need a slightly different approach because you need to install dependencies into a `.python_packages` directory.

```yaml
# Build job for a Python function app
build-and-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.11'

    # Install dependencies into the deployment package directory
    - name: Install dependencies
      run: |
        pip install --target=".python_packages/lib/site-packages" \
          -r requirements.txt

    - name: Run tests
      run: |
        pip install -r requirements-dev.txt
        pytest tests/

    - name: Upload artifact
      uses: actions/upload-artifact@v4
      with:
        name: function-app
        path: |
          ${{ env.WORKING_DIRECTORY }}
          !${{ env.WORKING_DIRECTORY }}/.venv
```

## Adding Health Check Validation

A good pipeline does not just deploy and walk away. Add a health check step after deployment to verify the function is responding.

```yaml
# Add this step after the deployment step
- name: Validate deployment
  run: |
    # Wait for the deployment to stabilize
    sleep 30

    # Hit the health check endpoint and verify a 200 response
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      "https://${{ env.AZURE_FUNCTION_APP_NAME }}.azurewebsites.net/api/health")

    if [ "$STATUS" != "200" ]; then
      echo "Health check failed with status $STATUS"
      exit 1
    fi

    echo "Health check passed"
```

## Using OIDC Instead of Service Principal Secrets

For better security, you can switch to OpenID Connect (OIDC) authentication, which eliminates the need for long-lived credentials stored in GitHub secrets.

```yaml
# Replace the azure/login step with OIDC authentication
- name: Login to Azure with OIDC
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

This requires setting up a federated identity credential on your Azure AD app registration, but it is significantly more secure because there are no secrets to rotate or leak.

## Environment Protection Rules

GitHub Environments let you add manual approval gates and deployment rules. In your repository settings, create environments called "staging" and "production." For production, enable "Required reviewers" so that someone has to approve the deployment before the slot swap happens. This gives your team a checkpoint between staging validation and production release.

## Wrapping Up

A well-built CI/CD pipeline for Azure Functions should build your code, run tests, deploy to a staging environment, validate the deployment, and then promote to production. GitHub Actions gives you all the building blocks, and the official Azure actions make the integration straightforward. Start with a simple pipeline and add stages as your confidence grows. The slot swap pattern is particularly valuable because it gives you zero-downtime deployments and instant rollback capability if something goes wrong in production.
