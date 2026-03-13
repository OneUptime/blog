# How to Use Terraform with Spinnaker for Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Spinnaker, Deployments, DevOps, CI/CD, Infrastructure as Code, Continuous Delivery

Description: Learn how to combine Terraform for infrastructure provisioning with Spinnaker for multi-cloud application deployment and advanced release strategies.

---

Spinnaker is Netflix's open-source continuous delivery platform designed for releasing software changes with high velocity and confidence. When paired with Terraform, you get a powerful combination where Terraform manages the underlying infrastructure and Spinnaker handles sophisticated deployment strategies like canary releases, blue-green deployments, and automated rollbacks. This guide walks through integrating these two tools.

## Understanding the Terraform-Spinnaker Relationship

Terraform and Spinnaker address different phases of the delivery pipeline. Terraform provisions and manages infrastructure resources such as Kubernetes clusters, load balancers, databases, and networking. Spinnaker manages the application deployment lifecycle, handling how new versions of your application are rolled out across environments with safety checks and rollback capabilities.

The typical workflow is: Terraform creates the target infrastructure, Spinnaker deploys applications to that infrastructure, and both tools are triggered through a CI/CD pipeline.

## Prerequisites

You need Terraform version 1.0 or later, a running Spinnaker installation (Halyard or Helm-based), a Kubernetes cluster, cloud provider accounts configured in both tools, and familiarity with Spinnaker pipelines.

## Step 1: Provision Spinnaker Infrastructure with Terraform

Start by using Terraform to create the infrastructure Spinnaker will deploy to, and optionally Spinnaker itself.

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

```hcl
# spinnaker-infra.tf
# Create the EKS cluster for both Spinnaker and application workloads
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "spinnaker-cluster"
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    # Node group for Spinnaker components
    spinnaker = {
      desired_size   = 3
      min_size       = 2
      max_size       = 5
      instance_types = ["t3.xlarge"]
      labels = {
        workload = "spinnaker"
      }
    }

    # Node group for application workloads
    applications = {
      desired_size   = 3
      min_size       = 2
      max_size       = 20
      instance_types = ["t3.large"]
      labels = {
        workload = "applications"
      }
    }
  }
}

# S3 bucket for Spinnaker's persistent storage
resource "aws_s3_bucket" "spinnaker" {
  bucket = "spinnaker-storage-${var.account_id}"

  tags = {
    Name    = "spinnaker-storage"
    Purpose = "Spinnaker persistent storage"
  }
}

# IAM role for Spinnaker
resource "aws_iam_role" "spinnaker" {
  name = "spinnaker-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = module.eks.oidc_provider_arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
    }]
  })
}
```

## Step 2: Install Spinnaker with Terraform

Deploy Spinnaker to the cluster using Helm through Terraform.

```hcl
# spinnaker-install.tf
# Create the Spinnaker namespace
resource "kubernetes_namespace" "spinnaker" {
  metadata {
    name = "spinnaker"
  }

  depends_on = [module.eks]
}

# Install Spinnaker using Helm
resource "helm_release" "spinnaker" {
  name       = "spinnaker"
  repository = "https://helmcharts.opsmx.com/"
  chart      = "spinnaker"
  version    = "2.2.7"
  namespace  = kubernetes_namespace.spinnaker.metadata[0].name
  timeout    = 600

  # Configure Spinnaker's storage backend
  set {
    name  = "minio.enabled"
    value = "false"
  }

  set {
    name  = "s3.enabled"
    value = "true"
  }

  set {
    name  = "s3.bucket"
    value = aws_s3_bucket.spinnaker.id
  }

  set {
    name  = "s3.region"
    value = var.aws_region
  }

  # Configure Kubernetes as a cloud provider
  set {
    name  = "kubeConfig.enabled"
    value = "true"
  }

  # Set resource limits
  set {
    name  = "halyard.additionalProfileConfigMaps.data.gate-local\\.yml"
    value = "server.port: 8084"
  }

  depends_on = [
    kubernetes_namespace.spinnaker,
    aws_s3_bucket.spinnaker,
  ]
}
```

## Step 3: Configure Spinnaker Accounts with Terraform

Define the cloud accounts Spinnaker will use for deployments.

```hcl
# spinnaker-accounts.tf
# Create Kubernetes service accounts for Spinnaker
resource "kubernetes_service_account" "spinnaker_deploy" {
  metadata {
    name      = "spinnaker-deploy"
    namespace = "default"
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.spinnaker.arn
    }
  }
}

# Create RBAC for Spinnaker deployments
resource "kubernetes_cluster_role_binding" "spinnaker_deploy" {
  metadata {
    name = "spinnaker-deploy-binding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "cluster-admin"
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.spinnaker_deploy.metadata[0].name
    namespace = "default"
  }
}

# Create namespaces for deployment environments
resource "kubernetes_namespace" "environments" {
  for_each = toset(["staging", "production", "canary"])

  metadata {
    name = each.value
    labels = {
      environment = each.value
      managed-by  = "terraform"
    }
  }

  depends_on = [module.eks]
}
```

## Step 4: Create Spinnaker Pipeline Templates

Use Terraform to manage Spinnaker pipeline configurations as code.

```hcl
# spinnaker-pipelines.tf
# Define a Spinnaker pipeline using the Spinnaker provider or API calls
resource "null_resource" "spinnaker_pipeline" {
  triggers = {
    pipeline_hash = sha256(jsonencode(local.pipeline_config))
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST \
        -H "Content-Type: application/json" \
        -d '${jsonencode(local.pipeline_config)}' \
        "${var.spinnaker_gate_url}/pipelines"
    EOT
  }
}

locals {
  # Define a canary deployment pipeline
  pipeline_config = {
    name        = "Deploy to Production"
    application = "my-application"
    keepWaitingPipelines = false
    limitConcurrent      = true

    # Pipeline stages
    stages = [
      {
        # Stage 1: Deploy to staging
        name                = "Deploy to Staging"
        type                = "deployManifest"
        refId               = "1"
        requisiteStageRefIds = []
        account             = "kubernetes"
        cloudProvider        = "kubernetes"
        namespaceOverride    = "staging"
        source               = "artifact"
        manifestArtifactId   = "deployment-manifest"
      },
      {
        # Stage 2: Run integration tests
        name                = "Integration Tests"
        type                = "webhook"
        refId               = "2"
        requisiteStageRefIds = ["1"]
        url                 = "${var.test_runner_url}/run"
        method              = "POST"
        waitForCompletion   = true
      },
      {
        # Stage 3: Manual approval
        name                = "Production Approval"
        type                = "manualJudgment"
        refId               = "3"
        requisiteStageRefIds = ["2"]
        instructions        = "Review staging deployment and approve for production"
        judgmentInputs      = ["Approve", "Reject"]
      },
      {
        # Stage 4: Canary deployment to production
        name                = "Canary Deploy"
        type                = "deployManifest"
        refId               = "4"
        requisiteStageRefIds = ["3"]
        account             = "kubernetes"
        cloudProvider        = "kubernetes"
        namespaceOverride    = "canary"
        trafficManagement = {
          enabled = true
          options = {
            strategy  = "highlander"
            namespace = "production"
          }
        }
      },
      {
        # Stage 5: Full production deployment
        name                = "Full Production Deploy"
        type                = "deployManifest"
        refId               = "5"
        requisiteStageRefIds = ["4"]
        account             = "kubernetes"
        cloudProvider        = "kubernetes"
        namespaceOverride    = "production"
      }
    ]
  }
}
```

## Step 5: Triggering Spinnaker from Terraform

Set up triggers so that Terraform infrastructure changes can kick off Spinnaker pipelines.

```hcl
# trigger-spinnaker.tf
# Trigger a Spinnaker pipeline after infrastructure changes
resource "null_resource" "trigger_deployment" {
  triggers = {
    # Trigger when the EKS cluster or networking changes
    cluster_version = module.eks.cluster_version
    vpc_id          = module.vpc.vpc_id
  }

  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST \
        -H "Content-Type: application/json" \
        -d '{
          "type": "manual",
          "user": "terraform",
          "parameters": {
            "infrastructure_version": "${module.eks.cluster_version}",
            "triggered_by": "terraform-apply"
          }
        }' \
        "${var.spinnaker_gate_url}/pipelines/${var.spinnaker_app}/Deploy%20to%20Production"
    EOT
  }
}
```

## Integrating Terraform Stages in Spinnaker Pipelines

Spinnaker can also run Terraform as a pipeline stage using the Terraform plugin.

```hcl
# spinnaker-terraform-stage.tf
# Configure Spinnaker to use Terraform as a pipeline stage
locals {
  terraform_stage_pipeline = {
    name        = "Infrastructure and Deploy"
    application = "platform"

    stages = [
      {
        # Terraform plan stage
        name  = "Terraform Plan"
        type  = "terraform"
        refId = "1"
        action = "plan"
        terraformVersion = "1.6.0"
        workspace = var.environment
        dir       = "terraform/app-infra"
        artifacts = [{
          type      = "git/repo"
          reference = "https://github.com/org/infra-repo.git"
        }]
      },
      {
        # Manual approval for Terraform changes
        name                = "Approve Infrastructure Changes"
        type                = "manualJudgment"
        refId               = "2"
        requisiteStageRefIds = ["1"]
      },
      {
        # Terraform apply stage
        name                = "Terraform Apply"
        type                = "terraform"
        refId               = "3"
        requisiteStageRefIds = ["2"]
        action              = "apply"
        terraformVersion    = "1.6.0"
        workspace           = var.environment
      },
      {
        # Deploy application after infrastructure is ready
        name                = "Deploy Application"
        type                = "deployManifest"
        refId               = "4"
        requisiteStageRefIds = ["3"]
        account             = "kubernetes"
        namespaceOverride   = var.environment
      }
    ]
  }
}
```

## Best Practices

Keep the boundary clear: Terraform manages infrastructure, Spinnaker manages application deployments. Use Terraform to provision the target environments that Spinnaker deploys to. Store Spinnaker pipeline configurations as code alongside your Terraform configurations. Use Spinnaker's built-in Terraform stage for infrastructure changes that need deployment pipeline safety features. Configure proper RBAC in both tools to control who can modify infrastructure versus who can deploy applications. Use Spinnaker's canary analysis with Terraform-provisioned monitoring infrastructure.

## Conclusion

Terraform and Spinnaker together create a comprehensive infrastructure and deployment pipeline. Terraform provides the reliable, declarative infrastructure provisioning, while Spinnaker adds sophisticated deployment strategies, automated rollbacks, and multi-environment management. By using Terraform to set up Spinnaker's infrastructure and configure its pipelines, you achieve a fully automated path from infrastructure changes to production deployments.
