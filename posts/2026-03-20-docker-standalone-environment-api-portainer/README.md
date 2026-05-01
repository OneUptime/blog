# How to Add a Docker Standalone Environment to Portainer via API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Environment, API, Remote

Description: Connect a remote Docker standalone host to Portainer using the Docker TCP API with optional TLS.

---

Adding environments to Portainer allows centralized management of containers across different infrastructure types. Each environment type has specific connection requirements.

## Prerequisites

- Portainer running and accessible
- Target environment accessible from the Portainer server
- Appropriate credentials or connection details

## Adding the Environment via the UI

1. Log in to Portainer as an administrator
2. Navigate to **Environments** in the left sidebar
3. Click **Add environment**
4. Select the appropriate environment type
5. Fill in the connection details
6. Click **Connect**

## Adding via API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Add environment via API

curl -X POST \
  https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --form "Name=my-environment" \
  --form "EndpointCreationType=1" \
  --form "URL=tcp://10.0.7.10:2375" \
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

## EndpointCreationType Reference

| Type | Value | Description |
|------|-------|-------------|
| Docker standalone | 1 | Docker environment via socket or TCP API |
| Agent | 2 | Remote via Portainer Agent |
| Azure ACI | 3 | Azure Container Instances |
| Edge agent | 4 | Remote via Portainer Edge Agent |
| Kubernetes (local) | 5 | Local Kubernetes environment |

## Verify the Connection

After adding the environment, verify it shows as healthy:

```bash
# Check environment status
curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    status = e.get('Status', 0)
    if status == 1:
        status_str = 'Online'
    elif status == 2:
        status_str = 'Offline'
    else:
        status_str = 'Unknown'
    print(f'{e[\"Name\"]}: {status_str}')
"
```

---

*Monitor all your connected environments with [OneUptime](https://oneuptime.com) uptime monitoring.*
