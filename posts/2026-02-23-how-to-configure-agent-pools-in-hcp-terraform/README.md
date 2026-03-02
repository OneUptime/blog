# How to Configure Agent Pools in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Terraform Cloud, Agent Pools, Agent, Private Infrastructure, Networking

Description: Learn how to configure and manage agent pools in HCP Terraform to run Terraform operations inside your private network securely.

---

When your infrastructure lives behind firewalls, VPNs, or private networks, the default remote execution in HCP Terraform cannot reach it. That is where agent pools come in. Agents are lightweight processes that run inside your network and execute Terraform operations on behalf of HCP Terraform, giving you the benefits of remote state management and collaboration without exposing your private infrastructure to the internet.

This guide walks you through configuring agent pools, registering agents, and managing them effectively.

## How Agents Work

The architecture is straightforward:

1. You create an agent pool in HCP Terraform
2. You run one or more agent processes inside your private network
3. Agents poll HCP Terraform for work (outbound connection only - no inbound firewall rules needed)
4. When a run is queued on a workspace that uses your agent pool, an available agent picks it up
5. The agent executes the Terraform plan/apply locally and streams results back to HCP Terraform

The important thing to understand is that agents initiate all connections outbound. Your network only needs to allow HTTPS traffic to `app.terraform.io` on port 443. No inbound firewall rules or port forwarding required.

## Prerequisites

- An HCP Terraform organization on the **Business** tier (agents are not available on free or Teams plans)
- A machine inside your private network where you can run the agent
- Outbound HTTPS access from that machine to `app.terraform.io`

## Creating an Agent Pool

### Through the UI

1. Navigate to your organization in HCP Terraform
2. Go to **Settings** > **Agents**
3. Click **Create Agent Pool**
4. Give it a descriptive name (e.g., `production-datacenter` or `aws-private-vpc`)
5. Click **Create Agent Pool**

### Through the API

```bash
# Create an agent pool
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "agent-pools",
      "attributes": {
        "name": "production-datacenter",
        "organization-scoped": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/${TFC_ORG}/agent-pools"
```

### Using the TFE Provider

```hcl
# Create an agent pool with Terraform
resource "tfe_agent_pool" "production" {
  name         = "production-datacenter"
  organization = "your-org"

  # Make this pool available to all workspaces in the org
  organization_scoped = true
}

# Output the pool ID for workspace configuration
output "agent_pool_id" {
  value = tfe_agent_pool.production.id
}
```

## Generating Agent Tokens

Each agent needs a token to authenticate with HCP Terraform. You can create multiple tokens per pool for different agents or environments:

### Through the UI

1. Go to **Settings** > **Agents**
2. Click on your agent pool
3. Click **Create Token**
4. Give the token a description (e.g., `agent-vm-01`)
5. Copy and save the token - it will not be shown again

### Through the API

```bash
# Generate an agent token
AGENT_POOL_ID="apool-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "authentication-tokens",
      "attributes": {
        "description": "agent-vm-01-token"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/agent-pools/${AGENT_POOL_ID}/authentication-tokens"
```

### Using Terraform

```hcl
# Create an agent token
resource "tfe_agent_token" "production_agent_01" {
  agent_pool_id = tfe_agent_pool.production.id
  description   = "Production Agent VM 01"
}

# Output the token (sensitive)
output "agent_token" {
  value     = tfe_agent_token.production_agent_01.token
  sensitive = true
}
```

## Running an Agent

### Docker (Recommended)

The easiest way to run an agent is with Docker:

```bash
# Run the agent in Docker
docker run -d \
  --name tfc-agent \
  --restart always \
  -e TFC_AGENT_TOKEN="your-agent-token" \
  -e TFC_AGENT_NAME="agent-docker-01" \
  hashicorp/tfc-agent:latest
```

With additional configuration:

```bash
# Run with resource limits and custom configuration
docker run -d \
  --name tfc-agent \
  --restart always \
  --memory 2g \
  --cpus 2 \
  -e TFC_AGENT_TOKEN="your-agent-token" \
  -e TFC_AGENT_NAME="agent-docker-01" \
  -e TFC_AGENT_LOG_LEVEL="info" \
  -e TFC_AGENT_SINGLE="false" \
  -v /opt/agent-data:/agent-data \
  hashicorp/tfc-agent:latest
```

### Docker Compose

For a more maintainable setup:

```yaml
# docker-compose.yml
version: "3.8"

services:
  tfc-agent:
    image: hashicorp/tfc-agent:latest
    restart: always
    environment:
      TFC_AGENT_TOKEN: "${TFC_AGENT_TOKEN}"
      TFC_AGENT_NAME: "agent-compose-01"
      TFC_AGENT_LOG_LEVEL: "info"
      TFC_AGENT_SINGLE: "false"
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
    volumes:
      - agent-data:/agent-data

volumes:
  agent-data:
```

### Running as a Systemd Service

For bare-metal or VM deployments:

```bash
# Download the agent binary
curl -o /usr/local/bin/tfc-agent \
  https://releases.hashicorp.com/tfc-agent/1.15.0/tfc-agent_1.15.0_linux_amd64.zip

# Unzip and make executable
unzip /usr/local/bin/tfc-agent -d /usr/local/bin/
chmod +x /usr/local/bin/tfc-agent
```

Create the systemd service file:

```ini
# /etc/systemd/system/tfc-agent.service
[Unit]
Description=HCP Terraform Agent
After=network.target

[Service]
Type=simple
User=tfc-agent
Group=tfc-agent
Environment=TFC_AGENT_TOKEN=your-agent-token
Environment=TFC_AGENT_NAME=agent-vm-01
Environment=TFC_AGENT_LOG_LEVEL=info
ExecStart=/usr/local/bin/tfc-agent
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable tfc-agent
sudo systemctl start tfc-agent

# Check the status
sudo systemctl status tfc-agent
```

## Assigning Workspaces to Agent Pools

Once your agent pool is set up with running agents, assign workspaces to use it:

```hcl
# Configure a workspace to use an agent pool
resource "tfe_workspace" "private_infra" {
  name           = "private-infrastructure"
  organization   = "your-org"
  execution_mode = "agent"
  agent_pool_id  = tfe_agent_pool.production.id
}
```

Through the API:

```bash
# Update a workspace to use an agent pool
WORKSPACE_ID="ws-xxxxxxxxxxxxxxxx"
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

## Scoping Agent Pools

By default, an agent pool is organization-scoped, meaning any workspace can use it. You can restrict pools to specific workspaces for better isolation:

```hcl
# Create a scoped agent pool (not organization-wide)
resource "tfe_agent_pool" "payment_systems" {
  name                = "payment-systems"
  organization        = "your-org"
  organization_scoped = false
}

# Allow specific workspaces to use this pool
resource "tfe_agent_pool_allowed_workspaces" "payment_workspaces" {
  agent_pool_id         = tfe_agent_pool.payment_systems.id
  allowed_workspace_ids = [
    tfe_workspace.payment_api.id,
    tfe_workspace.payment_database.id,
  ]
}
```

## Scaling Agent Pools

For high-throughput environments, run multiple agents in the same pool:

```yaml
# docker-compose.yml - Multiple agents
version: "3.8"

services:
  tfc-agent-1:
    image: hashicorp/tfc-agent:latest
    restart: always
    environment:
      TFC_AGENT_TOKEN: "${TFC_AGENT_TOKEN}"
      TFC_AGENT_NAME: "agent-01"

  tfc-agent-2:
    image: hashicorp/tfc-agent:latest
    restart: always
    environment:
      TFC_AGENT_TOKEN: "${TFC_AGENT_TOKEN}"
      TFC_AGENT_NAME: "agent-02"

  tfc-agent-3:
    image: hashicorp/tfc-agent:latest
    restart: always
    environment:
      TFC_AGENT_TOKEN: "${TFC_AGENT_TOKEN}"
      TFC_AGENT_NAME: "agent-03"
```

Each agent in a pool handles one run at a time. Three agents means three concurrent runs. Scale the number of agents based on your workload.

## Monitoring Agent Status

Check agent health through the API:

```bash
# List agents in a pool
AGENT_POOL_ID="apool-xxxxxxxxxxxxxxxx"

curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/agent-pools/${AGENT_POOL_ID}/agents" \
  | jq '.data[] | {name: .attributes.name, status: .attributes.status, last_ping: .attributes["last-ping-at"]}'
```

## Troubleshooting

**Agent not connecting**: Verify outbound HTTPS access to `app.terraform.io:443`. Check for proxy settings if you are behind a corporate proxy.

**Runs stuck in "pending"**: Either no agents are running in the pool, or all agents are busy. Check agent status and consider scaling up.

**Permission denied during runs**: The agent process needs access to the same credentials your Terraform configuration requires (cloud provider credentials, API keys, etc.). Set these as environment variables on the agent machine or in workspace variables.

## Summary

Agent pools give you the best of both worlds - centralized state and run management through HCP Terraform, with the ability to reach private infrastructure that is not accessible from the internet. Start with a single agent per pool and scale as your run volume grows. For Kubernetes-based deployments, check out our guide on [setting up HCP Terraform agents on Kubernetes](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-hcp-terraform-agent-on-kubernetes/view).
