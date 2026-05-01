# How to Add a Docker Standalone Environment to Portainer via Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Environment, Socket, Configuration

Description: Add a local Docker standalone environment to Portainer using the Docker socket for direct host management.

---

Adding environments to Portainer allows centralized management of containers across different infrastructure types. For Docker socket connections, Portainer must be running on the same host and have access to the Docker socket.

## Prerequisites

- Portainer running and accessible
- Portainer Server started with the Docker socket bind-mounted, for example `-v /var/run/docker.sock:/var/run/docker.sock`
- The user running Portainer has permission to access the Docker socket
- Administrator access to Portainer

## Adding the Environment via the UI

1. Log in to Portainer as an administrator
2. Expand **Environment-related**, then click **Environments**
3. Click **Add environment**
4. Select **Docker Standalone** and click **Start Wizard**
5. Under **More options**, select **Socket** and choose your platform
6. Enter a name, and if needed enable **Override default socket path** and provide the socket path
7. Ensure the required Docker socket bind mount shown by Portainer is present on the Portainer Server container
8. Click **Connect**

## Adding via API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Add environment via API

curl -X POST \
  https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -F "Name=my-environment" \
  -F "EndpointCreationType=1" \
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

## Environment Types Reference

| Type | Value | Description |
|------|-------|-------------|
| Local Docker environment | 1 | Docker via the local socket by default, or via TCP when `URL` is provided |
| Agent environment | 2 | Remote via Portainer Agent |
| Azure environment | 3 | Azure Container Instances |
| Edge agent environment | 4 | Remote via Portainer Edge Agent |
| Local Kubernetes environment | 5 | Local Kubernetes environment |

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
    status = e.get('Status')
    if status == 1:
        status_str = 'Online'
    elif status == 2:
        status_str = 'Offline'
    else:
        status_str = f'Unknown ({status})'
    print(f'{e[\"Name\"]}: {status_str}')
"
```

---

*Monitor all your connected environments with [OneUptime](https://oneuptime.com) uptime monitoring.*
