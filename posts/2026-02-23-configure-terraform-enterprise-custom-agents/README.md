# How to Configure Terraform Enterprise Custom Agents

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Agents, Custom Agents, Networking, DevOps

Description: Learn how to deploy and configure custom Terraform Enterprise agents for running Terraform operations in private networks, restricted environments, and custom execution contexts.

---

By default, Terraform Enterprise runs plan and apply operations on the TFE server itself. This works fine when TFE has direct network access to all the cloud APIs and internal services your Terraform code talks to. But in many enterprise environments, TFE cannot reach everything directly - private cloud accounts, on-premises infrastructure, segmented networks. That is where custom agents come in.

TFE agents are lightweight processes that register with your TFE instance and execute Terraform runs on behalf of workspaces. They run wherever you need them - inside a private VPC, behind a corporate firewall, or in a specific cloud account.

## How TFE Agents Work

The agent architecture is straightforward:

1. You create an **agent pool** in TFE and generate an agent token
2. You deploy one or more **agent processes** in your target network
3. Agents connect outbound to TFE (no inbound ports needed)
4. When a workspace assigned to that agent pool triggers a run, TFE routes it to an available agent
5. The agent executes the Terraform plan/apply and sends results back to TFE

The key advantage is that agents make outbound connections only. You do not need to open any firewall ports to TFE.

## Prerequisites

- Terraform Enterprise instance with admin access
- Network environment where you want to run agents
- Docker or a Kubernetes cluster for running agent containers
- Outbound HTTPS (443) access from the agent network to TFE

## Step 1: Create an Agent Pool

```bash
# Create an agent pool via the TFE API
curl -s \
  --header "Authorization: Bearer $TFE_ORG_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "https://tfe.example.com/api/v2/organizations/my-org/agent-pools" \
  --data '{
    "data": {
      "type": "agent-pools",
      "attributes": {
        "name": "private-network-agents",
        "organization-scoped": true
      }
    }
  }' | jq '.data.id'

# Save the agent pool ID - you will need it
AGENT_POOL_ID="apool-abc123xyz"
```

## Step 2: Generate an Agent Token

```bash
# Create an agent token for the pool
curl -s \
  --header "Authorization: Bearer $TFE_ORG_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "https://tfe.example.com/api/v2/agent-pools/${AGENT_POOL_ID}/authentication-tokens" \
  --data '{
    "data": {
      "type": "authentication-tokens",
      "attributes": {
        "description": "Production agent token"
      }
    }
  }' | jq -r '.data.attributes.token'

# Store this token securely - it is shown only once
# TFE_AGENT_TOKEN="your-agent-token-here"
```

## Step 3: Deploy Agents

### Docker Deployment

```bash
# Run a single agent with Docker
docker run -d \
  --name tfe-agent-1 \
  --restart unless-stopped \
  -e TFC_ADDRESS=https://tfe.example.com \
  -e TFC_AGENT_TOKEN="${TFE_AGENT_TOKEN}" \
  -e TFC_AGENT_NAME="agent-prod-1" \
  -e TFC_AGENT_LOG_LEVEL=info \
  hashicorp/tfc-agent:latest

# Run multiple agents for higher concurrency
for i in $(seq 1 5); do
  docker run -d \
    --name "tfe-agent-${i}" \
    --restart unless-stopped \
    -e TFC_ADDRESS=https://tfe.example.com \
    -e TFC_AGENT_TOKEN="${TFE_AGENT_TOKEN}" \
    -e TFC_AGENT_NAME="agent-prod-${i}" \
    -e TFC_AGENT_LOG_LEVEL=info \
    hashicorp/tfc-agent:latest
done
```

### Docker Compose Deployment

```yaml
# docker-compose.yml for TFE agents
version: "3.9"
services:
  agent-1:
    image: hashicorp/tfc-agent:latest
    restart: unless-stopped
    environment:
      TFC_ADDRESS: https://tfe.example.com
      TFC_AGENT_TOKEN: "${TFE_AGENT_TOKEN}"
      TFC_AGENT_NAME: agent-prod-1
      TFC_AGENT_LOG_LEVEL: info
      # Custom CA certificate for TFE
      TFC_AGENT_CUSTOM_CA_CERT_FILE: /etc/ssl/custom/ca.crt
      # Proxy configuration if needed
      # HTTPS_PROXY: http://proxy.internal:3128
      # NO_PROXY: "internal.example.com,10.0.0.0/8"
    volumes:
      - ./certs/ca.crt:/etc/ssl/custom/ca.crt:ro
      # Mount any tools the agent needs
      - ./tools:/opt/custom-tools:ro

  agent-2:
    image: hashicorp/tfc-agent:latest
    restart: unless-stopped
    environment:
      TFC_ADDRESS: https://tfe.example.com
      TFC_AGENT_TOKEN: "${TFE_AGENT_TOKEN}"
      TFC_AGENT_NAME: agent-prod-2
      TFC_AGENT_LOG_LEVEL: info
      TFC_AGENT_CUSTOM_CA_CERT_FILE: /etc/ssl/custom/ca.crt
    volumes:
      - ./certs/ca.crt:/etc/ssl/custom/ca.crt:ro
      - ./tools:/opt/custom-tools:ro
```

### Kubernetes Deployment

```yaml
# tfe-agents.yaml - Kubernetes deployment
apiVersion: v1
kind: Namespace
metadata:
  name: tfe-agents
---
apiVersion: v1
kind: Secret
metadata:
  name: tfe-agent-token
  namespace: tfe-agents
type: Opaque
stringData:
  token: "your-agent-token-here"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tfe-agent
  namespace: tfe-agents
spec:
  replicas: 5
  selector:
    matchLabels:
      app: tfe-agent
  template:
    metadata:
      labels:
        app: tfe-agent
    spec:
      serviceAccountName: tfe-agent
      containers:
        - name: tfe-agent
          image: hashicorp/tfc-agent:latest
          env:
            - name: TFC_ADDRESS
              value: "https://tfe.example.com"
            - name: TFC_AGENT_TOKEN
              valueFrom:
                secretKeyRef:
                  name: tfe-agent-token
                  key: token
            - name: TFC_AGENT_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: TFC_AGENT_LOG_LEVEL
              value: "info"
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
      # Add tolerations or node selectors if agents need
      # to run on specific nodes
      # nodeSelector:
      #   agent-role: tfe-agent
```

## Step 4: Build Custom Agent Images

Sometimes the default agent image does not have everything you need. Build a custom image with additional tools:

```dockerfile
# Dockerfile for custom TFE agent
FROM hashicorp/tfc-agent:latest

# Switch to root to install packages
USER root

# Install additional tools your Terraform code needs
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

# Install Azure CLI
RUN pip3 install azure-cli

# Install custom provider plugins for air-gapped use
COPY provider-mirror/ /opt/provider-mirror/

# Add custom CA certificates
COPY certs/internal-ca.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates

# Switch back to the agent user
USER tfc-agent

# Set custom environment variables
ENV TFC_AGENT_LOG_LEVEL=info
```

Build and deploy:

```bash
# Build the custom agent image
docker build -t registry.example.com/tfe-agent-custom:latest .

# Push to your internal registry
docker push registry.example.com/tfe-agent-custom:latest
```

## Step 5: Assign Workspaces to Agent Pools

```bash
# Assign a workspace to use the agent pool
WORKSPACE_ID="ws-abc123xyz"

curl -s \
  --header "Authorization: Bearer $TFE_ORG_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  "https://tfe.example.com/api/v2/workspaces/${WORKSPACE_ID}" \
  --data "{
    \"data\": {
      \"type\": \"workspaces\",
      \"attributes\": {
        \"execution-mode\": \"agent\",
        \"agent-pool-id\": \"${AGENT_POOL_ID}\"
      }
    }
  }"
```

## Monitoring Agent Health

```bash
# List agents in a pool and their status
curl -s \
  --header "Authorization: Bearer $TFE_ORG_TOKEN" \
  "https://tfe.example.com/api/v2/agent-pools/${AGENT_POOL_ID}/agents" | \
  jq '.data[] | {name: .attributes.name, status: .attributes.status, last_ping: .attributes["last-ping-at"]}'

# Check agent logs
docker logs tfe-agent-1 --tail 50

# Monitor agent container resources
docker stats tfe-agent-1 tfe-agent-2 tfe-agent-3 --no-stream
```

## Auto-Scaling Agents

For Kubernetes deployments, use the Horizontal Pod Autoscaler or KEDA:

```yaml
# KEDA ScaledObject for scaling agents based on TFE queue
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: tfe-agent-scaler
  namespace: tfe-agents
spec:
  scaleTargetRef:
    name: tfe-agent
  minReplicaCount: 2
  maxReplicaCount: 20
  pollingInterval: 30
  cooldownPeriod: 300
  triggers:
    - type: metrics-api
      metadata:
        targetValue: "1"
        url: "https://tfe.example.com/api/v2/agent-pools/apool-abc123xyz"
        valueLocation: "data.attributes.agent-count"
```

## Troubleshooting Agent Issues

**Agent shows as "idle" but runs are queued**: The workspace might not be assigned to the correct agent pool. Verify the workspace execution mode is set to "agent" and the pool ID matches.

**Agent cannot connect to TFE**: Check outbound HTTPS connectivity. Agents need to reach TFE on port 443. If behind a proxy, set the `HTTPS_PROXY` environment variable.

**Agent runs fail with provider errors**: The agent needs network access to whatever APIs the Terraform providers communicate with. For AWS, the agent needs access to AWS API endpoints.

**Custom CA certificate issues**: If TFE uses a private CA, pass the CA certificate to the agent via `TFC_AGENT_CUSTOM_CA_CERT_FILE`.

## Summary

Custom agents extend Terraform Enterprise's reach into networks and environments that TFE cannot access directly. The deployment is simple - create a pool, generate a token, and run the agent container wherever you need it. Agents only need outbound HTTPS access to TFE, which makes them firewall-friendly. For production deployments, run multiple agents per pool for redundancy, build custom images with the tools your Terraform code needs, and set up auto-scaling to handle variable workloads.
