# How to Secure Elasticsearch with Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Security, Authentication, X-Pack, DevOps, Access Control

Description: A comprehensive guide to securing Elasticsearch with built-in authentication, covering user management, role-based access control, API keys, and security best practices.

---

Securing Elasticsearch is critical for protecting sensitive data and preventing unauthorized access. Elasticsearch 8.x enables security by default, including authentication and TLS encryption. This guide covers setting up and managing authentication, creating users and roles, and implementing security best practices.

## Understanding Elasticsearch Security

Elasticsearch security (formerly X-Pack Security) provides:

- **Authentication**: Verify user identity
- **Authorization**: Control what users can do
- **Encryption**: Protect data in transit and at rest
- **Audit logging**: Track security events

## Enabling Security (Elasticsearch 7.x and Earlier)

For Elasticsearch 8.x, security is enabled by default. For older versions:

Edit `/etc/elasticsearch/elasticsearch.yml`:

```yaml
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
```

## Initial Setup and Built-in Users

### Setting Passwords for Built-in Users

Elasticsearch includes several built-in users:

- **elastic**: Superuser account
- **kibana_system**: Used by Kibana to connect
- **logstash_system**: Used by Logstash
- **beats_system**: Used by Beats agents
- **apm_system**: Used by APM Server
- **remote_monitoring_user**: Used for remote monitoring

Set passwords interactively:

```bash
# Interactive password setup
sudo /usr/share/elasticsearch/bin/elasticsearch-setup-passwords interactive
```

Or set them automatically:

```bash
# Auto-generate passwords
sudo /usr/share/elasticsearch/bin/elasticsearch-setup-passwords auto
```

### Resetting the Elastic User Password

```bash
# Reset elastic user password
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic

# Or set a specific password
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic -i
```

## Creating Users

### Using the API

Create a new user:

```bash
curl -k -u elastic:your_password -X POST "https://localhost:9200/_security/user/john_doe" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "secure_password_123",
    "roles": ["developer"],
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "metadata": {
      "department": "engineering"
    }
  }'
```

### Listing Users

```bash
curl -k -u elastic:your_password "https://localhost:9200/_security/user?pretty"
```

### Updating User Password

```bash
curl -k -u elastic:your_password -X POST "https://localhost:9200/_security/user/john_doe/_password" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "new_secure_password_456"
  }'
```

### Deleting a User

```bash
curl -k -u elastic:your_password -X DELETE "https://localhost:9200/_security/user/john_doe"
```

## Role-Based Access Control (RBAC)

### Understanding Privileges

Elasticsearch has two types of privileges:

1. **Cluster privileges**: Control cluster-level operations
2. **Index privileges**: Control index-level operations

Common cluster privileges:
- `all`: Full cluster access
- `monitor`: Read-only cluster monitoring
- `manage`: Cluster management without security
- `manage_security`: Security management

Common index privileges:
- `all`: Full index access
- `read`: Read index data
- `write`: Write to index
- `create_index`: Create new indices
- `delete_index`: Delete indices
- `manage`: Index management

### Creating Custom Roles

Create a read-only role for logs:

```bash
curl -k -u elastic:your_password -X PUT "https://localhost:9200/_security/role/logs_reader" \
  -H "Content-Type: application/json" \
  -d '{
    "cluster": ["monitor"],
    "indices": [
      {
        "names": ["logs-*", "metrics-*"],
        "privileges": ["read", "view_index_metadata"]
      }
    ]
  }'
```

Create a developer role with write access:

```bash
curl -k -u elastic:your_password -X PUT "https://localhost:9200/_security/role/developer" \
  -H "Content-Type: application/json" \
  -d '{
    "cluster": ["monitor", "manage_index_templates"],
    "indices": [
      {
        "names": ["dev-*", "test-*"],
        "privileges": ["all"]
      },
      {
        "names": ["prod-*"],
        "privileges": ["read"]
      }
    ]
  }'
```

Create an admin role:

```bash
curl -k -u elastic:your_password -X PUT "https://localhost:9200/_security/role/admin" \
  -H "Content-Type: application/json" \
  -d '{
    "cluster": ["all"],
    "indices": [
      {
        "names": ["*"],
        "privileges": ["all"]
      }
    ]
  }'
```

### Document-Level Security

Restrict access to specific documents:

```bash
curl -k -u elastic:your_password -X PUT "https://localhost:9200/_security/role/team_a_reader" \
  -H "Content-Type: application/json" \
  -d '{
    "cluster": ["monitor"],
    "indices": [
      {
        "names": ["projects"],
        "privileges": ["read"],
        "query": {
          "match": {
            "team": "team_a"
          }
        }
      }
    ]
  }'
```

### Field-Level Security

Restrict access to specific fields:

```bash
curl -k -u elastic:your_password -X PUT "https://localhost:9200/_security/role/limited_reader" \
  -H "Content-Type: application/json" \
  -d '{
    "cluster": ["monitor"],
    "indices": [
      {
        "names": ["employees"],
        "privileges": ["read"],
        "field_security": {
          "grant": ["name", "department", "title"],
          "except": ["salary", "ssn"]
        }
      }
    ]
  }'
```

### Listing Roles

```bash
curl -k -u elastic:your_password "https://localhost:9200/_security/role?pretty"
```

### Assigning Roles to Users

```bash
curl -k -u elastic:your_password -X PUT "https://localhost:9200/_security/user/jane_doe" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "secure_password",
    "roles": ["developer", "logs_reader"],
    "full_name": "Jane Doe",
    "email": "jane.doe@example.com"
  }'
```

## API Keys

API keys provide a secure way to authenticate programmatic access.

### Creating an API Key

```bash
curl -k -u elastic:your_password -X POST "https://localhost:9200/_security/api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app-key",
    "expiration": "30d",
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
    "metadata": {
      "application": "my-app",
      "environment": "production"
    }
  }'
```

Response:

```json
{
  "id": "VuaCfGcBCdbkQm-e5aOx",
  "name": "my-app-key",
  "expiration": 1735689600000,
  "api_key": "ui2lp2axTNmsyakw9tvNnw",
  "encoded": "VnVhQ2ZHY0JDZGJrUW0tZTVhT3g6dWkybHAyYXhUTm1zeWFrdzl0dk5udw=="
}
```

### Using API Keys

Use the encoded key in the Authorization header:

```bash
curl -k -H "Authorization: ApiKey VnVhQ2ZHY0JDZGJrUW0tZTVhT3g6dWkybHAyYXhUTm1zeWFrdzl0dk5udw==" \
  "https://localhost:9200/app-data-*/_search"
```

Or use the id and api_key separately:

```bash
curl -k -H "Authorization: ApiKey VuaCfGcBCdbkQm-e5aOx:ui2lp2axTNmsyakw9tvNnw" \
  "https://localhost:9200/app-data-*/_search"
```

### Listing API Keys

```bash
# List all API keys
curl -k -u elastic:your_password "https://localhost:9200/_security/api_key?pretty"

# List API keys for current user
curl -k -u elastic:your_password "https://localhost:9200/_security/api_key?owner=true&pretty"
```

### Invalidating API Keys

```bash
# Invalidate by ID
curl -k -u elastic:your_password -X DELETE "https://localhost:9200/_security/api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["VuaCfGcBCdbkQm-e5aOx"]
  }'

# Invalidate by name
curl -k -u elastic:your_password -X DELETE "https://localhost:9200/_security/api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app-key"
  }'
```

## Service Tokens

Service tokens are used for Kibana and other Elastic services:

```bash
# Create a service token for Kibana
sudo /usr/share/elasticsearch/bin/elasticsearch-service-tokens create elastic/kibana my-kibana-token
```

## File-Based Authentication

For simpler setups, use file-based authentication:

### Create User File

Edit `/etc/elasticsearch/users`:

```
admin:$2a$10$...hashed_password...
readonly_user:$2a$10$...hashed_password...
```

Generate password hashes:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-users passwd admin
```

### Create Role Mapping File

Edit `/etc/elasticsearch/users_roles`:

```
superuser:admin
viewer:readonly_user
```

### Configure File Realm

Edit `/etc/elasticsearch/elasticsearch.yml`:

```yaml
xpack.security.authc.realms.file.file1:
  order: 0
```

## LDAP/Active Directory Integration

### Configure LDAP Realm

Edit `/etc/elasticsearch/elasticsearch.yml`:

```yaml
xpack.security.authc.realms.ldap.ldap1:
  order: 1
  url: "ldaps://ldap.example.com:636"
  bind_dn: "cn=elasticsearch,ou=services,dc=example,dc=com"
  user_search:
    base_dn: "ou=users,dc=example,dc=com"
    filter: "(cn={0})"
  group_search:
    base_dn: "ou=groups,dc=example,dc=com"
  unmapped_groups_as_roles: false
```

Store the bind password securely:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-keystore add xpack.security.authc.realms.ldap.ldap1.secure_bind_password
```

### LDAP Role Mapping

Create role mappings for LDAP groups:

```bash
curl -k -u elastic:your_password -X PUT "https://localhost:9200/_security/role_mapping/ldap_admins" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": ["admin"],
    "enabled": true,
    "rules": {
      "field": {
        "groups": "cn=elasticsearch-admins,ou=groups,dc=example,dc=com"
      }
    }
  }'
```

## Anonymous Access

Enable limited anonymous access for specific use cases:

```yaml
# /etc/elasticsearch/elasticsearch.yml
xpack.security.authc:
  anonymous:
    username: anonymous_user
    roles: anonymous_role
    authz_exception: true
```

Create the anonymous role:

```bash
curl -k -u elastic:your_password -X PUT "https://localhost:9200/_security/role/anonymous_role" \
  -H "Content-Type: application/json" \
  -d '{
    "cluster": [],
    "indices": [
      {
        "names": ["public-*"],
        "privileges": ["read"]
      }
    ]
  }'
```

## Securing Kibana Access

Configure Kibana to authenticate with Elasticsearch:

Edit `/etc/kibana/kibana.yml`:

```yaml
elasticsearch.hosts: ["https://localhost:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "kibana_password"
elasticsearch.ssl.certificateAuthorities: ["/etc/kibana/certs/ca.crt"]
elasticsearch.ssl.verificationMode: certificate

# Enable Kibana security
xpack.security.enabled: true
xpack.encryptedSavedObjects.encryptionKey: "32-character-minimum-encryption-key"
```

## Audit Logging

Enable security audit logging:

```yaml
# /etc/elasticsearch/elasticsearch.yml
xpack.security.audit.enabled: true
xpack.security.audit.logfile.events.include:
  - access_granted
  - access_denied
  - authentication_failed
  - connection_denied
  - tampered_request
  - run_as_granted
  - run_as_denied
```

View audit logs:

```bash
tail -f /var/log/elasticsearch/audit.json
```

## Security Best Practices

### 1. Use Strong Passwords

Enforce password requirements:

```yaml
# /etc/elasticsearch/elasticsearch.yml
xpack.security.authc.password_hashing.algorithm: bcrypt
```

### 2. Implement Least Privilege

Create specific roles with minimal required permissions:

```bash
# Example: Create a role for a specific application
curl -k -u elastic:your_password -X PUT "https://localhost:9200/_security/role/app_service" \
  -H "Content-Type: application/json" \
  -d '{
    "cluster": [],
    "indices": [
      {
        "names": ["app-data"],
        "privileges": ["read", "write", "create_index"]
      }
    ]
  }'
```

### 3. Use API Keys for Applications

Generate unique API keys for each application:

```bash
# Create API key for specific service
curl -k -u elastic:your_password -X POST "https://localhost:9200/_security/api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order-service-prod",
    "expiration": "90d",
    "role_descriptors": {
      "order_service": {
        "indices": [
          {
            "names": ["orders-*"],
            "privileges": ["read", "write"]
          }
        ]
      }
    }
  }'
```

### 4. Regular Security Audits

Review users and roles periodically:

```bash
# List all users
curl -k -u elastic:your_password "https://localhost:9200/_security/user?pretty"

# List all roles
curl -k -u elastic:your_password "https://localhost:9200/_security/role?pretty"

# List all role mappings
curl -k -u elastic:your_password "https://localhost:9200/_security/role_mapping?pretty"
```

### 5. Rotate Credentials

Implement regular credential rotation:

```bash
# Rotate API key
# 1. Create new key
# 2. Update application configuration
# 3. Invalidate old key
curl -k -u elastic:your_password -X DELETE "https://localhost:9200/_security/api_key" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["old_key_id"]}'
```

## Troubleshooting Authentication

### Check Authentication Status

```bash
curl -k -u elastic:your_password "https://localhost:9200/_security/_authenticate?pretty"
```

### Common Issues

**1. Authentication failed**
```bash
# Check if user exists
curl -k -u elastic:your_password "https://localhost:9200/_security/user/username?pretty"

# Verify password
curl -k -u username:password "https://localhost:9200/_security/_authenticate?pretty"
```

**2. Authorization failed**
```bash
# Check user's roles
curl -k -u elastic:your_password "https://localhost:9200/_security/user/username?pretty"

# Check role privileges
curl -k -u elastic:your_password "https://localhost:9200/_security/role/rolename?pretty"
```

**3. API key issues**
```bash
# Check API key info
curl -k -u elastic:your_password "https://localhost:9200/_security/api_key?id=key_id&pretty"
```

## Conclusion

Securing Elasticsearch with proper authentication is essential for protecting your data. Key takeaways:

1. **Use built-in security** - Elasticsearch 8.x enables security by default
2. **Implement RBAC** - Create specific roles with minimal required permissions
3. **Use API keys** - For programmatic access instead of user credentials
4. **Enable audit logging** - Track all security-related events
5. **Regular audits** - Review users, roles, and access patterns periodically
6. **Integrate with existing identity providers** - Use LDAP/AD for enterprise environments

By following these security practices, you can protect your Elasticsearch cluster from unauthorized access while providing appropriate access to legitimate users and applications.
