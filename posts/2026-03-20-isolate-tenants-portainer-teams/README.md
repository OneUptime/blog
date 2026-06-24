# How to Isolate Tenants Using Portainer Teams and Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Multi-Tenant, Team, Isolation, Access Control

Description: Use Portainer's Teams feature and environment access control to create strong boundaries between tenant workloads, preventing cross-team visibility and resource access.

## Introduction

Portainer Teams provide a grouping mechanism for users, and environment access control determines which teams can see and manage which Docker environments. By mapping each tenant to a team and each team to specific environments, you create administrative boundaries that prevent one tenant from viewing or modifying another tenant's environments. Resource visibility inside an environment is separate: Portainer assigns resources to administrators by default, so non-admin users need resource ownership or public access to see them. This guide covers the complete tenant isolation setup workflow.

## Step 1: Plan Your Tenant Structure

```text
Multi-tenant architecture:

Portainer Server
├── Admin User (full access)
│
├── Team: Alpha Corp
│   ├── User: alice@alpha.com (Team Leader)
│   ├── User: bob@alpha.com (Team Member)
│   ├── Environment: alpha-production (Portainer Agent on host-1)
│   └── Environment: alpha-staging (Portainer Agent on host-2)
│
├── Team: Beta Inc
│   ├── User: charlie@beta.com (Team Leader)
│   └── Environment: beta-production (Portainer Agent on host-3)
│
└── Team: Internal Dev
    ├── User: dev-team@company.com
    └── Environment: shared-dev (Docker host-4)
```

## Step 2: Create Teams and Assign Users

```bash
PORTAINER_URL="https://portainer.example.com"
ADMIN_JWT="admin_jwt_from_/api/auth"

# Create Team: Alpha Corp

ALPHA_TEAM=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/teams" \
  -d '{"Name": "Alpha Corp"}' | jq -r '.Id')

echo "Alpha Corp team ID: $ALPHA_TEAM"

# Create user Alice (Team Leader)
ALICE_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/users" \
  -d '{
    "Username": "alice",
    "Password": "Alice@Secure123!",
    "Role": 2
  }' | jq -r '.Id')

# Add Alice to Alpha Corp as Team Leader (role 1)
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/team_memberships" \
  -d "{\"TeamID\": $ALPHA_TEAM, \"UserID\": $ALICE_ID, \"Role\": 1}"

# Add Bob to Alpha Corp as Team Member (role 2)
BOB_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/users" \
  -d '{"Username": "bob", "Password": "Bob@Secure123!", "Role": 2}' | \
  jq -r '.Id')

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/team_memberships" \
  -d "{\"TeamID\": $ALPHA_TEAM, \"UserID\": $BOB_ID, \"Role\": 2}"
```

## Step 3: Create and Restrict Environments per Tenant

```bash
# Look up the role you want Alpha Corp to have on this environment.
# RoleId 1 is "Environment administrator" in current Portainer releases.
ALPHA_ENV_ROLE_ID=$(curl -s \
  -H "Authorization: Bearer $ADMIN_JWT" \
  "$PORTAINER_URL/api/roles" | \
  jq -r '.[] | select(.Name == "Environment administrator") | .Id')

# Register Alpha Corp's production environment
ALPHA_ENV_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  "$PORTAINER_URL/api/endpoints" \
  -F "Name=alpha-production" \
  -F "EndpointCreationType=2" \
  -F "URL=tcp://alpha-host.internal:9001" \
  -F "PublicURL=alpha-host.internal" \
  -F "TLS=true" \
  -F "TLSSkipVerify=true" \
  -F "TLSSkipClientVerify=true" | jq -r '.Id')

# Restrict environment to Alpha Corp team ONLY
curl -s -X PUT \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/endpoints/$ALPHA_ENV_ID" \
  -d "{
    \"TeamAccessPolicies\": {
      \"$ALPHA_TEAM\": {\"RoleId\": $ALPHA_ENV_ROLE_ID}
    },
    \"UserAccessPolicies\": {}
  }"

# Verify: Beta team users should NOT see this environment
# Environment access controls who can see this environment at all.
# Non-admin users still need resource ownership or public access to see workloads inside it.
```

## Step 4: Container-Level Access Control with Labels

```yaml
# For workloads deployed outside Portainer, apply access labels so Portainer
# can grant non-admin users access when it discovers the resources.
services:
  api:
    image: alpha-corp/api:latest
    labels:
      # Match the Portainer team name exactly
      io.portainer.accesscontrol.teams: Alpha Corp
      tenant: alpha-corp
    networks:
      - alpha_net

networks:
  alpha_net:
    driver: bridge
    labels:
      tenant: alpha-corp
```

## Step 5: Registry Access Isolation per Tenant

```bash
# Give each tenant access to their own registry only on their own environment
# Registry access in Portainer is environment-specific, not global.
# This prevents Alpha Corp from pulling Beta Inc's images

# Add Alpha Corp's private registry
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/registries" \
  -d "{
    \"Name\": \"Alpha Corp Registry\",
    \"Type\": 3,
    \"URL\": \"registry.alpha-corp.com\",
    \"Authentication\": true,
    \"Username\": \"registry-user\",
    \"Password\": \"registry-pass\",
    \"TLS\": true
  }"

# Get the registry ID
ALPHA_REGISTRY_ID=$(curl -s \
  -H "Authorization: Bearer $ADMIN_JWT" \
  "$PORTAINER_URL/api/registries" | \
  jq -r '.[] | select(.Name == "Alpha Corp Registry") | .Id')

# Grant ONLY Alpha Corp team access to this registry on alpha-production
curl -s -X PUT \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/endpoints/$ALPHA_ENV_ID/registries/$ALPHA_REGISTRY_ID" \
  -d "{
    \"TeamAccessPolicies\": {
      \"$ALPHA_TEAM\": {\"RoleId\": $ALPHA_ENV_ROLE_ID}
    },
    \"UserAccessPolicies\": {}
  }"
```

## Step 6: Verify Tenant Isolation

```bash
# Test isolation: authenticate as an Alpha team member
BOB_TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/auth" \
  -d '{"Username": "bob", "Password": "Bob@Secure123!"}' | \
  jq -r '.jwt')

# Bob should only see Alpha Corp environments
# Resource visibility inside those environments still depends on resource ownership.
curl -s \
  -H "Authorization: Bearer $BOB_TOKEN" \
  "$PORTAINER_URL/api/endpoints" | \
  jq '.[].Name'
# Should return ONLY: "alpha-production", "alpha-staging"

# Bob should NOT see Beta's environment
BETA_ENV_VISIBLE=$(curl -s \
  -H "Authorization: Bearer $BOB_TOKEN" \
  "$PORTAINER_URL/api/endpoints" | \
  jq -r '.[] | select(.Name | contains("beta")) | .Name')

if [ -z "$BETA_ENV_VISIBLE" ]; then
  echo "ISOLATION VERIFIED: Bob cannot see Beta's environments"
else
  echo "WARNING: Isolation breach - Bob can see: $BETA_ENV_VISIBLE"
fi
```

## Conclusion

Portainer's Teams and environment access control model maps naturally to multi-tenant scenarios. Each tenant gets a team, and each environment gets access restricted to exactly one team. For non-admin users, environment access and workload access are separate controls: environment access determines which environments a tenant can open, while resource ownership and access-control labels determine which workloads they can see or manage inside those environments. Validate your tenant isolation periodically by authenticating as a tenant user and confirming they cannot see other tenants' environments or workloads.
