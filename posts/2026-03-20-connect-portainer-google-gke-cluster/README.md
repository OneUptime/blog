# How to Connect Portainer to a Google GKE Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Google Cloud, GKE, Kubernetes, Cloud

Description: Connect a Google Kubernetes Engine cluster to Portainer via the agent for unified container management across cloud providers.

---

How to Connect Portainer to a Google GKE Cluster in Portainer is a key management task for maintaining a well-organized and secure container infrastructure.

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

For EKS, AKS, and GKE environments, deploy the standard Portainer Agent using the official YAML manifest. Match the manifest version to your Portainer Server version (replace `2-21` with the major.minor of your install):

```bash
# Create the namespace and apply the Load Balancer agent manifest (CE)
kubectl create namespace portainer
kubectl apply -n portainer \
  -f https://downloads.portainer.io/ce2-21/portainer-agent-k8s-lb.yaml
```

This deploys the agent and exposes it via a cloud Load Balancer on port 9001. On GKE this provisions an external TCP Load Balancer automatically. Once the service has an external IP, add the environment in the Portainer Server UI under **Environments → Add environment → Kubernetes → Agent**, using the Load Balancer IP and port 9001.

If you prefer a node-port deployment instead of a Load Balancer, use `portainer-agent-k8s-nodeport.yaml` from the same path.

## Best Practices

- Use descriptive names for environments (include location and type)
- Apply consistent tags for filtering (e.g., `env:prod`, `region:us-central1`)
- Group related environments together for bulk operations
- Review environment list quarterly and remove decommissioned environments

---

*Monitor all your environments from a single pane of glass with [OneUptime](https://oneuptime.com).*
