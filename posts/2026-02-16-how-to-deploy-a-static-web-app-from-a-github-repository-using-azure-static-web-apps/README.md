# How to Deploy a Static Web App from a GitHub Repository Using Azure Static Web Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Static Web Apps, GitHub, CI/CD, Deployment, Web Development, Cloud

Description: Step-by-step instructions for deploying a static web application directly from a GitHub repository using Azure Static Web Apps with automatic CI/CD.

---

Azure Static Web Apps is one of those services that does exactly what you want with minimal fuss. You point it at a GitHub repository, tell it where your app lives, and it handles the rest - building, deploying, setting up HTTPS, and giving you a globally distributed site. Every push to your main branch triggers a new deployment, and pull requests get their own preview URLs automatically.

This guide walks through deploying a static web app from a GitHub repo, covering the initial setup, build configuration, and common customizations.

## What Azure Static Web Apps Gives You

Before getting into the steps, here is what the service provides out of the box:

- Free SSL/TLS certificates with automatic renewal.
- Global distribution through Azure's CDN.
- Automatic builds and deployments triggered by GitHub commits.
- Staging environments for every pull request.
- Built-in authentication providers (Azure AD, GitHub, Twitter).
- Optional serverless API backend via Azure Functions.

For a free tier, this is a surprisingly complete package.

## Prerequisites

You will need:

- An Azure account (the free tier works fine for this).
- A GitHub account with a repository containing a static web app or a frontend framework project.
- The app should have a build command that outputs static files (like React, Vue, Angular, Hugo, or plain HTML).

If you do not have a project ready, create a simple React app to follow along.

```bash
# Create a new React app and push it to GitHub
npx create-react-app my-static-app
cd my-static-app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/my-static-app.git
git push -u origin main
```

## Step 1: Create the Static Web App in Azure Portal

Open the Azure portal and navigate to "Create a resource." Search for "Static Web App" and click Create.

Fill in the following details:

- **Subscription**: Select your Azure subscription.
- **Resource Group**: Create a new one or use an existing group.
- **Name**: Choose a name for your app (this appears in the Azure URL).
- **Plan type**: Free tier is fine for most projects.
- **Region**: Select the region closest to your audience.
- **Source**: Select GitHub.

Click "Sign in with GitHub" and authorize Azure to access your repositories.

## Step 2: Connect Your GitHub Repository

After authorizing, select:

- **Organization**: Your GitHub username or org.
- **Repository**: The repository containing your app.
- **Branch**: Usually `main` or `master`.

Azure then asks about your build configuration. This is where you tell it how to build your project.

## Step 3: Configure Build Settings

The build configuration depends on your framework. Here are common settings:

**React / Create React App:**
- App location: `/`
- API location: (leave empty)
- Output location: `build`

**Vue.js:**
- App location: `/`
- API location: (leave empty)
- Output location: `dist`

**Angular:**
- App location: `/`
- API location: (leave empty)
- Output location: `dist/your-app-name`

**Hugo:**
- App location: `/`
- API location: (leave empty)
- Output location: `public`

**Plain HTML (no build step):**
- App location: `/`
- API location: (leave empty)
- Output location: `/`

Click "Review + Create" and then "Create."

## Step 4: Understand the GitHub Actions Workflow

When you create the Static Web App, Azure automatically commits a GitHub Actions workflow file to your repository. This file lives at `.github/workflows/` and looks something like this.

```yaml
# Azure Static Web Apps CI/CD workflow
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    # Only run on push or non-closed PRs
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true

      # Build and deploy using the Azure Static Web Apps action
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: "build"

  close_pull_request_job:
    # Clean up staging environments when PRs are closed
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request Job
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
```

Notice the two jobs: one for building and deploying, and another for cleaning up staging environments when pull requests are closed. The `AZURE_STATIC_WEB_APPS_API_TOKEN` secret is automatically added to your GitHub repository by Azure.

## Step 5: Monitor the First Deployment

Go to the Actions tab in your GitHub repository. You should see the workflow running. Click on it to watch the build and deployment progress.

The build typically takes 1-3 minutes for a standard React app. Once it completes, your site is live.

## Step 6: Find Your App URL

Back in the Azure portal, go to your Static Web App resource. The URL is shown on the overview page and looks like:

```
https://happy-river-0a1b2c3d4.azurestaticapps.net
```

Open it in your browser to verify the deployment worked.

## Step 7: Configure the Azure CLI Alternative

If you prefer the command line, you can create and manage Static Web Apps using the Azure CLI.

```bash
# Create a Static Web App connected to your GitHub repo
az staticwebapp create \
  --name my-static-app \
  --resource-group myResourceGroup \
  --source https://github.com/your-username/my-static-app \
  --branch main \
  --app-location "/" \
  --output-location "build" \
  --login-with-github
```

The `--login-with-github` flag opens a browser window for GitHub authorization, similar to the portal experience.

## Customizing the Build

You can customize the build process by modifying the workflow file or adding configuration files.

**Environment Variables**: Add build-time environment variables in the workflow file.

```yaml
# Add environment variables to the build step
- name: Build And Deploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    action: "upload"
    app_location: "/"
    output_location: "build"
  env:
    # Set environment variables for the build process
    REACT_APP_API_URL: "https://api.example.com"
    REACT_APP_ENVIRONMENT: "production"
```

**Routing Rules**: Create a `staticwebapp.config.json` file in your app's output directory to control routing, headers, and redirects.

```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg}", "/css/*"]
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/custom-404.html"
    }
  }
}
```

The `navigationFallback` setting is critical for single-page applications. Without it, refreshing the page on a client-side route returns a 404 error because the server does not know about your frontend routes.

## Handling Monorepos

If your static app is inside a subdirectory of a larger repository (a monorepo setup), adjust the `app_location` in the workflow file.

```yaml
# Point to a subdirectory in a monorepo
- name: Build And Deploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    action: "upload"
    app_location: "/packages/frontend"
    output_location: "build"
```

## Wrapping Up

Deploying from GitHub to Azure Static Web Apps is about as painless as cloud deployment gets. The initial setup takes five minutes through the portal, and after that, every push to your main branch deploys automatically. Pull requests get their own preview environments, and the free tier covers most hobby and small production projects. The main things to remember are getting the build output location right for your framework and adding a `staticwebapp.config.json` for SPA routing if your app uses client-side navigation.
