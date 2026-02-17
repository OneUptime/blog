# How to Configure Azure Managed Grafana Role-Based Access Control and Team Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Managed Grafana, RBAC, Access Control, Teams, Azure Active Directory, Permissions

Description: Learn how to configure role-based access control and team permissions in Azure Managed Grafana to manage who can view and edit dashboards and data sources.

---

When you set up Azure Managed Grafana for your organization, one of the first things you need to get right is access control. You do not want every developer having admin access to your production monitoring dashboards, but you also do not want to make it so locked down that people cannot build the dashboards they need. Getting the balance right requires understanding both the Azure RBAC layer and the Grafana-native permission system.

In this post, I will walk through configuring access control at both layers, setting up teams, managing dashboard permissions, and establishing a practical governance model for your Grafana deployment.

## Two Layers of Access Control

Azure Managed Grafana has two distinct access control layers:

**Azure RBAC** - Controls who can access the Grafana instance at all and what Grafana role they get. This is configured through Azure role assignments.

**Grafana-native permissions** - Controls what specific dashboards, folders, and data sources each user or team can access within Grafana. This is configured within the Grafana UI.

Both layers work together. Azure RBAC determines the maximum access level, and Grafana-native permissions can further restrict it.

## Azure RBAC Roles for Managed Grafana

Microsoft provides three built-in roles for Managed Grafana:

**Grafana Admin** - Full access to the Grafana instance, including managing users, teams, organizations, plugins, and all dashboards.

**Grafana Editor** - Can create, edit, and delete dashboards and alerting rules. Cannot manage users or change Grafana settings.

**Grafana Viewer** - Can only view dashboards. Cannot create or edit anything.

Here is how to assign these roles:

```bash
# Grant Grafana Admin role to a user
az role assignment create \
    --assignee "admin-user@company.com" \
    --role "Grafana Admin" \
    --scope "/subscriptions/sub-id/resourceGroups/grafana-rg/providers/Microsoft.Dashboard/grafana/my-grafana-workspace"

# Grant Grafana Editor role to a security group
az role assignment create \
    --assignee "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" \
    --role "Grafana Editor" \
    --scope "/subscriptions/sub-id/resourceGroups/grafana-rg/providers/Microsoft.Dashboard/grafana/my-grafana-workspace"

# Grant Grafana Viewer role to all authenticated users in the tenant
az role assignment create \
    --assignee "ffffffff-1111-2222-3333-444444444444" \
    --role "Grafana Viewer" \
    --scope "/subscriptions/sub-id/resourceGroups/grafana-rg/providers/Microsoft.Dashboard/grafana/my-grafana-workspace"
```

A common setup is:
- Platform/SRE team members get **Grafana Admin**
- Development team leads get **Grafana Editor**
- Everyone else gets **Grafana Viewer**

## Setting Up Grafana Teams

Once users have access through Azure RBAC, you can organize them into teams within Grafana for more granular permission management.

### Creating Teams

In the Grafana UI, navigate to Configuration > Teams.

Click "New Team" and create teams that match your organizational structure:

- **Platform Engineering** - Owns infrastructure dashboards
- **Application Team A** - Owns their application-specific dashboards
- **Application Team B** - Owns their application-specific dashboards
- **Security** - Needs read access to everything
- **Management** - Needs read access to summary dashboards

### Adding Members to Teams

You can add members to teams through the Grafana UI or using the Grafana API:

```bash
# Using the Grafana API to add a member to a team
GRAFANA_URL=$(az grafana show \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg" \
    --query "properties.endpoint" \
    --output tsv)

# Get the team ID first
az grafana api-call \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg" \
    --api-path "/api/teams/search?name=Platform Engineering"

# Add a user to the team (you need the userId and teamId)
az grafana api-call \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg" \
    --api-path "/api/teams/1/members" \
    --method post \
    --body '{"userId": 2}'
```

### Syncing Teams with Azure AD Groups

For larger organizations, manually managing team membership is not practical. You can sync Grafana teams with Azure AD groups. This is done through the Grafana configuration:

1. In the Grafana settings, enable Azure AD group sync
2. Map Azure AD groups to Grafana teams
3. Team membership is automatically updated when users log in

This ensures that when someone is added to or removed from an Azure AD group, their Grafana team membership follows.

## Dashboard Folder Permissions

Grafana uses folders to organize dashboards, and permissions are set at the folder level. This is the primary mechanism for controlling who can see and edit which dashboards.

### Creating a Folder Structure

A practical folder structure for a multi-team organization:

```
/Infrastructure/
    - VM Health Dashboard
    - Network Dashboard
    - Storage Dashboard
/Application-Team-A/
    - Service Health Dashboard
    - API Metrics Dashboard
/Application-Team-B/
    - Frontend Dashboard
    - Backend Dashboard
/Security/
    - Security Alerts Dashboard
    - Compliance Dashboard
/Executive/
    - High Level Health Summary
```

### Setting Folder Permissions

For each folder, set permissions based on team needs:

In the Grafana UI, click on a folder and go to the "Permissions" tab. Remove the default permissions and add team-specific ones:

**Infrastructure folder:**
- Platform Engineering: Editor
- Security: Viewer
- Management: Viewer

**Application Team A folder:**
- Application Team A: Editor
- Platform Engineering: Editor
- Security: Viewer

**Executive folder:**
- Management: Viewer
- Platform Engineering: Editor
- Security: Viewer

### Setting Permissions via API

```bash
# Set folder permissions using the Grafana API
# First, get the folder UID
az grafana folder list \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg"

# Update folder permissions
az grafana api-call \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg" \
    --api-path "/api/folders/infrastructure-uid/permissions" \
    --method post \
    --body '{
        "items": [
            {
                "teamId": 1,
                "permission": 2
            },
            {
                "teamId": 2,
                "permission": 1
            }
        ]
    }'
```

Permission values: 1 = Viewer, 2 = Editor, 4 = Admin.

## Data Source Permissions

In Grafana Enterprise features (available in Azure Managed Grafana Standard tier), you can restrict which data sources each team can query. This is important when you have data sources that contain sensitive data.

For example, you might have a Log Analytics workspace that contains security logs. You want the Security team to query it but not the Application teams.

Navigate to Configuration > Data sources, select the data source, and go to the Permissions tab. Add team-specific permissions there.

## Practical Access Control Patterns

### Pattern 1: Central Platform Team Model

The platform team manages all infrastructure dashboards and grants view access to other teams:

```
Azure RBAC:
- Platform Team: Grafana Admin
- All other teams: Grafana Viewer

Folder Permissions:
- Platform Team edits all folders
- Other teams view only their relevant folders
```

### Pattern 2: Federated Team Model

Each team manages their own dashboards within their designated folder:

```
Azure RBAC:
- Platform Team: Grafana Admin
- All teams: Grafana Editor

Folder Permissions:
- Each team has Editor on their own folder
- Each team has Viewer on shared folders
- No team can edit other teams' folders
```

### Pattern 3: Strict Segregation Model

Teams can only see dashboards relevant to them:

```
Azure RBAC:
- Admins: Grafana Admin
- Everyone else: Grafana Viewer or Grafana Editor

Folder Permissions:
- Each team only has access to their own folder
- Shared dashboards go in a "Common" folder visible to all
```

## Configuring Service Accounts for Automation

For CI/CD pipelines that need to deploy dashboards programmatically, create service accounts instead of using personal credentials:

```bash
# Create a Grafana service account
az grafana service-account create \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg" \
    --service-account "dashboard-deployer" \
    --role "Editor"

# Create a token for the service account
az grafana service-account token create \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg" \
    --service-account "dashboard-deployer" \
    --token "deploy-token" \
    --time-to-live "90d"
```

Store the token securely in Azure Key Vault and use it in your deployment pipelines.

## Auditing Access

Monitor who is accessing your Grafana instance and what they are doing:

```bash
# View Grafana audit logs (available in Standard tier)
az grafana api-call \
    --name "my-grafana-workspace" \
    --resource-group "grafana-rg" \
    --api-path "/api/admin/settings"
```

For Azure-level auditing, check the Activity Log for role assignment changes:

```bash
# Check recent role assignments for the Grafana resource
az monitor activity-log list \
    --resource-group "grafana-rg" \
    --offset 7d \
    --query "[?authorization.action=='Microsoft.Authorization/roleAssignments/write']" \
    --output table
```

## Best Practices

**Use Azure AD groups for role assignments.** Assign Azure RBAC roles to groups, not individuals. This makes onboarding and offboarding seamless.

**Use folders for permission boundaries.** Every dashboard should be in a folder. Dashboards in the General folder inherit the default permissions, which is often too permissive.

**Start restrictive and open up.** It is easier to grant additional access than to take it away.

**Document your access model.** Write down which teams have access to what and why. This is important for compliance and for onboarding new team members.

**Review permissions quarterly.** Access needs change over time. Stale permissions are a security risk.

**Use service accounts for automation.** Never use personal tokens in CI/CD pipelines.

## Summary

Configuring access control for Azure Managed Grafana involves working with both Azure RBAC (for instance-level access) and Grafana-native permissions (for dashboard and folder-level access). By organizing users into teams, creating a logical folder structure, and assigning permissions based on team responsibilities, you can build a governance model that balances security with usability. The key is to plan your access model before building dashboards, so you have the right structure in place from the start.
