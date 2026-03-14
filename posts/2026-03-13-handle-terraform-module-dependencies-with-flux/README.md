# Handle Terraform Module Dependencies with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Terraform, GitOps, Infrastructure as Code, Dependencies, Kubernetes

Description: Learn how to manage Terraform module deployment ordering and dependencies using Flux CD's Kustomization dependsOn feature and the Terraform Controller.

---

## Introduction

When managing infrastructure with Terraform through GitOps, resource deployment order matters. A VPC must exist before subnets, an EKS cluster before node groups, and a database before applications. Flux CD's `dependsOn` feature combined with the Terraform Controller (tf-controller) enables declarative dependency management for Terraform modules running on Kubernetes.

This post demonstrates how to structure Terraform workspaces managed by Flux so that dependencies are respected and failures in one module stop downstream modules from running.

## Prerequisites

- Kubernetes cluster with Flux CD installed
- Terraform Controller (tf-controller) installed
- AWS/GCP/Azure credentials stored as Kubernetes secrets
- Git repository with Terraform module configurations

## Step 1: Install the Terraform Controller

The tf-controller by Weaveworks runs Terraform plans and applies within Kubernetes pods.

```bash
# Add the tf-controller Helm repository
helm repo add tf-controller https://weaveworks.github.io/tf-controller
helm repo update

# Install tf-controller via Flux HelmRelease
cat > tf-controller-helmrelease.yaml << 'EOF'
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: tf-controller
  namespace: flux-system
spec:
  interval: 1h
  url: https://weaveworks.github.io/tf-controller
---
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: tf-controller
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: tf-controller
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: tf-controller
  values:
    replicaCount: 1
    concurrency: 4
EOF
kubectl apply -f tf-controller-helmrelease.yaml
```

## Step 2: Define Terraform Modules as Flux Resources

Create a `Terraform` resource for each module. Start with the VPC module:

```yaml
# terraform-vpc.yaml - Manage the VPC Terraform module with Flux
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: vpc
  namespace: flux-system
spec:
  interval: 1h
  # Apply changes automatically (set to false for plan-only mode)
  approvePlan: auto
  path: ./modules/vpc
  sourceRef:
    kind: GitRepository
    name: infrastructure
    namespace: flux-system
  vars:
    - name: region
      value: us-east-1
    - name: cidr_block
      value: "10.0.0.0/16"
  # Store Terraform outputs as a Kubernetes secret
  writeOutputsToSecret:
    name: vpc-outputs
```

Define the EKS cluster module that depends on VPC:

```yaml
# terraform-eks.yaml - EKS module that depends on the VPC module
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: eks-cluster
  namespace: flux-system
spec:
  interval: 1h
  approvePlan: auto
  path: ./modules/eks
  sourceRef:
    kind: GitRepository
    name: infrastructure
    namespace: flux-system
  # Read VPC outputs to use as inputs for EKS
  varsFrom:
    - kind: Secret
      name: vpc-outputs
      varsKeys:
        - vpc_id
        - private_subnet_ids
  writeOutputsToSecret:
    name: eks-outputs
```

## Step 3: Use Flux Kustomization DependsOn for Module Ordering

Wrap each Terraform resource in a Flux Kustomization to control execution order:

```yaml
# infrastructure-kustomizations.yaml - Ordered infrastructure deployment
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: terraform-vpc
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/vpc
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  # Wait for VPC to be ready before proceeding
  healthChecks:
    - apiVersion: infra.contrib.fluxcd.io/v1alpha2
      kind: Terraform
      name: vpc
      namespace: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: terraform-eks
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/eks
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  # EKS cannot start until VPC Terraform is complete
  dependsOn:
    - name: terraform-vpc
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubernetes-apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  # Apps cannot deploy until the EKS cluster is provisioned
  dependsOn:
    - name: terraform-eks
```

## Best Practices

- Use `writeOutputsToSecret` to pass Terraform outputs between modules without hardcoding values
- Set `approvePlan: auto` only after thorough review; use plan-only mode in staging
- Define `retryInterval` on Terraform resources to handle transient provider API failures
- Use separate Git paths for each Terraform module to enable independent reconciliation
- Monitor tf-controller pod logs when a Terraform resource enters a stuck state

## Conclusion

Flux CD's `dependsOn` feature combined with the tf-controller enables a clean, declarative approach to managing Terraform module dependencies. By wrapping Terraform resources in Kustomizations with explicit ordering, you get automatic dependency resolution, health-checked sequential execution, and full GitOps auditability for infrastructure changes. This approach is significantly more reliable than managing Terraform module ordering in custom CI/CD scripts.
