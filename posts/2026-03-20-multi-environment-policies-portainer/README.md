# How to Set Up Multi-Environment Policies in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Policies, Environment, Access Control, Business Edition

Description: Configure consistent access control policies that apply across multiple environments simultaneously in Portainer Business Edition.

---

Setting up multi-environment policies in Portainer is a key management task for maintaining a well-organized and secure container infrastructure.

## Overview

Portainer provides rich tooling for managing environments at scale. Following best practices ensures your team can efficiently navigate and manage multiple environments.

## Step-by-Step Instructions

### Via the Portainer UI

1. Log in to Portainer as an administrator
2. Navigate to **Environments** (or the relevant section)
3. Find the target environment or create a new configuration
4. Apply the required settings
5. Save your changes

### Via the API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# List all environments

curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    tags = [t['Name'] for t in e.get('Tags', [])]
    group = e.get('GroupId', 0)
    print(f'  ID: {e[\"Id\"]}, Name: {e[\"Name\"]}, Group: {group}, Tags: {tags}')
"
```

## Installing the Portainer Agent (for Cloud K8s)

For EKS, AKS, and GKE environments, deploy the agent via Helm:

```bash
# Add the Portainer Helm repository
helm repo add portainer https://portainer.github.io/k8s/
helm repo update

# Install the Portainer Edge Agent
helm install portainer-agent portainer/portainer-agent \
  -n portainer \
  --create-namespace \
  --set env.edge.enabled=true \
  --set env.edge.id="<your-edge-id>" \
  --set env.edge.key="<your-edge-key>"
```

## Best Practices

- Use descriptive names for environments (include location and type)
- Apply consistent tags for filtering (e.g., `production`, `staging`)
- Group related environments together for bulk operations
- Review environment list quarterly and remove decommissioned environments

---

*Monitor all your environments from a single pane of glass with [OneUptime](https://oneuptime.com).*
