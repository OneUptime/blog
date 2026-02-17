# How to Deploy a Spring Boot Application to Azure Spring Apps with Zero Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Spring Apps, Spring Boot, Zero Downtime, Blue-Green Deployment, Java, Cloud Deployment, DevOps

Description: Step-by-step guide to deploying Spring Boot applications to Azure Spring Apps with zero downtime using staging deployments and traffic switching.

---

Deploying application updates without downtime is a basic expectation in production environments. Users should not see errors or experience interruptions because you pushed a new version. Azure Spring Apps provides built-in support for zero-downtime deployments through its staging deployment feature. In this guide, I will walk through the entire process - from creating the Spring Apps instance to performing a seamless traffic cutover.

## Why Zero Downtime Matters

Even a few seconds of downtime during a deployment can result in failed API calls, broken user sessions, and lost revenue. For applications serving real-time traffic - whether it is an e-commerce checkout, a healthcare portal, or a SaaS dashboard - zero-downtime deployment is not optional. Azure Spring Apps handles this through a deployment slot mechanism similar to what Azure App Service offers, but tailored for Spring Boot applications.

## Prerequisites

Before starting, you need:

- An Azure subscription with the Spring Apps resource provider registered
- Azure CLI installed with the spring extension
- A Spring Boot application packaged as a JAR file
- Java 17 or later (Azure Spring Apps supports Java 8, 11, 17, and 21)

Install the Azure Spring Apps extension if you have not already:

```bash
# Install the spring extension for Azure CLI
az extension add --name spring --upgrade
```

## Step 1: Create the Azure Spring Apps Instance

First, set up the Spring Apps service and create your application:

```bash
# Set variables for reuse throughout the deployment
RESOURCE_GROUP="rg-spring-production"
SPRING_APPS_NAME="myorg-spring-apps"
APP_NAME="order-service"
LOCATION="eastus"

# Create a resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create the Azure Spring Apps instance (Standard tier for staging deployments)
# The Standard tier is required for the staging deployment feature
az spring create \
    --name $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku Standard

# Create the application within Spring Apps
az spring app create \
    --name $APP_NAME \
    --service $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --runtime-version Java_17 \
    --assign-endpoint true \
    --memory 2Gi \
    --cpu 1
```

## Step 2: Deploy the Initial Version

Deploy your application JAR to the default production deployment:

```bash
# Deploy the initial version to the default (production) deployment
# This creates a deployment named "default" automatically
az spring app deploy \
    --name $APP_NAME \
    --service $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --artifact-path target/order-service-1.0.0.jar \
    --jvm-options "-Xmx1024m -Xms512m" \
    --env "SPRING_PROFILES_ACTIVE=production"
```

At this point, your application is running and serving traffic on its assigned endpoint. You can verify by checking the URL:

```bash
# Get the application URL
az spring app show \
    --name $APP_NAME \
    --service $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "properties.url" -o tsv
```

## Step 3: Create a Staging Deployment

When you have a new version ready, deploy it to a staging slot instead of directly to production. This is the key to zero-downtime deployments:

```bash
# Create a staging deployment with the new version
# The staging deployment runs alongside production but receives no traffic
az spring app deployment create \
    --name staging \
    --app $APP_NAME \
    --service $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --artifact-path target/order-service-2.0.0.jar \
    --jvm-options "-Xmx1024m -Xms512m" \
    --env "SPRING_PROFILES_ACTIVE=production" \
    --instance-count 2
```

The staging deployment starts up and gets its own endpoint for testing. It does not receive any production traffic yet.

## Step 4: Validate the Staging Deployment

Before switching traffic, verify that the staging deployment is healthy. Azure Spring Apps gives the staging deployment its own test endpoint:

```bash
# Get the staging deployment test endpoint
az spring app deployment show \
    --name staging \
    --app $APP_NAME \
    --service $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "properties.status" -o tsv

# Run your smoke tests against the staging endpoint
# The test endpoint URL follows this pattern:
STAGING_URL=$(az spring test-endpoint list \
    --service $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "primaryTestEndpoint" -o tsv)

# Hit the health endpoint to verify
curl -s "${STAGING_URL}/${APP_NAME}/staging/actuator/health" | jq .
```

Run your full test suite against the staging endpoint. This is your chance to catch bugs before they hit production. I typically run integration tests, a few key API contract tests, and a quick performance check.

## Step 5: Switch Traffic to Staging

Once you are confident the staging deployment is working correctly, swap the deployments. This is where the zero-downtime magic happens:

```bash
# Set the staging deployment as the production deployment
# This swaps traffic instantly without dropping connections
az spring app set-deployment \
    --name $APP_NAME \
    --service $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --deployment staging
```

The traffic switch is nearly instantaneous. Azure Spring Apps updates the routing rules so that all incoming requests go to the staging deployment (which is now the production deployment). The old production deployment becomes the new staging slot, which you can use for the next deployment cycle or as a quick rollback target.

## Step 6: Rollback If Needed

If something goes wrong after the swap, rolling back is just another swap:

```bash
# Roll back by switching back to the previous deployment
# The old production deployment is still running in the staging slot
az spring app set-deployment \
    --name $APP_NAME \
    --service $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --deployment default
```

This is one of the biggest advantages of this approach. Your previous version is still running and warm, so the rollback is instant. No waiting for a build, no downloading artifacts, no cold start.

## Automating with a CI/CD Pipeline

In practice, you do not want to run these commands manually. Here is a simplified Azure DevOps pipeline that automates the process:

```yaml
# azure-pipelines.yml
# This pipeline builds, deploys to staging, validates, and swaps
trigger:
  branches:
    include:
      - main

variables:
  SPRING_APPS_NAME: 'myorg-spring-apps'
  RESOURCE_GROUP: 'rg-spring-production'
  APP_NAME: 'order-service'

stages:
  - stage: Build
    jobs:
      - job: BuildJar
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: Maven@3
            inputs:
              mavenPomFile: 'pom.xml'
              goals: 'clean package -DskipTests'
          - publish: target/order-service.jar
            artifact: app-jar

  - stage: DeployStaging
    dependsOn: Build
    jobs:
      - job: DeployToStaging
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - download: current
            artifact: app-jar
          - task: AzureCLI@2
            inputs:
              azureSubscription: 'my-azure-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                # Deploy to the staging slot
                az spring app deployment create \
                  --name staging \
                  --app $(APP_NAME) \
                  --service $(SPRING_APPS_NAME) \
                  --resource-group $(RESOURCE_GROUP) \
                  --artifact-path $(Pipeline.Workspace)/app-jar/order-service.jar

  - stage: SwapToProduction
    dependsOn: DeployStaging
    jobs:
      - deployment: SwapDeployment
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: 'my-azure-connection'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      # Swap staging to production
                      az spring app set-deployment \
                        --name $(APP_NAME) \
                        --service $(SPRING_APPS_NAME) \
                        --resource-group $(RESOURCE_GROUP) \
                        --deployment staging
```

The pipeline uses an environment gate on the SwapToProduction stage, so you can require manual approval before the traffic switch happens.

## Health Probes and Graceful Shutdown

For truly seamless zero-downtime deployments, your Spring Boot application needs proper health probes and graceful shutdown configuration. Add these to your application.yml:

```yaml
# application.yml
# Configure health probes and graceful shutdown for zero-downtime deployments
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s

management:
  endpoints:
    web:
      exposure:
        include: health, info
  endpoint:
    health:
      probes:
        enabled: true
      show-details: always
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
```

The graceful shutdown setting ensures that when the old deployment is being replaced, it finishes processing in-flight requests before shutting down. The readiness probe tells Azure Spring Apps when a new instance is ready to accept traffic.

## Monitoring the Deployment

After swapping, monitor your application metrics to confirm everything is healthy:

```bash
# Check the deployment status
az spring app deployment show \
    --name staging \
    --app $APP_NAME \
    --service $SPRING_APPS_NAME \
    --resource-group $RESOURCE_GROUP \
    --query "{Status:properties.status, Instances:properties.instances[].status}"
```

Also check Application Insights (if configured) for error rate spikes, increased latency, or throughput drops. These are your early warning indicators that something might be wrong with the new version.

## Summary

Zero-downtime deployments in Azure Spring Apps follow a straightforward pattern: deploy to a staging slot, validate, then swap traffic. The swap is instantaneous, and rollback is just as fast since the previous version stays running in the staging slot. By automating this through a CI/CD pipeline with proper health probes and monitoring, you can deploy confidently to production multiple times a day without your users noticing a thing.
