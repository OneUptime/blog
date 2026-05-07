# How to Add an Azure ACI Environment to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Azure, ACI, Cloud, Container Instances

Description: Connect Azure Container Instances to Portainer for managing serverless containers in the Azure cloud.

---

Adding environments to Portainer allows centralized management of containers across different infrastructure types. Azure ACI environments use Azure credentials rather than a Docker socket or Portainer Agent.

## Prerequisites

- Portainer running and accessible
- A Microsoft Entra app registration / service principal with access to the Azure subscription you want Portainer to manage
- The Application (client) ID, Directory (tenant) ID, and a client secret for that app registration
- HTTPS access from the Portainer server to the Azure management API

## Adding the Environment via the UI

1. Log in to Portainer as an administrator
2. Navigate to **Environments** in the left sidebar
3. Click **Add environment**
4. Select **ACI** and click **Start Wizard**
5. Enter a name, **Application ID**, **Tenant ID**, and **Authentication Key**
6. Click **Connect**

## Adding via API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

ACI_NAME="my-azure-aci"

# Add Azure ACI environment via API
curl -X POST \
  https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --form-string "Name=${ACI_NAME}" \
  --form-string "EndpointCreationType=3" \
  --form-string "AzureApplicationID=your-application-client-id" \
  --form-string "AzureTenantID=your-directory-tenant-id" \
  --form-string "AzureAuthenticationKey=your-client-secret" \
  --insecure

# List all environments
curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    print(f'  ID: {e[\"Id\"]}, Name: {e[\"Name\"]}, Type: {e.get(\"Type\",\"?\")}, URL: {e.get(\"URL\",\"?\")}')
"
```

## Environment Types Reference

| Type | Value | Description |
|------|-------|-------------|
| Azure ACI | 3 | Portainer `EndpointCreationType` value for Azure Container Instances |

## Verify the Connection

After adding the environment, verify it shows as healthy:

```bash
# Check Azure ACI environment status
ACI_NAME="my-azure-aci"

curl -s https://localhost:9443/api/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    if e['Name'] == '${ACI_NAME}':
        status = e.get('Status', 0)
        status_str = 'Online' if status == 1 else 'Offline'
        print(f'{e[\"Name\"]}: {status_str} (Type={e.get(\"Type\",\"?\")}, URL={e.get(\"URL\",\"?\")})')
"
```

---

*Monitor all your connected environments with [OneUptime](https://oneuptime.com) uptime monitoring.*
