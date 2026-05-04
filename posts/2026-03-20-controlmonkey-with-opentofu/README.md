# How to Use ControlMonkey with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, ControlMonkey, Drift Detection, Infrastructure as Code, Governance, DevOps

Description: Learn how to integrate ControlMonkey with OpenTofu to gain continuous drift detection, self-service infrastructure provisioning, and automated policy enforcement across your cloud estate.

## Introduction

ControlMonkey is a cloud infrastructure automation platform that connects to your OpenTofu configurations and continuously reconciles them with the actual state of your cloud environment. Its primary differentiators are autonomous drift remediation and a self-service catalog that lets developers provision approved infrastructure without writing code.

## Connecting ControlMonkey to a Repository

ControlMonkey manages stacks through its provider:

```hcl
# controlmonkey.tf

terraform {
  required_providers {
    cm = {
      source  = "control-monkey/cm"
      version = "~> 1.0"
    }
  }
}

provider "cm" {
  # Token set via CONTROL_MONKEY_TOKEN environment variable
}

# Create a namespace (maps to a team or business unit)
resource "cm_namespace" "platform" {
  name = "platform-team"
}

# Create a stack backed by OpenTofu
resource "cm_stack" "networking" {
  name         = "aws-networking"
  namespace_id = cm_namespace.platform.id
  iac_type     = "opentofu"

  iac_config = {
    opentofu_version = "1.9.0"
  }

  deployment_behavior = {
    deploy_on_push = true
  }

  vcs_info = {
    provider_id = "vcs-github-connection-id"
    repo_name   = "my-org/infra-repo"
    branch      = "main"
    path        = "stacks/networking"
  }
}
```

## Enabling Drift Detection

ControlMonkey continuously monitors deployed resources and compares them to the OpenTofu state. Enable the drift detection capability and choose whether to remediate automatically:

```hcl
resource "cm_stack" "networking" {
  name         = "aws-networking"
  namespace_id = cm_namespace.platform.id
  iac_type     = "opentofu"

  iac_config = {
    opentofu_version = "1.9.0"
  }

  deployment_behavior = {
    deploy_on_push = true
  }

  vcs_info = {
    provider_id = "vcs-github-connection-id"
    repo_name   = "my-org/infra-repo"
    path        = "stacks/networking"
  }

  capabilities = {
    drift_detection = {
      status = "enabled"
    }
  }

  # When drift is detected, leave deploy_when_drift_detected = false
  # to surface drift for manual review instead of auto-remediating.
  auto_sync = {
    deploy_when_drift_detected = false
  }

  # Require a human to approve before applying any deployment.
  deployment_approval_policy = {
    rules = [
      {
        type = "requireApproval"
      }
    ]
  }
}
```

## Self-Service Blueprint Example

A blueprint is a pre-approved, parameterized OpenTofu module that developers can launch new stacks from without writing infrastructure code:

```hcl
resource "cm_blueprint" "web_app" {
  name        = "Standard Web Application"
  description = "Deploys an EC2 instance, ALB, and RDS in a standard configuration"

  # Where the blueprint source code lives.
  blueprint_vcs_info = {
    provider_id = "vcs-github-connection-id"
    repo_name   = "my-org/infra-blueprints"
    path        = "blueprints/web-app"
    branch      = "main"
  }

  # How stacks launched from this blueprint should be created.
  stack_configuration = {
    name_pattern = "web-app-{env}-{service}"
    iac_type     = "opentofu"

    iac_config = {
      opentofu_version = "1.9.0"
    }

    vcs_info_with_patterns = {
      provider_id  = "vcs-github-connection-id"
      repo_name    = "my-org/infra-repo"
      path_pattern = "stacks/{env}/{service}"
    }
  }

  # Dynamic placeholders the developer fills in when launching the stack.
  substitute_parameters = [
    {
      key         = "env"
      description = "Target environment, e.g. dev, stage, prod"
      value_conditions = [
        {
          operator = "in"
          values   = ["dev", "stage", "prod"]
        }
      ]
    },
    {
      key         = "service"
      description = "Service name used in resource naming"
    }
  ]
}
```

## Policy as Code Integration

ControlMonkey ships with a library of typed control policies (for example, `aws_required_tags`) that are evaluated against the plan output. Policies are grouped and then mapped onto namespaces or stacks:

```hcl
resource "cm_control_policy" "require_env_tag" {
  name        = "AWS resources must have an Env tag"
  description = "All AWS resources must be tagged with Env = dev/stage/prod."
  type        = "aws_required_tags"
  parameters = jsonencode({
    tags = [
      {
        key           = "Env"
        allowedValues = ["dev", "stage", "prod"]
      }
    ]
  })
}

resource "cm_control_policy_group" "security_baseline" {
  name        = "security-baseline"
  description = "Mandatory baseline policies for all platform stacks"

  control_policies = [
    {
      control_policy_id = cm_control_policy.require_env_tag.id
      severity          = "high"
    }
  ]
}

resource "cm_control_policy_group_mappings" "networking_policies" {
  control_policy_group_id = cm_control_policy_group.security_baseline.id

  targets = [
    {
      target_id         = cm_namespace.platform.id
      target_type       = "namespace"
      enforcement_level = "hardMandatory"
    }
  ]
}
```

## Importing Existing Resources

ControlMonkey continuously scans connected cloud accounts and flags resources that are not managed by IaC. From the ControlMonkey console, the **IaC Import** wizard generates both the OpenTofu/Terraform code and the matching state file for the selected resources, so you can place them under a stack without re-provisioning. The flow is:

1. Connect the cloud account in **Cloud Accounts**.
2. Open the **Inventory** view and filter for resources tagged as *Unmanaged*.
3. Select the resources to import and launch the **IaC Import** wizard.
4. Review the generated code, open the suggested pull request to your repo, and attach the resulting files to a `cm_stack`.

## Conclusion

ControlMonkey extends OpenTofu with continuous drift detection, self-service infrastructure blueprints, and a typed control-policy engine. Teams that want to move beyond reactive drift remediation toward proactive governance - where drift is detected and triaged automatically - will find ControlMonkey a compelling complement to a standard OpenTofu workflow.
