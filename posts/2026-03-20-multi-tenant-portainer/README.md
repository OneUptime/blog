# How to Set Up Multi-Tenant Container Management with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Multi-Tenant, Team, Access Control, Enterprise

Description: Configure Portainer for multiple teams with isolated environments, role-based access control, and resource quotas so each tenant manages their own containers securely.

## Introduction

Multi-tenant container management allows different teams, departments, or customers to manage their own containers through a single Portainer instance without visibility into each other's workloads. Portainer Business Edition provides Teams, Role-Based Access Control (RBAC) with built-in environment roles, and Kubernetes namespace resource quotas. The CE edition offers basic user management with environment access control and Docker security restrictions for standard users. This guide covers configuring Portainer for multi-tenancy at both the CE and Business tiers.

## Step 1: Create User Accounts for Each Tenant

```bash
PORTAINER_URL="https://portainer.example.com"
ADMIN_TOKEN="admin_api_token"

# Create a user for tenant A

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/users" \
  -d '{
    "Username": "team-alpha-user",
    "Password": "SecurePassword123!",
    "Role": 2
  }'
# Role: 1=Admin, 2=Standard User

# Create user for tenant B
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/users" \
  -d '{
    "Username": "team-beta-user",
    "Password": "AnotherPassword456!",
    "Role": 2
  }'
```

## Step 2: Create Teams (Portainer Business / EE)

```bash
# Create a team for each tenant
create_team() {
  local name=$1
  curl -s -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    "$PORTAINER_URL/api/teams" \
    -d "{\"Name\": \"$name\"}"
}

create_team "Team Alpha"
create_team "Team Beta"
create_team "Team Gamma"

# Get team IDs
curl -s \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$PORTAINER_URL/api/teams" | \
  jq '.[] | {id: .Id, name: .Name}'

# Add users to teams
# TEAM_ID=1 (Team Alpha), USER_ID=2 (team-alpha-user)
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/team_memberships" \
  -d '{"TeamID": 1, "UserID": 2, "Role": 1}'  # 1=Team Leader, 2=Team Member
```

## Step 3: Create Isolated Environments per Tenant

```bash
# Option 1: Separate Docker hosts per tenant (strongest isolation)
# Each team gets their own Portainer endpoint

# Register Team Alpha's Docker host
# /api/endpoints expects multipart/form-data, not JSON.
# EndpointCreationType: 1=Local Docker, 2=Agent, 3=Azure, 4=Edge Agent, 5=Local Kubernetes.
# Port 9001 is the Portainer Agent default, so use type 2.
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$PORTAINER_URL/api/endpoints" \
  --form "Name=Team Alpha Production" \
  --form "EndpointCreationType=2" \
  --form "URL=team-alpha-docker.internal:9001" \
  --form "TLS=true" \
  --form "TLSSkipVerify=false"

# Register Team Beta's Docker host
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$PORTAINER_URL/api/endpoints" \
  --form "Name=Team Beta Production" \
  --form "EndpointCreationType=2" \
  --form "URL=team-beta-docker.internal:9001"
```

## Step 4: Configure Access Control per Environment

```bash
# Grant Team Alpha access ONLY to their environment
# Environment ID: 1 (Team Alpha Production)
# Team ID: 1 (Team Alpha)
# Role IDs are not fixed - query GET /api/roles to find the IDs for
# Endpoint Administrator, Helpdesk, Standard User, Read-Only User, and Operator.

curl -s -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/endpoints/1" \
  -d '{
    "TeamAccessPolicies": {
      "1": {"RoleId": 1}
    },
    "UserAccessPolicies": {}
  }'

# Grant Team Beta access to their environment (ID: 2)
curl -s -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/endpoints/2" \
  -d '{
    "TeamAccessPolicies": {
      "2": {"RoleId": 1}
    }
  }'

# Team Alpha now CANNOT see Team Beta's environment and vice versa
```

## Step 5: Network Isolation Between Tenants (Single Host)

If sharing a Docker host, use network namespaces:

```yaml
# Team Alpha's stack - isolated network
version: "3.8"

networks:
  team_alpha_net:
    name: team_alpha_net   # Predictable name for labeling
    driver: bridge
    labels:
      - "portainer.team=alpha"
    ipam:
      config:
        - subnet: 172.30.0.0/24  # Alpha's dedicated subnet

services:
  alpha_api:
    image: myapp/api:latest
    networks:
      - team_alpha_net
    labels:
      - "portainer.team=alpha"
```

```yaml
# Team Beta's stack - completely separate network
version: "3.8"

networks:
  team_beta_net:
    name: team_beta_net
    driver: bridge
    labels:
      - "portainer.team=beta"
    ipam:
      config:
        - subnet: 172.31.0.0/24  # Beta's dedicated subnet

services:
  beta_api:
    image: otherapp/api:latest
    networks:
      - team_beta_net
    labels:
      - "portainer.team=beta"
```

## Step 6: Restrict What Regular Users Can Do per Environment

```bash
# Update per-environment security settings via PUT /api/endpoints/{id}/settings
# (these flags exist in CE; the dedicated handler unwraps them onto the
# endpoint's SecuritySettings object).
curl -s -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/endpoints/1/settings" \
  -d '{
    "AllowBindMountsForRegularUsers": false,
    "AllowPrivilegedModeForRegularUsers": false,
    "AllowHostNamespaceForRegularUsers": false,
    "AllowDeviceMappingForRegularUsers": false,
    "AllowSysctlSettingForRegularUsers": false,
    "AllowContainerCapabilitiesForRegularUsers": false
  }'

# Regular users cannot:
# - Mount host paths (only volumes)
# - Run privileged containers
# - Use host network/PID namespaces
# - Create custom devices
# - Modify kernel parameters
# - Add/drop capabilities
```

## Conclusion

Multi-tenancy in Portainer ranges from simple user-to-environment access restrictions (CE) to full team-based RBAC with security policies (Business Edition). The most important isolation principle is giving each tenant their own environment (Docker host or Swarm cluster) - this provides complete separation at the infrastructure level. When sharing a host, enforce network isolation through dedicated subnets per team and disable privileged mode for standard users. Regular audit of team memberships and environment access policies ensures that access rights stay aligned with organizational changes.
