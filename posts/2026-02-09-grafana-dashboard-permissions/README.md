# How to configure Grafana dashboard permissions and sharing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Dashboards, Permissions

Description: Learn how to manage Grafana dashboard permissions, sharing options, and access controls to secure your monitoring infrastructure.

---

Dashboards often contain sensitive information about your infrastructure, performance metrics, and business data. Grafana's permission system lets you control who can view, edit, or admin dashboards while maintaining flexibility for collaboration. Understanding these controls is essential for running Grafana in production.

## Understanding Grafana Permission Levels

Grafana has three permission levels for dashboards: View, Edit, and Admin.

View permission allows users to see the dashboard and its data but not make any changes. This is appropriate for most users who need visibility without modification rights.

Edit permission lets users modify panels, queries, and dashboard settings. Editors can save their changes, creating new dashboard versions.

Admin permission provides complete control including the ability to modify permissions and delete the dashboard.

## Dashboard Folder Permissions

Dashboards live in folders, and folder permissions cascade to contained dashboards. Set permissions at the folder level to manage groups of related dashboards efficiently.

```bash
# Create a folder via API
curl -X POST http://grafana:3000/api/folders \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Production Dashboards"
  }'

# Set folder permissions
curl -X POST http://grafana:3000/api/folders/production-dashboards/permissions \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "role": "Viewer",
        "permission": 1
      },
      {
        "role": "Editor",
        "permission": 2
      },
      {
        "teamId": 2,
        "permission": 4
      }
    ]
  }'
```

Permission values are: 1 (View), 2 (Edit), 4 (Admin). This configuration gives all Viewers read access, all Editors edit access, and team 2 admin access.

## Setting Dashboard-Specific Permissions

Override folder permissions for individual dashboards when needed.

```bash
# Get dashboard by UID
DASHBOARD_UID="abc123"

# Update dashboard permissions
curl -X POST "http://grafana:3000/api/dashboards/uid/$DASHBOARD_UID/permissions" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "role": "Viewer",
        "permission": 1
      },
      {
        "userId": 5,
        "permission": 4
      },
      {
        "teamId": 3,
        "permission": 2
      }
    ]
  }'
```

This gives all Viewers read access, user 5 admin access, and team 3 edit access, overriding any folder-level permissions.

## Managing Team-Based Permissions

Teams group users for easier permission management. Create teams for different departments or functions.

```bash
# Create a team
curl -X POST http://grafana:3000/api/teams \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Platform Team",
    "email": "platform@example.com"
  }'

# Add users to team
curl -X POST http://grafana:3000/api/teams/2/members \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 5
  }'

# Grant team permissions on folder
curl -X POST http://grafana:3000/api/folders/infrastructure/permissions \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "teamId": 2,
        "permission": 2
      }
    ]
  }'
```

Now all Platform Team members can edit dashboards in the infrastructure folder.

## Creating Public Dashboards

Public dashboards allow external viewing without authentication. Enable this feature carefully as it exposes your data.

```yaml
# grafana.ini
[security]
allow_embedding = true

[public_dashboards]
enabled = true
```

Then create a public link through the Grafana UI or API:

```bash
# Make dashboard public
curl -X POST "http://grafana:3000/api/dashboards/uid/$DASHBOARD_UID/public-dashboards" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isEnabled": true,
    "share": "public",
    "annotationsEnabled": false,
    "timeSelectionEnabled": true
  }'
```

This generates a public URL that anyone can access without logging in. Disable annotations to prevent exposing internal notes.

## Implementing Snapshot Sharing

Snapshots create point-in-time copies of dashboards for sharing outside your organization without exposing live data sources.

```bash
# Create a snapshot
curl -X POST http://grafana:3000/api/snapshots \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard": {
      "title": "CPU Usage Report",
      "panels": [...]
    },
    "expires": 3600,
    "external": false
  }'
```

The snapshot contains rendered data but no queries or data source information, making it safe for external sharing.

## Using Data Source Permissions

Restrict which users can query specific data sources to prevent unauthorized data access.

```bash
# Update data source permissions
curl -X POST http://grafana:3000/api/datasources/1/permissions \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "permissions": [
      {
        "teamId": 2,
        "permission": 1
      }
    ]
  }'
```

With data source permissions enabled, only authorized teams can create or edit panels using that data source.

## Configuring Organization-Level Permissions

Each user has a role within their organization: Admin, Editor, or Viewer.

```bash
# Update user's organization role
curl -X PATCH http://grafana:3000/api/org/users/5 \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Editor"
  }'

# List organization users and their roles
curl -X GET http://grafana:3000/api/org/users \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

Organization roles provide baseline permissions that folder and dashboard permissions build upon.

## Implementing Read-Only Viewers with Terraform

Manage permissions as code to ensure consistent configuration across environments.

```hcl
# main.tf
resource "grafana_team" "viewers" {
  name = "Read Only Viewers"
}

resource "grafana_folder" "production" {
  title = "Production Dashboards"
}

resource "grafana_folder_permission" "production_permissions" {
  folder_uid = grafana_folder.production.uid

  permissions {
    role       = "Viewer"
    permission = "View"
  }

  permissions {
    team_id    = grafana_team.viewers.id
    permission = "View"
  }
}

resource "grafana_dashboard" "overview" {
  folder      = grafana_folder.production.id
  config_json = file("dashboards/overview.json")
}
```

This ensures your permission model is documented and reproducible across deployments.

## Handling External Authentication Permissions

Map external authentication providers to Grafana roles automatically.

```ini
# grafana.ini - LDAP integration
[auth.ldap]
enabled = true
config_file = /etc/grafana/ldap.toml
```

Configure LDAP mappings:

```toml
# ldap.toml
[[servers]]
host = "ldap.example.com"
port = 389
use_ssl = false
bind_dn = "cn=admin,dc=example,dc=com"
bind_password = "password"
search_filter = "(cn=%s)"
search_base_dns = ["dc=example,dc=com"]

[[servers.group_mappings]]
group_dn = "cn=admins,ou=groups,dc=example,dc=com"
org_role = "Admin"

[[servers.group_mappings]]
group_dn = "cn=developers,ou=groups,dc=example,dc=com"
org_role = "Editor"

[[servers.group_mappings]]
group_dn = "cn=viewers,ou=groups,dc=example,dc=com"
org_role = "Viewer"
```

Users automatically receive appropriate roles based on their LDAP group membership.

## Creating Anonymous Access

Enable anonymous viewing for specific dashboards without requiring login.

```ini
# grafana.ini
[auth.anonymous]
enabled = true
org_name = Main Org.
org_role = Viewer
```

Anonymous users get Viewer role by default. Combine this with folder permissions to restrict which dashboards anonymous users can see.

## Auditing Permission Changes

Track who changes permissions to maintain security accountability.

```bash
# Query audit logs for permission changes
curl -X GET "http://grafana:3000/api/access-control/audit" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -G \
  -d "action=dashboards.permissions.update" \
  -d "from=2026-02-01" \
  -d "to=2026-02-09"
```

Regular audit reviews help you detect unauthorized permission changes.

## Implementing Row-Level Permissions

Use dashboard variables with data source query restrictions to implement row-level security.

```json
{
  "templating": {
    "list": [
      {
        "name": "tenant",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(metric{user_id=\"$__user.id\"}, tenant)",
        "current": {
          "value": "$__user.tenant"
        }
      }
    ]
  }
}
```

Users only see data for tenants they have access to, filtered by the variable.

## Managing Permissions at Scale

For large organizations, automate permission management through scripting.

```python
#!/usr/bin/env python3
import requests
import json

GRAFANA_URL = "http://grafana:3000"
API_TOKEN = "YOUR_API_TOKEN"
HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

def set_folder_permissions(folder_uid, team_permissions):
    """Set permissions for a folder"""
    url = f"{GRAFANA_URL}/api/folders/{folder_uid}/permissions"

    items = []
    for team_id, permission in team_permissions.items():
        items.append({
            "teamId": team_id,
            "permission": permission
        })

    payload = {"items": items}
    response = requests.post(url, headers=HEADERS, json=payload)
    return response.json()

# Set permissions for multiple folders
folders = {
    "production": {2: 4, 3: 2},  # Team 2: Admin, Team 3: Edit
    "staging": {2: 4, 3: 4},      # Both teams: Admin
    "development": {3: 4}          # Team 3: Admin
}

for folder, teams in folders.items():
    result = set_folder_permissions(folder, teams)
    print(f"Updated {folder}: {result}")
```

Scripts like this enforce consistent permissions across many folders.

## Best Practices for Dashboard Permissions

Use folders to organize dashboards logically and apply permissions at the folder level rather than individual dashboards.

Grant the minimum necessary permissions. Most users should be Viewers, with Edit and Admin roles reserved for those who need them.

Leverage teams instead of individual user permissions for easier management as your organization grows.

Review permissions quarterly to ensure they still match current team structures and responsibilities.

Use public dashboards sparingly and only for data that's truly safe to expose publicly.

Document your permission model so new team members understand the access structure.

Enable audit logging in production to track permission changes and potential security issues.

Test permission changes in a staging environment before applying them to production dashboards.

Consider using external authentication with automatic role mapping to reduce manual user management.

Proper dashboard permissions balance security with usability. They protect sensitive data while ensuring teams can access the information they need to do their jobs effectively.
