# How to Use AWS CDK with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, AWS CDK, GitOps, Kubernetes, EKS, Infrastructure as Code

Description: A practical guide to integrating AWS CDK with Flux CD to provision EKS clusters and bootstrap GitOps-driven application delivery.

---

## Introduction

AWS Cloud Development Kit (CDK) lets you define cloud infrastructure using familiar programming languages. By combining AWS CDK with Flux CD, you can use CDK to provision your EKS clusters and supporting infrastructure, then automatically bootstrap Flux CD for continuous application delivery. CDK handles the cloud layer, Flux handles the Kubernetes layer.

This guide demonstrates how to build an end-to-end workflow using AWS CDK with TypeScript and Flux CD.

## Prerequisites

- AWS CDK CLI v2 installed
- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- kubectl and flux CLI installed
- A GitHub account with a personal access token

## Project Setup

Initialize a new CDK project.

```bash
# Create a new CDK project
mkdir flux-cdk-infra && cd flux-cdk-infra
npx cdk init app --language typescript

# Install required CDK packages
npm install aws-cdk-lib constructs
npm install @aws-cdk/lambda-layer-kubectl-v31
```

## Defining the VPC Stack

Create the networking foundation for your EKS cluster.

```typescript
// lib/vpc-stack.ts
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class VpcStack extends cdk.Stack {
  // Expose the VPC for use by other stacks
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC with public and private subnets
    this.vpc = new ec2.Vpc(this, "FluxClusterVpc", {
      // Use 3 availability zones for high availability
      maxAzs: 3,
      // CIDR block for the VPC
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      // Define subnet configuration
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
      // Tag subnets for EKS auto-discovery
      natGateways: 1,
    });

    // Tag subnets for EKS load balancer controller
    for (const subnet of this.vpc.publicSubnets) {
      cdk.Tags.of(subnet).add("kubernetes.io/role/elb", "1");
    }
    for (const subnet of this.vpc.privateSubnets) {
      cdk.Tags.of(subnet).add("kubernetes.io/role/internal-elb", "1");
    }
  }
}
```

## Defining the EKS Stack

Create the EKS cluster with Flux CD bootstrapping.

```typescript
// lib/eks-flux-stack.ts
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { KubectlV31Layer } from "@aws-cdk/lambda-layer-kubectl-v31";

// Properties for the EKS Flux stack
interface EksFluxStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  environment: string;
  clusterName: string;
  fluxRepoOwner: string;
  fluxRepoName: string;
}

export class EksFluxStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;

  constructor(scope: Construct, id: string, props: EksFluxStackProps) {
    super(scope, id, props);

    // Create the EKS cluster in the provided VPC
    this.cluster = new eks.Cluster(this, "FluxCluster", {
      clusterName: props.clusterName,
      version: eks.KubernetesVersion.V1_31,
      vpc: props.vpc,
      // Place the cluster in private subnets
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      // Use the kubectl layer for Kubernetes operations
      kubectlLayer: new KubectlV31Layer(this, "KubectlLayer"),
      // Default capacity with managed node groups
      defaultCapacity: 0,
    });

    // Add a managed node group with appropriate sizing
    this.cluster.addNodegroupCapacity("FluxNodeGroup", {
      instanceTypes: [new ec2.InstanceType("t3.medium")],
      minSize: 2,
      maxSize: 5,
      desiredSize: 3,
      // Use Amazon Linux 2023 for the nodes
      amiType: eks.NodegroupAmiType.AL2023_X86_64_STANDARD,
      labels: {
        environment: props.environment,
        "managed-by": "cdk",
      },
    });

    // Install Flux CD on the cluster
    this.installFluxCD(props);
  }

  private installFluxCD(props: EksFluxStackProps): void {
    // Create the flux-system namespace
    const fluxNamespace = this.cluster.addManifest("FluxNamespace", {
      apiVersion: "v1",
      kind: "Namespace",
      metadata: {
        name: "flux-system",
        labels: {
          "app.kubernetes.io/managed-by": "cdk",
        },
      },
    });

    // Install Flux using a Helm chart
    const fluxHelm = this.cluster.addHelmChart("FluxCD", {
      chart: "flux2",
      repository: "https://fluxcd-community.github.io/helm-charts",
      namespace: "flux-system",
      release: "flux",
      values: {
        // Enable all controllers
        sourceController: { create: true },
        kustomizeController: { create: true },
        helmController: { create: true },
        notificationController: { create: true },
        // Set resource requests for stability
        cli: { install: false },
      },
    });

    // Ensure namespace exists before Helm install
    fluxHelm.node.addDependency(fluxNamespace);

    // Create the GitRepository source pointing to the fleet repo
    const gitSource = this.cluster.addManifest("FluxGitSource", {
      apiVersion: "source.toolkit.fluxcd.io/v1",
      kind: "GitRepository",
      metadata: {
        name: "flux-system",
        namespace: "flux-system",
      },
      spec: {
        interval: "1m",
        url: `https://github.com/${props.fluxRepoOwner}/${props.fluxRepoName}.git`,
        ref: { branch: "main" },
      },
    });
    gitSource.node.addDependency(fluxHelm);

    // Create the root Kustomization for this cluster
    const rootSync = this.cluster.addManifest("FluxRootSync", {
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
        path: `./clusters/${props.environment}/${props.clusterName}`,
        prune: true,
        wait: true,
      },
    });
    rootSync.node.addDependency(gitSource);
  }
}
```

## Adding EKS Add-ons

Configure essential EKS add-ons that Flux will manage.

```typescript
// lib/eks-addons.ts
import * as cdk from "aws-cdk-lib";
import * as eks from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";

// Configure Flux to deploy cluster add-ons from Git
export function configureFluxAddons(
  cluster: eks.Cluster,
  environment: string
): void {
  // Create a Kustomization for infrastructure add-ons
  // These will be managed as YAML in the Git repository
  const infraKustomization = cluster.addManifest("InfraKustomization", {
    apiVersion: "kustomize.toolkit.fluxcd.io/v1",
    kind: "Kustomization",
    metadata: {
      name: "infrastructure",
      namespace: "flux-system",
    },
    spec: {
      interval: "10m",
      sourceRef: {
        kind: "GitRepository",
        name: "flux-system",
      },
      path: `./infrastructure/${environment}`,
      prune: true,
      wait: true,
      timeout: "10m",
    },
  });

  // Create a Kustomization for applications
  const appsKustomization = cluster.addManifest("AppsKustomization", {
    apiVersion: "kustomize.toolkit.fluxcd.io/v1",
    kind: "Kustomization",
    metadata: {
      name: "applications",
      namespace: "flux-system",
    },
    spec: {
      interval: "5m",
      sourceRef: {
        kind: "GitRepository",
        name: "flux-system",
      },
      path: `./apps/${environment}`,
      prune: true,
      // Wait for infrastructure before deploying apps
      dependsOn: [{ name: "infrastructure" }],
    },
  });
}
```

## Defining the CDK App Entry Point

Wire everything together in the CDK app.

```typescript
// bin/app.ts
import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/vpc-stack";
import { EksFluxStack } from "../lib/eks-flux-stack";

const app = new cdk.App();

// Read configuration from CDK context
const environment = app.node.tryGetContext("environment") || "dev";
const clusterName = app.node.tryGetContext("clusterName") || `flux-${environment}`;
const fluxRepoOwner = app.node.tryGetContext("fluxRepoOwner") || "my-org";
const fluxRepoName = app.node.tryGetContext("fluxRepoName") || "fleet-infra";

// Environment configuration for the stacks
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};

// Create the VPC stack
const vpcStack = new VpcStack(app, `FluxVpc-${environment}`, { env });

// Create the EKS stack with Flux CD
const eksStack = new EksFluxStack(app, `FluxEks-${environment}`, {
  env,
  vpc: vpcStack.vpc,
  environment,
  clusterName,
  fluxRepoOwner,
  fluxRepoName,
});

// Add tags to all resources
cdk.Tags.of(app).add("ManagedBy", "aws-cdk");
cdk.Tags.of(app).add("GitOps", "flux-cd");
cdk.Tags.of(app).add("Environment", environment);
```

## Deploying with CDK

Deploy the infrastructure and verify Flux is running.

```bash
# Bootstrap CDK (first time only)
npx cdk bootstrap

# Synthesize CloudFormation templates to review
npx cdk synth -c environment=production -c clusterName=prod-east-1

# Deploy the VPC and EKS stacks
npx cdk deploy --all \
  -c environment=production \
  -c clusterName=prod-east-1 \
  -c fluxRepoOwner=my-org \
  -c fluxRepoName=fleet-infra \
  --require-approval broadening

# Update kubeconfig to access the cluster
aws eks update-kubeconfig --name prod-east-1 --region us-east-1

# Verify Flux is running
kubectl get pods -n flux-system
flux check
```

## Setting Up the Git Repository Structure

After CDK deploys the cluster, populate the Git repository with the structure Flux expects.

```bash
# Clone the fleet infrastructure repository
git clone git@github.com:my-org/fleet-infra.git
cd fleet-infra

# Create the directory structure for the cluster
mkdir -p clusters/production/prod-east-1
mkdir -p infrastructure/production
mkdir -p apps/production
```

```yaml
# infrastructure/production/kustomization.yaml
# Infrastructure components for the production environment
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ingress-nginx.yaml
  - cert-manager.yaml
  - external-dns.yaml
```

```yaml
# infrastructure/production/ingress-nginx.yaml
# Deploy ingress-nginx through Flux
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes.github.io/ingress-nginx
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 15m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.11.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  install:
    createNamespace: true
  values:
    controller:
      # Use NLB for AWS
      service:
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: nlb
          service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
      replicaCount: 2
```

## Updating Infrastructure with CDK

When you need to modify the cluster, update the CDK code and redeploy.

```bash
# Compare changes before deploying
npx cdk diff -c environment=production -c clusterName=prod-east-1

# Deploy updates
npx cdk deploy --all \
  -c environment=production \
  -c clusterName=prod-east-1

# Flux automatically picks up any Kubernetes manifest changes
flux reconcile source git flux-system
```

## Destroying the Infrastructure

CDK handles full cleanup when needed.

```bash
# Destroy all CDK stacks
npx cdk destroy --all \
  -c environment=production \
  -c clusterName=prod-east-1
```

## Conclusion

AWS CDK and Flux CD complement each other well. CDK excels at provisioning AWS resources like VPCs, EKS clusters, and IAM roles using the expressiveness of TypeScript. Flux CD excels at continuously reconciling Kubernetes workloads from Git. By using CDK to set up the cluster and bootstrap Flux, you get a clean separation: CDK owns the infrastructure layer, Flux owns the application layer. Both are defined in code, both are version-controlled, and both support repeatable, automated deployments.
