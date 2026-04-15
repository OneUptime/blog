# How to Deploy Dapr with Pulumi on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pulumi, Kubernetes, Infrastructure as Code, Deployment

Description: Deploy Dapr on Kubernetes using Pulumi and TypeScript for a type-safe, programmable infrastructure-as-code approach with full IDE support.

---

## Why Pulumi for Dapr?

Pulumi lets you define infrastructure using real programming languages - TypeScript, Python, Go, or C#. For Dapr deployments, this means you get type safety, loops, conditionals, and reusable functions instead of static YAML or HCL templates.

## Project Setup

Initialize a new Pulumi TypeScript project:

```bash
# Install Pulumi CLI
brew install pulumi

# Create new project
mkdir dapr-pulumi && cd dapr-pulumi
pulumi new kubernetes-typescript

# Install Kubernetes provider (if not already included by the template)
npm install @pulumi/kubernetes
```

## Deploying Dapr with Pulumi

Create `index.ts`:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();
const daprVersion = config.get("daprVersion") || "1.13.0";
const environment = config.require("environment");

// Create Dapr namespace
const daprNamespace = new k8s.core.v1.Namespace("dapr-system", {
  metadata: {
    name: "dapr-system",
    labels: {
      "managed-by": "pulumi",
      environment: environment,
    },
  },
});

// Deploy Dapr via Helm
const dapr = new k8s.helm.v3.Release("dapr", {
  name: "dapr",
  chart: "dapr",
  version: daprVersion,
  repositoryOpts: {
    repo: "https://dapr.github.io/helm-charts/",
  },
  namespace: daprNamespace.metadata.name,
  values: {
    global: {
      mtls: { enabled: true },
      logAsJson: true,
    },
    dapr_operator: {
      replicaCount: environment === "production" ? 2 : 1,
    },
    dapr_sentry: {
      replicaCount: environment === "production" ? 2 : 1,
    },
    dapr_placement: {
      replicaCount: environment === "production" ? 3 : 1,
    },
  },
});

export const daprStatus = dapr.status;
```

## Adding a Dapr Component via Pulumi

```typescript
// Deploy a Redis state store component
const redisStateStore = new k8s.apiextensions.CustomResource("redis-state", {
  apiVersion: "dapr.io/v1alpha1",
  kind: "Component",
  metadata: {
    name: "statestore",
    namespace: "default",
  },
  spec: {
    type: "state.redis",
    version: "v1",
    metadata: [
      { name: "redisHost", value: "redis-master:6379" },
      { name: "redisPassword", secretKeyRef: { name: "redis", key: "redis-password" } },
    ],
  },
});
```

## Stack Configuration

Use Pulumi stacks for environment-specific settings:

```bash
# Create stacks
pulumi stack init dev
pulumi stack init prod

# Configure per-stack values
pulumi config set environment dev
pulumi config set daprVersion 1.13.0

# Switch to prod stack
pulumi stack select prod
pulumi config set environment production
```

## Deploying

```bash
# Preview the deployment
pulumi preview

# Deploy to the selected stack
pulumi up --yes

# Check outputs
pulumi stack output daprStatus
```

## Importing Existing Dapr Installations

If Dapr is already running, import it into Pulumi state:

```bash
pulumi import kubernetes:helm.sh/v3:Release dapr dapr-system/dapr
```

## Summary

Pulumi brings the expressiveness of TypeScript to Dapr infrastructure management, enabling conditional logic, reusable modules, and type-checked configurations. Using stacks for environment separation and Pulumi's Helm release resource, teams can manage Dapr deployments with the same engineering rigor applied to application code.
