# How to configure Grafana organizations for multi-tenancy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Multi-Tenancy, Organizations

Description: Learn how to configure Grafana organizations to implement multi-tenancy with isolated dashboards, data sources, and user access controls.

---

Managing multiple teams or clients within a single Grafana instance requires proper isolation of dashboards, data sources, and user permissions. Grafana organizations provide the foundation for implementing true multi-tenancy, allowing you to separate resources and access controls across different groups while maintaining a unified monitoring infrastructure.

## Understanding Grafana Organizations

Grafana organizations are isolated tenants within a single Grafana instance. Each organization has its own set of dashboards, data sources, users, and teams. Users can belong to multiple organizations with different roles in each, but they can only view resources from one organization at a time.

This separation makes organizations perfect for scenarios like managing multiple clients, separating development and production environments, or isolating different business units within an enterprise.

## Creating and Managing Organizations

You can create organizations through the Grafana UI or API. Using the API provides automation capabilities for large-scale deployments.

```bash
# Create a new organization via API
curl -X POST http://admin:admin@localhost:3000/api/orgs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering Team"
  }'

# List all organizations
curl -X GET http://admin:admin@localhost:3000/api/orgs \
  -H "Content-Type: application/json"
```

When you create an organization, the user who creates it automatically becomes an admin. You'll need to add other users and assign appropriate roles afterward.

```bash
# Add user to organization
curl -X POST http://admin:admin@localhost:3000/api/orgs/2/users \
  -H "Content-Type: application/json" \
  -d '{
    "loginOrEmail": "user@example.com",
    "role": "Viewer"
  }'
```

## Configuring Organization Preferences

Each organization can have its own preferences including home dashboard, timezone, and theme. Setting these preferences ensures consistent experience for all users within the organization.

```bash
# Update organization preferences
curl -X PUT http://admin:admin@localhost:3000/api/org/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "dark",
    "homeDashboardId": 0,
    "timezone": "utc"
  }'
```

You can also set a specific dashboard as the home dashboard for an organization, which is useful for providing a consistent landing page for all users.

## Managing Data Sources Per Organization

Data sources in Grafana are scoped to organizations. This means each organization needs its own data source configuration, even if they connect to the same backend systems. This separation provides security and prevents cross-tenant data access.

```yaml
# datasource.yaml - provision data sources per organization
apiVersion: 1

datasources:
  - name: Prometheus-Org1
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    orgId: 1
    isDefault: true
    jsonData:
      timeInterval: "30s"

  - name: Prometheus-Org2
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    orgId: 2
    isDefault: true
    jsonData:
      timeInterval: "30s"
      # Add custom headers for tenant isolation
      httpHeaderName1: "X-Scope-OrgID"
    secureJsonData:
      httpHeaderValue1: "org2"
```

This configuration creates separate Prometheus data sources for different organizations. The second organization includes a custom header that can be used with multi-tenant Prometheus setups like Cortex or Mimir.

## User Management Across Organizations

Users in Grafana can belong to multiple organizations with different roles in each. The role determines what actions they can perform within that organization.

```bash
# List user's organizations
curl -X GET http://admin:admin@localhost:3000/api/user/orgs \
  -H "Content-Type: application/json"

# Switch user to different organization
curl -X POST http://admin:admin@localhost:3000/api/user/using/2 \
  -H "Content-Type: application/json"

# Update user role in organization
curl -X PATCH http://admin:admin@localhost:3000/api/orgs/2/users/3 \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Editor"
  }'
```

Roles include Admin (full control), Editor (can create and modify dashboards), and Viewer (read-only access). Choose roles based on the principle of least privilege.

## Automating Organization Setup with Terraform

For production deployments, use infrastructure as code to manage organizations consistently. The Grafana Terraform provider supports organization management.

```hcl
# main.tf
terraform {
  required_providers {
    grafana = {
      source  = "grafana/grafana"
      version = "~> 1.40"
    }
  }
}

provider "grafana" {
  url  = "http://localhost:3000"
  auth = "admin:admin"
}

# Create organizations
resource "grafana_organization" "engineering" {
  name = "Engineering Team"
}

resource "grafana_organization" "operations" {
  name = "Operations Team"
}

# Add users to organizations
resource "grafana_organization_user" "eng_user" {
  org_id       = grafana_organization.engineering.id
  login_or_email = "engineer@example.com"
  role         = "Editor"
}

resource "grafana_data_source" "prometheus_eng" {
  org_id = grafana_organization.engineering.id
  type   = "prometheus"
  name   = "Prometheus"
  url    = "http://prometheus:9090"

  json_data_encoded = jsonencode({
    timeInterval = "30s"
  })
}
```

This Terraform configuration creates organizations, adds users, and provisions data sources in a repeatable manner.

## Implementing Multi-Tenant Authentication

When running multi-tenant Grafana, configure authentication to map users to the correct organizations automatically. This is particularly important with OAuth or LDAP.

```ini
# grafana.ini
[auth.generic_oauth]
enabled = true
name = OAuth
allow_sign_up = true
client_id = YOUR_CLIENT_ID
client_secret = YOUR_CLIENT_SECRET
scopes = user:email,read:org
auth_url = https://oauth.provider.com/authorize
token_url = https://oauth.provider.com/token
api_url = https://oauth.provider.com/api/user
allowed_organizations = org1,org2
role_attribute_path = contains(groups[*], 'admin') && 'Admin' || 'Viewer'
```

This configuration automatically assigns users to organizations and roles based on OAuth claims, reducing manual user management overhead.

## Monitoring Organization Usage

Track resource usage per organization to identify heavy users and optimize resource allocation.

```bash
# Script to get dashboard counts per organization
#!/bin/bash

for org_id in {1..10}; do
  count=$(curl -s -X GET \
    -H "X-Grafana-Org-Id: $org_id" \
    http://admin:admin@localhost:3000/api/search?type=dash-db | \
    jq '. | length')

  echo "Organization $org_id: $count dashboards"
done
```

Regular monitoring helps you understand usage patterns and plan capacity accordingly.

## Best Practices for Multi-Tenant Grafana

Keep organization names descriptive and consistent with your naming conventions. Use a prefix or suffix to categorize organizations by environment or customer type.

Limit the number of admin users per organization to maintain security. Most users should be editors or viewers.

Create template dashboards that can be provisioned across organizations to maintain consistency. Use dashboard provisioning with organization-specific variables.

Implement proper backup strategies that account for multiple organizations. Export dashboards and data sources regularly.

Consider using external authentication systems like LDAP or OAuth to simplify user management across organizations and reduce password fatigue.

Set up alerting rules at the organization level to ensure each tenant receives notifications relevant to their resources only.

Organizations provide a powerful way to implement multi-tenancy in Grafana. With proper configuration and automation, you can manage hundreds of isolated tenants within a single Grafana instance while maintaining security and performance.
