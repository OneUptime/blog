# How to Add a Podman Environment to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Environment, Container, Linux

Description: Add a Podman environment to Portainer for managing rootless containers on Linux systems without the Docker daemon.

---

Adding environments to Portainer allows centralized management of containers across different infrastructure types. Podman environments have specific support and connection requirements.

## Prerequisites

- Portainer running and accessible
- Podman host running a supported configuration: CentOS Stream 9 with Podman 5 in rootful mode
- Connectivity that matches the chosen connection method
- If using the socket option, Portainer Server running in a Podman container with `/run/podman/podman.sock` bind-mounted to `/var/run/docker.sock`
- Appropriate credentials or connection details

## Adding the Environment via the UI

1. Log in to Portainer as an administrator
2. Navigate to **Environments** in the left sidebar
3. Click **Add environment**
4. Select **Podman** and click **Start Wizard**
5. Choose a connection method. **Edge Agent** is recommended; **Agent** and **Socket** are legacy options
6. If using **Socket**, start the rootful Podman socket with `sudo systemctl enable --now podman.socket`
7. Fill in the connection details
8. Click **Connect**

## Adding via API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# For a local Podman socket environment, Portainer Server must be running on Podman
# with: -v /run/podman/podman.sock:/var/run/docker.sock

# Add environment via API

curl -X POST \
  https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --form "Name=my-podman-environment" \
  --form "EndpointCreationType=1" \
  --form "ContainerEngine=podman" \
  --form "URL=unix:///var/run/docker.sock" \
  --insecure

# List all environments
curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    print(f'  ID: {e[\"Id\"]}, Name: {e[\"Name\"]}, Engine: {e.get(\"ContainerEngine\",\"?\")}, URL: {e.get(\"URL\",\"?\")}')
"
```

## Environment Creation Types Reference

| Type | Value | Description |
|------|-------|-------------|
| Local environment | 1 | Local socket environment. Use `ContainerEngine=podman` for Podman |
| Agent | 2 | Remote via Portainer Agent. Use `ContainerEngine=podman` for Podman |
| Azure ACI | 3 | Azure Container Instances |
| Edge Agent | 4 | Remote via Portainer Edge Agent. Use `ContainerEngine=podman` for Podman |
| Kubernetes local | 5 | Local Kubernetes environment |

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
    engine = e.get('ContainerEngine', '?')
    status_str = 'Online' if status == 1 else 'Offline'
    print(f'{e[\"Name\"]} ({engine}): {status_str}')
"
```

---

*Monitor all your connected environments with [OneUptime](https://oneuptime.com) uptime monitoring.*
