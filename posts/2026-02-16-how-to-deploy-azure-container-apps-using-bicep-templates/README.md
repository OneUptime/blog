# How to Deploy Azure Container Apps Using Bicep Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Apps, Bicep, Infrastructure as Code, DevOps, ARM Templates, Deployment

Description: A complete walkthrough of deploying Azure Container Apps using Bicep templates including environments, apps, secrets, and scaling configuration.

---

If you are managing Azure Container Apps through CLI commands or portal clicks, you are going to run into trouble as your infrastructure grows. Bicep is Azure's domain-specific language for infrastructure as code, and it gives you a declarative, repeatable way to define your container apps. You write what you want, commit it to source control, and deploy it through a pipeline. This post shows you how to build a complete Bicep template for Azure Container Apps from scratch.

## Why Bicep Over CLI Commands?

CLI commands are great for experiments and one-off tasks, but they have limitations for real infrastructure:

- No version history unless you track scripts manually
- Hard to reproduce environments consistently
- No dependency management between resources
- Difficult to review changes before applying them

Bicep solves all of these. It compiles down to ARM templates, so anything you can do in ARM, you can do in Bicep with much cleaner syntax.

## Step 1: Define the Container Apps Environment

The environment is the shared infrastructure that all your container apps run in. It includes networking, logging, and Dapr configuration.

```bicep
// main.bicep - Container Apps Environment
param location string = resourceGroup().location
param environmentName string = 'my-container-env'

// Log Analytics workspace for collecting container logs
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${environmentName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Apps Environment with Log Analytics integration
resource environment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}
```

## Step 2: Add a Container Registry

Most production setups pull images from Azure Container Registry. Define it in the same template.

```bicep
// Azure Container Registry for storing container images
param acrName string = 'mycontainerregistry'

resource acr 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}
```

## Step 3: Deploy a Container App

Now define the container app itself. This includes the container image, resource limits, ingress, secrets, and scaling rules.

```bicep
// Container App with full configuration
param appName string = 'order-service'
param containerImage string = 'myregistry.azurecr.io/order-service:v1'

resource orderService 'Microsoft.App/containerApps@2023-05-01' = {
  name: appName
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      // Secret definitions - referenced by containers and scale rules
      secrets: [
        {
          name: 'db-connection'
          value: 'Server=myserver;Database=mydb;User=admin;Password=secret123'
        }
        {
          name: 'registry-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
      // Container registry credentials
      registries: [
        {
          server: '${acrName}.azurecr.io'
          username: acr.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
      // Ingress configuration
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      // Active revision mode
      activeRevisionsMode: 'Single'
    }
    template: {
      // Container definitions
      containers: [
        {
          name: appName
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'DB_CONNECTION'
              secretRef: 'db-connection'
            }
            {
              name: 'PORT'
              value: '3000'
            }
          ]
          // Health probes
          probes: [
            {
              type: 'liveness'
              httpGet: {
                path: '/health'
                port: 3000
              }
              periodSeconds: 10
              failureThreshold: 3
            }
            {
              type: 'readiness'
              httpGet: {
                path: '/ready'
                port: 3000
              }
              periodSeconds: 5
              initialDelaySeconds: 5
            }
          ]
        }
      ]
      // Scaling configuration
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}
```

## Step 4: Add Dapr Configuration

If your services use Dapr, enable it in the container app definition and add Dapr components to the environment.

```bicep
// Dapr-enabled container app
resource paymentService 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'payment-service'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      // Enable Dapr sidecar
      dapr: {
        enabled: true
        appId: 'payment-service'
        appPort: 4000
        appProtocol: 'http'
      }
      ingress: {
        external: false
        targetPort: 4000
      }
    }
    template: {
      containers: [
        {
          name: 'payment-service'
          image: '${acrName}.azurecr.io/payment-service:v1'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

// Dapr state store component
resource stateStore 'Microsoft.App/managedEnvironments/daprComponents@2023-05-01' = {
  name: 'statestore'
  parent: environment
  properties: {
    componentType: 'state.redis'
    version: 'v1'
    metadata: [
      {
        name: 'redisHost'
        value: 'my-redis.redis.cache.windows.net:6380'
      }
      {
        name: 'redisPassword'
        secretRef: 'redis-password'
      }
      {
        name: 'enableTLS'
        value: 'true'
      }
    ]
    secrets: [
      {
        name: 'redis-password'
        value: 'your-redis-key'
      }
    ]
    scopes: [
      'payment-service'
      'order-service'
    ]
  }
}
```

## Step 5: Use Modules for Reusability

As your template grows, break it into modules. Create a reusable module for container apps.

```bicep
// modules/container-app.bicep - Reusable container app module
param name string
param location string
param environmentId string
param containerImage string
param targetPort int = 3000
param isExternal bool = true
param minReplicas int = 1
param maxReplicas int = 10
param cpu string = '0.5'
param memory string = '1Gi'
param envVars array = []

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: name
  location: location
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: isExternal
        targetPort: targetPort
      }
    }
    template: {
      containers: [
        {
          name: name
          image: containerImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: envVars
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

// Output the FQDN for other modules to reference
output fqdn string = containerApp.properties.configuration.ingress.fqdn
```

Then use the module from your main template.

```bicep
// main.bicep - Using the reusable module
module apiGateway 'modules/container-app.bicep' = {
  name: 'api-gateway-deployment'
  params: {
    name: 'api-gateway'
    location: location
    environmentId: environment.id
    containerImage: '${acrName}.azurecr.io/api-gateway:v1'
    targetPort: 8080
    isExternal: true
    minReplicas: 2
    maxReplicas: 20
    envVars: [
      {
        name: 'UPSTREAM_URL'
        value: 'http://order-service'
      }
    ]
  }
}
```

## Step 6: Deploy the Template

Deploy using the Azure CLI.

```bash
# Deploy the Bicep template to a resource group
az deployment group create \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters environmentName=prod-env acrName=myacr

# Preview changes before deploying (what-if)
az deployment group what-if \
  --resource-group my-rg \
  --template-file main.bicep \
  --parameters environmentName=prod-env acrName=myacr
```

The `what-if` command is extremely useful. It shows you exactly what resources will be created, modified, or deleted before you commit to the deployment.

## Step 7: Integrate with CI/CD

Here is a GitHub Actions workflow that deploys your Bicep template on every push to main.

```yaml
# .github/workflows/deploy.yml
name: Deploy Container Apps
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy Bicep template
        uses: azure/arm-deploy@v1
        with:
          resourceGroupName: my-rg
          template: ./infra/main.bicep
          parameters: environmentName=prod-env
```

## Tips for Production Templates

1. **Use Key Vault references for secrets** instead of hardcoding them in the Bicep file. This keeps sensitive values out of source control.

2. **Parameterize everything** that differs between environments. Use parameter files for dev, staging, and production.

3. **Use the what-if command** in your CI/CD pipeline before applying changes. This acts as a safety net.

4. **Version your container images** with specific tags, not `latest`. This ensures deployments are reproducible.

## Summary

Bicep templates give you a clean, maintainable way to manage Azure Container Apps infrastructure. Start with a simple template covering the environment and one app, then gradually add modules for reusability. Combined with CI/CD pipelines and the what-if command, you get a deployment process that is both safe and efficient.
