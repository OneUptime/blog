# How to Use Terraform with Harness for CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Harness, CI/CD, DevOps, Infrastructure as Code, Continuous Delivery

Description: Learn how to integrate Terraform with Harness CI/CD platform to automate infrastructure provisioning as part of your deployment pipelines with built-in verification.

---

Harness is a modern CI/CD platform that provides intelligent deployment verification, automated rollbacks, and cost management. Integrating Terraform with Harness allows you to include infrastructure provisioning as a first-class step in your delivery pipelines. Harness offers native Terraform support, making it straightforward to plan, apply, and destroy infrastructure as part of your deployment workflows. This guide covers setting up and using this integration.

## Why Use Terraform with Harness?

Harness brings several advantages to Terraform workflows. Its native Terraform integration provides plan approval workflows, state management, and drift detection. Harness's AI-powered verification can validate that infrastructure changes do not cause service degradation. The platform's governance features allow you to enforce policies on Terraform operations, and its cost management tools help track the cost impact of infrastructure changes.

## Prerequisites

You need a Harness account (free tier is available), Terraform configurations stored in a Git repository, a cloud provider account with appropriate credentials, and basic understanding of Harness pipeline concepts.

## Step 1: Configure Harness Connectors

First, set up the connectors Harness needs to access your Git repository and cloud provider.

```hcl
# harness-connectors.tf
# Use Terraform to manage Harness itself
terraform {
  required_providers {
    harness = {
      source  = "harness/harness"
      version = "~> 0.30"
    }
  }
}

provider "harness" {
  endpoint         = var.harness_endpoint
  account_id       = var.harness_account_id
  platform_api_key = var.harness_api_key
}

# Create a GitHub connector for accessing Terraform configurations
resource "harness_platform_connector_github" "terraform_repo" {
  identifier  = "terraform_repo"
  name        = "Terraform Repository"
  description = "GitHub connector for Terraform configurations"
  url         = "https://github.com/${var.github_org}"

  connection_type = "Account"

  credentials {
    http {
      username  = var.github_username
      token_ref = "account.github_token"
    }
  }

  api_authentication {
    token_ref = "account.github_token"
  }
}

# Create an AWS connector for Terraform operations
resource "harness_platform_connector_aws" "terraform_aws" {
  identifier  = "terraform_aws"
  name        = "AWS for Terraform"
  description = "AWS connector for Terraform infrastructure provisioning"

  manual {
    access_key_ref = "account.aws_access_key"
    secret_key_ref = "account.aws_secret_key"
  }
}
```

## Step 2: Define Infrastructure in Harness

Set up Harness environments and infrastructure definitions that reference Terraform.

```hcl
# harness-environments.tf
# Create environments in Harness
resource "harness_platform_environment" "production" {
  identifier = "production"
  name       = "Production"
  type       = "Production"
  org_id     = var.harness_org_id
  project_id = var.harness_project_id

  yaml = <<-YAML
    environment:
      name: Production
      identifier: production
      type: Production
      orgIdentifier: ${var.harness_org_id}
      projectIdentifier: ${var.harness_project_id}
      variables:
        - name: aws_region
          type: String
          value: us-east-1
        - name: instance_type
          type: String
          value: t3.large
  YAML
}

resource "harness_platform_environment" "staging" {
  identifier = "staging"
  name       = "Staging"
  type       = "PreProduction"
  org_id     = var.harness_org_id
  project_id = var.harness_project_id

  yaml = <<-YAML
    environment:
      name: Staging
      identifier: staging
      type: PreProduction
      orgIdentifier: ${var.harness_org_id}
      projectIdentifier: ${var.harness_project_id}
      variables:
        - name: aws_region
          type: String
          value: us-east-1
        - name: instance_type
          type: String
          value: t3.medium
  YAML
}
```

## Step 3: Create Infrastructure Definitions

Define how Terraform provisions infrastructure for each environment.

```hcl
# harness-infra-def.tf
# Create an infrastructure definition using Terraform
resource "harness_platform_infrastructure" "production_k8s" {
  identifier      = "production_k8s"
  name            = "Production Kubernetes"
  org_id          = var.harness_org_id
  project_id      = var.harness_project_id
  env_id          = harness_platform_environment.production.identifier
  type            = "KubernetesDirect"
  deployment_type = "Kubernetes"

  yaml = <<-YAML
    infrastructureDefinition:
      name: Production Kubernetes
      identifier: production_k8s
      orgIdentifier: ${var.harness_org_id}
      projectIdentifier: ${var.harness_project_id}
      environmentRef: production
      type: KubernetesDirect
      spec:
        connectorRef: account.k8s_connector
        namespace: production
        releaseName: release-<+INFRA_KEY>
  YAML
}
```

## Step 4: Create a Harness Pipeline with Terraform Steps

Build a pipeline that includes Terraform plan, approval, and apply stages.

```hcl
# harness-pipeline.tf
# Create a deployment pipeline with Terraform integration
resource "harness_platform_pipeline" "infra_deploy" {
  identifier = "infra_deploy_pipeline"
  name       = "Infrastructure Deployment"
  org_id     = var.harness_org_id
  project_id = var.harness_project_id

  yaml = <<-YAML
    pipeline:
      name: Infrastructure Deployment
      identifier: infra_deploy_pipeline
      projectIdentifier: ${var.harness_project_id}
      orgIdentifier: ${var.harness_org_id}
      stages:
        # Stage 1: Terraform Plan
        - stage:
            name: Terraform Plan
            identifier: terraform_plan
            type: Custom
            spec:
              execution:
                steps:
                  - step:
                      name: Terraform Plan
                      identifier: tf_plan
                      type: TerraformPlan
                      timeout: 10m
                      spec:
                        configuration:
                          command: Apply
                          configFiles:
                            store:
                              type: Github
                              spec:
                                gitFetchType: Branch
                                connectorRef: account.terraform_repo
                                branch: main
                                folderPath: terraform/production
                          secretManagerRef: account.harnessSecretManager
                          varFiles:
                            - varFile:
                                type: Remote
                                spec:
                                  store:
                                    type: Github
                                    spec:
                                      gitFetchType: Branch
                                      connectorRef: account.terraform_repo
                                      branch: main
                                      paths:
                                        - terraform/production/terraform.tfvars
                        provisionerIdentifier: production_infra

        # Stage 2: Approval Gate
        - stage:
            name: Approve Infrastructure Changes
            identifier: approval
            type: Approval
            spec:
              execution:
                steps:
                  - step:
                      name: Approve Changes
                      identifier: approve
                      type: HarnessApproval
                      timeout: 1d
                      spec:
                        approvalMessage: "Review Terraform plan and approve infrastructure changes"
                        approvers:
                          minimumCount: 1
                          userGroups:
                            - account.platform_team

        # Stage 3: Terraform Apply
        - stage:
            name: Terraform Apply
            identifier: terraform_apply
            type: Custom
            spec:
              execution:
                steps:
                  - step:
                      name: Terraform Apply
                      identifier: tf_apply
                      type: TerraformApply
                      timeout: 30m
                      spec:
                        configuration:
                          type: InheritFromPlan
                        provisionerIdentifier: production_infra

        # Stage 4: Deploy Application
        - stage:
            name: Deploy Application
            identifier: deploy_app
            type: Deployment
            spec:
              deploymentType: Kubernetes
              environment:
                environmentRef: production
                infrastructureDefinitions:
                  - identifier: production_k8s
              execution:
                steps:
                  - step:
                      name: Rolling Deployment
                      identifier: rolling
                      type: K8sRollingDeploy
                      timeout: 10m
                      spec:
                        skipDryRun: false
                rollbackSteps:
                  - step:
                      name: Rollback
                      identifier: rollback
                      type: K8sRollingRollback
                      timeout: 10m
  YAML
}
```

## Step 5: Configure Terraform Workspace in Harness

```hcl
# harness-terraform-workspace.tf
# Create a Terraform workspace configuration
resource "harness_platform_workspace" "production" {
  identifier           = "production_workspace"
  name                 = "Production Infrastructure"
  org_id               = var.harness_org_id
  project_id           = var.harness_project_id
  provisioner_type     = "terraform"
  provider_connector   = "account.terraform_aws"
  repository           = "org/infrastructure"
  repository_connector = "account.terraform_repo"
  repository_path      = "terraform/production"
  repository_branch    = "main"
  terraform_version    = "1.6.0"

  environment_variables = [
    {
      key        = "AWS_REGION"
      value      = "us-east-1"
      value_type = "string"
    }
  ]

  terraform_variables = [
    {
      key        = "environment"
      value      = "production"
      value_type = "string"
    },
    {
      key        = "instance_type"
      value      = "t3.large"
      value_type = "string"
    }
  ]
}
```

## Step 6: Set Up Governance Policies

Use Harness OPA policies to enforce rules on Terraform operations.

```hcl
# harness-policies.tf
# Create a governance policy for Terraform operations
resource "harness_platform_policy" "terraform_governance" {
  identifier = "terraform_governance"
  name       = "Terraform Governance"
  org_id     = var.harness_org_id
  project_id = var.harness_project_id

  rego = <<-REGO
    package terraform

    # Deny if trying to destroy production resources without approval
    deny[msg] {
      input.action == "destroy"
      input.environment == "production"
      not input.approved
      msg := "Production destroy operations require explicit approval"
    }

    # Deny if instance types are too large
    deny[msg] {
      some resource
      input.plan.resource_changes[resource].type == "aws_instance"
      instance_type := input.plan.resource_changes[resource].change.after.instance_type
      not allowed_instance_types[instance_type]
      msg := sprintf("Instance type %s is not allowed", [instance_type])
    }

    allowed_instance_types = {
      "t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge"
    }
  REGO
}

# Create a policy set that includes the governance policy
resource "harness_platform_policyset" "terraform_rules" {
  identifier = "terraform_rules"
  name       = "Terraform Rules"
  org_id     = var.harness_org_id
  project_id = var.harness_project_id
  action     = "onrun"
  type       = "custom"
  enabled    = true

  policies {
    identifier = harness_platform_policy.terraform_governance.identifier
    severity   = "error"
  }
}
```

## Monitoring and Verification

Harness can automatically verify infrastructure changes by monitoring key metrics after a Terraform apply.

```hcl
# harness-verification.tf
# Add a verification step after Terraform apply
# This monitors infrastructure health after changes
resource "harness_platform_monitored_service" "infra" {
  identifier = "infrastructure_health"
  name       = "Infrastructure Health"
  org_id     = var.harness_org_id
  project_id = var.harness_project_id

  service_ref     = "infrastructure"
  environment_ref = "production"
  type            = "Infrastructure"
}
```

## Best Practices

Use Harness workspaces to manage Terraform state centrally with proper locking. Implement approval gates between Terraform plan and apply stages. Use OPA policies to enforce organizational standards on infrastructure changes. Leverage Harness's verification capabilities to validate infrastructure health after Terraform applies. Store Terraform configurations in Git and reference them through Harness connectors. Use pipeline templates for consistent Terraform workflows across teams. Monitor deployment frequency and failure rates to improve your pipeline over time.

## Conclusion

Terraform and Harness together provide a robust infrastructure and application delivery platform. Harness's native Terraform integration adds governance, approval workflows, and verification capabilities that complement Terraform's infrastructure provisioning strengths. By managing your Harness configuration with Terraform itself, you achieve a fully codified delivery pipeline that is reproducible, auditable, and scalable.
