# How to Set Up the Edge Administrator Role in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge, Administrator, RBAC, Edge Computing

Description: Configure the Edge Administrator role in Portainer Business Edition to delegate edge environment management without granting full global administrator access.

## Introduction

The Edge Administrator role in Portainer Business Edition allows designated users to manage all edge environments (remote sites, IoT devices, branch offices) without having full global administrator access. This enables a dedicated edge operations team to manage edge deployments while the central platform team retains control over core environments and Portainer-wide settings.

## Prerequisites

- Portainer Business Edition
- Edge computing features enabled
- Edge environments or edge groups configured

## Edge Administrator Capabilities

An Edge Administrator can:

- View and manage all edge environments
- Deploy stacks and manage resources in edge environments
- View edge agent status and connectivity
- Create and manage edge groups
- Use Edge Stacks, Edge Jobs, and Edge Configurations

An Edge Administrator **cannot**:
- Manage standard (non-edge) environments
- Create or manage users or teams
- Configure global authentication settings
- Access Portainer's global settings

## Assigning the Edge Administrator Role

The Edge Administrator is a global role (not environment-specific):

### Via Web UI

1. Go to **Settings** → **Edge Compute**
2. In **Edge Compute access**, select the user in **Select user(s)**
3. Click **Create access**

### Via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a regular user, then promote that user to Edge Administrator
USER_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/users \
  -d '{
    "Username": "edge-ops-1",
    "Password": "SecureEdgeP@ssword123",
    "Role": 2
  }' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")

# Role: 2 = regular user, 3 = Edge Administrator
# Edge Compute features must be enabled before assigning role 3.
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/users/$USER_ID \
  -d '{
    "Username": "edge-ops-1",
    "Role": 3
  }'
```

## Typical Deployment Scenario

```text
Org Structure:
  Central IT Team → Global Administrators
  Edge Ops Team   → Edge Administrator (manages all edge environments)
```

The Edge Administrator role is best for a dedicated edge operations function that needs control across all Edge environments without full Portainer administrator access.

## Edge Groups for Organization and Targeting

Edge Administrators can use Edge Groups to organize Edge environments and target Edge Stacks, Jobs, and Configurations:

```bash
# Create an edge group
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/edge_groups \
  -d '{
    "Name": "US-Branch-Offices",
    "Dynamic": false,
    "Endpoints": [10, 11, 12, 13]
  }'

# Dynamic edge groups (based on tags)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/edge_groups \
  -d '{
    "Name": "US-East-Sites",
    "Dynamic": true,
    "TagIDs": [5, 6],
    "PartialMatch": true
  }'
```

Edge Groups organize Edge environments for bulk actions and deployments; they do not scope the Edge Administrator role itself.

## Edge Administrator vs. Global Administrator

| Task | Edge Admin | Global Admin |
|------|-----------|-------------|
| Manage edge environments | ✓ | ✓ |
| Deploy to edge | ✓ | ✓ |
| Manage edge groups | ✓ | ✓ |
| Manage standard environments | ✗ | ✓ |
| Manage users | ✗ | ✓ |
| Configure auth | ✗ | ✓ |
| View global settings | ✗ | ✓ |

## Testing Edge Administrator Access

```bash
# Login as Edge Administrator
EDGE_ADMIN_TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"edge-ops-1","password":"SecureEdgeP@ssword123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# List accessible edge environments
curl -s \
  -H "Authorization: Bearer $EDGE_ADMIN_TOKEN" \
  'https://portainer.example.com/api/endpoints?types=4,7' \
  | python3 -c "
import sys, json
envs = json.load(sys.stdin)
print(f'Edge environments accessible: {len(envs)}')
for env in envs:
    print(f'  - {env[\"Name\"]} (ID: {env[\"Id\"]}, Type: {env[\"Type\"]})')
"
# Type 4 = Edge Agent on Docker, Type 7 = Edge Agent on Kubernetes

# Try to access a global settings endpoint (should be denied)
curl -s \
  -o /dev/null \
  -w "%{http_code}\n" \
  -H "Authorization: Bearer $EDGE_ADMIN_TOKEN" \
  https://portainer.example.com/api/settings
# Should print 403
```

## Conclusion

The Edge Administrator role is the right tool for organizations with distributed edge deployments managed by a dedicated edge operations team. It provides full edge management capabilities while maintaining separation from central infrastructure and Portainer-wide administration. This role is especially valuable in OT/IoT environments, retail chains, or any organization with remote sites that need centralized Edge management without granting full administrator access.
