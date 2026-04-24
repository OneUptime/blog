# How to Set Up the Helpdesk (Read-Only) Role in Portainer - Readonly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Helpdesk, Read-Only, RBAC, Access Control, Support

Description: Configure the Helpdesk read-only role in Portainer for support teams who need visibility into container environments without management capabilities.

## Introduction

The Helpdesk role in Portainer Business Edition provides visibility into Portainer environments without the ability to make changes. It is distinct from the Read-Only User role, which only provides read-only access to resources the user or team is entitled to see. Support teams, auditors, and junior staff can use the Helpdesk role to troubleshoot issues and gather information without the risk of accidentally modifying production environments.

## Helpdesk Role Capabilities

**What Helpdesk Users CAN do:**
- View container list and status (running, stopped, exited)
- View container details (image, ports, env vars, mounts)
- View container logs (read-only)
- View images, volumes, and networks
- View stack configurations
- View service details in Swarm environments
- View Kubernetes deployments and pod status (read-only)
- View resource usage and statistics

**What Helpdesk Users CANNOT do:**
- Start, stop, restart, or remove containers
- Deploy new containers or stacks
- Execute commands in containers (no terminal access)
- Modify any configuration
- Create or delete containers, stacks, services, volumes, networks, configs, or secrets

## Assigning the Helpdesk Role

### Via Web UI

1. Navigate to **Environments**
2. Locate the environment and click **Manage access**
3. Add the team or user
4. Set role to **Helpdesk**

### Via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Assign team 4 (support team) to environment 1 with Helpdesk role.
# Portainer updates environment access by replacing the current TeamAccessPolicies map,
# so fetch the current policies first and merge the new entry.

TEAM_ACCESS_PAYLOAD=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints/1 \
  | python3 -c 'import sys,json; endpoint=json.load(sys.stdin); policies=endpoint.get("TeamAccessPolicies", {}); policies["4"]={"RoleId": 2}; print(json.dumps({"TeamAccessPolicies": policies}))')

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d "$TEAM_ACCESS_PAYLOAD"
# RoleId 2 = Helpdesk

# Assign individual user (ID: 8) to environment 1 with Helpdesk role.
# Portainer updates environment access by replacing the current UserAccessPolicies map,
# so fetch the current policies first and merge the new entry.

USER_ACCESS_PAYLOAD=$(curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints/1 \
  | python3 -c 'import sys,json; endpoint=json.load(sys.stdin); policies=endpoint.get("UserAccessPolicies", {}); policies["8"]={"RoleId": 2}; print(json.dumps({"UserAccessPolicies": policies}))')

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/1 \
  -d "$USER_ACCESS_PAYLOAD"
```

## Creating a Helpdesk Team and Assigning to Multiple Environments

```bash
# Step 1: Create the support team
TEAM_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/teams \
  -d '{"Name": "support-team"}')

TEAM_ID=$(printf '%s' "$TEAM_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")
echo "Support team ID: $TEAM_ID"

# Step 2: Add users to the support team
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/team_memberships \
  -d "{\"UserID\": 8, \"TeamID\": ${TEAM_ID}, \"Role\": 2}"

# Step 3: Grant Helpdesk access to all environments
ENDPOINTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -c "import sys,json; [print(e['Id']) for e in json.load(sys.stdin)]")

for endpoint_id in $ENDPOINTS; do
  echo "Assigning helpdesk access to environment $endpoint_id"

  TEAM_ACCESS_PAYLOAD=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    "https://portainer.example.com/api/endpoints/${endpoint_id}" \
    | TEAM_ID="$TEAM_ID" python3 -c 'import os,sys,json; endpoint=json.load(sys.stdin); policies=endpoint.get("TeamAccessPolicies", {}); policies[str(os.environ["TEAM_ID"])]={"RoleId": 2}; print(json.dumps({"TeamAccessPolicies": policies}))')

  curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "https://portainer.example.com/api/endpoints/${endpoint_id}" \
    -d "$TEAM_ACCESS_PAYLOAD"
done
```

## Helpdesk Use Case: Troubleshooting Workflow

A typical helpdesk investigation using read-only access:

```text
1. User reports "Website is down"
2. Helpdesk logs into Portainer
3. Navigates to production environment
4. Views container list → sees nginx container is "Exited"
5. Opens container → views logs → sees "cannot open configuration file"
6. Reports to DevOps: "nginx container exited, configuration file error"
7. DevOps restarts the container with correct config
```

The helpdesk never needs to make changes - they gather information and escalate.

## Viewing Container Logs as Helpdesk

```bash
# Helpdesk user can view logs via Portainer UI
# They can also use the API with their own token

HELPDESK_TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"helpdesk-user","password":"password"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# View container logs (read-only operation)
curl -s \
  -H "Authorization: Bearer $HELPDESK_TOKEN" \
  "https://portainer.example.com/api/endpoints/1/docker/containers/nginx/logs?tail=100&stdout=true&stderr=true"
```

## Conclusion

The Helpdesk role provides the minimum access needed for support teams to do their job effectively - they can inspect deployed resources without changing them. Grant this role to support staff and read-only stakeholders who need environment-wide visibility, then assign the minimum necessary write access only to those who need it. Combined with good logging and monitoring, helpdesk users can triage most Level 1 issues before escalation.
