# How to Configure Kibana Spaces for Multi-Tenant Log Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kibana, Multi-Tenancy, Security, Elasticsearch, Access Control

Description: Implement Kibana Spaces to create isolated environments for different teams or customers, including space configuration, role-based access control, index pattern restrictions, and dashboard sharing strategies.

---

Kibana Spaces provide logical isolation within a single Kibana instance, allowing multiple teams or customers to work with their own dashboards, visualizations, and index patterns without seeing each other's data. Each space acts as a separate workspace with its own saved objects while sharing the underlying Elasticsearch cluster. This architecture enables multi-tenant deployments without running separate Kibana instances.

## Understanding Kibana Spaces Architecture

Spaces organize Kibana objects into isolated containers. When you create a dashboard, visualization, or saved search, it exists within a specific space. Users access only the spaces they have permissions for, and objects from one space remain invisible in another space.

This isolation extends to all saved objects including dashboards, visualizations, saved searches, index patterns, and maps. However, the underlying data in Elasticsearch remains accessible across spaces. You control data access through index patterns and Elasticsearch security features, not through spaces alone.

A common pattern assigns one space per team or customer, with that space configured to access only relevant indices. Teams see only their dashboards and work with their data, even though everything runs on a shared infrastructure.

## Creating Spaces

Access Space management through Stack Management in Kibana. Navigate to Stack Management > Spaces to see the default space and create new ones.

Create a space for the development team:

```bash
# Using Kibana API to create space
curl -X POST "http://kibana:5601/api/spaces/space" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "id": "dev-team",
    "name": "Development Team",
    "description": "Space for development team logs and dashboards",
    "color": "#00BFB3",
    "initials": "DT",
    "disabledFeatures": [],
    "imageUrl": ""
  }'
```

Create additional spaces for other teams:

```bash
# Production operations space
curl -X POST "http://kibana:5601/api/spaces/space" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "id": "prod-ops",
    "name": "Production Operations",
    "description": "Production monitoring and operations",
    "color": "#E7664C",
    "initials": "PO",
    "disabledFeatures": []
  }'

# Security team space
curl -X POST "http://kibana:5601/api/spaces/space" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "id": "security",
    "name": "Security Team",
    "description": "Security logs and threat analysis",
    "color": "#CC5642",
    "initials": "ST",
    "disabledFeatures": ["ml", "graph"]
  }'
```

The disabledFeatures array lets you hide specific Kibana features within a space, preventing users from accessing Machine Learning or Graph capabilities if not needed.

## Configuring Index Patterns Per Space

Each space needs its own index patterns pointing to the appropriate data. Switch to a space and create index patterns specific to that space's data:

```bash
# Create index pattern in dev-team space
curl -X POST "http://kibana:5601/s/dev-team/api/saved_objects/index-pattern" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "attributes": {
      "title": "dev-logs-*",
      "timeFieldName": "@timestamp"
    }
  }'

# Create index pattern in prod-ops space
curl -X POST "http://kibana:5601/s/prod-ops/api/saved_objects/index-pattern" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "attributes": {
      "title": "prod-logs-*",
      "timeFieldName": "@timestamp"
    }
  }'

# Create index pattern in security space
curl -X POST "http://kibana:5601/s/security/api/saved_objects/index-pattern" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "attributes": {
      "title": "security-logs-*,audit-logs-*",
      "timeFieldName": "@timestamp"
    }
  }'
```

These index patterns exist only within their respective spaces, so users in the dev-team space see only dev-logs-* patterns.

## Setting Up Role-Based Access Control

Spaces work with Elasticsearch security to control who can access which spaces and what they can do there. Create roles that grant specific permissions:

```bash
# Role for development team members
curl -X POST "http://elasticsearch:9200/_security/role/dev_team_role" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "cluster": [],
    "indices": [
      {
        "names": ["dev-logs-*"],
        "privileges": ["read", "view_index_metadata"]
      }
    ],
    "applications": [
      {
        "application": "kibana-.kibana",
        "privileges": ["space_all"],
        "resources": ["space:dev-team"]
      }
    ]
  }'

# Role for production operations
curl -X POST "http://elasticsearch:9200/_security/role/prod_ops_role" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "cluster": [],
    "indices": [
      {
        "names": ["prod-logs-*", "metrics-*"],
        "privileges": ["read", "view_index_metadata"]
      }
    ],
    "applications": [
      {
        "application": "kibana-.kibana",
        "privileges": ["space_all"],
        "resources": ["space:prod-ops"]
      }
    ]
  }'

# Role for security analysts
curl -X POST "http://elasticsearch:9200/_security/role/security_analyst_role" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "cluster": [],
    "indices": [
      {
        "names": ["security-logs-*", "audit-logs-*", "threat-intel-*"],
        "privileges": ["read", "view_index_metadata"]
      }
    ],
    "applications": [
      {
        "application": "kibana-.kibana",
        "privileges": ["space_all"],
        "resources": ["space:security"]
      }
    ]
  }'
```

These roles grant full access to their respective spaces while restricting index access to only relevant data.

## Creating Users with Space Access

Create users and assign them to roles:

```bash
# Create developer user
curl -X POST "http://elasticsearch:9200/_security/user/dev_user" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "password": "dev_password",
    "roles": ["dev_team_role"],
    "full_name": "Development User",
    "email": "dev@example.com"
  }'

# Create production operator user
curl -X POST "http://elasticsearch:9200/_security/user/ops_user" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "password": "ops_password",
    "roles": ["prod_ops_role"],
    "full_name": "Operations User",
    "email": "ops@example.com"
  }'

# Create security analyst user
curl -X POST "http://elasticsearch:9200/_security/user/security_user" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "password": "security_password",
    "roles": ["security_analyst_role"],
    "full_name": "Security Analyst",
    "email": "security@example.com"
  }'
```

Users automatically land in their assigned space when logging into Kibana and cannot see or access other spaces.

## Configuring Cross-Space Access

Some users need access to multiple spaces. Create a role with permissions across spaces:

```bash
# Manager role with access to multiple spaces
curl -X POST "http://elasticsearch:9200/_security/role/manager_role" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "cluster": [],
    "indices": [
      {
        "names": ["dev-logs-*", "prod-logs-*", "metrics-*"],
        "privileges": ["read", "view_index_metadata"]
      }
    ],
    "applications": [
      {
        "application": "kibana-.kibana",
        "privileges": ["space_all"],
        "resources": ["space:dev-team", "space:prod-ops"]
      }
    ]
  }'
```

Users with this role can switch between dev-team and prod-ops spaces using the space selector in Kibana.

## Copying Objects Between Spaces

Share dashboards or visualizations across spaces without duplicating configuration:

```bash
# Copy dashboard from dev-team to prod-ops space
curl -X POST "http://kibana:5601/api/spaces/_copy_saved_objects" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "spaces": ["prod-ops"],
    "objects": [
      {
        "type": "dashboard",
        "id": "dev-dashboard-id"
      }
    ],
    "includeReferences": true,
    "overwrite": false,
    "createNewCopies": false
  }'
```

The includeReferences parameter copies all visualizations and saved searches referenced by the dashboard.

## Bulk Space Configuration

Automate space setup for multiple tenants using scripts:

```bash
#!/bin/bash
# create-customer-space.sh

CUSTOMER=$1
KIBANA_URL="http://kibana:5601"
ES_URL="http://elasticsearch:9200"
CREDS="elastic:password"

# Create space
curl -X POST "${KIBANA_URL}/api/spaces/space" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u "$CREDS" \
  -d "{
    \"id\": \"customer-${CUSTOMER}\",
    \"name\": \"Customer ${CUSTOMER}\",
    \"description\": \"Space for customer ${CUSTOMER}\",
    \"color\": \"#0077CC\",
    \"initials\": \"C${CUSTOMER}\"
  }"

# Create index pattern
curl -X POST "${KIBANA_URL}/s/customer-${CUSTOMER}/api/saved_objects/index-pattern" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u "$CREDS" \
  -d "{
    \"attributes\": {
      \"title\": \"customer-${CUSTOMER}-logs-*\",
      \"timeFieldName\": \"@timestamp\"
    }
  }"

# Create role
curl -X POST "${ES_URL}/_security/role/customer_${CUSTOMER}_role" \
  -H "Content-Type: application/json" \
  -u "$CREDS" \
  -d "{
    \"indices\": [
      {
        \"names\": [\"customer-${CUSTOMER}-logs-*\"],
        \"privileges\": [\"read\", \"view_index_metadata\"]
      }
    ],
    \"applications\": [
      {
        \"application\": \"kibana-.kibana\",
        \"privileges\": [\"space_all\"],
        \"resources\": [\"space:customer-${CUSTOMER}\"]
      }
    ]
  }"

echo "Space created for customer ${CUSTOMER}"
```

Run for multiple customers:

```bash
for customer in ACME-001 ACME-002 ACME-003; do
  ./create-customer-space.sh $customer
done
```

## Managing Space Features

Control which Kibana features are available per space:

```bash
# Disable certain features in a space
curl -X PUT "http://kibana:5601/api/spaces/space/dev-team" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "id": "dev-team",
    "name": "Development Team",
    "disabledFeatures": ["ml", "apm", "canvas", "graph"],
    "description": "Development team space with limited features"
  }'
```

This prevents users from accessing features they don't need, simplifying the interface and reducing potential confusion.

## Monitoring Space Usage

Track which spaces are actively used and by whom:

```bash
# Get list of all spaces
curl -X GET "http://kibana:5601/api/spaces/space" \
  -H "kbn-xsrf: true" \
  -u elastic:password | jq

# Count objects per space
curl -X GET "http://kibana:5601/s/dev-team/api/saved_objects/_find?type=dashboard" \
  -H "kbn-xsrf: true" \
  -u elastic:password | jq '.total'

# List users with access to a space
curl -X GET "http://elasticsearch:9200/_security/role/dev_team_role" \
  -u elastic:password | jq
```

Set up alerts for space creation or modification:

```bash
# Audit space changes through Elasticsearch audit logs
curl -X GET "http://elasticsearch:9200/.security-audit-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          {
            "term": {
              "event.action": "space_create"
            }
          }
        ]
      }
    }
  }'
```

## Default Space Configuration

Set which space users land in by default:

```bash
# Configure default space per user through user profile
curl -X PUT "http://kibana:5601/internal/spaces/_active_space" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u dev_user:dev_password \
  -d '{
    "id": "dev-team"
  }'
```

Users see their default space immediately upon login without needing to navigate.

## Space Migration and Backup

Export space configuration for backup or migration:

```bash
# Export all objects from a space
curl -X POST "http://kibana:5601/s/dev-team/api/saved_objects/_export" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "type": ["dashboard", "visualization", "search", "index-pattern"],
    "includeReferencesDeep": true
  }' > dev-team-export.ndjson

# Import objects into another space
curl -X POST "http://kibana:5601/s/prod-ops/api/saved_objects/_import" \
  -H "kbn-xsrf: true" \
  -u elastic:password \
  --form file=@dev-team-export.ndjson
```

This enables disaster recovery and space replication across environments.

## Conclusion

Kibana Spaces provide effective multi-tenancy for teams and customers sharing a single Elastic Stack deployment. By combining spaces with proper role-based access control and index pattern configuration, you create secure, isolated environments where users see only their relevant data and dashboards. Start with clear separation of data at the index level, create spaces that map to organizational boundaries, and use roles to enforce access control. The result is a scalable multi-tenant logging platform that maintains security and usability without operational overhead of multiple deployments.
