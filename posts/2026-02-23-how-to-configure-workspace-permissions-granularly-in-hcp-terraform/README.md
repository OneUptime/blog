# How to Configure Workspace Permissions Granularly in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Permissions, RBAC, Access Control, Security

Description: Configure fine-grained workspace permissions in HCP Terraform to control who can plan, apply, manage variables, and administer workspaces.

---

Not everyone on your team should have the same level of access to infrastructure. Junior developers might need to view plans, senior engineers should be able to apply changes, and only platform leads should manage workspace settings. HCP Terraform provides granular workspace permissions that go well beyond simple read/write access. This post shows how to set them up properly.

## Permission Levels Overview

HCP Terraform has five built-in permission levels for workspace access:

- **Read** - View workspace details, state, runs, and variables (not sensitive values)
- **Plan** - Everything in Read, plus the ability to trigger plans
- **Write** - Everything in Plan, plus the ability to apply runs, lock/unlock workspaces
- **Admin** - Everything in Write, plus managing workspace settings, variables, and team access
- **Custom** - Pick and choose specific permissions

The custom permission level is where the real flexibility lives.

## Setting Up Teams

Permissions are assigned through teams. First, create teams that map to your organizational roles:

```bash
# Create a "developers" team
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "teams",
      "attributes": {
        "name": "developers",
        "organization-access": {
          "manage-workspaces": false,
          "manage-policies": false,
          "manage-vcs-settings": false,
          "manage-providers": false,
          "manage-modules": false
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/teams"
```

```bash
# Create a "platform-engineers" team with more access
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "teams",
      "attributes": {
        "name": "platform-engineers",
        "organization-access": {
          "manage-workspaces": true,
          "manage-policies": true,
          "manage-vcs-settings": false,
          "manage-providers": true,
          "manage-modules": true
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/organizations/my-org/teams"
```

## Assigning Built-In Permissions

Assign a team to a workspace with a specific access level:

```bash
# Give "developers" team Plan access to a workspace
TEAM_ID="team-abc123"
WORKSPACE_ID="ws-def456"

curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"team-workspaces\",
      \"attributes\": {
        \"access\": \"plan\"
      },
      \"relationships\": {
        \"team\": {
          \"data\": {
            \"type\": \"teams\",
            \"id\": \"$TEAM_ID\"
          }
        },
        \"workspace\": {
          \"data\": {
            \"type\": \"workspaces\",
            \"id\": \"$WORKSPACE_ID\"
          }
        }
      }
    }
  }" \
  "https://app.terraform.io/api/v2/team-workspaces"
```

## Custom Permissions

Custom permissions let you mix and match specific capabilities. Here is the full list of custom permission options:

```bash
# Assign custom permissions to a team
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"team-workspaces\",
      \"attributes\": {
        \"access\": \"custom\",
        \"runs\": \"apply\",
        \"variables\": \"read\",
        \"state-versions\": \"read-outputs\",
        \"sentinel-mocks\": \"read\",
        \"workspace-locking\": true,
        \"run-tasks\": false
      },
      \"relationships\": {
        \"team\": {
          \"data\": {
            \"type\": \"teams\",
            \"id\": \"$TEAM_ID\"
          }
        },
        \"workspace\": {
          \"data\": {
            \"type\": \"workspaces\",
            \"id\": \"$WORKSPACE_ID\"
          }
        }
      }
    }
  }" \
  "https://app.terraform.io/api/v2/team-workspaces"
```

### Custom Permission Options

**runs** - Controls what the team can do with runs:
- `read` - View runs only
- `plan` - Trigger plans
- `apply` - Confirm applies

**variables** - Controls variable access:
- `none` - Cannot view variables
- `read` - Can view non-sensitive variables
- `write` - Can create and edit variables

**state-versions** - Controls state access:
- `none` - Cannot access state
- `read-outputs` - Can only see outputs
- `read` - Can read full state
- `write` - Can create state versions (rare)

**sentinel-mocks** - Controls access to Sentinel mock data:
- `none` - No access
- `read` - Can download mock data

**workspace-locking** - Boolean: can the team lock/unlock the workspace

**run-tasks** - Boolean: can the team manage run tasks

## Common Permission Patterns

### Pattern 1: Developer Team (Read-Only with Plan)

Developers can view everything and trigger plans to test their changes, but cannot apply:

```bash
# Developers: can plan but not apply
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"team-workspaces\",
      \"attributes\": {
        \"access\": \"custom\",
        \"runs\": \"plan\",
        \"variables\": \"read\",
        \"state-versions\": \"read-outputs\",
        \"sentinel-mocks\": \"none\",
        \"workspace-locking\": false,
        \"run-tasks\": false
      },
      \"relationships\": {
        \"team\": {\"data\": {\"type\": \"teams\", \"id\": \"$DEV_TEAM_ID\"}},
        \"workspace\": {\"data\": {\"type\": \"workspaces\", \"id\": \"$WORKSPACE_ID\"}}
      }
    }
  }" \
  "https://app.terraform.io/api/v2/team-workspaces"
```

### Pattern 2: CI/CD Pipeline Team

The CI/CD service account needs to apply but should not manage settings:

```bash
# CI/CD team: can apply but not manage workspace settings
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"team-workspaces\",
      \"attributes\": {
        \"access\": \"custom\",
        \"runs\": \"apply\",
        \"variables\": \"read\",
        \"state-versions\": \"read\",
        \"sentinel-mocks\": \"read\",
        \"workspace-locking\": true,
        \"run-tasks\": false
      },
      \"relationships\": {
        \"team\": {\"data\": {\"type\": \"teams\", \"id\": \"$CICD_TEAM_ID\"}},
        \"workspace\": {\"data\": {\"type\": \"workspaces\", \"id\": \"$WORKSPACE_ID\"}}
      }
    }
  }" \
  "https://app.terraform.io/api/v2/team-workspaces"
```

### Pattern 3: Security Audit Team

Security needs to read state and variables but never modify anything:

```bash
# Security team: read-only with full state access
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data "{
    \"data\": {
      \"type\": \"team-workspaces\",
      \"attributes\": {
        \"access\": \"custom\",
        \"runs\": \"read\",
        \"variables\": \"read\",
        \"state-versions\": \"read\",
        \"sentinel-mocks\": \"read\",
        \"workspace-locking\": false,
        \"run-tasks\": false
      },
      \"relationships\": {
        \"team\": {\"data\": {\"type\": \"teams\", \"id\": \"$SECURITY_TEAM_ID\"}},
        \"workspace\": {\"data\": {\"type\": \"workspaces\", \"id\": \"$WORKSPACE_ID\"}}
      }
    }
  }" \
  "https://app.terraform.io/api/v2/team-workspaces"
```

## Bulk Permission Assignment

When you have many workspaces, assign permissions in bulk:

```bash
#!/bin/bash
# assign-team-to-workspaces.sh
# Assign a team to all workspaces with a specific tag

TEAM_ID=$1
TAG=$2
ACCESS=${3:-"plan"}

# Get all workspaces with the tag
WORKSPACES=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/my-org/workspaces?search%5Btags%5D=$TAG&page%5Bsize%5D=100" | \
  jq -r '.data[].id')

for WS_ID in $WORKSPACES; do
  curl -s \
    --request POST \
    --header "Authorization: Bearer $TF_TOKEN" \
    --header "Content-Type: application/vnd.api+json" \
    --data "{
      \"data\": {
        \"type\": \"team-workspaces\",
        \"attributes\": {\"access\": \"$ACCESS\"},
        \"relationships\": {
          \"team\": {\"data\": {\"type\": \"teams\", \"id\": \"$TEAM_ID\"}},
          \"workspace\": {\"data\": {\"type\": \"workspaces\", \"id\": \"$WS_ID\"}}
        }
      }
    }" \
    "https://app.terraform.io/api/v2/team-workspaces" > /dev/null

  echo "Assigned $ACCESS to workspace $WS_ID"
  sleep 0.1  # Avoid rate limits
done
```

## Auditing Permissions

Review who has access to what:

```bash
# List all team access for a workspace
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/team-access" | \
  jq '.data[] | {
    team_id: .relationships.team.data.id,
    access: .attributes.access,
    runs: .attributes.runs,
    variables: .attributes.variables,
    state: .attributes["state-versions"]
  }'
```

Run this periodically to ensure permissions stay aligned with your security requirements.

## Summary

Granular workspace permissions in HCP Terraform let you implement the principle of least privilege for infrastructure management. Start by defining teams that map to roles in your organization, then assign the minimum permissions each role needs. Use custom permissions when built-in levels do not fit your requirements. Regularly audit who has access to production workspaces, and automate permission assignment to keep your access control consistent as you add new workspaces.
