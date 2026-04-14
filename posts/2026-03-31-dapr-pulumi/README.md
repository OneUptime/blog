# How to Use Dapr with Pulumi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pulumi, Infrastructure as Code, Kubernetes, TypeScript

Description: Use Pulumi to provision Kubernetes clusters, install Dapr, and manage Dapr component configurations using real programming languages for infrastructure as code.

---

## Overview

Pulumi is an infrastructure-as-code platform that uses real programming languages (TypeScript, Python, Go, C#) instead of DSLs. For Dapr deployments, Pulumi provides type safety, loops, conditions, and reusable abstractions that are harder to achieve with HCL-based tools.

## Prerequisites

- Pulumi CLI installed
- Node.js (for TypeScript examples)
- Cloud provider credentials configured
- kubectl installed

## Setting Up the Pulumi Project

```bash
# Install Pulumi CLI
curl -fsSL https://get.pulumi.com | sh

# Create a new project
mkdir dapr-pulumi && cd dapr-pulumi
pulumi new typescript

# Install required packages
npm install @pulumi/kubernetes
```

## Installing Dapr with Pulumi (TypeScript)

```typescript
import * as k8s from "@pulumi/kubernetes";

// Install Dapr via Helm
const daprRelease = new k8s.helm.v3.Release("dapr", {
    chart: "dapr",
    repositoryOpts: {
        repo: "https://dapr.github.io/helm-charts/",
    },
    version: "1.13.0",
    namespace: "dapr-system",
    createNamespace: true,
    values: {
        global: {
            ha: { enabled: true },
            logAsJson: true,
        },
    },
    waitForJobs: true,
});

export const daprNamespace = daprRelease.namespace;
```

## Creating Dapr Components with Pulumi

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

interface DaprComponentArgs {
    name: string;
    type: string;
    version: string;
    metadata: Array<{ name: string; value?: string; secretKeyRef?: object }>;
}

// Reusable Dapr component factory
function createDaprComponent(args: DaprComponentArgs, opts?: pulumi.CustomResourceOptions) {
    return new k8s.apiextensions.CustomResource(args.name, {
        apiVersion: "dapr.io/v1alpha1",
        kind: "Component",
        metadata: {
            name: args.name,
            namespace: "default",
        },
        spec: {
            type: args.type,
            version: args.version,
            metadata: args.metadata,
        },
    }, opts);
}

// Create Redis state store
const stateStore = createDaprComponent({
    name: "statestore",
    type: "state.redis",
    version: "v1",
    metadata: [
        { name: "redisHost", value: "redis:6379" },
        { name: "redisPassword", secretKeyRef: { name: "redis-secret", key: "password" } },
    ],
}, { dependsOn: daprRelease });
```

## Provisioning Cloud Resources and Dapr Together

```typescript
import * as azure from "@pulumi/azure-native";

// Create Azure Redis Cache
const redisCache = new azure.cache.Redis("dapr-redis", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: "Standard",
        family: "C",
        capacity: 1,
    },
    enableNonSslPort: false,
});

// Get Redis access keys
const redisKeys = azure.cache.listRedisKeysOutput({
    resourceGroupName: resourceGroup.name,
    name: redisCache.name,
});

// Store Redis password in Kubernetes secret
const redisSecret = new k8s.core.v1.Secret("redis-secret", {
    metadata: { name: "redis-secret", namespace: "default" },
    stringData: {
        password: redisKeys.primaryKey,
    },
});

// Create Dapr state store pointing to Azure Redis
const stateStore = createDaprComponent({
    name: "statestore",
    type: "state.redis",
    version: "v1",
    metadata: [
        { name: "redisHost", value: redisCache.hostName.apply(h => `${h}:6380`) },
        { name: "redisPassword", secretKeyRef: { name: "redis-secret", key: "password" } },
        { name: "enableTLS", value: "true" },
    ],
}, { dependsOn: [daprRelease, redisSecret] });
```

## Deploying Dapr Applications

```typescript
const orderServiceDeployment = new k8s.apps.v1.Deployment("order-service", {
    metadata: { namespace: "default" },
    spec: {
        replicas: 2,
        selector: { matchLabels: { app: "order-service" } },
        template: {
            metadata: {
                labels: { app: "order-service" },
                annotations: {
                    "dapr.io/enabled": "true",
                    "dapr.io/app-id": "order-service",
                    "dapr.io/app-port": "8080",
                },
            },
            spec: {
                containers: [{
                    name: "order-service",
                    image: "myorg/order-service:latest",
                }],
            },
        },
    },
});
```

## Summary

Pulumi brings the full power of programming languages to Dapr infrastructure management. By creating reusable component factories, leveraging TypeScript type safety, and provisioning cloud resources alongside Dapr configurations in a single program, teams achieve more maintainable and testable infrastructure code than with YAML-only approaches.
