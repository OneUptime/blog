# Using Terraform Workspaces to Manage Multiple Kubernetes Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, Multi-Environment, Kubernetes, Infrastructure as Code

Description: Learn how to use Terraform workspaces to manage development, staging, and production Kubernetes environments with shared configurations and environment-specific overrides.

---

Running multiple Kubernetes environments, such as development, staging, and production, is standard practice for any serious engineering team. But managing these environments with Terraform raises an important question: do you duplicate your configuration for each environment, or do you share a single configuration and parameterize the differences? Terraform workspaces provide a built-in mechanism for the latter approach, giving each environment its own state while sharing the same codebase. In this post, we will explore how to use workspaces effectively for multi-environment Kubernetes management.

## What Are Terraform Workspaces

A Terraform workspace is an isolated instance of state data within a single backend configuration. When you create a new workspace, Terraform creates a separate state file for it, while still using the same configuration files. The default workspace is called `default`, and you can create additional ones with simple commands:

```bash
terraform workspace new dev
terraform workspace new staging
terraform workspace new production
```

List all workspaces:

```bash
terraform workspace list
```

Switch between them:

```bash
terraform workspace select production
```

The current workspace name is available in your configuration via `terraform.workspace`, which becomes the key to environment-specific behavior.

## Setting Up the Backend for Workspaces

When using remote backends, workspaces automatically get separate state files. For S3, the state paths look like this:

```
s3://myorg-terraform-state/env:/dev/kubernetes/terraform.tfstate
s3://myorg-terraform-state/env:/staging/kubernetes/terraform.tfstate
s3://myorg-terraform-state/env:/production/kubernetes/terraform.tfstate
```

Configure the backend as usual:

```hcl
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-state"
    key            = "kubernetes/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

Terraform handles the workspace-specific path prefixing automatically.

## Environment-Specific Variables

The core pattern with workspaces is to use `terraform.workspace` to select different variable values. Create a locals block that maps workspace names to environment configurations:

```hcl
locals {
  environment_config = {
    dev = {
      cluster_name       = "k8s-dev"
      node_count         = 2
      node_instance_type = "t3.medium"
      min_nodes          = 1
      max_nodes          = 4
      disk_size_gb       = 50
      enable_monitoring  = false
      enable_autoscaling = false
      ingress_replicas   = 1
      domain_prefix      = "dev"
    }
    staging = {
      cluster_name       = "k8s-staging"
      node_count         = 3
      node_instance_type = "t3.large"
      min_nodes          = 2
      max_nodes          = 6
      disk_size_gb       = 100
      enable_monitoring  = true
      enable_autoscaling = true
      ingress_replicas   = 2
      domain_prefix      = "staging"
    }
    production = {
      cluster_name       = "k8s-production"
      node_count         = 5
      node_instance_type = "m5.xlarge"
      min_nodes          = 3
      max_nodes          = 20
      disk_size_gb       = 200
      enable_monitoring  = true
      enable_autoscaling = true
      ingress_replicas   = 3
      domain_prefix      = "www"
    }
  }

  env = local.environment_config[terraform.workspace]
}
```

Now you can reference `local.env` throughout your configuration:

```hcl
resource "aws_eks_cluster" "main" {
  name     = local.env.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = terraform.workspace != "production"
  }

  tags = {
    Environment = terraform.workspace
    ManagedBy   = "terraform"
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.env.cluster_name}-main"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.subnet_ids

  instance_types = [local.env.node_instance_type]
  disk_size      = local.env.disk_size_gb

  scaling_config {
    desired_size = local.env.node_count
    min_size     = local.env.min_nodes
    max_size     = local.env.max_nodes
  }
}
```

## Workspace-Aware Kubernetes Resources

Once the cluster is provisioned, use the workspace to configure Kubernetes resources appropriately:

```hcl
resource "helm_release" "ingress_nginx" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = "4.9.0"
  namespace  = "ingress-system"

  create_namespace = true

  set {
    name  = "controller.replicaCount"
    value = local.env.ingress_replicas
  }

  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/aws-load-balancer-ssl-cert"
    value = var.acm_certificate_arns[terraform.workspace]
  }
}

resource "kubernetes_resource_quota" "default" {
  metadata {
    name      = "default-quota"
    namespace = "default"
  }

  spec {
    hard = {
      "requests.cpu"    = terraform.workspace == "production" ? "32" : "8"
      "requests.memory" = terraform.workspace == "production" ? "64Gi" : "16Gi"
      "pods"            = terraform.workspace == "production" ? "200" : "50"
    }
  }
}
```

## Conditional Resources

Some resources should only exist in certain environments. Use `count` with workspace conditions:

```hcl
# Only deploy monitoring stack in staging and production
resource "helm_release" "prometheus" {
  count = terraform.workspace != "dev" ? 1 : 0

  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "55.5.0"
  namespace  = "monitoring"

  create_namespace = true

  values = [
    file("${path.module}/values/prometheus-${terraform.workspace}.yaml")
  ]
}

# Deploy debug tools only in dev
resource "helm_release" "debug_tools" {
  count = terraform.workspace == "dev" ? 1 : 0

  name      = "debug-tools"
  chart     = "${path.module}/charts/debug-tools"
  namespace = "debug"

  create_namespace = true
}

# Stricter network policies only in production
resource "kubernetes_network_policy" "strict_default_deny" {
  count = terraform.workspace == "production" ? 1 : 0

  metadata {
    name      = "strict-default-deny"
    namespace = "default"
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress", "Egress"]
  }
}
```

## Variable Files Per Workspace

For values that change between environments but are not easily expressed in a locals map, use workspace-specific tfvars files:

```bash
# Apply for development
terraform workspace select dev
terraform apply -var-file="environments/dev.tfvars"

# Apply for production
terraform workspace select production
terraform apply -var-file="environments/production.tfvars"
```

Example tfvars files:

```hcl
# environments/dev.tfvars
vpc_id     = "vpc-dev12345"
subnet_ids = ["subnet-dev1", "subnet-dev2"]
domain     = "dev.example.com"

allowed_cidr_blocks = ["10.0.0.0/8"]
```

```hcl
# environments/production.tfvars
vpc_id     = "vpc-prod12345"
subnet_ids = ["subnet-prod1", "subnet-prod2", "subnet-prod3"]
domain     = "example.com"

allowed_cidr_blocks = ["10.0.0.0/8", "172.16.0.0/12"]
```

## CI/CD Integration

In a CI/CD pipeline, workspaces integrate naturally. Here is a GitLab CI example:

```yaml
# .gitlab-ci.yml
stages:
  - plan
  - apply

.terraform_template: &terraform_template
  image: hashicorp/terraform:1.7
  before_script:
    - terraform init

plan:dev:
  <<: *terraform_template
  stage: plan
  script:
    - terraform workspace select dev
    - terraform plan -var-file="environments/dev.tfvars" -out=plan.tfplan
  artifacts:
    paths:
      - plan.tfplan
  rules:
    - if: $CI_MERGE_REQUEST_ID

apply:dev:
  <<: *terraform_template
  stage: apply
  script:
    - terraform workspace select dev
    - terraform apply -auto-approve -var-file="environments/dev.tfvars"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  environment:
    name: dev

apply:production:
  <<: *terraform_template
  stage: apply
  script:
    - terraform workspace select production
    - terraform apply -auto-approve -var-file="environments/production.tfvars"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  when: manual
  environment:
    name: production
```

## Safety Guards

Add validation to prevent accidental workspace operations:

```hcl
variable "confirm_environment" {
  description = "Must match the current workspace name for production operations"
  type        = string
  default     = ""
}

resource "null_resource" "workspace_guard" {
  count = terraform.workspace == "production" && var.confirm_environment != "production" ? 1 : 0

  provisioner "local-exec" {
    command = "echo 'ERROR: Set confirm_environment=production for production changes' && exit 1"
  }
}
```

## When Not to Use Workspaces

Workspaces are not always the right choice. They work best when environments share the same general structure and differ only in scale and configuration. If your development environment has a fundamentally different architecture than production (for example, single-node versus multi-region), separate root modules are a better fit.

Workspaces also do not provide access control. Anyone who can access the backend can switch to any workspace. If you need environment-level access restrictions, consider separate backends per environment or use Terraform Cloud workspaces, which have built-in RBAC.

## Best Practices Summary

Always use a workspace-aware naming convention for resources to avoid collisions. Never hardcode environment-specific values; use the `local.env` map pattern. Protect production workspaces with manual approval gates in CI/CD. Keep environment-specific tfvars files in version control alongside your Terraform code. Test changes in dev and staging before applying to production. And maintain a clear mapping between workspace names and their corresponding infrastructure.

Terraform workspaces provide an elegant solution for managing multiple Kubernetes environments from a shared codebase. By combining workspace-aware configuration with environment-specific variable files and CI/CD guardrails, you can maintain consistency across environments while accommodating the unique requirements of each deployment tier.
