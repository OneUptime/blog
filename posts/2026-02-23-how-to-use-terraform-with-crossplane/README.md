# How to Use Terraform with Crossplane

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Crossplane, Kubernetes, DevOps, Infrastructure as Code, Cloud Native

Description: Learn how to use Terraform alongside Crossplane to manage cloud infrastructure both from the command line and through Kubernetes-native APIs.

---

Terraform and Crossplane both provision cloud infrastructure, but they approach the problem differently. Terraform uses a CLI-driven workflow with state files, while Crossplane extends the Kubernetes API to manage cloud resources as custom resources. Rather than choosing one over the other, many organizations use both tools together, each handling the infrastructure it manages best. This guide explores how to combine Terraform and Crossplane effectively.

## Understanding Terraform vs Crossplane

Terraform operates outside Kubernetes. You write HCL files, run `terraform plan` and `terraform apply`, and Terraform maintains state in a backend. It works well for provisioning foundational infrastructure like VPCs, Kubernetes clusters, and IAM policies.

Crossplane runs inside Kubernetes as a set of controllers. It represents cloud resources as Kubernetes custom resources, and the Crossplane controllers reconcile them continuously. This makes it ideal for teams that want to request infrastructure through Kubernetes APIs and manifests.

The key insight is that these tools are not mutually exclusive. Terraform can provision the Kubernetes cluster and install Crossplane, and then Crossplane can manage application-level cloud resources from within the cluster.

## Prerequisites

You need a Kubernetes cluster (or a cloud account to create one), Terraform version 1.0 or later, kubectl and Helm installed, and basic familiarity with Kubernetes custom resources.

## Step 1: Provision Infrastructure with Terraform

Use Terraform to create the foundational infrastructure including the Kubernetes cluster where Crossplane will run.

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

```hcl
# cluster.tf
# Create the EKS cluster that will host Crossplane
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "crossplane-cluster"
  cluster_version = "1.29"

  cluster_endpoint_public_access = true
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets

  eks_managed_node_groups = {
    crossplane = {
      desired_size   = 3
      min_size       = 2
      max_size       = 5
      instance_types = ["t3.large"]
    }
  }
}

# Configure the Kubernetes and Helm providers
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}
```

## Step 2: Install Crossplane with Terraform

Use the Helm provider to install Crossplane on the cluster.

```hcl
# crossplane.tf
# Create the Crossplane system namespace
resource "kubernetes_namespace" "crossplane_system" {
  metadata {
    name = "crossplane-system"
  }

  depends_on = [module.eks]
}

# Install Crossplane using Helm
resource "helm_release" "crossplane" {
  name       = "crossplane"
  repository = "https://charts.crossplane.io/stable"
  chart      = "crossplane"
  version    = "1.14.0"
  namespace  = kubernetes_namespace.crossplane_system.metadata[0].name

  set {
    name  = "args"
    value = "{--enable-composition-revisions}"
  }

  depends_on = [kubernetes_namespace.crossplane_system]
}
```

## Step 3: Configure Crossplane Providers

Install and configure the AWS provider for Crossplane using Terraform.

```hcl
# crossplane-providers.tf
# Install the AWS provider for Crossplane
resource "kubernetes_manifest" "aws_provider" {
  manifest = {
    apiVersion = "pkg.crossplane.io/v1"
    kind       = "Provider"

    metadata = {
      name = "provider-aws-s3"
    }

    spec = {
      package = "xpkg.upbound.io/upbound/provider-aws-s3:v1.0.0"
    }
  }

  depends_on = [helm_release.crossplane]
}

# Create an IAM role for Crossplane to use
resource "aws_iam_role" "crossplane" {
  name = "crossplane-provider-aws"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "${module.eks.oidc_provider}:sub" = "system:serviceaccount:crossplane-system:provider-aws-*"
          }
        }
      }
    ]
  })
}

# Attach necessary policies to the Crossplane role
resource "aws_iam_role_policy_attachment" "crossplane_s3" {
  role       = aws_iam_role.crossplane.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

# Create a ProviderConfig for AWS
resource "kubernetes_manifest" "aws_provider_config" {
  manifest = {
    apiVersion = "aws.upbound.io/v1beta1"
    kind       = "ProviderConfig"

    metadata = {
      name = "default"
    }

    spec = {
      credentials = {
        source = "IRSA"
      }
    }
  }

  depends_on = [kubernetes_manifest.aws_provider]
}
```

## Step 4: Define Crossplane Compositions

Compositions define reusable infrastructure templates that developers can request.

```hcl
# crossplane-compositions.tf
# Create a Composite Resource Definition (XRD) for databases
resource "kubernetes_manifest" "database_xrd" {
  manifest = {
    apiVersion = "apiextensions.crossplane.io/v1"
    kind       = "CompositeResourceDefinition"

    metadata = {
      name = "databases.platform.example.com"
    }

    spec = {
      group = "platform.example.com"

      names = {
        kind   = "Database"
        plural = "databases"
      }

      claimNames = {
        kind   = "DatabaseClaim"
        plural = "databaseclaims"
      }

      versions = [
        {
          name          = "v1alpha1"
          served        = true
          referenceable = true

          schema = {
            openAPIV3Schema = {
              type = "object"
              properties = {
                spec = {
                  type = "object"
                  properties = {
                    parameters = {
                      type = "object"
                      properties = {
                        engine = {
                          type    = "string"
                          enum    = ["postgres", "mysql"]
                          default = "postgres"
                        }
                        size = {
                          type    = "string"
                          enum    = ["small", "medium", "large"]
                          default = "small"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    }
  }

  depends_on = [helm_release.crossplane]
}

# Create a Composition that implements the XRD
resource "kubernetes_manifest" "database_composition" {
  manifest = {
    apiVersion = "apiextensions.crossplane.io/v1"
    kind       = "Composition"

    metadata = {
      name = "database-aws"
      labels = {
        provider = "aws"
      }
    }

    spec = {
      compositeTypeRef = {
        apiVersion = "platform.example.com/v1alpha1"
        kind       = "Database"
      }

      resources = [
        {
          name = "rds-instance"
          base = {
            apiVersion = "rds.aws.upbound.io/v1beta1"
            kind       = "Instance"
            spec = {
              forProvider = {
                region         = var.aws_region
                instanceClass  = "db.t3.micro"
                engine         = "postgres"
                engineVersion  = "15"
                allocatedStorage = 20
                skipFinalSnapshot = true
              }
            }
          }
        }
      ]
    }
  }

  depends_on = [kubernetes_manifest.database_xrd]
}
```

## Step 5: Using Both Tools for Different Layers

A practical pattern is to use Terraform for platform-level resources and Crossplane for application-level resources.

```hcl
# platform-resources.tf
# Terraform manages platform-level resources
# These are shared resources that multiple applications depend on

# VPC and networking
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "platform-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

# Shared container registry
resource "aws_ecr_repository" "shared" {
  name                 = "shared-apps"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
```

Then developers create Crossplane claims for their application-specific resources:

```yaml
# This is a Kubernetes manifest, not Terraform
# Developers apply this to request a database through Crossplane
apiVersion: platform.example.com/v1alpha1
kind: DatabaseClaim
metadata:
  name: my-app-database
  namespace: team-alpha
spec:
  parameters:
    engine: postgres
    size: medium
```

## Managing the Boundary Between Tools

The most important decision when using Terraform and Crossplane together is defining which tool manages what. Here is a recommended split.

Terraform manages the Kubernetes cluster itself, VPCs and core networking, IAM roles and policies, the Crossplane installation, Crossplane provider configurations, and CompositeResourceDefinitions and Compositions.

Crossplane manages application databases, application storage buckets, application message queues, and any resource that individual development teams need to provision.

```hcl
# boundary.tf
# This file clearly documents the Terraform-Crossplane boundary

# Terraform manages these directly
resource "aws_iam_role" "app_roles" {
  for_each = toset(["service-a", "service-b", "service-c"])

  name = "${each.key}-role"
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

# Crossplane manages these through claims
# (the Compositions are defined by Terraform, but instances are created by developers)
```

## Best Practices

Use Terraform for foundational infrastructure that changes infrequently and requires careful planning. Use Crossplane for resources that application teams need to provision on demand. Define Crossplane Compositions with Terraform to ensure they follow organizational standards. Use IRSA or workload identity for Crossplane credentials rather than static keys. Monitor both Terraform state and Crossplane managed resources for drift. Keep the boundary between tools explicit and documented in your repository.

## Conclusion

Terraform and Crossplane are powerful tools that work well together when you define clear boundaries. Terraform provides the platform foundation, while Crossplane empowers development teams to provision resources through Kubernetes-native APIs. This combination gives platform teams control over standards and governance while giving developers the self-service experience they need. The key is maintaining a clear separation of responsibilities and ensuring both tools have proper access and monitoring.
