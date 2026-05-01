# How to Set Up the Edge Administrator Role in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge, RBAC, Administrator, Business Edition

Description: Configure the Edge Administrator role in Portainer Business Edition to delegate management of edge environments to specific users.

---

The Edge Administrator role in Portainer BE allows designated users to manage edge environments and edge agent deployments without having full global administrator access. This is ideal for distributed teams managing remote sites.

## Edge Administrator Capabilities

Edge Administrators can:
- View and manage all edge environments
- Generate edge agent deployment scripts
- Create and manage edge groups
- View edge environment status and health
- Associate pending devices in the Edge waiting room

Edge Administrators cannot:
- Manage non-edge environments
- Modify global Portainer settings
- Manage other users or teams

## Assign Edge Administrator Role

1. Navigate to **Settings > Edge Compute**
2. Under **Edge Compute access**, select the user from **Select user(s)**
3. Click **Create access**
4. The user is now an Edge Administrator across all Edge environments

## Use Edge Groups with Edge Administrator

Edge Groups organize Edge environments, but they do not restrict the Edge Administrator role to specific groups:

1. Select **Edge Groups**
2. Create or select an edge group (e.g., "Site-London")
3. Use the group to organize the Edge environments you want to manage together
4. Edge Administrators still have control across all Edge environments

## Create Edge Groups via API

```bash
# Create a static edge group
curl -X POST \
  https://localhost:9443/api/edge_groups \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "site-london",
    "Dynamic": false,
    "Endpoints": [5, 6, 7]
  }' \
  --insecure

# Inspect the edge group
curl -X GET \
  https://localhost:9443/api/edge_groups/1 \
  -H "X-API-Key: your_api_key_here" \
  --insecure
```

---

*Monitor your edge deployments with [OneUptime](https://oneuptime.com) for distributed infrastructure visibility.*
