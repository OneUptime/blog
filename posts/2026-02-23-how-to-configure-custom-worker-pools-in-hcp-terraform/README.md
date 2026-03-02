# How to Configure Custom Worker Pools in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Agent Pools, Worker, Self-Hosted Agents

Description: Set up custom worker pools (agent pools) in HCP Terraform to run Terraform operations on your own infrastructure for private network access.

---

By default, HCP Terraform runs your Terraform plans and applies on HashiCorp-managed infrastructure. But what if your resources live behind a firewall, in a private VPC, or on a network that HCP Terraform cannot reach? Custom worker pools - officially called agent pools - let you run Terraform operations on your own infrastructure while still using HCP Terraform for state management, variable storage, and the UI.

## Why You Need Custom Workers

The standard HCP Terraform execution environment works great when your cloud providers are accessible over the internet with API keys. But several scenarios require custom workers:

- Resources in private networks without public endpoints
- On-premises infrastructure managed through private APIs
- Providers that need local binaries or tools installed
- Compliance requirements that mandate execution in specific regions or networks
- Access to internal services like private DNS, certificate authorities, or secret stores

## How Agent Pools Work

An agent pool is a group of agents (workers) that you run on your own infrastructure. When a workspace is configured to use an agent pool, HCP Terraform sends the Terraform operation to one of the agents in the pool instead of running it on its own infrastructure.

The agent connects outbound to HCP Terraform - it does not require any inbound network access. This makes it firewall-friendly.

```
[Your Network]
  Agent 1 ----outbound----> HCP Terraform
  Agent 2 ----outbound----> HCP Terraform
  Agent 3 ----outbound----> HCP Terraform

  Agent receives job, runs terraform plan/apply locally,
  sends results back to HCP Terraform
```

## Creating an Agent Pool

### Step 1: Create the Pool

```bash
# Create an agent pool in your organization
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "agent-pools",
      "attributes": {
        "name": "private-network-pool",
        "organization-scoped": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/agent-pools"
```

### Step 2: Generate an Agent Token

```bash
# Create an authentication token for the agent pool
POOL_ID="apool-abc123"

curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "authentication-tokens",
      "attributes": {
        "description": "Production agent token"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/agent-pools/$POOL_ID/authentication-tokens" | \
  jq -r '.data.attributes.token'
```

Save this token securely - you will need it to start the agent.

### Step 3: Install and Run the Agent

The HCP Terraform agent is a standalone binary. Install it on a machine in your private network:

```bash
# Download the agent (Linux amd64)
curl -o tfc-agent.zip \
  "https://releases.hashicorp.com/tfc-agent/1.15.0/tfc-agent_1.15.0_linux_amd64.zip"
unzip tfc-agent.zip

# Set the required environment variables
export TFC_AGENT_TOKEN="your-agent-token-from-step-2"
export TFC_AGENT_NAME="agent-prod-01"

# Start the agent
./tfc-agent
```

The agent connects to HCP Terraform and registers itself in the pool. It then waits for jobs.

## Running the Agent as a Service

For production use, run the agent as a systemd service:

```ini
# /etc/systemd/system/tfc-agent.service
[Unit]
Description=HCP Terraform Agent
After=network.target

[Service]
Type=simple
User=tfc-agent
Group=tfc-agent
ExecStart=/usr/local/bin/tfc-agent
Restart=always
RestartSec=5

# Agent configuration via environment
Environment=TFC_AGENT_TOKEN=your-agent-token
Environment=TFC_AGENT_NAME=agent-prod-01
Environment=TFC_AGENT_LOG_LEVEL=info

# Security hardening
NoNewPrivileges=yes
ProtectSystem=full
ProtectHome=yes

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable tfc-agent
sudo systemctl start tfc-agent

# Check status
sudo systemctl status tfc-agent
```

## Running the Agent in Docker

For containerized environments:

```dockerfile
# Dockerfile for HCP Terraform agent
FROM hashicorp/tfc-agent:latest

# Install additional tools your Terraform configs might need
USER root
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install any required CLI tools
RUN pip3 install awscli

USER tfc-agent
```

```bash
# Run the agent container
docker run -d \
  --name tfc-agent \
  --restart always \
  -e TFC_AGENT_TOKEN="your-agent-token" \
  -e TFC_AGENT_NAME="docker-agent-01" \
  hashicorp/tfc-agent:latest
```

## Running the Agent on Kubernetes

For Kubernetes deployments, use a Deployment:

```yaml
# tfc-agent-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tfc-agent
  namespace: terraform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tfc-agent
  template:
    metadata:
      labels:
        app: tfc-agent
    spec:
      containers:
        - name: tfc-agent
          image: hashicorp/tfc-agent:latest
          env:
            - name: TFC_AGENT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: tfc-agent-secret
                  key: token
            - name: TFC_AGENT_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
```

```bash
# Create the secret
kubectl create namespace terraform
kubectl -n terraform create secret generic tfc-agent-secret \
  --from-literal=token="your-agent-token"

# Deploy the agents
kubectl apply -f tfc-agent-deployment.yaml
```

## Assigning Workspaces to Agent Pools

Configure a workspace to use your agent pool instead of HCP Terraform's default workers:

```bash
# Set workspace to use a specific agent pool
curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "execution-mode": "agent",
        "agent-pool-id": "apool-abc123"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces/private-infra"
```

The key settings are `"execution-mode": "agent"` and providing the `agent-pool-id`.

## Scaling Agent Pools

Run multiple agents in a pool for redundancy and throughput:

```bash
# Each agent registers independently with the same pool token
# Agent 1
TFC_AGENT_TOKEN="pool-token" TFC_AGENT_NAME="agent-01" ./tfc-agent &

# Agent 2
TFC_AGENT_TOKEN="pool-token" TFC_AGENT_NAME="agent-02" ./tfc-agent &

# Agent 3
TFC_AGENT_TOKEN="pool-token" TFC_AGENT_NAME="agent-03" ./tfc-agent &
```

HCP Terraform distributes jobs across available agents. If one agent is busy, the next job goes to an idle agent.

## Monitoring Agent Health

Check agent status through the API:

```bash
# List agents in a pool
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/agent-pools/$POOL_ID/agents" | \
  jq '.data[] | {
    name: .attributes.name,
    status: .attributes.status,
    ip: .attributes["ip-address"],
    last_ping: .attributes["last-ping-at"]
  }'
```

Agent statuses include:
- `idle` - Connected and waiting for work
- `busy` - Currently executing a job
- `unknown` - Has not pinged recently (may be down)

## Scoping Agent Pools

Control which workspaces can use a specific agent pool:

```bash
# Restrict an agent pool to specific workspaces
curl -s \
  --request PATCH \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "agent-pools",
      "attributes": {
        "organization-scoped": false
      },
      "relationships": {
        "allowed-workspaces": {
          "data": [
            {"type": "workspaces", "id": "ws-abc123"},
            {"type": "workspaces", "id": "ws-def456"}
          ]
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/agent-pools/$POOL_ID"
```

## Best Practices

- Run at least two agents per pool for redundancy
- Use separate pools for production and non-production workloads
- Monitor agent health and set up alerts for agents going offline
- Keep agent versions current - they update independently of Terraform
- Install only the tools your Terraform configurations actually need
- Secure agent tokens like any other credential

## Summary

Custom worker pools bridge the gap between HCP Terraform's managed service and your private infrastructure. Deploy agents wherever your Terraform operations need to run - private networks, specific cloud regions, or machines with specialized tooling. The agents handle the heavy lifting while HCP Terraform manages state, variables, and the workflow UI. Start with a single agent to test, then scale out as your workload demands.
