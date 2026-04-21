# How to Tag Environments in Portainer for Better Organization - Organization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Tag, Environment, Organization, Management

Description: Apply tags to Portainer environments to filter, search, and organize large numbers of environments by type, location, or team.

---

How to Tag Environments in Portainer for Better Organization in Portainer is a key management task for maintaining a well-organized and secure container infrastructure.

## Overview

Portainer provides rich tooling for managing environments at scale. Following best practices ensures your team can efficiently navigate and manage multiple environments.

## Step-by-Step Instructions

### Via the Portainer UI

1. Log in to Portainer as an administrator
2. Expand **Environment-related** and select **Tags**
3. Enter a tag name and click **Create tag**
4. Go to **Environment-related** > **Environments** and select the target environment
5. Select the tag from the **Tags** lookup and click **Update environment**

### Via the API

```bash
PORTAINER_URL="https://localhost:9443"
ENVIRONMENT_ID=1
TAG_ID=2

TOKEN=$(curl -s -X POST \
  "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a tag and note the ID returned in the response
curl -s -X POST "$PORTAINER_URL/api/tags" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"Name":"production"}' \
  --insecure

# Apply tag IDs to an environment. Include any existing tag IDs you want to keep.
curl -s -X PUT "$PORTAINER_URL/api/endpoints/$ENVIRONMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"TagIDs\":[$TAG_ID]}" \
  --insecure

# List all environments and their tag IDs
curl -s "$PORTAINER_URL/api/endpoints" \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    tag_ids = e.get('TagIds', [])
    group = e.get('GroupId', 0)
    print(f'  ID: {e[\"Id\"]}, Name: {e[\"Name\"]}, Group: {group}, Tag IDs: {tag_ids}')
"
```

## Installing the Portainer Agent (for Cloud K8s)

For EKS, AKS, and GKE environments, create a Kubernetes Edge Agent environment in Portainer and run the generated command on the target cluster:

```bash
# In Portainer, go to Environment-related > Environments > Add environment.
# Select Kubernetes > Edge Agent Standard, enter the Portainer API server URL
# and tunnel server address, then copy and run Portainer's generated command.
```

## Best Practices

- Use descriptive names for environments (include location and type)
- Apply consistent tags for filtering (e.g., production, staging)
- Group related environments together for bulk operations
- Review environment list quarterly and remove decommissioned environments

---

*Monitor all your environments from a single pane of glass with [OneUptime](https://oneuptime.com).*
