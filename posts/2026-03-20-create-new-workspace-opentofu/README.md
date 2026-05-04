# How to Create a New Workspace in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Workspaces

Description: Learn how to create new OpenTofu workspaces to manage separate infrastructure environments with isolated state files using the workspace new command.

## Introduction

OpenTofu workspaces allow you to manage multiple distinct instances of your infrastructure using a single configuration. Each workspace has its own state file, enabling environment isolation (dev, staging, production) without duplicating configuration files.

## Creating a New Workspace

```bash
# Create a new workspace named "staging"

tofu workspace new staging

# Output:
# Created and switched to workspace "staging"!
#
# You're now on a new, empty workspace. Workspaces isolate their state,
# so if you run "tofu plan" OpenTofu will not see any existing state
# for this configuration.
```

OpenTofu automatically switches to the new workspace after creation.

## Creating Multiple Workspaces

```bash
# Create all environment workspaces
tofu workspace new development
tofu workspace new staging
tofu workspace new production

# Verify all workspaces exist
tofu workspace list
#   default
#   development
# * production
#   staging
```

## Using the Workspace in Configuration

Reference the workspace name in your configuration to differentiate environments:

```hcl
# main.tf
locals {
  environment = terraform.workspace

  # Map workspace to environment-specific settings
  instance_type = {
    default     = "t3.micro"
    development = "t3.micro"
    staging     = "t3.small"
    production  = "t3.large"
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.instance_type[terraform.workspace]

  tags = {
    Name        = "app-${terraform.workspace}"
    Environment = terraform.workspace
  }
}
```

## Creating a Workspace and Deploying

```bash
# Step 1: Create the workspace
tofu workspace new production

# Step 2: Verify you're in the right workspace
tofu workspace show
# production

# Step 3: Configure environment-specific variables
cat > production.tfvars << 'EOF'
instance_count = 3
instance_type  = "t3.large"
domain         = "api.example.com"
EOF

# Step 4: Plan and apply
tofu plan -var-file=production.tfvars
tofu apply -var-file=production.tfvars
```

## Workspace with Different Backend Keys

When you create a workspace, the state is stored at a different key in your backend:

```text
S3 bucket:
├── app/terraform.tfstate           ← default workspace
└── env:/
    ├── production/
    │   └── app/terraform.tfstate   ← production workspace
    └── staging/
        └── app/terraform.tfstate   ← staging workspace
```

## Initializing a New Project with Multiple Workspaces

```bash
# Initialize the project
tofu init

# Create workspaces for each environment
for env in development staging production; do
  tofu workspace new $env
  echo "Created workspace: $env"
done

# Verify
tofu workspace list
```

## Copying State to a New Workspace

If you want to start a new workspace based on existing state:

```bash
# Export current state
tofu workspace select default
tofu state pull > temp_state.tfstate

# Create new workspace
tofu workspace new production

# Push the copied state
tofu state push temp_state.tfstate

# Clean up
rm temp_state.tfstate
```

## Conclusion

Creating workspaces in OpenTofu is straightforward with `tofu workspace new`. Each new workspace starts with an empty state, completely isolated from other workspaces. Use `terraform.workspace` in your configuration to make resource names, instance types, and counts environment-aware. Establish a workspace naming convention early and document which workspaces correspond to which environments.
