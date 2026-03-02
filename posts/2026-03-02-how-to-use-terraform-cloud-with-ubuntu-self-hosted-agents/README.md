# How to Use Terraform Cloud with Ubuntu Self-Hosted Agents

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Terraform, CI/CD, Infrastructure as Code, DevOps

Description: Learn how to set up Terraform Cloud agent pools on Ubuntu so your Terraform runs can access private networks and on-premises infrastructure without exposing internal services.

---

Terraform Cloud runs Terraform operations in its hosted environment by default. But when your infrastructure lives in a private network - on-premises servers, a private cloud, or an internal Kubernetes cluster - the Terraform Cloud runners cannot reach it. Terraform Cloud agents solve this: you run an agent process on a machine inside your private network, and Terraform Cloud routes plan and apply operations through that agent.

## How Agents Work

The agent is a persistent process that establishes an outbound connection to Terraform Cloud. When a workspace triggers a plan or apply, Terraform Cloud sends the job to an available agent in the pool. The agent downloads the Terraform configuration, runs `terraform plan` or `terraform apply` locally, and streams results back to Terraform Cloud.

Key points:
- The connection is outbound only from the agent - no inbound firewall rules needed
- The agent needs network access to your private infrastructure
- Multiple agents can share a pool for concurrency
- Agents authenticate to Terraform Cloud with a token

## Prerequisites

- Terraform Cloud account (Business tier or higher - agents require a paid plan)
- Ubuntu 20.04 or 22.04 for the agent host
- The agent host needs network access to your private infrastructure
- Outbound HTTPS access from the agent host to Terraform Cloud

## Step 1: Create an Agent Pool in Terraform Cloud

1. Log into Terraform Cloud at `https://app.terraform.io`
2. Navigate to your organization settings
3. Click **Agent Pools** under the **Security** section
4. Click **Create agent pool**
5. Name it (e.g., `on-prem-agents` or `private-network-pool`)
6. Click **Create agent pool and token**
7. Copy the generated agent token - you will not see it again

## Step 2: Install the Terraform Cloud Agent on Ubuntu

```bash
# Download the agent
AGENT_VERSION="1.15.0"
wget "https://releases.hashicorp.com/tfc-agent/${AGENT_VERSION}/tfc-agent_${AGENT_VERSION}_linux_amd64.zip"

# Install
unzip "tfc-agent_${AGENT_VERSION}_linux_amd64.zip"
sudo install -m 755 tfc-agent /usr/local/bin/
sudo install -m 755 tfc-agent-core /usr/local/bin/

# Verify
tfc-agent --version
```

## Step 3: Configure the Agent

Store the agent token securely. The simplest approach is an environment file that the systemd service loads:

```bash
sudo mkdir -p /etc/tfc-agent
sudo chmod 700 /etc/tfc-agent

# Create the configuration
sudo tee /etc/tfc-agent/config.env << 'EOF'
# Terraform Cloud token for agent pool authentication
TFC_AGENT_TOKEN=your-agent-token-here

# Optional: give this agent a unique name for identification in the UI
TFC_AGENT_NAME=ubuntu-agent-01

# Optional: agent logs (info, debug, trace)
TFC_AGENT_LOG_LEVEL=info

# Optional: working directory for Terraform operations
# TFC_AGENT_CACHE_DIR=/var/lib/tfc-agent/cache

# Optional: limit concurrent jobs (default is 1)
# TFC_AGENT_SINGLE=true

# Optional: automatically re-register if token changes
# TFC_AGENT_AUTO_UPDATE=minor
EOF

sudo chmod 600 /etc/tfc-agent/config.env
```

## Step 4: Create a Systemd Service

```bash
# Create a dedicated user for the agent
sudo useradd --system --home /var/lib/tfc-agent --shell /bin/false tfc-agent
sudo mkdir -p /var/lib/tfc-agent
sudo chown tfc-agent:tfc-agent /var/lib/tfc-agent

# Create the service
sudo tee /etc/systemd/system/tfc-agent.service << 'EOF'
[Unit]
Description=Terraform Cloud Agent
Documentation=https://developer.hashicorp.com/terraform/cloud-docs/agents
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=tfc-agent
Group=tfc-agent

# Load agent token and settings
EnvironmentFile=/etc/tfc-agent/config.env

# Run the agent
ExecStart=/usr/local/bin/tfc-agent

# Restart on failure
Restart=on-failure
RestartSec=10

# Allow Terraform to run as this user
# The agent needs to call terraform, kubectl, etc.
NoNewPrivileges=false

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tfc-agent
sudo systemctl start tfc-agent

# Verify it connected
sudo systemctl status tfc-agent
sudo journalctl -u tfc-agent -f
```

## Step 5: Configure the Workspace to Use the Agent Pool

In Terraform Cloud:

1. Go to your workspace's **Settings > General**
2. Under **Execution Mode**, select **Agent**
3. Select your agent pool from the dropdown
4. Save settings

Now plans and applies for this workspace will route through your agent.

## Installing Provider Dependencies on the Agent

Terraform providers are downloaded and cached on the agent. Make sure the agent has internet access for provider downloads, or configure a network mirror.

For Terraform operations that need specific tools, install them on the agent host:

```bash
# kubectl for Kubernetes providers
sudo snap install kubectl --classic

# helm for Helm provider
sudo snap install helm --classic

# AWS CLI for testing
sudo snap install aws-cli --classic

# Ansible (if using Terraform + Ansible together)
sudo apt-get install -y ansible

# Install any custom binaries the tfc-agent user needs
# The agent runs as the tfc-agent user, so ensure binaries are in a standard PATH
```

## Configuring Agent Credentials

The agent runs Terraform, which needs credentials to reach your infrastructure. Configure them as environment variables in the systemd service or as workspace variables in Terraform Cloud.

### Option 1: Environment Variables in the Systemd Unit

```bash
# Add credentials to the environment file
sudo tee -a /etc/tfc-agent/config.env << 'EOF'
# AWS credentials for the private cloud
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_DEFAULT_REGION=us-east-1

# Kubernetes config (if needed)
KUBECONFIG=/etc/tfc-agent/.kube/config

# VMware credentials (for vSphere provider)
VSPHERE_USER=terraform@vsphere.local
VSPHERE_PASSWORD=your-vsphere-password
VSPHERE_SERVER=vcenter.internal
EOF

sudo chmod 600 /etc/tfc-agent/config.env
sudo systemctl restart tfc-agent
```

### Option 2: Workspace Variables in Terraform Cloud

In the workspace **Variables** section, add sensitive environment variables marked as "Sensitive". These are injected at runtime and not visible to users with read access.

## Running Multiple Agents for Concurrency

For multiple concurrent Terraform runs, run multiple agents. The simplest approach is multiple systemd services:

```bash
# Copy the service file for a second agent
sudo cp /etc/systemd/system/tfc-agent.service \
       /etc/systemd/system/tfc-agent-02.service

# Edit the second service to use a different name
sudo sed -i 's/ubuntu-agent-01/ubuntu-agent-02/' \
  /etc/tfc-agent/config.env  # This approach requires per-agent configs

# A cleaner approach: use systemd template units
sudo mv /etc/systemd/system/tfc-agent.service \
        /etc/systemd/system/tfc-agent@.service

# Each instance gets its own config file
sudo mkdir /etc/tfc-agent
sudo tee /etc/tfc-agent/agent1.env << 'EOF'
TFC_AGENT_TOKEN=your-token
TFC_AGENT_NAME=ubuntu-agent-01
EOF

sudo tee /etc/tfc-agent/agent2.env << 'EOF'
TFC_AGENT_TOKEN=your-token
TFC_AGENT_NAME=ubuntu-agent-02
EOF

# Update the template unit to use instance-specific config
sudo sed -i 's|EnvironmentFile=.*|EnvironmentFile=/etc/tfc-agent/agent%i.env|' \
  /etc/systemd/system/tfc-agent@.service

# Start both instances
sudo systemctl enable --now tfc-agent@1
sudo systemctl enable --now tfc-agent@2
```

## Agent Networking Requirements

The agent needs outbound HTTPS access to:

- `app.terraform.io:443` - Terraform Cloud API
- `registry.terraform.io:443` - Provider registry
- `releases.hashicorp.com:443` - Provider downloads
- Any endpoints your infrastructure providers need (AWS, Azure, GCP, vSphere, etc.)

Check connectivity from the agent host:

```bash
# Test Terraform Cloud connectivity
curl -v https://app.terraform.io/api/v2/ping

# Test provider registry
curl -v https://registry.terraform.io/v1/providers/hashicorp/aws

# Check DNS resolution
dig app.terraform.io
```

## Monitoring Agent Health

```bash
# Check service status
sudo systemctl status tfc-agent

# Tail logs
sudo journalctl -u tfc-agent --since "1 hour ago"

# In Terraform Cloud UI: Settings > Agent Pools > [your pool]
# Shows each agent's status: idle, busy, or offline
```

## Updating the Agent

```bash
# Download new version
NEW_VERSION="1.16.0"
wget "https://releases.hashicorp.com/tfc-agent/${NEW_VERSION}/tfc-agent_${NEW_VERSION}_linux_amd64.zip"
unzip "tfc-agent_${NEW_VERSION}_linux_amd64.zip"

# Replace the binary
sudo systemctl stop tfc-agent
sudo install -m 755 tfc-agent /usr/local/bin/
sudo install -m 755 tfc-agent-core /usr/local/bin/
sudo systemctl start tfc-agent
```

## Troubleshooting

**Agent shows as offline in Terraform Cloud:**
```bash
# Check outbound connectivity
curl https://app.terraform.io/api/v2/ping
# Should return {"status":"ok"}

# Verify the token is correct
journalctl -u tfc-agent | grep -i "error\|token\|auth"
```

**Terraform plan fails with "no agents available":**
- Check at least one agent in the pool shows as idle
- Verify the workspace is configured to use the correct pool
- Check the agent process is running: `systemctl status tfc-agent`

**Provider downloads fail on the agent:**
```bash
# Check network access to provider registry
curl https://registry.terraform.io/v1/providers/hashicorp/aws

# If behind a proxy, configure it in the environment file
http_proxy=http://proxy.internal:3128
https_proxy=http://proxy.internal:3128
no_proxy=localhost,127.0.0.1,.internal
```

Terraform Cloud agents bridge the gap between SaaS-managed CI/CD and private infrastructure. Once the agent is stable and running as a systemd service, it essentially disappears into the background - workspaces route through it automatically, and the Terraform Cloud UI provides full visibility into plan and apply runs.
