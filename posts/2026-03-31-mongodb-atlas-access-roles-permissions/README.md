# How to Configure Atlas Access Roles and Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Role, Permission, Access Control

Description: Configure MongoDB Atlas organization and project roles, custom database users, and role-based access control to enforce least-privilege access across your teams.

---

## Overview

MongoDB Atlas has two distinct access control layers: Atlas UI/API access governed by organization and project roles, and database-level access governed by database user roles. Both must be configured to enforce least privilege for your teams.

## Organization-Level Roles

Organization roles control who can manage billing, create projects, and manage organization settings.

| Role | Capabilities |
| ---- | ------------ |
| Organization Owner | Full control including billing and project creation |
| Organization Member | Can be added to projects but has no org-level privileges |
| Organization Billing Admin | Manages billing only |
| Organization Read Only | View-only access to org settings |

Assign roles via the Atlas CLI.

```bash
# List org members
atlas organizations users list --orgId <ORG_ID>

# Update a member's org role
atlas organizations invitations invite user@example.com \
  --orgId <ORG_ID> \
  --role ORG_MEMBER
```

## Project-Level Roles

Project roles control access to clusters, network settings, and monitoring within a project.

```bash
# Invite a user to a project as cluster manager
atlas projects invitations create user@example.com \
  --projectId <PROJECT_ID> \
  --role GROUP_CLUSTER_MANAGER
```

Common project roles:
- `GROUP_OWNER` - full project control
- `GROUP_CLUSTER_MANAGER` - manage clusters, no data access
- `GROUP_DATA_ACCESS_ADMIN` - create/manage database users
- `GROUP_DATA_ACCESS_READ_WRITE` - read/write data via Data Explorer
- `GROUP_READ_ONLY` - view-only access

## Database User Roles

Database users authenticate to MongoDB clusters. They are separate from Atlas UI users.

```bash
# Create a read-only database user
atlas dbusers create \
  --username app_readonly \
  --password "$(openssl rand -base64 24)" \
  --role readAnyDatabase \
  --projectId <PROJECT_ID>

# Create a user with collection-level access
atlas dbusers create \
  --username app_orders_rw \
  --password "S3cret!" \
  --role "readWrite@orders_db" \
  --projectId <PROJECT_ID>
```

## Custom Database Roles

Built-in roles like `readWrite` often grant more access than needed. Create custom roles.

```bash
atlas customDbRoles create orders_reader \
  --privilege FIND@orders_db.orders \
  --privilege FIND@orders_db.products \
  --projectId <PROJECT_ID>

# Assign the custom role to a user
atlas dbusers create \
  --username orders_service \
  --password "S3cret!" \
  --role orders_reader \
  --projectId <PROJECT_ID>
```

Or use the Admin API for fine-grained privilege control.

```bash
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Content-Type: application/json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/customDBRoles/roles" \
  --data '{
    "roleName": "orders_reader",
    "actions": [
      {
        "action": "FIND",
        "resources": [{ "db": "orders_db", "collection": "orders" }]
      }
    ]
  }'
```

## Provisioning with Terraform

```hcl
resource "mongodbatlas_database_user" "app_service" {
  project_id         = mongodbatlas_project.production.id
  username           = "app_service"
  password           = var.db_password
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "app_db"
  }

  scopes {
    name = "production-cluster"
    type = "CLUSTER"
  }
}
```

## Summary

Atlas access control operates at two layers: UI and API access through organization and project roles, and data access through database user roles. Use project roles to separate cluster management from data access, create custom database roles to enforce collection-level least privilege, and use Terraform or the Atlas CLI to provision users consistently across environments.
