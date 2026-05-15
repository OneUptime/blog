# How to Configure RBAC and Organizations in Ansible Automation Controller on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Automation Controller, RBAC, Organization

Description: Configure role-based access control (RBAC) and organizations in Ansible Automation Controller to manage team permissions and resource isolation on RHEL.

---

Ansible Automation Controller (formerly Tower) provides a comprehensive RBAC system that lets you control who can do what across your automation platform. Organizations, teams, and roles form the foundation of access control.

## Creating Organizations

Organizations are the top-level resource isolation boundary.

```bash
# Using the awx CLI tool

# Install the Automation Controller CLI on RHEL 9
sudo dnf install --enablerepo=ansible-automation-platform-2.6-for-rhel-9-x86_64-rpms automation-controller-cli

# Create a new organization
awx organizations create \
  --name "Engineering" \
  --description "Engineering department automation"

awx organizations create \
  --name "Operations" \
  --description "Operations team automation"
```

## Creating Teams

Teams belong to organizations and group users with similar access needs.

```bash
# Create teams within an organization
awx teams create \
  --name "Platform Engineers" \
  --organization "Engineering"

awx teams create \
  --name "SRE Team" \
  --organization "Operations"
```

## Assigning Users to Teams

```bash
# Add a user to a team
awx users create \
  --username "jdoe" \
  --email "jdoe@example.com" \
  --password "TempPass123"

# Associate user with a team
awx users grant \
  --team "Platform Engineers" \
  --role member \
  "jdoe"
```

## Configuring Role-Based Permissions

The controller provides granular roles for each resource type.

```bash
# Grant a team admin access to a project
awx teams grant \
  --project "RHEL Patching" \
  --role admin \
  "Platform Engineers"

# Grant execute permission on a job template
awx teams grant \
  --job_template "Deploy Application" \
  --role execute \
  "SRE Team"

# Grant read-only access to an inventory
awx teams grant \
  --inventory "Production Servers" \
  --role read \
  "SRE Team"
```

## Built-in Role Types

```bash
# Available roles vary by resource type:
# - admin: Full control over the resource
# - execute: Can launch (job templates, workflows)
# - read: View-only access
# - use: Can use resource in other contexts (credentials, inventories)
# - update: Can modify the resource
# - member: Team membership

# List role assignments for a specific team
TEAM_ID=$(awx teams list --name "Platform Engineers" -f jq --filter '.results[0].id')
awx role_team_assignments list --team "$TEAM_ID"
```

## Organization-Level Permissions

```bash
# Grant an organization-wide role
awx users grant \
  --organization "Engineering" \
  --role auditor \
  "auditor_user"

# This gives the user read access to all resources in the org
```

Properly configured RBAC ensures that teams can only access the automation resources they need, reducing the risk of accidental changes to production systems.
