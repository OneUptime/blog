# How to Use Pulumi with Flux CD for GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, pulumi, gitops, kubernetes, infrastructure as code, typescript

Description: A step-by-step guide to integrating Pulumi with Flux CD to manage both infrastructure provisioning and GitOps-driven application delivery.

---

## Introduction

Pulumi lets you define infrastructure using general-purpose programming languages like TypeScript, Python, and Go. When combined with Flux CD, you get a powerful workflow: Pulumi provisions the cluster and installs Flux, then Flux takes over continuous delivery of applications from Git.

This guide demonstrates how to use Pulumi with TypeScript to provision a Kubernetes cluster, bootstrap Flux CD, and set up GitOps workflows.

## Prerequisites

- Pulumi CLI installed (v3.x or later)
- Node.js 18+ and npm
- A cloud provider account (AWS examples used here)
- GitHub personal access token
- kubectl installed

## Project Setup

Initialize a new Pulumi project for your infrastructure.

```bash
# Create a new Pulumi project using TypeScript
mkdir flux-pulumi-infra && cd flux-pulumi-infra
pulumi new typescript --name flux-infrastructure --yes

# Install required packages
npm install @pulumi/aws @pulumi/eks @pulumi/kubernetes @pulumi/github
```

## Provisioning an EKS Cluster

Define the Kubernetes cluster that Flux will manage.

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as github from "@pulumi/github";

// Load configuration values
const config = new pulumi.Config();
const environment = config.require("environment");
const clusterName = `flux-cluster-${environment}`;
const githubOwner = config.require("githubOwner");
const githubToken = config.requireSecret("githubToken");
const repoName = config.get("repoName") || "fleet-infra";

// Create an EKS cluster with managed node groups
const cluster = new eks.Cluster(clusterName, {
  // Use the latest Kubernetes version supported
  version: "1.31",
  instanceType: "t3.medium",
  desiredCapacity: 3,
  minSize: 2,
  maxSize: 5,
  // Enable control plane logging for debugging
  enabledClusterLogTypes: [
    "api",
    "audit",
    "authenticator",
  ],
  tags: {
    Environment: environment,
    ManagedBy: "pulumi",
    GitOps: "flux-cd",
  },
});

// Export the kubeconfig for kubectl access
export const kubeconfig = cluster.kubeconfig;
export const clusterEndpoint = cluster.eksCluster.endpoint;
```

## Creating the Git Repository

Set up the GitHub repository that Flux will use as its source of truth.

```typescript
// git-repository.ts
// Create a GitHub repository for Flux to manage
const fleetRepo = new github.Repository("fleet-infra", {
  name: repoName,
  description: "Flux CD fleet infrastructure repository",
  visibility: "private",
  autoInit: true,
  // Protect the main branch from direct pushes
  hasIssues: true,
});

// Generate an SSH key pair for Flux authentication
const sshKey = new tls.PrivateKey("flux-ssh-key", {
  algorithm: "ED25519",
});

// Add the public key as a deploy key with write access
const deployKey = new github.RepositoryDeployKey("flux-deploy-key", {
  title: `flux-${clusterName}`,
  repository: fleetRepo.name,
  key: sshKey.publicKeyOpenssh,
  readOnly: false,
});
```

## Installing Flux CD

Use the Kubernetes provider to install Flux components on the cluster.

```typescript
// flux-install.ts
// Create a Kubernetes provider that uses the EKS cluster
const k8sProvider = new k8s.Provider("k8s-provider", {
  kubeconfig: cluster.kubeconfig,
});

// Create the flux-system namespace
const fluxNamespace = new k8s.core.v1.Namespace("flux-system", {
  metadata: {
    name: "flux-system",
    labels: {
      "app.kubernetes.io/managed-by": "pulumi",
    },
  },
}, { provider: k8sProvider });

// Store the SSH private key as a Kubernetes Secret for Flux
const gitSecret = new k8s.core.v1.Secret("flux-git-secret", {
  metadata: {
    name: "flux-system",
    namespace: "flux-system",
  },
  type: "Opaque",
  stringData: {
    // SSH private key for Git authentication
    "identity": sshKey.privateKeyOpenssh,
    // Public key for reference
    "identity.pub": sshKey.publicKeyOpenssh,
    // Known hosts entry for GitHub
    "known_hosts": "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl",
  },
}, { provider: k8sProvider, dependsOn: [fluxNamespace] });
```

## Deploying Flux Controllers with Helm

Install the Flux controllers using Helm charts through Pulumi.

```typescript
// flux-controllers.ts
// Install Flux controllers using the official Helm chart
const fluxHelmRelease = new k8s.helm.v4.Chart("flux2", {
  chart: "flux2",
  namespace: "flux-system",
  repositoryOpts: {
    repo: "https://fluxcd-community.github.io/helm-charts",
  },
  values: {
    // Enable all standard Flux controllers
    sourceController: {
      create: true,
      resources: {
        requests: { cpu: "100m", memory: "128Mi" },
      },
    },
    kustomizeController: {
      create: true,
      resources: {
        requests: { cpu: "100m", memory: "256Mi" },
      },
    },
    helmController: {
      create: true,
      resources: {
        requests: { cpu: "100m", memory: "256Mi" },
      },
    },
    notificationController: {
      create: true,
    },
  },
}, { provider: k8sProvider, dependsOn: [fluxNamespace] });
```

## Configuring Flux GitRepository Source

Tell Flux where to find your manifests.

```typescript
// flux-config.ts
// Create the GitRepository custom resource pointing to the fleet repo
const gitRepository = new k8s.apiextensions.CustomResource("flux-git-source", {
  apiVersion: "source.toolkit.fluxcd.io/v1",
  kind: "GitRepository",
  metadata: {
    name: "flux-system",
    namespace: "flux-system",
  },
  spec: {
    // Check for updates every minute
    interval: "1m",
    url: pulumi.interpolate`ssh://git@github.com/${githubOwner}/${repoName}.git`,
    ref: {
      branch: "main",
    },
    secretRef: {
      name: "flux-system",
    },
  },
}, { provider: k8sProvider, dependsOn: [fluxHelmRelease, gitSecret] });

// Create the root Kustomization that syncs cluster manifests
const rootKustomization = new k8s.apiextensions.CustomResource("flux-root-sync", {
  apiVersion: "kustomize.toolkit.fluxcd.io/v1",
  kind: "Kustomization",
  metadata: {
    name: "flux-system",
    namespace: "flux-system",
  },
  spec: {
    interval: "5m",
    sourceRef: {
      kind: "GitRepository",
      name: "flux-system",
    },
    // Path inside the repo for this specific cluster
    path: `./clusters/${environment}/${clusterName}`,
    prune: true,
    wait: true,
  },
}, { provider: k8sProvider, dependsOn: [gitRepository] });
```

## Seeding the Repository with Initial Structure

Use Pulumi to create the initial directory structure in the Git repository.

```typescript
// repo-structure.ts
// Create the initial kustomization.yaml for the cluster path
const clusterKustomization = new github.RepositoryFile("cluster-kustomization", {
  repository: fleetRepo.name,
  branch: "main",
  file: `clusters/${environment}/${clusterName}/kustomization.yaml`,
  content: `# Cluster-level kustomization - managed by Pulumi
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - infrastructure.yaml
  - apps.yaml
`,
  commitMessage: "Initialize cluster structure via Pulumi",
});

// Create the infrastructure Kustomization reference
const infraRef = new github.RepositoryFile("infra-kustomization", {
  repository: fleetRepo.name,
  branch: "main",
  file: `clusters/${environment}/${clusterName}/infrastructure.yaml`,
  content: `# Infrastructure Kustomization - syncs base infrastructure
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/${environment}
  prune: true
  wait: true
`,
  commitMessage: "Add infrastructure kustomization via Pulumi",
});
```

## Adding Stack Configuration

Configure different environments using Pulumi stack configs.

```yaml
# Pulumi.dev.yaml
# Development environment configuration
config:
  flux-infrastructure:environment: dev
  flux-infrastructure:githubOwner: my-org
  flux-infrastructure:repoName: fleet-infra
```

```yaml
# Pulumi.production.yaml
# Production environment configuration
config:
  flux-infrastructure:environment: production
  flux-infrastructure:githubOwner: my-org
  flux-infrastructure:repoName: fleet-infra
```

## Deploying with Pulumi

Run the Pulumi deployment to provision everything.

```bash
# Set the GitHub token as a secret
pulumi config set --secret githubToken "$GITHUB_TOKEN"

# Preview the changes
pulumi preview

# Deploy the full stack
pulumi up --yes

# Get the kubeconfig output
pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
export KUBECONFIG=$(pwd)/kubeconfig.yaml

# Verify Flux is running
kubectl get pods -n flux-system
flux check
```

## Adding Application Deployments

Once Flux is running, add application definitions to the Git repository and let Flux handle deployment.

```typescript
// apps.ts
// Define a HelmRelease for the application
const appRelease = new github.RepositoryFile("app-helm-release", {
  repository: fleetRepo.name,
  branch: "main",
  file: `apps/${environment}/my-app/helmrelease.yaml`,
  content: `# Application HelmRelease managed by Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: ./charts/my-app
      sourceRef:
        kind: GitRepository
        name: flux-system
        namespace: flux-system
  values:
    replicaCount: 2
    image:
      repository: my-org/my-app
      tag: latest
`,
  commitMessage: "Add application HelmRelease via Pulumi",
});
```

## Cleaning Up

Pulumi makes it easy to tear down the entire stack.

```bash
# Destroy all resources including the cluster and Flux
pulumi destroy --yes

# Remove the stack entirely
pulumi stack rm --yes
```

## Conclusion

Combining Pulumi with Flux CD gives you the expressiveness of a real programming language for infrastructure provisioning, paired with Flux's GitOps engine for continuous delivery. Pulumi handles the initial setup (cluster creation, Flux installation, repository configuration), and then Flux takes over the ongoing reconciliation of your workloads. This separation of concerns keeps your infrastructure code clean and your deployment pipeline reliable.
