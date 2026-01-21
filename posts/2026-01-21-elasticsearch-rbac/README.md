# How to Implement Role-Based Access Control in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, RBAC, Security, Access Control, Users, Roles, Privileges

Description: A comprehensive guide to implementing Role-Based Access Control (RBAC) in Elasticsearch, covering user management, role creation, privilege assignment, and security best practices.

---

Role-Based Access Control (RBAC) in Elasticsearch allows you to control who can access what data and perform which operations. This guide covers complete RBAC implementation from basic user management to advanced privilege configurations.

## Understanding Elasticsearch Security Model

Elasticsearch RBAC consists of:

- **Users** - Identities that authenticate to the cluster
- **Roles** - Collections of privileges
- **Privileges** - Permissions to perform actions
- **Role Mappings** - Link external identities to roles

## Enabling Security

First, ensure security is enabled in `elasticsearch.yml`:

```yaml
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
# Additional TLS configuration...
```

Set up built-in user passwords:

```bash
/usr/share/elasticsearch/bin/elasticsearch-setup-passwords interactive
```

## Built-in Roles

Elasticsearch includes several built-in roles:

```bash
# List all built-in roles
curl -u elastic:password -X GET "localhost:9200/_security/role?pretty"
```

Key built-in roles:

| Role | Description |
|------|-------------|
| superuser | Full cluster access |
| kibana_system | Kibana server access |
| logstash_system | Logstash monitoring |
| beats_system | Beats monitoring |
| monitoring_user | Monitoring read access |
| remote_monitoring_agent | Remote monitoring |
| ingest_admin | Manage ingest pipelines |

## Creating Custom Roles

### Basic Role Creation

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/logs_reader" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["logs-*"],
      "privileges": ["read", "view_index_metadata"]
    }
  ]
}'
```

### Role with Write Access

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/logs_writer" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["logs-*"],
      "privileges": ["create_index", "write", "read", "view_index_metadata"]
    }
  ]
}'
```

### Role with Full Index Management

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/logs_admin" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor", "manage_index_templates"],
  "indices": [
    {
      "names": ["logs-*"],
      "privileges": ["all"]
    }
  ]
}'
```

## Index Privileges Reference

Common index privileges:

| Privilege | Description |
|-----------|-------------|
| read | Read operations (search, get) |
| write | Write operations (index, delete) |
| create | Create documents |
| delete | Delete documents |
| create_index | Create indices |
| delete_index | Delete indices |
| view_index_metadata | View index metadata |
| manage | Full index management |
| all | All privileges |

## Cluster Privileges Reference

Common cluster privileges:

| Privilege | Description |
|-----------|-------------|
| monitor | Read-only cluster state |
| manage | Full cluster management |
| manage_security | Manage users and roles |
| manage_index_templates | Manage templates |
| manage_ilm | Manage ILM policies |
| manage_pipeline | Manage ingest pipelines |
| all | All cluster privileges |

## Creating Users

### Basic User Creation

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/user/john_doe" -H 'Content-Type: application/json' -d'
{
  "password": "secure-password-123",
  "roles": ["logs_reader"],
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "metadata": {
    "department": "engineering"
  }
}'
```

### User with Multiple Roles

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/user/jane_admin" -H 'Content-Type: application/json' -d'
{
  "password": "secure-password-456",
  "roles": ["logs_admin", "monitoring_user"],
  "full_name": "Jane Admin",
  "email": "jane.admin@example.com"
}'
```

### List Users

```bash
curl -u elastic:password -X GET "localhost:9200/_security/user?pretty"
```

### Get Specific User

```bash
curl -u elastic:password -X GET "localhost:9200/_security/user/john_doe?pretty"
```

### Update User

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/user/john_doe" -H 'Content-Type: application/json' -d'
{
  "roles": ["logs_reader", "logs_writer"],
  "full_name": "John Doe",
  "email": "john.doe@example.com"
}'
```

### Change Password

```bash
curl -u elastic:password -X POST "localhost:9200/_security/user/john_doe/_password" -H 'Content-Type: application/json' -d'
{
  "password": "new-secure-password"
}'
```

### Disable User

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/user/john_doe/_disable"
```

### Delete User

```bash
curl -u elastic:password -X DELETE "localhost:9200/_security/user/john_doe"
```

## Advanced Role Configuration

### Document-Level Security

Restrict access to specific documents:

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/logs_team_a" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["logs-*"],
      "privileges": ["read"],
      "query": {
        "term": {
          "team": "team-a"
        }
      }
    }
  ]
}'
```

### Field-Level Security

Restrict access to specific fields:

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/logs_restricted" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["logs-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": ["timestamp", "message", "level", "service"]
      }
    }
  ]
}'
```

### Combined Document and Field Security

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/logs_team_a_restricted" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["logs-*"],
      "privileges": ["read"],
      "query": {
        "term": {
          "team": "team-a"
        }
      },
      "field_security": {
        "grant": ["timestamp", "message", "level"],
        "except": ["internal_id", "debug_info"]
      }
    }
  ]
}'
```

## Multi-Tenancy with RBAC

### Tenant-Specific Roles

```bash
# Role for Tenant A
curl -u elastic:password -X PUT "localhost:9200/_security/role/tenant_a" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["tenant-a-*"],
      "privileges": ["read", "write", "create_index"]
    }
  ]
}'

# Role for Tenant B
curl -u elastic:password -X PUT "localhost:9200/_security/role/tenant_b" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["tenant-b-*"],
      "privileges": ["read", "write", "create_index"]
    }
  ]
}'
```

### Index Pattern-Based Isolation

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/project_analytics" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["analytics-project-123-*"],
      "privileges": ["read", "write"]
    },
    {
      "names": ["shared-reference-*"],
      "privileges": ["read"]
    }
  ]
}'
```

## Application and Service Accounts

### Create Service Account Role

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/app_service" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["app-data-*"],
      "privileges": ["read", "write", "create_index", "delete_index"]
    }
  ],
  "applications": [
    {
      "application": "myapp",
      "privileges": ["read", "write"],
      "resources": ["*"]
    }
  ]
}'
```

### Create Service User

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/user/app_service_user" -H 'Content-Type: application/json' -d'
{
  "password": "service-account-password",
  "roles": ["app_service"],
  "full_name": "Application Service Account",
  "metadata": {
    "service": "backend-api",
    "environment": "production"
  }
}'
```

### API Keys for Services

```bash
# Create API key
curl -u elastic:password -X POST "localhost:9200/_security/api_key" -H 'Content-Type: application/json' -d'
{
  "name": "backend-api-key",
  "role_descriptors": {
    "app_role": {
      "cluster": ["monitor"],
      "indices": [
        {
          "names": ["app-data-*"],
          "privileges": ["read", "write"]
        }
      ]
    }
  },
  "expiration": "30d"
}'

# Response contains api_key to use
# Use as: Authorization: ApiKey <base64(id:api_key)>
```

## Role Mappings

Map external identities (LDAP, SAML, etc.) to roles:

```bash
# Map LDAP group to role
curl -u elastic:password -X PUT "localhost:9200/_security/role_mapping/admins" -H 'Content-Type: application/json' -d'
{
  "roles": ["superuser"],
  "enabled": true,
  "rules": {
    "field": {
      "groups": "cn=admins,ou=groups,dc=example,dc=com"
    }
  }
}'

# Map by realm and username pattern
curl -u elastic:password -X PUT "localhost:9200/_security/role_mapping/developers" -H 'Content-Type: application/json' -d'
{
  "roles": ["logs_reader", "monitoring_user"],
  "enabled": true,
  "rules": {
    "all": [
      {"field": {"realm.name": "ldap1"}},
      {"field": {"groups": "cn=developers,ou=groups,dc=example,dc=com"}}
    ]
  }
}'
```

## Testing Permissions

### Check User Privileges

```bash
# Check if user has specific privileges
curl -u john_doe:password -X POST "localhost:9200/_security/user/_has_privileges" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor", "manage"],
  "index": [
    {
      "names": ["logs-*"],
      "privileges": ["read", "write"]
    }
  ]
}'
```

### Authenticate and Get User Info

```bash
curl -u john_doe:password -X GET "localhost:9200/_security/_authenticate?pretty"
```

### Test Role-Specific Access

```bash
# Test read access
curl -u john_doe:password -X GET "localhost:9200/logs-2024.01.21/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {"match_all": {}},
  "size": 1
}'

# Test write access (should fail for read-only users)
curl -u john_doe:password -X POST "localhost:9200/logs-2024.01.21/_doc" -H 'Content-Type: application/json' -d'
{
  "message": "test",
  "timestamp": "2024-01-21T00:00:00Z"
}'
```

## Common RBAC Patterns

### Developer Role (Read-Only)

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/developer" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["logs-*", "metrics-*", "traces-*"],
      "privileges": ["read", "view_index_metadata"]
    }
  ]
}'
```

### Operations Role (Monitoring and Basic Management)

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/operations" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor", "manage_index_templates", "manage_ilm"],
  "indices": [
    {
      "names": ["*"],
      "privileges": ["monitor", "view_index_metadata"]
    },
    {
      "names": ["logs-*", "metrics-*"],
      "privileges": ["manage"]
    }
  ]
}'
```

### Data Engineer Role (Full Data Access)

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/data_engineer" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor", "manage_index_templates", "manage_pipeline", "manage_ilm"],
  "indices": [
    {
      "names": ["*"],
      "privileges": ["all"]
    }
  ]
}'
```

### Security Admin Role

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/security_admin" -H 'Content-Type: application/json' -d'
{
  "cluster": ["manage_security", "monitor"],
  "indices": [
    {
      "names": [".security*"],
      "privileges": ["all"]
    }
  ]
}'
```

## Best Practices

### 1. Principle of Least Privilege

Grant only the minimum permissions needed:

```bash
# Good - specific indices and minimal privileges
{
  "indices": [
    {
      "names": ["logs-app-production-*"],
      "privileges": ["read"]
    }
  ]
}

# Avoid - overly broad access
{
  "indices": [
    {
      "names": ["*"],
      "privileges": ["all"]
    }
  ]
}
```

### 2. Use Role Inheritance

Create base roles and combine them:

```bash
# Base monitoring role
curl -u elastic:password -X PUT "localhost:9200/_security/role/base_monitoring" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"]
}'

# User with multiple roles
curl -u elastic:password -X PUT "localhost:9200/_security/user/power_user" -H 'Content-Type: application/json' -d'
{
  "password": "password",
  "roles": ["base_monitoring", "logs_reader", "metrics_reader"]
}'
```

### 3. Regular Audits

Periodically review users and roles:

```bash
# List all users
curl -u elastic:password -X GET "localhost:9200/_security/user?pretty"

# List all roles
curl -u elastic:password -X GET "localhost:9200/_security/role?pretty"

# Check user permissions
curl -u elastic:password -X GET "localhost:9200/_security/user/john_doe?pretty"
```

### 4. Use API Keys for Applications

Prefer API keys over user credentials for applications:

```bash
curl -u elastic:password -X POST "localhost:9200/_security/api_key" -H 'Content-Type: application/json' -d'
{
  "name": "application-key",
  "expiration": "90d",
  "role_descriptors": {
    "app_role": {
      "cluster": ["monitor"],
      "indices": [
        {"names": ["app-*"], "privileges": ["read", "write"]}
      ]
    }
  }
}'
```

## Summary

Implementing RBAC in Elasticsearch involves:

1. **Enable security** in Elasticsearch configuration
2. **Create roles** with appropriate cluster and index privileges
3. **Create users** and assign roles
4. **Use document and field-level security** for fine-grained access
5. **Configure role mappings** for external identity providers
6. **Test permissions** to verify access controls
7. **Follow best practices** like least privilege and regular audits

With proper RBAC configuration, you can ensure that users and applications have exactly the access they need - no more, no less.
