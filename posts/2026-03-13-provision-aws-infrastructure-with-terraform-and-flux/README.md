# How to Provision AWS Infrastructure with Terraform and Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, AWS, GitOps, Kubernetes, Infrastructure as Code

Description: Provision AWS infrastructure using Terraform via the Tofu Controller with Flux CD for fully GitOps-driven cloud resource management.

---

## Introduction

Provisioning AWS infrastructure with Terraform via the Tofu Controller combines the ecosystem richness of Terraform's AWS provider with the GitOps reconciliation model of Flux CD. Unlike CI/CD pipelines that run Terraform imperatively on trigger, the Tofu Controller continuously reconciles infrastructure state, detecting and correcting drift automatically.

This guide provisions a complete AWS environment: a VPC with public and private subnets, an EKS cluster, and an RDS database. Each component is a separate Terraform module referenced by a dedicated Terraform resource, with Flux Kustomization ordering ensuring they are provisioned in the correct sequence.

## Prerequisites

- Tofu Controller installed via Flux
- AWS credentials configured as a Kubernetes Secret
- A Git repository with Terraform modules
- `kubectl` and `flux` CLIs installed

## Step 1: Structure the Terraform Modules Repository

```plaintext
terraform-modules/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── rds/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
```

## Step 2: Create the VPC Terraform Resource

```yaml
# infrastructure/terraform/aws/01-vpc.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: aws-production-vpc
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/vpc
  workspace: aws-production-vpc
  approvePlan: "manual"
  storeReadablePlan: human

  backendConfig:
    customConfiguration: |
      backend "s3" {
        bucket         = "my-org-terraform-state"
        key            = "production/aws/vpc/terraform.tfstate"
        region         = "us-east-1"
        encrypt        = true
        dynamodb_table = "terraform-state-lock"
      }

  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials
      optional: false

  vars:
    - name: region
      value: us-east-1
    - name: vpc_cidr
      value: "10.0.0.0/16"
    - name: environment
      value: production
    - name: availability_zones
      value: '["us-east-1a", "us-east-1b", "us-east-1c"]'
    - name: private_subnet_cidrs
      value: '["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]'
    - name: public_subnet_cidrs
      value: '["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]'

  writeOutputsToSecret:
    name: aws-vpc-outputs
    outputs:
      - vpc_id
      - private_subnet_ids
      - public_subnet_ids
      - vpc_cidr_block
```

## Step 3: Create the EKS Terraform Resource

```yaml
# infrastructure/terraform/aws/02-eks.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: aws-production-eks
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/eks
  workspace: aws-production-eks
  approvePlan: "manual"
  # EKS cluster creation takes 15-20 minutes
  runnerTerminationGracePeriodSeconds: 1800

  backendConfig:
    customConfiguration: |
      backend "s3" {
        bucket         = "my-org-terraform-state"
        key            = "production/aws/eks/terraform.tfstate"
        region         = "us-east-1"
        encrypt        = true
        dynamodb_table = "terraform-state-lock"
      }

  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials
      optional: false
    # Consume VPC outputs as Terraform variables
    - kind: Secret
      name: aws-vpc-outputs
      varsKeys:
        - vpc_id
        - private_subnet_ids

  vars:
    - name: region
      value: us-east-1
    - name: cluster_name
      value: production-eks
    - name: kubernetes_version
      value: "1.29"
    - name: node_instance_type
      value: m6i.large
    - name: node_count
      value: "3"
    - name: node_min_count
      value: "2"
    - name: node_max_count
      value: "10"
    - name: environment
      value: production

  writeOutputsToSecret:
    name: aws-eks-outputs
    outputs:
      - cluster_endpoint
      - cluster_name
      - cluster_certificate_authority_data
      - node_group_arn
      - oidc_provider_arn
```

## Step 4: Create the RDS Terraform Resource

```yaml
# infrastructure/terraform/aws/03-rds.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: aws-production-rds
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  path: ./modules/rds
  workspace: aws-production-rds
  approvePlan: "manual"

  backendConfig:
    customConfiguration: |
      backend "s3" {
        bucket         = "my-org-terraform-state"
        key            = "production/aws/rds/terraform.tfstate"
        region         = "us-east-1"
        encrypt        = true
        dynamodb_table = "terraform-state-lock"
      }

  varsFrom:
    - kind: Secret
      name: terraform-aws-credentials
      optional: false
    - kind: Secret
      name: aws-vpc-outputs
      varsKeys:
        - vpc_id
        - private_subnet_ids
    - kind: Secret
      name: terraform-production-sensitive-vars
      varsKeys:
        - db_master_password

  vars:
    - name: region
      value: us-east-1
    - name: engine
      value: postgres
    - name: engine_version
      value: "15.4"
    - name: instance_class
      value: db.r6g.large
    - name: allocated_storage
      value: "100"
    - name: max_allocated_storage
      value: "500"
    - name: multi_az
      value: "true"
    - name: environment
      value: production

  writeOutputsToSecret:
    name: aws-rds-outputs
    outputs:
      - db_endpoint
      - db_port
      - db_name
```

## Step 5: Create Flux Kustomizations with Ordering

```yaml
# clusters/my-cluster/terraform/aws-infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: aws-vpc
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/terraform/aws
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: tofu-controller
```

## Step 6: Verify the Infrastructure

```bash
# Watch all Terraform resources
kubectl get terraform -n flux-system --watch

# After VPC is applied, check its outputs
kubectl get secret aws-vpc-outputs -n flux-system -o yaml

# After EKS is ready, get the kubeconfig
EKS_ENDPOINT=$(kubectl get secret aws-eks-outputs \
  -n flux-system \
  -o jsonpath='{.data.cluster_endpoint}' | base64 -d)
echo "EKS Endpoint: ${EKS_ENDPOINT}"

# Verify the RDS endpoint
kubectl get secret aws-rds-outputs \
  -n flux-system \
  -o jsonpath='{.data.db_endpoint}' | base64 -d
```

## Best Practices

- Use separate Terraform resources and workspaces for VPC, EKS, and RDS. This allows independent updates and prevents a change to the database from triggering a plan against the VPC.
- Pass outputs from one Terraform resource (VPC outputs) to another (EKS) via the `writeOutputsToSecret` and `varsFrom` pattern. This creates a declarative dependency chain.
- Set `approvePlan: "manual"` for all production Terraform resources. The time cost of review is worth the protection against unintended changes.
- Use S3 state backend with DynamoDB locking for all production Terraform resources to prevent concurrent plan/apply operations.
- Set generous `runnerTerminationGracePeriodSeconds` for resources with long provisioning times (EKS: 30 minutes, RDS: 20 minutes).

## Conclusion

A complete AWS infrastructure stack is now provisioned through Terraform modules managed by the Tofu Controller and Flux CD. VPC, EKS, and RDS are all defined declaratively in Git, reconciled continuously, and ordered correctly through Flux Kustomization dependencies. Infrastructure outputs flow between components via Kubernetes Secrets, enabling a declarative dependency chain without manual coordination.
