# How to Configure Workspace Execution Mode in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Execution Mode, Remote Execution, Agent Execution, DevOps

Description: Learn how to choose and configure the right workspace execution mode in HCP Terraform - remote, local, or agent - for your infrastructure needs.

---

Every workspace in HCP Terraform has an execution mode that determines where Terraform operations actually run. Choosing the right mode affects everything from security to performance to which resources you can manage. Get it wrong and your plans will fail, your credentials will not be found, or your private infrastructure will be unreachable.

This guide explains the three execution modes, when to use each one, and how to switch between them.

## The Three Execution Modes

### Remote Execution

Plans and applies run on HCP Terraform's managed infrastructure. This is the default mode.

```text
Developer -> terraform plan -> HCP Terraform workers -> Cloud APIs
```

**Best for**: Cloud infrastructure that is publicly accessible (or accessible via dynamic credentials). Teams that want a consistent, managed execution environment.

**Characteristics**:
- Plans and applies run on HCP Terraform's servers
- You need to set cloud credentials as workspace environment variables
- Consistent execution environment across all team members
- Full audit trail of all operations
- Terraform version is managed by the workspace setting

### Local Execution

Plans and applies run on your local machine (or CI/CD agent). State is still stored in HCP Terraform.

```text
Developer -> terraform plan -> Local machine -> Cloud APIs
                                    |
                                    v
                              HCP Terraform (state only)
```

**Best for**: Development workflows where you want local control. Situations where you need local tools or network access during runs. Debugging issues with remote execution.

**Characteristics**:
- State storage and locking in HCP Terraform
- Operations run wherever you invoke `terraform`
- Uses your local credentials and network access
- No execution time limits from HCP Terraform
- You manage the Terraform version locally

### Agent Execution

Plans and applies run on your own agent processes inside your network.

```text
Developer -> terraform plan -> HCP Terraform -> Agent (your network) -> Private APIs
```

**Best for**: Infrastructure behind firewalls, VPNs, or private networks. On-premises resources. Environments where credentials cannot leave your network.

**Characteristics**:
- Agents run inside your network, poll HCP Terraform for work
- Credentials stay within your network
- No inbound firewall rules needed
- You manage the agent infrastructure
- Available on Business tier

## Configuring Execution Mode

### Through the UI

1. Go to your workspace in HCP Terraform
2. Navigate to **Settings** > **General**
3. Under **Execution Mode**, select Remote, Local, or Agent
4. If selecting Agent, choose an agent pool
5. Click **Save settings**

### Using the TFE Provider

```hcl
# Remote execution (default)
resource "tfe_workspace" "remote_ws" {
  name           = "cloud-infrastructure"
  organization   = "your-org"
  execution_mode = "remote"
}

# Local execution
resource "tfe_workspace" "local_ws" {
  name           = "development-testing"
  organization   = "your-org"
  execution_mode = "local"
}

# Agent execution
resource "tfe_workspace" "agent_ws" {
  name           = "private-datacenter"
  organization   = "your-org"
  execution_mode = "agent"
  agent_pool_id  = tfe_agent_pool.private_network.id
}
```

### Through the API

```bash
# Set execution mode to remote
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "execution-mode": "remote"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}"
```

```bash
# Set execution mode to agent
AGENT_POOL_ID="apool-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"execution-mode\": \"agent\",
        \"agent-pool-id\": \"${AGENT_POOL_ID}\"
      }
    }
  }" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}"
```

## Decision Guide: Which Mode to Use

### Use Remote When...

- Your infrastructure is in public cloud (AWS, Azure, GCP)
- You can provide cloud credentials via environment variables or dynamic credentials
- You want maximum consistency across team members
- You want HCP Terraform to manage the Terraform version
- You do not need local tools during plan/apply

```hcl
# Typical remote workspace setup
resource "tfe_workspace" "aws_production" {
  name              = "aws-production"
  organization      = "your-org"
  execution_mode    = "remote"
  terraform_version = "1.7.0"
  auto_apply        = false
}

# Set AWS credentials as environment variables
resource "tfe_variable" "aws_key" {
  key          = "AWS_ACCESS_KEY_ID"
  value        = var.aws_key
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.aws_production.id
}

resource "tfe_variable" "aws_secret" {
  key          = "AWS_SECRET_ACCESS_KEY"
  value        = var.aws_secret
  category     = "env"
  sensitive    = true
  workspace_id = tfe_workspace.aws_production.id
}
```

### Use Local When...

- You are developing and testing configurations
- You need access to local files, tools, or network resources during runs
- You want to use local credentials (like `~/.aws/credentials`)
- Your team is small and does not need centralized execution
- You are debugging an issue with remote execution

```hcl
# Local execution workspace - state in cloud, runs locally
resource "tfe_workspace" "dev_local" {
  name           = "development-local"
  organization   = "your-org"
  execution_mode = "local"
}
```

When using local mode, your Terraform configuration still uses the `cloud` block:

```hcl
terraform {
  cloud {
    organization = "your-org"
    workspaces {
      name = "development-local"
    }
  }
}
```

But runs happen on your machine:

```bash
# This runs locally, state goes to HCP Terraform
terraform plan
# Uses local AWS credentials, local network, etc.
terraform apply
```

### Use Agent When...

- Your resources are behind firewalls or in private networks
- Compliance requirements prevent sending credentials to third-party services
- You need to access on-premises infrastructure
- You need custom tools installed in the execution environment
- Your Terraform providers connect to internal APIs

```hcl
# Agent pool for private infrastructure
resource "tfe_agent_pool" "private" {
  name         = "private-datacenter"
  organization = "your-org"
}

# Workspace using agent execution
resource "tfe_workspace" "private_infra" {
  name           = "private-infrastructure"
  organization   = "your-org"
  execution_mode = "agent"
  agent_pool_id  = tfe_agent_pool.private.id
}
```

## Switching Between Execution Modes

You can switch a workspace's execution mode at any time. Here is what to consider:

### Switching from Local to Remote

1. Make sure all required credentials are set as workspace environment variables
2. Remove any references to local files in your configuration
3. Update the execution mode
4. Run a plan to verify everything works

```bash
# Verify credentials are set before switching
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}/vars" \
  | jq '.data[] | {key: .attributes.key, category: .attributes.category}'

# Switch to remote
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{"data": {"type": "workspaces", "attributes": {"execution-mode": "remote"}}}' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}"
```

### Switching from Remote to Agent

1. Set up an agent pool and deploy agents in your network
2. Verify agents are connected and healthy
3. Move any credentials from workspace variables to the agent host (if they should not leave your network)
4. Update the workspace to agent execution mode

### Temporary Mode Changes

Sometimes you need to temporarily switch modes for debugging:

```bash
#!/bin/bash
# debug-locally.sh - Temporarily switch to local mode for debugging

WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"
ORIGINAL_MODE="remote"

# Switch to local
echo "Switching to local execution..."
curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{"data": {"type": "workspaces", "attributes": {"execution-mode": "local"}}}' \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}" > /dev/null

echo "Now in local mode. Debug your configuration."
echo "Press Enter when done to switch back to ${ORIGINAL_MODE}..."
read

# Switch back
echo "Switching back to ${ORIGINAL_MODE}..."
curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data "{\"data\": {\"type\": \"workspaces\", \"attributes\": {\"execution-mode\": \"${ORIGINAL_MODE}\"}}}" \
  "https://app.terraform.io/api/v2/workspaces/${WORKSPACE_ID}" > /dev/null

echo "Back to ${ORIGINAL_MODE} mode."
```

## Execution Mode by Environment Pattern

A common pattern is to use different execution modes for different environments:

```hcl
variable "workspaces" {
  default = {
    development = {
      execution_mode = "local"      # Developers run locally
      auto_apply     = true
    }
    staging = {
      execution_mode = "remote"     # Staging runs on HCP Terraform
      auto_apply     = true
    }
    production = {
      execution_mode = "remote"     # Production runs on HCP Terraform
      auto_apply     = false
    }
    private-dc = {
      execution_mode = "agent"      # Private DC uses agents
      auto_apply     = false
    }
  }
}

resource "tfe_workspace" "environments" {
  for_each = var.workspaces

  name           = "app-${each.key}"
  organization   = "your-org"
  execution_mode = each.value.execution_mode
  auto_apply     = each.value.auto_apply

  # Only set agent pool for agent mode
  agent_pool_id = each.value.execution_mode == "agent" ? tfe_agent_pool.private.id : null
}
```

## Credential Management Across Modes

Each mode handles credentials differently:

| Mode | How Credentials Work |
|---|---|
| Remote | Set as workspace env variables or use dynamic credentials |
| Local | Uses your local environment (env vars, credential files, instance profiles) |
| Agent | Available on the agent host's environment |

### Dynamic Credentials (Remote Mode)

For remote execution, dynamic credentials are the most secure option:

```hcl
# Configure dynamic credentials for AWS
resource "tfe_workspace" "aws_dynamic" {
  name           = "aws-with-dynamic-creds"
  organization   = "your-org"
  execution_mode = "remote"
}

# Set the TFC_AWS_RUN_ROLE_ARN variable
resource "tfe_variable" "aws_role" {
  key          = "TFC_AWS_RUN_ROLE_ARN"
  value        = "arn:aws:iam::123456789012:role/tfc-workload-identity"
  category     = "env"
  workspace_id = tfe_workspace.aws_dynamic.id
}

resource "tfe_variable" "aws_provider_auth" {
  key          = "TFC_AWS_PROVIDER_AUTH"
  value        = "true"
  category     = "env"
  workspace_id = tfe_workspace.aws_dynamic.id
}
```

## Troubleshooting

**"Error: Required variable not set"**: In remote mode, `terraform.tfvars` is not read. Set all variables in the workspace UI or API.

**Plan shows unexpected changes after switching modes**: Different environments may have slightly different provider behavior. Run a plan and review carefully after switching.

**Agent mode: "No agents available"**: Verify agents are running and connected to the correct pool. Check agent logs for connection issues.

**Local mode: "Error acquiring state lock"**: Another process may have the lock. Check for stale locks and use `terraform force-unlock` if necessary.

## Summary

Choosing the right execution mode comes down to two questions: Where does Terraform need to run to reach your infrastructure? And where should your credentials live? Use remote for standard cloud infrastructure, local for development and debugging, and agents for private infrastructure. You can switch modes as your needs change, and it is common to use different modes for different environments within the same organization.

For more on agent-based execution, see our guides on [configuring agent pools](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-agent-pools-in-hcp-terraform/view) and [setting up agents on Kubernetes](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-hcp-terraform-agent-on-kubernetes/view). For remote operations, check out [configuring remote operations in HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-remote-operations-in-hcp-terraform/view).
