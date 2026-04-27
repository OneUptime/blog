# How to Organize Environments with Groups in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Environment, Group, Organization, DevOps

Description: Use environment groups in Portainer to logically organize and manage multiple environments by site, team, or purpose.

---

How to Organize Environments with Groups in Portainer in Portainer is a key management task for maintaining a well-organized and secure container infrastructure.

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
    tag_ids = e.get('TagIds', [])
    group = e.get('GroupId', 0)
    print(f'  ID: {e[\"Id\"]}, Name: {e[\"Name\"]}, Group: {group}, TagIds: {tag_ids}')
"
```

## Installing the Portainer Agent (for Cloud K8s)

For EKS, AKS, and GKE environments, deploy the agent by applying the official manifest with `kubectl` (Helm charts for agent-only deployments are not yet available):

```bash
# LoadBalancer variant (most cloud Kubernetes clusters)
kubectl apply -n portainer -f https://downloads.portainer.io/ce-lts/portainer-agent-k8s-lb.yaml

# NodePort variant (clusters without a load balancer)
kubectl apply -n portainer -f https://downloads.portainer.io/ce-lts/portainer-agent-k8s-nodeport.yaml

# Verify the agent is running
kubectl get pods --namespace=portainer
```

## Best Practices

- Use descriptive names for environments (include location and type)
- Apply consistent tags for filtering (e.g., , )
- Group related environments together for bulk operations
- Review environment list quarterly and remove decommissioned environments

---

*Monitor all your environments from a single pane of glass with [OneUptime](https://oneuptime.com).*
