# How to Install and Use Terraform Cloud Agent on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Terraform, Cloud Agent, IaC, DevOps, Tutorial

Description: Complete guide to installing Terraform Cloud Agent for private infrastructure automation on Ubuntu.

---

Terraform Cloud Agents enable you to provision infrastructure in private networks that are isolated from the public internet. Instead of exposing your internal infrastructure to Terraform Cloud, agents run within your network and communicate outbound to Terraform Cloud, executing Terraform operations on your behalf. This guide walks you through everything you need to know to install, configure, and operate Terraform Cloud Agents on Ubuntu.

## Understanding Terraform Cloud Agents

Terraform Cloud Agents are lightweight processes that poll Terraform Cloud for work, execute Terraform runs locally, and report results back. They are essential when:

- **Private Infrastructure**: Your resources exist in private networks without public internet access
- **On-Premises Data Centers**: You need to manage infrastructure behind corporate firewalls
- **Compliance Requirements**: Security policies prohibit direct cloud-to-infrastructure connections
- **Hybrid Environments**: You manage a mix of cloud and on-premises resources

### How Agents Work

1. The agent establishes an outbound HTTPS connection to Terraform Cloud
2. Terraform Cloud queues runs for workspaces configured to use agent pools
3. The agent polls for available work and claims jobs
4. Terraform operations execute locally within your network
5. Results, logs, and state are transmitted back to Terraform Cloud

This architecture means you never need to expose internal network services or open inbound firewall rules.

## Prerequisites

Before installing Terraform Cloud Agent, ensure you have the following:

### System Requirements

```bash
# Check Ubuntu version (18.04 LTS or later recommended)
lsb_release -a

# Verify you have at least 2GB RAM and 2 CPU cores
free -h
nproc

# Ensure sufficient disk space (minimum 10GB recommended)
df -h /
```

### Terraform Cloud Requirements

- A Terraform Cloud account (Business or Enterprise tier for self-hosted agents)
- Organization admin or owner permissions
- Access to create agent pools and generate tokens

### Network Requirements

The agent requires outbound HTTPS (port 443) access to:
- `app.terraform.io` (or your Terraform Enterprise hostname)
- `registry.terraform.io` (for provider downloads)
- Any provider-specific endpoints (AWS, Azure, GCP APIs, etc.)

```bash
# Test connectivity to Terraform Cloud
curl -I https://app.terraform.io
# Expected: HTTP/2 200 or similar success response

# Test connectivity to the Terraform registry
curl -I https://registry.terraform.io
# Expected: HTTP/2 200 or similar success response
```

## Installing Terraform CLI

While not strictly required for running the agent, having Terraform CLI installed helps with debugging and local testing.

```bash
# Update package index
sudo apt-get update

# Install required dependencies
sudo apt-get install -y gnupg software-properties-common curl

# Add HashiCorp GPG key
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Verify the key fingerprint
gpg --no-default-keyring --keyring /usr/share/keyrings/hashicorp-archive-keyring.gpg --fingerprint

# Add the official HashiCorp repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

# Update and install Terraform
sudo apt-get update
sudo apt-get install -y terraform

# Verify installation
terraform version
# Output: Terraform v1.x.x
```

## Agent Pool Setup in Terraform Cloud

Before installing the agent, you need to create an agent pool in Terraform Cloud.

### Step 1: Navigate to Agent Pools

1. Log in to Terraform Cloud at https://app.terraform.io
2. Select your organization
3. Go to **Settings** > **Agents**
4. Click **Create agent pool**

### Step 2: Configure the Agent Pool

```
Pool Name: production-agents
Description: Agents for production infrastructure in private datacenter
```

### Step 3: Generate Agent Token

After creating the pool:

1. Click on your newly created agent pool
2. Navigate to the **Tokens** tab
3. Click **Create token**
4. Provide a description (e.g., "Ubuntu Agent 1")
5. Copy and securely store the token - it will only be displayed once

```bash
# Store the token securely (example using environment variable)
# NEVER commit tokens to version control
export TFC_AGENT_TOKEN="your-agent-token-here"

# For production, store in a secrets manager or secure file
echo "TFC_AGENT_TOKEN=your-agent-token-here" | sudo tee /etc/tfc-agent.env
sudo chmod 600 /etc/tfc-agent.env
```

## Installing tfc-agent

### Method 1: Download Binary Directly

```bash
# Create directory for the agent
sudo mkdir -p /opt/tfc-agent

# Download the latest agent release
# Check https://releases.hashicorp.com/tfc-agent/ for the latest version
TFC_AGENT_VERSION="1.15.0"

curl -o /tmp/tfc-agent.zip \
  "https://releases.hashicorp.com/tfc-agent/${TFC_AGENT_VERSION}/tfc-agent_${TFC_AGENT_VERSION}_linux_amd64.zip"

# Install unzip if not present
sudo apt-get install -y unzip

# Extract the agent binary
sudo unzip /tmp/tfc-agent.zip -d /opt/tfc-agent

# Verify the binary exists
ls -la /opt/tfc-agent/
# Should show: tfc-agent and tfc-agent-core

# Make binaries executable
sudo chmod +x /opt/tfc-agent/tfc-agent
sudo chmod +x /opt/tfc-agent/tfc-agent-core

# Verify agent version
/opt/tfc-agent/tfc-agent --version
```

### Method 2: Using HashiCorp Repository

```bash
# If you added the HashiCorp repository earlier, you can install via apt
sudo apt-get update
sudo apt-get install -y tfc-agent

# The agent will be installed to /usr/bin/tfc-agent
tfc-agent --version
```

### Running the Agent Manually (Testing)

```bash
# Set the agent token
export TFC_AGENT_TOKEN="your-agent-token-here"

# Optional: Set a custom agent name
export TFC_AGENT_NAME="ubuntu-agent-01"

# Run the agent in foreground (for testing)
/opt/tfc-agent/tfc-agent

# The agent will output:
# [INFO] Starting tfc-agent version X.X.X
# [INFO] Agent registered with Terraform Cloud
# [INFO] Waiting for work...
```

Press Ctrl+C to stop the test run.

## Running as a systemd Service

For production deployments, run the agent as a systemd service for automatic startup, restart on failure, and proper logging.

### Create a Dedicated User

```bash
# Create a system user for the agent (no login shell, no home directory)
sudo useradd --system --shell /usr/sbin/nologin tfc-agent

# Create working directory for the agent
sudo mkdir -p /var/lib/tfc-agent
sudo chown tfc-agent:tfc-agent /var/lib/tfc-agent

# Create log directory
sudo mkdir -p /var/log/tfc-agent
sudo chown tfc-agent:tfc-agent /var/log/tfc-agent
```

### Create Environment File

```bash
# Create secure environment file for the agent token
sudo tee /etc/tfc-agent.env << 'EOF'
# Terraform Cloud Agent Configuration
# This token authenticates the agent with Terraform Cloud
TFC_AGENT_TOKEN=your-agent-token-here

# Optional: Custom agent name for identification in Terraform Cloud UI
TFC_AGENT_NAME=ubuntu-prod-agent-01

# Optional: Set log level (trace, debug, info, warn, error)
TFC_AGENT_LOG_LEVEL=info

# Optional: Custom data directory
TFC_AGENT_DATA_DIR=/var/lib/tfc-agent

# Optional: Disable automatic updates (recommended for production)
TFC_AGENT_AUTO_UPDATE=disabled
EOF

# Secure the environment file
sudo chmod 600 /etc/tfc-agent.env
sudo chown root:root /etc/tfc-agent.env
```

### Create systemd Service Unit

```bash
# Create the systemd service file
sudo tee /etc/systemd/system/tfc-agent.service << 'EOF'
[Unit]
# Service description for systemd
Description=Terraform Cloud Agent
Documentation=https://developer.hashicorp.com/terraform/cloud-docs/agents

# Start after network is available
After=network-online.target
Wants=network-online.target

[Service]
# Run as dedicated user for security
User=tfc-agent
Group=tfc-agent

# Load environment variables from secure file
EnvironmentFile=/etc/tfc-agent.env

# Agent binary location
ExecStart=/opt/tfc-agent/tfc-agent

# Restart policy - always restart on failure
Restart=on-failure
RestartSec=5

# Stop timeout - allow time for graceful shutdown
TimeoutStopSec=30

# Security hardening options
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes

# Allow write access to data and log directories
ReadWritePaths=/var/lib/tfc-agent /var/log/tfc-agent

# Limit resources (adjust based on your workloads)
MemoryMax=2G
CPUQuota=200%

[Install]
# Enable service to start on boot
WantedBy=multi-user.target
EOF
```

### Enable and Start the Service

```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable tfc-agent

# Start the agent service
sudo systemctl start tfc-agent

# Check service status
sudo systemctl status tfc-agent

# View agent logs
sudo journalctl -u tfc-agent -f
# Press Ctrl+C to exit log view
```

### Managing the Service

```bash
# Stop the agent
sudo systemctl stop tfc-agent

# Restart the agent (e.g., after config changes)
sudo systemctl restart tfc-agent

# View recent logs
sudo journalctl -u tfc-agent --since "1 hour ago"

# View logs with specific priority
sudo journalctl -u tfc-agent -p err
```

## Docker Deployment

Running the agent in Docker provides isolation and simplifies deployment across multiple hosts.

### Basic Docker Run

```bash
# Pull the official HashiCorp agent image
docker pull hashicorp/tfc-agent:latest

# Run the agent with environment variable for token
docker run -d \
  --name tfc-agent \
  --restart=unless-stopped \
  -e TFC_AGENT_TOKEN="your-agent-token-here" \
  -e TFC_AGENT_NAME="docker-agent-01" \
  hashicorp/tfc-agent:latest

# Check container status
docker ps | grep tfc-agent

# View container logs
docker logs -f tfc-agent
```

### Docker Compose Deployment

Create a `docker-compose.yml` file for easier management:

```bash
# Create directory for Docker deployment
mkdir -p /opt/tfc-agent-docker
cd /opt/tfc-agent-docker

# Create docker-compose.yml
cat << 'EOF' > docker-compose.yml
# Terraform Cloud Agent Docker Compose Configuration
version: '3.8'

services:
  tfc-agent:
    # Use official HashiCorp image
    image: hashicorp/tfc-agent:latest
    container_name: tfc-agent

    # Restart policy for production
    restart: unless-stopped

    # Environment configuration
    environment:
      # Agent token (use secrets in production)
      - TFC_AGENT_TOKEN=${TFC_AGENT_TOKEN}
      # Custom agent name
      - TFC_AGENT_NAME=docker-agent-01
      # Log level
      - TFC_AGENT_LOG_LEVEL=info
      # Disable auto-updates in container
      - TFC_AGENT_AUTO_UPDATE=disabled

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

    # Health check
    healthcheck:
      test: ["CMD", "pgrep", "-f", "tfc-agent"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

    # Logging configuration
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"
EOF

# Create .env file for secrets
cat << 'EOF' > .env
# Store your agent token here (not in docker-compose.yml)
TFC_AGENT_TOKEN=your-agent-token-here
EOF

# Secure the .env file
chmod 600 .env
```

### Start with Docker Compose

```bash
# Start the agent
docker compose up -d

# View logs
docker compose logs -f

# Stop the agent
docker compose down

# Restart the agent
docker compose restart
```

### Custom Docker Image with Additional Tools

If your Terraform configurations require additional tools, create a custom image:

```bash
# Create Dockerfile
cat << 'EOF' > Dockerfile
# Custom Terraform Cloud Agent image with additional tools
FROM hashicorp/tfc-agent:latest

# Switch to root to install packages
USER root

# Install additional tools your Terraform configs might need
RUN apk add --no-cache \
    aws-cli \
    jq \
    curl \
    git \
    openssh-client \
    python3 \
    py3-pip

# Install additional Python packages if needed
RUN pip3 install --no-cache-dir \
    boto3 \
    azure-cli

# Create directory for custom scripts
RUN mkdir -p /opt/scripts
COPY scripts/ /opt/scripts/
RUN chmod +x /opt/scripts/*

# Switch back to non-root user
USER tfc-agent

# Default command
ENTRYPOINT ["/usr/bin/tfc-agent"]
EOF

# Build custom image
docker build -t my-tfc-agent:latest .

# Update docker-compose.yml to use custom image
# Change: image: hashicorp/tfc-agent:latest
# To: image: my-tfc-agent:latest
```

## Multiple Agents

Running multiple agents provides high availability and parallel run capacity.

### Multiple systemd Services

```bash
# Create configuration for second agent
sudo cp /etc/tfc-agent.env /etc/tfc-agent-02.env

# Edit the second agent configuration
sudo tee /etc/tfc-agent-02.env << 'EOF'
TFC_AGENT_TOKEN=your-agent-token-here
TFC_AGENT_NAME=ubuntu-prod-agent-02
TFC_AGENT_LOG_LEVEL=info
TFC_AGENT_DATA_DIR=/var/lib/tfc-agent-02
TFC_AGENT_AUTO_UPDATE=disabled
EOF

sudo chmod 600 /etc/tfc-agent-02.env

# Create data directory for second agent
sudo mkdir -p /var/lib/tfc-agent-02
sudo chown tfc-agent:tfc-agent /var/lib/tfc-agent-02

# Create service file for second agent
sudo cp /etc/systemd/system/tfc-agent.service /etc/systemd/system/tfc-agent-02.service

# Edit the service file to use the new environment file
sudo sed -i 's/tfc-agent.env/tfc-agent-02.env/g' /etc/systemd/system/tfc-agent-02.service
sudo sed -i 's/tfc-agent-02/tfc-agent-02/g' /etc/systemd/system/tfc-agent-02.service

# Enable and start second agent
sudo systemctl daemon-reload
sudo systemctl enable tfc-agent-02
sudo systemctl start tfc-agent-02

# Verify both agents are running
sudo systemctl status tfc-agent tfc-agent-02
```

### Multiple Docker Agents with Compose

```yaml
# docker-compose-multi.yml
version: '3.8'

services:
  tfc-agent-01:
    image: hashicorp/tfc-agent:latest
    container_name: tfc-agent-01
    restart: unless-stopped
    environment:
      - TFC_AGENT_TOKEN=${TFC_AGENT_TOKEN}
      - TFC_AGENT_NAME=docker-agent-01
      - TFC_AGENT_LOG_LEVEL=info
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  tfc-agent-02:
    image: hashicorp/tfc-agent:latest
    container_name: tfc-agent-02
    restart: unless-stopped
    environment:
      - TFC_AGENT_TOKEN=${TFC_AGENT_TOKEN}
      - TFC_AGENT_NAME=docker-agent-02
      - TFC_AGENT_LOG_LEVEL=info
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  tfc-agent-03:
    image: hashicorp/tfc-agent:latest
    container_name: tfc-agent-03
    restart: unless-stopped
    environment:
      - TFC_AGENT_TOKEN=${TFC_AGENT_TOKEN}
      - TFC_AGENT_NAME=docker-agent-03
      - TFC_AGENT_LOG_LEVEL=info
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

```bash
# Start all agents
docker compose -f docker-compose-multi.yml up -d

# Scale agents dynamically (using Docker Compose scale)
docker compose -f docker-compose-multi.yml up -d --scale tfc-agent-01=3
```

### Agent Capacity Planning

Consider these factors when determining the number of agents:

- **Concurrent runs**: Each agent handles one run at a time
- **Run duration**: Longer runs require more agents for throughput
- **Peak times**: Plan deployments often cluster during business hours
- **Redundancy**: Run at least 2 agents for high availability

## Agent Tokens Management

Proper token management is critical for security and operations.

### Token Types and Scopes

```bash
# Agent pool tokens - used by agents to authenticate
# Organization-scoped, can be used by any agent in the pool
# Create via UI: Settings > Agents > [Pool Name] > Tokens

# Best practices:
# 1. Create separate tokens for each agent or agent group
# 2. Use descriptive names including date and purpose
# 3. Rotate tokens periodically (every 90 days recommended)
# 4. Revoke tokens immediately if compromised
```

### Rotating Agent Tokens

```bash
# Step 1: Create new token in Terraform Cloud UI

# Step 2: Update the agent configuration with new token
sudo tee /etc/tfc-agent.env.new << EOF
TFC_AGENT_TOKEN=new-agent-token-here
TFC_AGENT_NAME=ubuntu-prod-agent-01
TFC_AGENT_LOG_LEVEL=info
TFC_AGENT_DATA_DIR=/var/lib/tfc-agent
TFC_AGENT_AUTO_UPDATE=disabled
EOF

# Step 3: Replace old config and restart
sudo mv /etc/tfc-agent.env.new /etc/tfc-agent.env
sudo chmod 600 /etc/tfc-agent.env
sudo systemctl restart tfc-agent

# Step 4: Verify agent reconnected
sudo journalctl -u tfc-agent --since "1 minute ago"

# Step 5: Revoke old token in Terraform Cloud UI
```

### Secure Token Storage Options

```bash
# Option 1: Environment file (basic)
# Already covered above with /etc/tfc-agent.env

# Option 2: HashiCorp Vault integration
# Install Vault agent and use template for token injection
cat << 'EOF' > /etc/vault-agent/tfc-agent.ctmpl
{{ with secret "secret/data/terraform/agent-token" }}
TFC_AGENT_TOKEN={{ .Data.data.token }}
{{ end }}
TFC_AGENT_NAME=ubuntu-prod-agent-01
EOF

# Option 3: AWS Secrets Manager (if running on AWS)
# Use IAM roles and fetch token at startup
cat << 'EOF' > /opt/tfc-agent/fetch-token.sh
#!/bin/bash
# Fetch agent token from AWS Secrets Manager
TOKEN=$(aws secretsmanager get-secret-value \
  --secret-id terraform/agent-token \
  --query SecretString \
  --output text | jq -r '.token')

export TFC_AGENT_TOKEN="$TOKEN"
exec /opt/tfc-agent/tfc-agent
EOF

chmod +x /opt/tfc-agent/fetch-token.sh
```

## Workspace Configuration

Configure workspaces to use your agent pool for runs.

### Via Terraform Cloud UI

1. Navigate to your workspace
2. Go to **Settings** > **General**
3. Under **Execution Mode**, select **Agent**
4. Choose your agent pool from the dropdown
5. Click **Save settings**

### Via Terraform Configuration

```hcl
# Configure workspace to use agent pool via Terraform
# This requires the tfe provider

terraform {
  required_providers {
    tfe = {
      source  = "hashicorp/tfe"
      version = "~> 0.51"
    }
  }
}

provider "tfe" {
  # Token can be set via TFE_TOKEN environment variable
  # or explicitly here (not recommended for production)
}

# Reference existing agent pool
data "tfe_agent_pool" "production" {
  name         = "production-agents"
  organization = "my-organization"
}

# Create workspace configured to use agents
resource "tfe_workspace" "private_infrastructure" {
  name         = "private-infrastructure"
  organization = "my-organization"
  description  = "Workspace for private datacenter resources"

  # Configure to use agent execution mode
  execution_mode = "agent"
  agent_pool_id  = data.tfe_agent_pool.production.id

  # Workspace settings
  auto_apply        = false
  terraform_version = "1.6.0"
  working_directory = "infrastructure/production"

  # VCS settings (optional)
  vcs_repo {
    identifier     = "my-org/infrastructure-repo"
    branch         = "main"
    oauth_token_id = var.oauth_token_id
  }
}

# Output the workspace ID for reference
output "workspace_id" {
  value = tfe_workspace.private_infrastructure.id
}
```

### Agent Pool Permissions

```hcl
# Grant team access to agent pool
resource "tfe_team" "infrastructure" {
  name         = "infrastructure-team"
  organization = "my-organization"
}

# Allow team to use the agent pool for their workspaces
resource "tfe_agent_pool_allowed_workspaces" "production" {
  agent_pool_id         = data.tfe_agent_pool.production.id
  allowed_workspace_ids = [
    tfe_workspace.private_infrastructure.id,
    # Add more workspace IDs as needed
  ]
}
```

## Networking Requirements

Understanding network requirements ensures reliable agent operation.

### Outbound Connections Required

```bash
# Create a script to test all required endpoints
cat << 'EOF' > /tmp/test-connectivity.sh
#!/bin/bash
# Test connectivity to Terraform Cloud endpoints

echo "Testing Terraform Cloud API..."
curl -s -o /dev/null -w "%{http_code}" https://app.terraform.io/api/v2/ping
echo ""

echo "Testing Terraform Registry..."
curl -s -o /dev/null -w "%{http_code}" https://registry.terraform.io/.well-known/terraform.json
echo ""

echo "Testing HashiCorp releases..."
curl -s -o /dev/null -w "%{http_code}" https://releases.hashicorp.com/index.json
echo ""

# Test common provider endpoints
echo "Testing AWS API..."
curl -s -o /dev/null -w "%{http_code}" https://sts.amazonaws.com
echo ""

echo "Testing Azure API..."
curl -s -o /dev/null -w "%{http_code}" https://management.azure.com
echo ""

echo "Testing Google Cloud API..."
curl -s -o /dev/null -w "%{http_code}" https://cloudresourcemanager.googleapis.com
echo ""
EOF

chmod +x /tmp/test-connectivity.sh
/tmp/test-connectivity.sh
```

### Firewall Rules

```bash
# UFW firewall rules (Ubuntu default firewall)
# Allow outbound HTTPS
sudo ufw allow out 443/tcp comment "HTTPS for Terraform Cloud"

# If using specific proxy
# Configure proxy for the agent
export HTTPS_PROXY="http://proxy.company.com:8080"
export HTTP_PROXY="http://proxy.company.com:8080"
export NO_PROXY="localhost,127.0.0.1,.internal.company.com"
```

### Proxy Configuration

```bash
# Add proxy settings to agent environment file
sudo tee -a /etc/tfc-agent.env << 'EOF'

# Proxy configuration
HTTPS_PROXY=http://proxy.company.com:8080
HTTP_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,.internal.company.com
EOF

# Restart agent to apply proxy settings
sudo systemctl restart tfc-agent
```

### DNS Requirements

```bash
# Verify DNS resolution for required endpoints
for host in app.terraform.io registry.terraform.io releases.hashicorp.com; do
  echo "Resolving $host:"
  dig +short $host
  echo ""
done

# If using internal DNS, ensure these hosts resolve correctly
# Add to /etc/hosts if needed (not recommended for production)
# 1.2.3.4 app.terraform.io
```

## Troubleshooting

Common issues and their solutions when running Terraform Cloud Agents.

### Agent Not Appearing in Terraform Cloud

```bash
# Check if agent is running
sudo systemctl status tfc-agent

# View agent logs for errors
sudo journalctl -u tfc-agent --since "10 minutes ago" -n 100

# Common causes:
# 1. Invalid token - verify token is correct and not expired
# 2. Network issues - test connectivity to app.terraform.io
# 3. DNS problems - verify DNS resolution

# Test token validity
curl -H "Authorization: Bearer $TFC_AGENT_TOKEN" \
  https://app.terraform.io/api/v2/ping

# Check for token issues in logs
sudo journalctl -u tfc-agent | grep -i "token\|auth\|401\|403"
```

### Agent Disconnecting Frequently

```bash
# Check system resources
top -bn1 | head -20
free -h
df -h

# Check for memory pressure
dmesg | grep -i "out of memory\|oom"

# Increase memory limit if needed
sudo sed -i 's/MemoryMax=2G/MemoryMax=4G/' /etc/systemd/system/tfc-agent.service
sudo systemctl daemon-reload
sudo systemctl restart tfc-agent

# Check network stability
ping -c 10 app.terraform.io

# Monitor agent connection
sudo journalctl -u tfc-agent -f | grep -i "connect\|disconnect\|error"
```

### Terraform Runs Failing

```bash
# Check if agent can download providers
/opt/tfc-agent/tfc-agent --version

# Test provider download manually
terraform init -backend=false -input=false

# Common issues:
# 1. Missing tools - install required binaries
# 2. Permission issues - check tfc-agent user permissions
# 3. Provider authentication - verify cloud credentials

# For AWS workloads, test AWS CLI
aws sts get-caller-identity

# For Azure workloads, test Azure CLI
az account show

# Check agent disk space (providers can be large)
df -h /var/lib/tfc-agent
```

### Agent Running But Not Picking Up Jobs

```bash
# Verify workspace is configured to use agents
# Check in UI: Workspace > Settings > General > Execution Mode

# Verify agent pool assignment matches
# The workspace must be assigned to the same pool as your agent

# Check agent capacity (might be busy with other runs)
# View in UI: Settings > Agents > [Pool] > Agents tab

# Force agent to reconnect
sudo systemctl restart tfc-agent
```

### Debug Mode for Detailed Logs

```bash
# Enable debug logging temporarily
sudo systemctl stop tfc-agent

# Run manually with debug logging
sudo -u tfc-agent TFC_AGENT_TOKEN="$TFC_AGENT_TOKEN" \
  TFC_AGENT_LOG_LEVEL=debug \
  /opt/tfc-agent/tfc-agent

# Or update environment file for persistent debug logging
sudo sed -i 's/TFC_AGENT_LOG_LEVEL=info/TFC_AGENT_LOG_LEVEL=debug/' /etc/tfc-agent.env
sudo systemctl start tfc-agent

# Remember to disable debug logging after troubleshooting
# Debug logs can be verbose and consume disk space
```

### Checking Agent Health

```bash
# Create a health check script
cat << 'EOF' > /opt/tfc-agent/health-check.sh
#!/bin/bash
# Health check script for Terraform Cloud Agent

# Check if process is running
if ! pgrep -f "tfc-agent" > /dev/null; then
    echo "CRITICAL: tfc-agent process not running"
    exit 2
fi

# Check systemd service status
if ! systemctl is-active --quiet tfc-agent; then
    echo "WARNING: tfc-agent service not active"
    exit 1
fi

# Check connectivity to Terraform Cloud
if ! curl -s -o /dev/null -w "%{http_code}" https://app.terraform.io/api/v2/ping | grep -q "200\|204"; then
    echo "WARNING: Cannot reach Terraform Cloud API"
    exit 1
fi

# Check disk space (warn if less than 1GB free)
AVAILABLE=$(df /var/lib/tfc-agent --output=avail -B1 | tail -1)
if [ "$AVAILABLE" -lt 1073741824 ]; then
    echo "WARNING: Low disk space for agent data directory"
    exit 1
fi

echo "OK: tfc-agent is healthy"
exit 0
EOF

chmod +x /opt/tfc-agent/health-check.sh

# Run health check
/opt/tfc-agent/health-check.sh
```

---

## Summary

Terraform Cloud Agents provide a secure way to manage private infrastructure while leveraging Terraform Cloud's powerful features. Key takeaways:

- **Agents communicate outbound** - no inbound firewall rules required
- **Run as systemd services** for production deployments with automatic restart
- **Use Docker** for containerized deployments and easy scaling
- **Deploy multiple agents** for high availability and parallel capacity
- **Manage tokens securely** and rotate them regularly
- **Monitor agent health** and connectivity to ensure reliable operations

With your agents configured and running, you can now manage private infrastructure through Terraform Cloud while maintaining the security of your internal networks.

---

## Monitor Your Terraform Infrastructure with OneUptime

Once your Terraform Cloud Agents are running and provisioning infrastructure, you need visibility into the health and performance of both the agents and the resources they manage. **OneUptime** provides comprehensive monitoring for your entire infrastructure stack:

- **Agent Health Monitoring**: Track agent uptime, connectivity, and job execution status
- **Infrastructure Monitoring**: Monitor the resources provisioned by Terraform - servers, databases, load balancers, and more
- **Custom Dashboards**: Visualize Terraform run metrics alongside infrastructure health
- **Alerting and Incident Management**: Get notified immediately when agents disconnect or infrastructure issues arise
- **Status Pages**: Keep your team informed about infrastructure status with customizable status pages

With OneUptime's open-source observability platform, you can ensure your Terraform automation pipeline and the infrastructure it manages remain healthy and performant. Visit [oneuptime.com](https://oneuptime.com) to get started with comprehensive infrastructure monitoring today.
