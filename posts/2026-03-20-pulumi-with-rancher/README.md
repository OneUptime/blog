# How to Use Pulumi with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Pulumi, Infrastructure as Code, TypeScript, Kubernetes, Cloud

Description: Use Pulumi with TypeScript to manage Rancher clusters, namespaces, and Kubernetes resources using real programming language constructs.

## Introduction

Pulumi is an infrastructure-as-code tool that uses real programming languages (TypeScript, Python, Go, .NET) instead of domain-specific languages like HCL. This gives you the full power of a programming language-loops, conditionals, functions, and type checking-when managing Rancher resources.

## Prerequisites

- Pulumi CLI installed
- Node.js 20 or 22 (for TypeScript examples)
- Rancher API key (access key and secret key)

## Step 1: Create a New Pulumi Project

```bash
# Install Pulumi CLI

curl -fsSL https://get.pulumi.com | sh

# Create a new TypeScript project
mkdir rancher-infra && cd rancher-infra
pulumi new typescript

# Install the Rancher2 provider
npm install @pulumi/rancher2 @pulumi/kubernetes
```

## Step 2: Configure the Rancher2 Provider

```typescript
// index.ts
import * as rancher2 from "@pulumi/rancher2";
import * as k8s from "@pulumi/kubernetes";

// Configure the Rancher2 provider
const provider = new rancher2.Provider("rancher", {
    apiUrl: "https://rancher.example.com",
    accessKey: process.env.RANCHER_ACCESS_KEY,
    secretKey: process.env.RANCHER_SECRET_KEY,
    insecure: false,
});
```

## Step 3: Create Projects and Namespaces for Multiple Teams

Using real programming constructs, you can create resources for multiple teams in a loop:

```typescript
// Define teams and their resource quotas
const teams = [
    { name: "frontend", cpu: "2000m", memory: "4Gi" },
    { name: "backend",  cpu: "4000m", memory: "8Gi" },
    { name: "data",     cpu: "8000m", memory: "16Gi" },
];

// Reference the production cluster
const cluster = rancher2.getCluster({ name: "production" }, { provider });

// Create a project and namespace for each team
for (const team of teams) {
    const project = new rancher2.Project(`${team.name}-project`, {
        name: team.name,
        clusterId: cluster.then(c => c.id),
        resourceQuota: {
            projectLimit: {
                limitsCpu: team.cpu,
                limitsMemory: team.memory,
            },
        },
    }, { provider });

    // Create production and staging namespaces per team
    for (const env of ["production", "staging"]) {
        new rancher2.Namespace(`${team.name}-${env}`, {
            name: `${team.name}-${env}`,
            projectId: project.id,
            labels: {
                team: team.name,
                environment: env,
            },
        }, { provider });
    }
}
```

## Step 4: Deploy Helm Charts via Pulumi

```typescript
// Use the Rancher cluster's kubeconfig with the Kubernetes provider
const k8sProvider = new k8s.Provider("k8s", {
    kubeconfig: cluster.then(c => c.kubeConfig),
});

// Deploy a Helm chart to the cluster
const prometheus = new k8s.helm.v3.Release("prometheus", {
    chart: "kube-prometheus-stack",
    repositoryOpts: {
        repo: "https://prometheus-community.github.io/helm-charts",
    },
    namespace: "monitoring",
    createNamespace: true,
    values: {
        grafana: { enabled: true },
        prometheus: {
            prometheusSpec: {
                retention: "30d",
            },
        },
    },
}, { provider: k8sProvider });
```

## Step 5: Deploy and Preview

```bash
# Set Rancher API key credentials
export RANCHER_ACCESS_KEY="token-xxxxx"
export RANCHER_SECRET_KEY="yyyyy"

# Preview changes
pulumi preview

# Deploy
pulumi up

# View stack outputs
pulumi stack output
```

## Conclusion

Pulumi's use of real programming languages makes complex Rancher configurations-like creating identical resources for multiple teams-far more concise than HCL. Type checking catches configuration errors before deployment, and the Pulumi state backend tracks all resource changes with a complete history.
