# How to Add a Docker Swarm Environment to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Environment, Configuration, DevOps

Description: Connect an existing Docker Swarm cluster to Portainer for centralized management of Swarm services and stacks.

---

Adding environments to Portainer allows centralized management of containers across different infrastructure types. Each environment type has specific connection requirements.

## Prerequisites

- Portainer running and accessible
- Docker Swarm initialized and reachable from the Portainer server
- Access to a Swarm manager node
- If using the Agent, port `9001` reachable from Portainer
- If using the Docker API, remote Docker API access configured on the manager node

## Adding the Environment via the UI

1. Log in to Portainer as an administrator
2. Navigate to **Environments** in the left sidebar
3. Click **Add environment**
4. Select **Docker Swarm** and click **Start Wizard**
5. Choose **Agent**, **API**, or **Socket** (local only) as the connection method
6. Fill in the connection details for your chosen method
7. Click **Connect**

## Adding via API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Add a Docker Swarm environment via the Docker API on a Swarm manager

curl -X POST \
  https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --form "Name=my-swarm" \
  --form "URL=tcp://swarm-manager.example.com:2375" \
  --form "EndpointCreationType=1" \
  --insecure

# List all environments
curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    print(f'  ID: {e[\"Id\"]}, Name: {e[\"Name\"]}, Type: {e.get(\"Type\",\"?\")}')
"
```

## Endpoint Creation Types Reference

| Type | Value | Description |
|------|-------|-------------|
| Docker environment | 1 | Docker via API or local socket |
| Agent environment | 2 | Remote via Portainer Agent |
| Azure environment | 3 | Azure Container Instances |
| Edge Agent environment | 4 | Remote via Portainer Edge Agent |
| Local Kubernetes environment | 5 | Local Kubernetes environment |

## Verify the Connection

After adding the environment, verify it shows as online:

```bash
# Check environment status
curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    status = e.get('Status', 0)
    status_str = 'Online' if status == 1 else 'Offline'
    print(f'{e[\"Name\"]}: {status_str}')
"
```

---

*Monitor all your connected environments with [OneUptime](https://oneuptime.com) uptime monitoring.*
