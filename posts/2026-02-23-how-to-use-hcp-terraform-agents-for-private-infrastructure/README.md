# How to Use HCP Terraform Agents for Private Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Agents, Private Infrastructure, Networking, Security

Description: Learn how to deploy and use HCP Terraform agents to manage infrastructure behind firewalls, VPNs, and private networks without opening inbound ports.

---

One of the biggest challenges with remote Terraform execution is reaching infrastructure that sits behind firewalls or inside private networks. If your databases, internal services, or cloud resources are not reachable from the public internet, HCP Terraform's default remote execution mode simply cannot work. That is the problem HCP Terraform agents solve.

Agents run inside your network and handle Terraform operations locally while still reporting back to HCP Terraform for state management, policy enforcement, and collaboration. This guide covers the practical aspects of deploying agents for private infrastructure management.

## Why You Need Agents

Consider these common scenarios where agents are necessary:

- Your cloud resources are in a private VPC with no public endpoints
- You manage on-premises servers behind a corporate firewall
- Your Terraform providers need to connect to internal APIs
- Compliance requirements prevent sending credentials to a third-party service
- You need to access private container registries or artifact repositories during runs

In all these cases, the Terraform process needs to run from a network location that has direct access to your private resources.

## Architecture Overview

The agent architecture is based on a pull model:

```text
HCP Terraform (Cloud)
        |
        | (HTTPS - outbound only)
        |
   [Agent Process]  <-- Runs inside your private network
        |
        | (Direct access)
        |
   [Private Infrastructure]
   - Private VPCs
   - On-prem servers
   - Internal APIs
   - Private registries
```

Key architectural properties:

- Agents only make outbound HTTPS connections to HCP Terraform
- No inbound firewall rules needed
- Agents receive work by polling, so there is no webhook or callback configuration
- Credentials for private resources stay within your network
- Multiple agents can share a single agent pool for high availability

## Setting Up the Agent Environment

### Network Requirements

Your agent host needs:

- Outbound HTTPS (port 443) access to `app.terraform.io`
- DNS resolution for your Terraform providers and any registry endpoints
- Network access to all resources managed by the workspaces assigned to the agent pool

If you are behind a proxy:

```bash
# Configure proxy settings for the agent
export HTTPS_PROXY="http://proxy.internal:8080"
export HTTP_PROXY="http://proxy.internal:8080"
export NO_PROXY="internal.company.com,10.0.0.0/8"
```

### Credential Management

One of the main benefits of agents is that credentials never leave your network. Set them up on the agent host:

```bash
# Option 1: Environment variables on the host
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-1"

# Option 2: Use instance profiles (AWS)
# If the agent runs on an EC2 instance, attach an IAM role
# No explicit credentials needed - the AWS provider picks them up automatically

# Option 3: Use managed identity (Azure)
# If the agent runs on an Azure VM, enable managed identity
# The AzureRM provider detects it automatically
```

The recommended approach is to use cloud-native identity mechanisms (IAM roles, managed identities, workload identity) rather than static credentials whenever possible.

### Installing Required Tooling

Your agent environment needs any tools that your Terraform configurations depend on:

```bash
# Install common tools the agent might need
# Terraform itself is handled by the agent, but other tools may be needed

# Install cloud CLIs if your provisioners use them
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install kubectl if you manage Kubernetes resources
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Ansible if you use local-exec provisioners with it
pip3 install ansible
```

## Building a Custom Agent Image

For consistency across agents, build a custom Docker image:

```dockerfile
# Dockerfile for a custom agent image
FROM hashicorp/tfc-agent:latest

# Switch to root for installing packages
USER root

# Install additional tools needed by your Terraform configs
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    jq \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl

# Install any Python packages your configs need
RUN pip3 install boto3 requests

# Switch back to the agent user
USER tfc-agent

# The agent binary is the default entrypoint
```

Build and run it:

```bash
# Build the custom image
docker build -t my-org/tfc-agent:latest .

# Run the custom agent
docker run -d \
  --name tfc-agent \
  --restart always \
  -e TFC_AGENT_TOKEN="your-agent-token" \
  -e TFC_AGENT_NAME="custom-agent-01" \
  -e AWS_DEFAULT_REGION="us-east-1" \
  my-org/tfc-agent:latest
```

## Agent Hooks

Agents support lifecycle hooks that let you run scripts before and after Terraform operations:

```bash
# Create the hooks directory structure
mkdir -p /opt/tfc-agent/hooks

# pre-plan hook - runs before terraform plan
cat > /opt/tfc-agent/hooks/pre-plan << 'EOF'
#!/bin/bash
# Refresh cloud credentials from Vault before planning
export VAULT_ADDR="https://vault.internal:8200"
eval $(vault kv get -format=json secret/terraform/aws | jq -r '.data.data | to_entries[] | "export \(.key)=\(.value)"')
echo "Credentials refreshed from Vault"
EOF

# pre-apply hook - runs before terraform apply
cat > /opt/tfc-agent/hooks/pre-apply << 'EOF'
#!/bin/bash
# Notify Slack before applying changes
curl -s -X POST "$SLACK_WEBHOOK_URL" \
  -d "{\"text\": \"Terraform apply starting for workspace: ${TFC_WORKSPACE_NAME}\"}"
EOF

chmod +x /opt/tfc-agent/hooks/*
```

Run the agent with hooks enabled:

```bash
docker run -d \
  --name tfc-agent \
  --restart always \
  -e TFC_AGENT_TOKEN="your-agent-token" \
  -e TFC_AGENT_NAME="agent-with-hooks" \
  -v /opt/tfc-agent/hooks:/etc/tfc-agent/hooks:ro \
  hashicorp/tfc-agent:latest
```

## Multi-Environment Agent Deployments

For organizations with multiple isolated environments, deploy separate agent pools:

```hcl
# Agent pools per environment
resource "tfe_agent_pool" "development" {
  name         = "development-network"
  organization = "your-org"
}

resource "tfe_agent_pool" "staging" {
  name         = "staging-network"
  organization = "your-org"
}

resource "tfe_agent_pool" "production" {
  name         = "production-network"
  organization = "your-org"
  # Restrict production pool to specific workspaces
  organization_scoped = false
}

# Production workspaces use the production agent pool
resource "tfe_workspace" "prod_database" {
  name           = "production-database"
  organization   = "your-org"
  execution_mode = "agent"
  agent_pool_id  = tfe_agent_pool.production.id
}

# Development workspaces use the development agent pool
resource "tfe_workspace" "dev_database" {
  name           = "development-database"
  organization   = "your-org"
  execution_mode = "agent"
  agent_pool_id  = tfe_agent_pool.development.id
}
```

This ensures that production credentials are only available to agents in the production network, and development credentials stay in the development network.

## High Availability Considerations

For production workloads, you need agent redundancy:

```yaml
# docker-compose.yml - HA agent deployment
version: "3.8"

services:
  agent-primary:
    image: my-org/tfc-agent:latest
    restart: always
    environment:
      TFC_AGENT_TOKEN: "${TFC_AGENT_TOKEN}"
      TFC_AGENT_NAME: "prod-agent-primary"
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "4.0"
    healthcheck:
      test: ["CMD", "pgrep", "-f", "tfc-agent"]
      interval: 30s
      timeout: 10s
      retries: 3

  agent-secondary:
    image: my-org/tfc-agent:latest
    restart: always
    environment:
      TFC_AGENT_TOKEN: "${TFC_AGENT_TOKEN}"
      TFC_AGENT_NAME: "prod-agent-secondary"
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: "4.0"
    healthcheck:
      test: ["CMD", "pgrep", "-f", "tfc-agent"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Each agent processes one run at a time. With two agents, you get failover and the ability to handle two concurrent runs.

## Security Best Practices

### Isolate Agent Hosts

Run agents on dedicated hosts, not on machines that serve other purposes. This limits the blast radius if an agent is compromised.

### Rotate Agent Tokens

Create new tokens periodically and deactivate old ones:

```bash
# List existing tokens for an agent pool
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/agent-pools/apool-xxx/authentication-tokens"

# Delete an old token
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --request DELETE \
  "https://app.terraform.io/api/v2/authentication-tokens/at-old-token-id"
```

### Limit Network Access

Configure network policies so agents can only reach the resources they need - not your entire network.

### Monitor Agent Activity

Set up logging and monitoring for your agent processes:

```bash
# Run agent with JSON logging for better log ingestion
docker run -d \
  --name tfc-agent \
  -e TFC_AGENT_TOKEN="your-agent-token" \
  -e TFC_AGENT_LOG_LEVEL="info" \
  -e TFC_AGENT_LOG_JSON="true" \
  --log-driver=json-file \
  --log-opt max-size=50m \
  --log-opt max-file=3 \
  hashicorp/tfc-agent:latest
```

## Summary

HCP Terraform agents bridge the gap between cloud-hosted Terraform management and private infrastructure. The key decisions you need to make are: where to run agents (Docker, VMs, Kubernetes), how many per pool (based on concurrent run needs), and how to manage credentials (prefer cloud-native identity over static keys). Start with a simple deployment and add complexity as needed.

For deploying agents on Kubernetes, see our guide on [setting up HCP Terraform agents on Kubernetes](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-hcp-terraform-agent-on-kubernetes/view). For agent pool configuration details, check out [configuring agent pools in HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-agent-pools-in-hcp-terraform/view).
