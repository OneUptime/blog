# How to Connect Portainer to an Azure AKS Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, AKS, Kubernetes, Cloud

Description: Add an Azure Kubernetes Service cluster to Portainer using the Helm-based agent deployment for centralized K8s management.

---

How to Connect Portainer to an Azure AKS Cluster in Portainer is a key management task for maintaining a well-organized and secure container infrastructure.

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

For EKS, AKS, and GKE environments, deploy the agent by applying the official YAML manifest published by Portainer:

```bash
# Standard agent (LoadBalancer) - Portainer Server reaches the agent over the public LB
kubectl apply -n portainer \
  -f https://downloads.portainer.io/ce-lts/portainer-agent-k8s-lb.yaml

# Or use NodePort if you do not want a cloud LoadBalancer
# kubectl apply -n portainer \
#   -f https://downloads.portainer.io/ce-lts/portainer-agent-k8s-nodeport.yaml
```

For an Edge Agent (recommended when Portainer Server cannot reach the cluster directly), first create an Edge environment in Portainer to obtain the `EDGE_ID` and `EDGE_KEY`, then:

```bash
curl -L https://downloads.portainer.io/ce-lts/portainer-agent-edge-k8s.yaml \
  -o portainer-agent-edge-k8s.yaml

# Edit the manifest and set EDGE_ID and EDGE_KEY in the portainer-agent-edge ConfigMap/Secret
kubectl apply -f portainer-agent-edge-k8s.yaml
```

## Best Practices

- Use descriptive names for environments (include location and type)
- Apply consistent tags for filtering (e.g., , )
- Group related environments together for bulk operations
- Review environment list quarterly and remove decommissioned environments

---

*Monitor all your environments from a single pane of glass with [OneUptime](https://oneuptime.com).*
