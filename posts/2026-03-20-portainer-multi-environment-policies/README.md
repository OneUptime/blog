# How to Set Up Multi-Environment Policies in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Environment, Policies, Governance, Compliance

Description: Implement consistent policies across multiple Portainer environments using groups, tags, and standardized access control configurations.

## Introduction

In organizations with many environments, maintaining consistent access rules (who can access what, with which role) becomes challenging. Portainer environment groups let you assign access once and have environments in the group inherit it, while tags help you organize and target environments consistently in automation. If you want RBAC roles beyond the default Standard user role, those examples require Portainer Business Edition.

## Strategy 1: Group-Based Policy Inheritance

Create environment groups first, then assign access at the group level:

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

PORTAINER_URL="https://portainer.example.com"

PRODUCTION_GROUP_ID=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoint_groups" \
  -d '{"name":"Production","description":"All production environments"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")

DEVELOPMENT_GROUP_ID=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoint_groups" \
  -d '{"name":"Development","description":"All dev environments"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")

# In Portainer BE, built-in role IDs include 2 = Helpdesk and 3 = Standard user.
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoint_groups/${PRODUCTION_GROUP_ID}" \
  -d '{"TeamAccessPolicies":{"1":{"RoleId":3},"2":{"RoleId":2}}}'

curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoint_groups/${DEVELOPMENT_GROUP_ID}" \
  -d '{"TeamAccessPolicies":{"1":{"RoleId":3},"2":{"RoleId":3},"3":{"RoleId":3}}}'
```

## Strategy 2: Scripted Policy Application

Apply consistent policies across all environments via script:

```bash
#!/bin/bash
# apply-environment-policies.sh

TOKEN="your-admin-token"
PORTAINER_URL="https://portainer.example.com"

# Get all environments
ENDPOINTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${PORTAINER_URL}/api/endpoints" \
  | python3 -c "import sys,json; [print(e['Id']) for e in json.load(sys.stdin)]")

# Portainer CE supports the default Standard user role; Helpdesk shown here requires BE.
# Example mapping: DevOps (team 1) = Standard user, Support (team 2) = Helpdesk
STANDARD_POLICY='{"1":{"RoleId":3},"2":{"RoleId":2}}'

for endpoint_id in $ENDPOINTS; do
  echo "Applying standard policy to endpoint $endpoint_id"
  curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoints/${endpoint_id}" \
    -d "{\"TeamAccessPolicies\":${STANDARD_POLICY}}"
done

echo "Done applying policies to all environments"
```

## Strategy 3: Environment Template Automation

When adding new environments, use a script that assigns the environment to the correct group automatically so it inherits the standard access policy:

```bash
#!/bin/bash
# add-environment-with-policy.sh

TOKEN="your-admin-token"
PORTAINER_URL="https://portainer.example.com"

add_environment_with_policy() {
  local name=$1
  local agent_url=$2
  local group_id=$3

  # Add the environment directly into the group so it inherits group access
  ENDPOINT_ID=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    "${PORTAINER_URL}/api/endpoints" \
    -F "Name=${name}" \
    -F "EndpointCreationType=2" \
    -F "URL=${agent_url}" \
    -F "TLS=true" \
    -F "TLSSkipVerify=true" \
    -F "TLSSkipClientVerify=true" \
    -F "GroupID=${group_id}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")

  echo "Added environment $name (ID: $ENDPOINT_ID) to group $group_id"
}

# Usage
add_environment_with_policy "US-West Production" "us-west-prod:9001" 1
add_environment_with_policy "US-West Staging" "us-west-staging:9001" 2
```

## Conclusion

Multi-environment access management in Portainer works best through groups that carry access assignments. New environments added to a group inherit the group's access automatically. For custom policies per-environment, maintain a policy configuration file and apply it via script to ensure consistency and auditability.
