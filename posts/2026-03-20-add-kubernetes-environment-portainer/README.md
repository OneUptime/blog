# How to Add a Kubernetes Environment to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Environment, kubeconfig, DevOps

Description: Connect a Kubernetes cluster to Portainer using the agent or kubeconfig for container orchestration management.

---

When connecting a Kubernetes environment to Portainer, you can install the Portainer Agent on the cluster, deploy the Portainer Edge Agent, or import an existing cluster from a kubeconfig file. The Agent and kubeconfig import paths are legacy options, and Portainer recommends the Edge Agent for most new deployments.

## Prerequisites

- Portainer running and accessible
- A working and up to date Kubernetes cluster
- If using the Portainer Agent: `kubectl` access and cluster-admin rights on the cluster
- If importing kubeconfig: a self-contained kubeconfig file with `current-context`; kubeconfig import requires Portainer Business Edition and a load balancer-enabled cluster

## Adding the Environment via the UI

1. Log in to Portainer as an administrator
2. Navigate to **Environments** in the left sidebar
3. Click **Add environment**
4. Select **Kubernetes** and click **Start Wizard**
5. Choose the connection method that matches your setup:
   - **Edge Agent Standard** or **Edge Agent Async** for new deployments
   - **Agent** to install the Portainer Agent on the cluster
   - **Import** to upload a kubeconfig file in Portainer Business Edition
6. Fill in the connection details and click **Connect**

## Using the API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Portainer's documented create-environment API examples cover Docker environments.
# For Kubernetes environments, use the UI workflow above, then verify the new
# environment via the API.

# List Kubernetes environments
curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    if e.get('Type') in (5, 6, 7):
        print(f'  ID: {e[\"Id\"]}, Name: {e[\"Name\"]}, Type: {e[\"Type\"]}, Status: {e.get(\"Status\", \"?\")}')
"
```

## Environment Types Reference

| Type | Value | Description |
|------|-------|-------------|
| Local Kubernetes | 5 | Local Kubernetes environment |
| Agent on Kubernetes | 6 | Portainer Agent deployed on a Kubernetes cluster |
| Edge Agent on Kubernetes | 7 | Portainer Edge Agent deployed on a Kubernetes cluster |

## Verify the Connection

After adding the environment, verify it shows as healthy:

```bash
# Check Kubernetes environment status
curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
status_map = {1: 'Up', 2: 'Down', 3: 'Provisioning', 4: 'Error'}
type_map = {5: 'Local Kubernetes', 6: 'Agent on Kubernetes', 7: 'Edge Agent on Kubernetes'}
envs = json.load(sys.stdin)
for e in envs:
    etype = e.get('Type')
    if etype in type_map:
        print(f'{e[\"Name\"]}: {type_map[etype]} - {status_map.get(e.get(\"Status\"), \"Unknown\")}')
"
```

---

*Monitor all your connected environments with [OneUptime](https://oneuptime.com) uptime monitoring.*
