# How to Configure Terraform Variables from ConfigMaps with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, ConfigMaps, Variables, GitOps, Kubernetes

Description: Pass Terraform variables from Kubernetes ConfigMaps using the Tofu Controller to share non-sensitive configuration across multiple Terraform resources.

---

## Introduction

Terraform variables serve as the interface between generic reusable modules and environment-specific configuration. When managing multiple Terraform resources with the Tofu Controller, you often have variables that are shared across many resources—the AWS region, the VPC ID, the environment name, the cluster name. Duplicating these in every `Terraform` resource is tedious and error-prone.

Kubernetes ConfigMaps provide a natural home for non-sensitive shared Terraform variables. The Tofu Controller can read variables from ConfigMaps using the `varsFrom` field, allowing you to centralize shared configuration and inject it into multiple Terraform resources. When the ConfigMap changes, all dependent Terraform resources will reconcile with the updated values.

This guide demonstrates managing environment-specific variables in ConfigMaps and consuming them in Terraform resources.

## Prerequisites

- Tofu Controller installed via Flux
- A Flux GitRepository source for your Terraform modules
- `kubectl` CLI installed

## Step 1: Create Environment ConfigMaps

Organize ConfigMaps by environment to hold shared variables.

```yaml
# infrastructure/terraform/config/production-vars.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: terraform-production-vars
  namespace: flux-system
  labels:
    environment: production
    managed-by: flux
data:
  # AWS configuration
  region: "us-east-1"
  availability_zones: '["us-east-1a", "us-east-1b", "us-east-1c"]'

  # Network configuration (populated after VPC is provisioned)
  vpc_cidr: "10.0.0.0/16"
  private_subnet_cidrs: '["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]'
  public_subnet_cidrs: '["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]'

  # Environment metadata
  environment: "production"
  cost_center: "platform-engineering"
  owner: "platform-team@example.com"

  # Default resource sizes for this environment
  default_db_instance_class: "db.r6g.large"
  default_node_instance_type: "m6i.large"
  default_node_count: "3"
```

```yaml
# infrastructure/terraform/config/staging-vars.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: terraform-staging-vars
  namespace: flux-system
  labels:
    environment: staging
data:
  region: "us-east-1"
  availability_zones: '["us-east-1a", "us-east-1b"]'
  vpc_cidr: "10.1.0.0/16"
  environment: "staging"
  default_db_instance_class: "db.t3.medium"
  default_node_instance_type: "t3.medium"
  default_node_count: "2"
```

## Step 2: Use varsFrom with a ConfigMap

```yaml
# infrastructure/terraform/production/networking.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-networking
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/vpc
  workspace: production-networking
  approvePlan: "manual"

  # Inject variables from the ConfigMap
  varsFrom:
    # Reference the production environment ConfigMap
    - kind: ConfigMap
      name: terraform-production-vars
      # varsKeys limits which ConfigMap keys are passed as variables
      # If omitted, ALL keys in the ConfigMap are passed as variables
      varsKeys:
        - region
        - availability_zones
        - vpc_cidr
        - environment

  # These vars override any values from the ConfigMap
  vars:
    - name: vpc_name
      value: production-main-vpc
```

## Step 3: Use Multiple varsFrom Sources

Combine ConfigMaps for layered variable injection.

```yaml
# infrastructure/terraform/production/eks-cluster.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: production-eks
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/eks
  workspace: production-eks
  approvePlan: "manual"

  varsFrom:
    # First: load environment-wide defaults
    - kind: ConfigMap
      name: terraform-production-vars
      varsKeys:
        - region
        - environment
        - default_node_instance_type
        - default_node_count

    # Second: load EKS-specific configuration
    - kind: ConfigMap
      name: terraform-eks-config
      varsKeys:
        - kubernetes_version
        - cluster_name
        - addon_versions

  # Direct vars take highest precedence
  vars:
    - name: enable_cluster_autoscaler
      value: "true"
    - name: cluster_log_types
      value: '["api", "audit", "authenticator"]'
```

## Step 4: Create an EKS-Specific ConfigMap

```yaml
# infrastructure/terraform/config/eks-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: terraform-eks-config
  namespace: flux-system
data:
  kubernetes_version: "1.29"
  cluster_name: "production-eks"
  # Addon versions are environment-agnostic best practices
  addon_versions: |
    {
      "vpc_cni": "v1.16.0-eksbuild.1",
      "coredns": "v1.11.1-eksbuild.6",
      "kube_proxy": "v1.29.0-eksbuild.1"
    }
```

## Step 5: Create a Flux Kustomization for Config Resources

```yaml
# clusters/my-cluster/terraform/config.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: terraform-config
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/terraform/config
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system

---
# clusters/my-cluster/terraform/production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: terraform-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/terraform/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # ConfigMaps must be applied before the Terraform resources
  dependsOn:
    - name: terraform-config
    - name: tofu-controller
```

## Step 6: Verify Variable Injection

```bash
# Verify the ConfigMap is created
kubectl get configmap terraform-production-vars -n flux-system -o yaml

# Check the Terraform resource status to confirm variables are resolved
kubectl get terraform production-networking \
  -n flux-system \
  -o jsonpath='{.spec.vars}' | jq .

# View the plan to confirm variables are applied correctly
kubectl get terraform production-networking \
  -n flux-system \
  -o jsonpath='{.status.plan.planJSON}' | jq '.variables'
```

## Best Practices

- Store only non-sensitive variables in ConfigMaps. Sensitive variables (passwords, API keys, credentials) must use Kubernetes Secrets (see the companion guide on Terraform variables from Secrets).
- Use consistent naming conventions for ConfigMap keys that match your Terraform variable names exactly. The Tofu Controller passes ConfigMap keys directly as Terraform variable names.
- Apply ConfigMaps before Terraform resources using Flux `dependsOn`. A Terraform resource that cannot resolve its `varsFrom` will fail.
- Use `varsKeys` to explicitly list which ConfigMap keys to pass as Terraform variables. This prevents unintended variable injection if the ConfigMap gains new keys.
- Validate ConfigMap changes in staging before applying them to production. A single ConfigMap update can affect many Terraform resources simultaneously.

## Conclusion

Terraform variables are now sourced from Kubernetes ConfigMaps, enabling centralized configuration management for multiple Terraform resources. Changing an environment-wide variable like the Kubernetes version or default instance type requires a single ConfigMap update, which Flux propagates to all dependent Terraform resources automatically.
