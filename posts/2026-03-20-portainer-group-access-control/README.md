# How to Set Up Per-Group Access Control in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Group, Access Control, RBAC, Environment Groups

Description: Use Portainer environment groups to assign access policies to multiple environments simultaneously, simplifying access management at scale.

## Introduction

When you have many environments, configuring access policies one-by-one becomes tedious. Portainer supports grouping environments and assigning access at the group level - changes to a group's access policies apply to all environments in that group. This guide covers environment groups and group-level access control.

## What Are Environment Groups?

Environment Groups are organizational units that contain multiple environments. Groups serve two purposes:
1. **Visual organization**: Environments are categorized in the UI
2. **Access control inheritance**: Teams assigned to a group get access to all environments in that group

## Creating Environment Groups via UI

1. Expand **Environment-related** in the left sidebar
2. Click **Groups**
3. Click **Add group**
4. Name the group (e.g., "Production", "Staging", "Development")
5. Add environments to the group

## Creating Groups via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create a group

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoint_groups \
  -d '{
    "Name": "Production",
    "Description": "All production environments",
    "AssociatedEndpoints": [1, 2, 3]
  }'

# Response: {"Id": 1, "Name": "Production", ...}
```

## Assigning Team Access to Groups

Examples that use roles such as `Standard User` and `Helpdesk` require Portainer Business Edition. In Portainer's built-in roles, `Standard User` is `RoleId` `3` and `Helpdesk` is `RoleId` `2`.

```bash
GROUP_ID=1

# Assign teams to the group
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/endpoint_groups/${GROUP_ID}" \
  -d '{
    "Name": "Production",
    "Description": "All production environments",
    "TeamAccessPolicies": {
      "2": {"RoleId": 3},
      "4": {"RoleId": 2}
    },
    "UserAccessPolicies": {
      "5": {"RoleId": 3}
    }
  }'
```

## Access Inheritance Model

When an environment belongs to a group:
- The environment inherits the group's access policies
- A direct environment assignment for the same user or team takes precedence over the inherited group assignment
- In the UI, inherited access is labeled `inherited` and a direct assignment that replaces it is labeled `override`

```text
Group "Production" → DevOps team (Standard User)
  ├── Environment A → inherits DevOps (Standard User)
  │                → also has QA team (Helpdesk) directly
  │   Effective: DevOps=Standard, QA=Helpdesk
  │
  ├── Environment B → inherits DevOps (Standard User)
  │   Effective: DevOps=Standard
  │
  └── Environment C → inherits DevOps (Standard User)
      Effective: DevOps=Standard
```

## Group Organization Strategy

### By Environment Type

```text
Production Group:
  - All production environments
  - DevOps team: Standard User
  - Support team: Helpdesk

Staging Group:
  - All staging/UAT environments
  - DevOps team: Standard User
  - QA team: Standard User
  - Support team: Standard User

Development Group:
  - All development environments
  - All developers: Standard User
  - Support team: Standard User
```

### By Geographic Region

```text
US-East Group:
  - us-east-prod, us-east-staging, us-east-dev
  - US Operations team: Standard User

EU-West Group:
  - eu-west-prod, eu-west-staging, eu-west-dev
  - EU Operations team: Standard User
```

## Managing Group Membership

```bash
# List all groups
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoint_groups \
  | python3 -m json.tool

# Get environments in a group
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoint_groups/${GROUP_ID}" \
  | python3 -c "import sys,json; g=json.load(sys.stdin); [print(e) for e in g.get('AssociatedEndpoints',[])]"

# Associate an environment with a group
ENDPOINT_ID=4
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoint_groups/${GROUP_ID}/endpoints/${ENDPOINT_ID}"
```

## Automating Group-Based Access

```bash
#!/bin/bash
# Setup-groups-and-access.sh

TOKEN="your-admin-token"
PORTAINER_URL="https://portainer.example.com"

# Create groups
create_group() {
  local name=$1
  local description=$2
  curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoint_groups" \
    -d "{\"Name\":\"${name}\",\"Description\":\"${description}\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])"
}

PROD_GROUP=$(create_group "Production" "Production environments")
STG_GROUP=$(create_group "Staging" "Staging environments")
DEV_GROUP=$(create_group "Development" "Development environments")

echo "Groups created: Prod=$PROD_GROUP, Staging=$STG_GROUP, Dev=$DEV_GROUP"

# Assign access policies
assign_group_access() {
  local group_id=$1
  local policies=$2
  curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoint_groups/${group_id}" \
    -d "${policies}"
}

# Production: DevOps = Standard User, Support = Helpdesk
assign_group_access $PROD_GROUP '{"Name":"Production","TeamAccessPolicies":{"2":{"RoleId":3},"4":{"RoleId":2}}}'
```

## Conclusion

Environment groups simplify access management in Portainer installations with many environments. Rather than configuring access on each environment individually, you configure it once at the group level. As new environments are added to a group, they automatically inherit the group's access policies. Design your group structure around how your organization segments infrastructure (by stage, region, or product), and group-based access control becomes a powerful, low-maintenance system.
