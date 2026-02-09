# Using the Crossplane Terraform Provider to Leverage Existing Terraform Modules
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Crossplane, Terraform, Provider, Kubernetes, Infrastructure as Code
Description: How to use the Crossplane Terraform provider to run existing Terraform modules and HCL configurations from within Kubernetes
---

Many organizations have years of investment in Terraform modules that encode hard-won infrastructure knowledge. Migrating entirely to Crossplane native providers is often impractical, especially when custom Terraform providers exist for niche services with no Crossplane equivalent. The Crossplane Terraform provider bridges this gap by allowing you to run Terraform configurations directly from Kubernetes, managed as Crossplane resources. This means you can incorporate existing Terraform modules into your Crossplane compositions, get Kubernetes-native reconciliation for Terraform-managed resources, and gradually migrate to native providers at your own pace.

## Why Use Terraform Inside Crossplane?

The Crossplane Terraform provider makes sense in several scenarios:

- **Existing modules**: You have battle-tested Terraform modules that would take significant effort to rewrite as native Crossplane compositions
- **Missing providers**: Some cloud services or third-party APIs have Terraform providers but no Crossplane provider
- **Gradual migration**: You want to adopt Crossplane incrementally without a big-bang migration from Terraform
- **Composition mixing**: Some resources are best handled by native Crossplane providers while others need Terraform

## Installing the Terraform Provider

Install the Crossplane Terraform provider:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-terraform
spec:
  package: xpkg.upbound.io/upbound/provider-terraform:v0.16.0
```

Wait for the provider to become healthy:

```bash
kubectl get provider provider-terraform
# NAME                  INSTALLED   HEALTHY   PACKAGE                                                   AGE
# provider-terraform    True        True      xpkg.upbound.io/upbound/provider-terraform:v0.16.0       1m
```

## Configuring the Terraform Provider

Create a ProviderConfig that specifies how Terraform should run:

```yaml
apiVersion: tf.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  configuration: |
    terraform {
      required_providers {
        aws = {
          source  = "hashicorp/aws"
          version = "~> 5.0"
        }
      }
      backend "kubernetes" {
        secret_suffix    = "terraform-state"
        namespace        = "crossplane-system"
        in_cluster_config = true
      }
    }

    provider "aws" {
      region = "us-east-1"
    }
  credentials:
    - filename: aws-credentials.ini
      source: Secret
      secretRef:
        namespace: crossplane-system
        name: aws-terraform-creds
        key: credentials
```

The configuration block supports any valid Terraform configuration, including backend configuration. Using the Kubernetes backend stores Terraform state as Kubernetes secrets, keeping everything within the cluster.

## Creating a Basic Workspace

The core resource type is the `Workspace`, which represents a Terraform workspace:

```yaml
apiVersion: tf.upbound.io/v1beta1
kind: Workspace
metadata:
  name: s3-bucket-example
spec:
  forProvider:
    source: Inline
    module: |
      variable "bucket_name" {
        type = string
      }

      variable "environment" {
        type    = string
        default = "production"
      }

      resource "aws_s3_bucket" "main" {
        bucket = var.bucket_name
        tags = {
          Environment = var.environment
          ManagedBy   = "crossplane-terraform"
        }
      }

      resource "aws_s3_bucket_versioning" "main" {
        bucket = aws_s3_bucket.main.id
        versioning_configuration {
          status = "Enabled"
        }
      }

      resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
        bucket = aws_s3_bucket.main.id
        rule {
          apply_server_side_encryption_by_default {
            sse_algorithm = "aws:kms"
          }
        }
      }

      output "bucket_arn" {
        value = aws_s3_bucket.main.arn
      }

      output "bucket_domain_name" {
        value = aws_s3_bucket.main.bucket_domain_name
      }
    vars:
      - key: bucket_name
        value: my-crossplane-managed-bucket
      - key: environment
        value: production
  writeConnectionSecretToRef:
    name: s3-bucket-connection
    namespace: default
```

## Using Remote Terraform Modules

Instead of inline HCL, reference existing modules from registries or Git repositories:

```yaml
apiVersion: tf.upbound.io/v1beta1
kind: Workspace
metadata:
  name: vpc-from-module
spec:
  forProvider:
    source: Remote
    module: |
      module "vpc" {
        source  = "terraform-aws-modules/vpc/aws"
        version = "5.4.0"

        name = var.vpc_name
        cidr = var.cidr_block

        azs             = var.availability_zones
        private_subnets = var.private_subnets
        public_subnets  = var.public_subnets

        enable_nat_gateway   = true
        single_nat_gateway   = false
        enable_dns_hostnames = true
        enable_dns_support   = true

        tags = {
          Environment = var.environment
          ManagedBy   = "crossplane-terraform"
        }
      }

      variable "vpc_name" {
        type = string
      }

      variable "cidr_block" {
        type = string
      }

      variable "availability_zones" {
        type = list(string)
      }

      variable "private_subnets" {
        type = list(string)
      }

      variable "public_subnets" {
        type = list(string)
      }

      variable "environment" {
        type = string
      }

      output "vpc_id" {
        value = module.vpc.vpc_id
      }

      output "private_subnet_ids" {
        value = join(",", module.vpc.private_subnets)
      }

      output "public_subnet_ids" {
        value = join(",", module.vpc.public_subnets)
      }
    vars:
      - key: vpc_name
        value: production-vpc
      - key: cidr_block
        value: "10.0.0.0/16"
      - key: availability_zones
        value: '["us-east-1a", "us-east-1b", "us-east-1c"]'
      - key: private_subnets
        value: '["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]'
      - key: public_subnets
        value: '["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]'
      - key: environment
        value: production
```

## Using Git Sources

Reference Terraform configurations stored in Git repositories:

```yaml
apiVersion: tf.upbound.io/v1beta1
kind: Workspace
metadata:
  name: infra-from-git
spec:
  forProvider:
    source: Remote
    module: |
      module "infrastructure" {
        source = "git::https://github.com/my-org/terraform-modules.git//networking/vpc?ref=v2.1.0"

        vpc_name    = var.vpc_name
        environment = var.environment
      }

      variable "vpc_name" {
        type = string
      }

      variable "environment" {
        type = string
      }

      output "vpc_id" {
        value = module.infrastructure.vpc_id
      }
    vars:
      - key: vpc_name
        value: production-vpc
      - key: environment
        value: production
```

For private repositories, configure Git credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: crossplane-system
type: Opaque
stringData:
  GIT_ASKPASS: "/bin/echo"
  GIT_USERNAME: "git-token"
  GIT_PASSWORD: "ghp_your_github_token_here"
```

## Integrating with Crossplane Compositions

The real power comes from embedding Terraform workspaces within Crossplane Compositions alongside native resources:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: full-stack-aws
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XFullStack
  resources:
    # Native Crossplane resource for the database
    - name: database
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            engine: postgres
            engineVersion: "15.4"
            instanceClass: db.r6g.large
            allocatedStorage: 100
    # Terraform workspace for custom networking
    - name: custom-networking
      base:
        apiVersion: tf.upbound.io/v1beta1
        kind: Workspace
        spec:
          forProvider:
            source: Remote
            module: |
              module "custom_networking" {
                source  = "git::https://github.com/my-org/terraform-modules.git//networking/custom?ref=v1.0.0"
                vpc_id  = var.vpc_id
                db_port = var.db_port
              }

              variable "vpc_id" {
                type = string
              }

              variable "db_port" {
                type = number
              }

              output "security_group_id" {
                value = module.custom_networking.security_group_id
              }
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: status.vpcId
          toFieldPath: spec.forProvider.vars[0].value
```

## Managing Terraform State

The Kubernetes backend stores state as secrets, which makes it easy to inspect and back up:

```bash
# List Terraform state secrets
kubectl get secrets -n crossplane-system -l tfstate=true

# Back up state
kubectl get secret terraform-state-s3-bucket-example \
  -n crossplane-system -o yaml > state-backup.yaml
```

For larger deployments, consider using an external backend:

```yaml
spec:
  configuration: |
    terraform {
      backend "s3" {
        bucket         = "terraform-state-bucket"
        key            = "crossplane/terraform.tfstate"
        region         = "us-east-1"
        dynamodb_table = "terraform-state-lock"
        encrypt        = true
      }
    }
```

## Reconciliation Behavior

Unlike native Crossplane providers that continuously reconcile, the Terraform provider runs `terraform plan` periodically to detect drift and `terraform apply` when changes are needed:

```yaml
spec:
  forProvider:
    # Run plan every 10 minutes to detect drift
    planArgs:
      - "-refresh=true"
    applyArgs:
      - "-auto-approve"
      - "-parallelism=10"
```

Monitor workspace reconciliation:

```bash
# Check workspace status
kubectl get workspace -o custom-columns=\
  NAME:.metadata.name,\
  READY:.status.conditions[?(@.type=='Ready')].status,\
  SYNCED:.status.conditions[?(@.type=='Synced')].status,\
  AGE:.metadata.creationTimestamp

# View Terraform output values
kubectl get workspace s3-bucket-example -o jsonpath='{.status.atProvider.outputs}'
```

## Handling Sensitive Variables

Pass sensitive variables through Kubernetes secrets:

```yaml
apiVersion: tf.upbound.io/v1beta1
kind: Workspace
metadata:
  name: database-with-secrets
spec:
  forProvider:
    source: Inline
    module: |
      variable "db_password" {
        type      = string
        sensitive = true
      }

      resource "aws_db_instance" "main" {
        password = var.db_password
        # ... other config
      }
    varFiles:
      - source: SecretKey
        secretKeyRef:
          namespace: default
          name: db-secrets
          key: terraform.tfvars
```

## Conclusion

The Crossplane Terraform provider is a pragmatic bridge between the Terraform and Crossplane ecosystems. It lets you leverage your existing Terraform investment while adopting Crossplane's Kubernetes-native control plane model. By embedding Terraform workspaces within Compositions, you can mix native Crossplane resources with Terraform-managed resources in a single abstraction. This approach enables gradual migration, fills gaps where native Crossplane providers do not yet exist, and preserves the value of your existing Terraform modules. Over time, as native Crossplane providers mature and cover more resource types, you can replace Terraform workspaces with native resources at your own pace, one module at a time.
