# How to Configure AD Group-Based Access in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Active Directory, Group, RBAC, Access Control

Description: Map Active Directory security groups to Portainer teams to control environment access based on AD group membership.

## Introduction

Active Directory group-based access in Portainer Business Edition enables you to control who can access which environments based on existing AD security group membership. This integrates Portainer's RBAC with your AD group structure, so access changes in AD are reflected in Portainer at the user's next login.

## Architecture Overview

```text
AD Security Group: CN=Portainer-DevOps,OU=Groups,DC=corp,DC=example,DC=com
        |
        v
Portainer Team: "Portainer-DevOps"
        |
        v
Environment Access: Production Environment (Standard User role)
```

## Step 1: Create AD Security Groups

```powershell
# Create groups for different access levels

New-ADGroup -Name "Portainer-DevOps" `
  -SamAccountName "Portainer-DevOps" `
  -GroupScope Global `
  -GroupCategory Security `
  -Path "OU=Groups,DC=corp,DC=example,DC=com" `
  -Description "Portainer DevOps team - full environment access"

New-ADGroup -Name "Portainer-QA" `
  -SamAccountName "Portainer-QA" `
  -GroupScope Global `
  -GroupCategory Security `
  -Path "OU=Groups,DC=corp,DC=example,DC=com" `
  -Description "Portainer QA team - staging access"

New-ADGroup -Name "Portainer-ReadOnly" `
  -SamAccountName "Portainer-ReadOnly" `
  -GroupScope Global `
  -GroupCategory Security `
  -Path "OU=Groups,DC=corp,DC=example,DC=com" `
  -Description "Portainer read-only access"

# Add members to groups
Add-ADGroupMember -Identity "Portainer-DevOps" -Members alice,bob
Add-ADGroupMember -Identity "Portainer-QA" -Members charlie,diana
Add-ADGroupMember -Identity "Portainer-ReadOnly" -Members eve
```

## Step 2: Configure Portainer Active Directory Authentication with Group Search

In Settings → Authentication, select Microsoft Active Directory:

```text
User Search Path:         OU=Users,DC=corp,DC=example,DC=com
Allowed Groups:           Portainer-DevOps, Portainer-QA, Portainer-ReadOnly
Group Search Path:        OU=Groups,DC=corp,DC=example,DC=com
Groups:                   Portainer-DevOps, Portainer-QA, Portainer-ReadOnly
```

Portainer fills the Group Base DN and Group Filter from the search paths and groups you choose. Use `Display User/Group matching` to verify that the expected users resolve into the `Portainer-*` groups before saving. If you want AD-authenticated users created automatically, enable Automatic user provisioning; otherwise create matching users in Portainer first.

## Step 3: Create Matching Teams in Portainer

Create Portainer teams with names matching the AD group CNs:

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Create teams matching AD group names
for team in "Portainer-DevOps" "Portainer-QA" "Portainer-ReadOnly"; do
  curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    https://portainer.example.com/api/teams \
    -d "{\"Name\": \"${team}\"}"
  echo "Created team: $team"
done
```

## Step 4: Assign Teams to Environments

```bash
# Get list of environments
curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -c "import sys,json; [print(f'ID={e[\"Id\"]} Name={e[\"Name\"]}') for e in json.load(sys.stdin)]"

# Get team IDs
curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/teams \
  | python3 -c "import sys,json; [print(f'ID={t[\"Id\"]} Name={t[\"Name\"]}') for t in json.load(sys.stdin)]"

# Get available roles and note the Id for "Standard User"
curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/roles \
  | python3 -c "import sys,json; [print(f'ID={r[\"Id\"]} Name={r[\"Name\"]}') for r in json.load(sys.stdin)]"

# Assign team access to environment
# Example: Environment ID 1, Team ID 1
# Replace 2 with the Id returned by /api/roles for "Standard User"
STANDARD_USER_ROLE_ID=2

curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d "{\"TeamAccessPolicies\": {\"1\": {\"RoleId\": ${STANDARD_USER_ROLE_ID}}}}"
```

## Step 5: Verify Automatic Team Sync

With Active Directory configured and groups set up:

1. Log out of Portainer
2. Log back in with an AD account that's a member of `Portainer-DevOps`
3. Portainer should automatically add the user to the `Portainer-DevOps` team

## Handling Nested AD Groups

Portainer team sync checks the configured group membership against the user's distinguished name. For predictable results, make users direct members of the AD groups that map to Portainer teams, then verify the result with `Display User/Group matching` and `Test login` before relying on it for access control.

## Conclusion

AD group-based access control in Portainer Business Edition bridges your existing AD group structure with container infrastructure access. By naming Portainer teams to match AD group CNs, you create a direct mapping that's maintained automatically. Access changes in AD (adding/removing group members) take effect the next time the user logs in to Portainer, with no manual Portainer changes required.
