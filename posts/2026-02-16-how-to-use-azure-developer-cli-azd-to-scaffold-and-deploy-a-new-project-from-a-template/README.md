# How to Use Azure Developer CLI (azd) to Scaffold and Deploy a New Project from a Template

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Developer CLI, azd, Azure, Project Templates, Deployment, Cloud Development, DevOps

Description: Get started with Azure Developer CLI to scaffold complete Azure projects from templates and deploy them with a single command.

---

Starting a new Azure project used to mean hours of setup: creating resource groups, configuring services, writing Bicep or ARM templates, setting up CI/CD pipelines, and wiring everything together. The Azure Developer CLI (`azd`) collapses all of that into a few commands.

`azd` is a developer-focused command-line tool that works with templates - pre-built project structures that include application code, infrastructure definitions, and CI/CD configuration. You pick a template, customize it, and deploy. The tool handles provisioning Azure resources, deploying your code, and setting up the pipeline.

In this post, I will walk through installing `azd`, working with templates, customizing projects, and deploying to Azure.

## Installing azd

The installation depends on your operating system.

```bash
# macOS (using Homebrew)
brew tap azure/azd && brew install azd

# Linux (using the install script)
curl -fsSL https://aka.ms/install-azd.sh | bash

# Windows (using winget)
winget install microsoft.azd

# Verify the installation
azd version
```

After installation, authenticate with Azure.

```bash
# Log in to Azure (opens a browser for authentication)
azd auth login

# Verify your account
azd auth show
```

## Browsing Available Templates

`azd` templates are hosted in GitHub repositories and follow a specific structure. Microsoft maintains a gallery of official templates, and the community contributes many more.

Browse templates from the command line or the web.

```bash
# List templates from the awesome-azd gallery
azd template list

# Search for templates matching a keyword
azd template list --source awesome-azd | grep "react"
```

You can also browse the gallery at [azure.github.io/awesome-azd](https://azure.github.io/awesome-azd/), which shows templates with descriptions, screenshots, and the Azure services they use.

Some popular templates include:

- **todo-nodejs-mongo**: A Node.js web app with MongoDB (Cosmos DB)
- **todo-csharp-sql**: A .NET web app with SQL Database
- **todo-python-mongo-aca**: A Python app on Azure Container Apps with Cosmos DB
- **ai-chat-app-python**: An AI chatbot using Azure OpenAI

## Scaffolding a New Project

Let us scaffold a project using a template. The `azd init` command sets up the project.

```bash
# Create a new directory for your project
mkdir my-web-app && cd my-web-app

# Initialize from a template
azd init --template todo-nodejs-mongo
```

This command downloads the template and sets up the project structure. It also prompts you for:

- **Environment name**: A unique name for this deployment (like `dev` or `prod`)
- **Azure location**: The region to deploy to
- **Azure subscription**: Which subscription to use

The resulting project structure looks like this.

```
my-web-app/
  src/                    # Application source code
    web/                  # Frontend code
    api/                  # Backend API code
  infra/                  # Infrastructure as Code (Bicep)
    main.bicep            # Main infrastructure definition
    main.parameters.json  # Parameters for the deployment
    resources.bicep       # Azure resource definitions
  azure.yaml              # azd project configuration
  .github/                # GitHub Actions workflow (if applicable)
    workflows/
      azure-dev.yml
  .azdo/                  # Azure DevOps pipeline (if applicable)
    pipelines/
      azure-dev.yml
```

## Understanding azure.yaml

The `azure.yaml` file is the heart of an `azd` project. It defines the services in your application and how they map to Azure resources.

```yaml
# azure.yaml - Project configuration for azd
name: my-web-app

# Metadata about the project
metadata:
  template: todo-nodejs-mongo@0.0.1-beta

# Services that make up the application
services:
  # The backend API service
  api:
    project: ./src/api          # Path to the service source code
    language: js                # Programming language
    host: appservice            # Azure hosting service to use

  # The frontend web service
  web:
    project: ./src/web          # Path to the frontend code
    language: js
    host: appservice
    dist: build                 # Build output directory
```

The `host` property tells `azd` where to deploy each service. Supported hosts include:

- `appservice`: Azure App Service
- `containerapp`: Azure Container Apps
- `function`: Azure Functions
- `staticwebapp`: Azure Static Web Apps
- `aks`: Azure Kubernetes Service

## Provisioning Infrastructure

With the project scaffolded, provision the Azure resources.

```bash
# Provision Azure resources defined in the infra/ directory
azd provision
```

This command:

1. Reads the Bicep files in the `infra/` directory
2. Creates a resource group (if it does not exist)
3. Deploys all the Azure resources (App Service, Cosmos DB, etc.)
4. Saves the resource names and connection strings as environment variables

You can see what resources will be created before provisioning.

```bash
# Preview the infrastructure changes without applying them
azd provision --preview
```

The provisioning output shows each resource being created, and when it finishes, it displays the endpoints and resource names.

## Deploying Your Application

After provisioning, deploy your application code.

```bash
# Deploy application code to the provisioned resources
azd deploy
```

This command:

1. Builds each service defined in `azure.yaml`
2. Packages the output
3. Deploys to the corresponding Azure resource
4. Displays the service URLs when complete

For a faster iteration cycle during development, you can deploy a specific service.

```bash
# Deploy only the API service
azd deploy api

# Deploy only the web frontend
azd deploy web
```

## The All-in-One Command

If you want to provision and deploy in a single step, use `azd up`.

```bash
# Provision infrastructure and deploy code in one command
azd up
```

This is the fastest way to go from zero to a running application. It runs `azd provision` followed by `azd deploy`.

## Working with Environments

`azd` supports multiple environments, which is how you manage dev, staging, and production deployments from the same codebase.

```bash
# Create a new environment for staging
azd env new staging

# Set environment-specific values
azd env set DATABASE_SKU "Standard"
azd env set APP_SERVICE_SKU "P1v3"

# Switch between environments
azd env select dev
azd env select staging

# List all environments
azd env list
```

Each environment gets its own set of Azure resources, so your dev environment is completely isolated from production.

## Customizing the Infrastructure

The Bicep files in the `infra/` directory are fully customizable. Let us look at a typical main.bicep file and how to modify it.

```bicep
// infra/main.bicep - Main infrastructure definition
targetScope = 'subscription'

@description('The environment name (used for resource naming)')
param environmentName string

@description('The Azure region for resources')
param location string

// Create a resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-${environmentName}'
  location: location
}

// Deploy the application resources into the resource group
module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    environmentName: environmentName
    location: location
  }
}

// Output the service endpoints
output AZURE_LOCATION string = location
output WEB_URI string = resources.outputs.WEB_URI
output API_URI string = resources.outputs.API_URI
```

To add a new resource, edit the Bicep files. For example, adding a Redis cache.

```bicep
// Add to resources.bicep - Redis cache for session storage
resource redisCache 'Microsoft.Cache/redis@2023-04-01' = {
  name: 'redis-${environmentName}'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// Output the connection string for the application
output REDIS_CONNECTION string = '${redisCache.properties.hostName}:${redisCache.properties.sslPort},ssl=True'
```

After modifying infrastructure, run `azd provision` again to apply the changes.

## Setting Up CI/CD

Most `azd` templates include CI/CD pipeline definitions. For GitHub Actions, you will find a workflow file in `.github/workflows/`. For Azure DevOps, it is in `.azdo/pipelines/`.

To configure the pipeline.

```bash
# Set up a CI/CD pipeline (prompts for provider choice)
azd pipeline config

# This command:
# 1. Creates a service principal for the pipeline
# 2. Configures the necessary secrets/variables
# 3. Sets up the pipeline in your chosen CI/CD provider
```

The generated pipeline typically runs `azd provision` and `azd deploy` on every push to the main branch.

## Monitoring and Troubleshooting

After deployment, `azd` provides quick access to monitoring.

```bash
# Open the Azure portal for your resources
azd monitor --overview

# Open Application Insights live metrics
azd monitor --live

# Open log stream for a service
azd monitor --logs
```

## Cleaning Up

When you are done with an environment, clean up all Azure resources.

```bash
# Delete all Azure resources for the current environment
azd down

# Force deletion without confirmation
azd down --force

# Also purge Key Vault and other soft-delete resources
azd down --purge
```

## Creating Your Own Template

If your team has a standard project structure, you can create your own `azd` template.

```bash
# Initialize a new template from your existing project
azd init

# Follow the prompts to configure services and infrastructure
```

The key files you need:

- `azure.yaml`: Service definitions
- `infra/main.bicep`: Infrastructure code
- Application source code
- Optionally, CI/CD pipeline definitions

Publish your template to a GitHub repository, and others can use it with `azd init --template <repo-url>`.

## Wrapping Up

The Azure Developer CLI removes the friction of setting up new Azure projects. Instead of spending hours configuring resources manually, you can go from zero to a deployed application in minutes. Start by trying one of the official templates to see how things work, then customize or create your own templates for your organization's standard patterns. The combination of `azd` templates with Bicep infrastructure gives you a repeatable, version-controlled foundation for every new project.
