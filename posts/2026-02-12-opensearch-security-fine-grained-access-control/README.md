# How to Configure OpenSearch Security with Fine-Grained Access Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Security, Access Control

Description: A detailed guide to configuring fine-grained access control in Amazon OpenSearch Service, including role mapping, document-level security, and field-level security.

---

Running a shared OpenSearch cluster for multiple teams or applications means you need to control who can see what. Fine-grained access control (FGAC) in Amazon OpenSearch Service lets you define permissions at the index, document, and even field level. It's built on the OpenSearch Security plugin and gives you granular control without running separate clusters for each team.

This guide covers enabling FGAC, creating roles and role mappings, and setting up document-level and field-level security.

## Enabling Fine-Grained Access Control

FGAC needs to be enabled when you create or update your OpenSearch domain. It requires encryption at rest, node-to-node encryption, and HTTPS enforcement:

```bash
# Create an OpenSearch domain with fine-grained access control enabled
aws opensearch create-domain \
    --domain-name "secure-search" \
    --engine-version "OpenSearch_2.11" \
    --cluster-config '{
        "InstanceType": "r6g.large.search",
        "InstanceCount": 3,
        "DedicatedMasterEnabled": true,
        "DedicatedMasterType": "r6g.large.search",
        "DedicatedMasterCount": 3
    }' \
    --ebs-options '{
        "EBSEnabled": true,
        "VolumeType": "gp3",
        "VolumeSize": 100
    }' \
    --encryption-at-rest-options '{"Enabled": true}' \
    --node-to-node-encryption-options '{"Enabled": true}' \
    --domain-endpoint-options '{"EnforceHTTPS": true, "TLSSecurityPolicy": "Policy-Min-TLS-1-2-2019-07"}' \
    --advanced-security-options '{
        "Enabled": true,
        "InternalUserDatabaseEnabled": true,
        "MasterUserOptions": {
            "MasterUserName": "admin",
            "MasterUserPassword": "YourStr0ngP@ssword!"
        }
    }'
```

The `InternalUserDatabaseEnabled` flag creates an internal user database for basic authentication. You can also use IAM-based authentication or SAML for single sign-on.

## Understanding the Security Model

OpenSearch Security has several layers:

1. **Users** - Authenticated identities (internal users or IAM roles)
2. **Roles** - Define permissions (what actions on which indexes)
3. **Role mappings** - Connect users or IAM roles to OpenSearch security roles
4. **Action groups** - Predefined sets of permissions you can assign to roles

The flow is: a user authenticates, gets mapped to one or more roles, and those roles determine what they can do.

## Creating Security Roles

You create roles using the OpenSearch Security API. Here's how to create a role that gives read-only access to specific indexes:

```bash
# Create a read-only role for the analytics team
# Only allows searching logs-* indexes
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/roles/analytics_reader" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "cluster_permissions": [
            "cluster_composite_ops_ro"
        ],
        "index_permissions": [
            {
                "index_patterns": ["logs-*"],
                "allowed_actions": [
                    "read",
                    "search"
                ]
            }
        ]
    }'
```

A role for the ingestion pipeline that can write but not read other indexes:

```bash
# Create a write role for the log ingestion pipeline
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/roles/log_writer" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "cluster_permissions": [
            "cluster_monitor",
            "indices:admin/template/get",
            "indices:admin/template/put"
        ],
        "index_permissions": [
            {
                "index_patterns": ["logs-*"],
                "allowed_actions": [
                    "crud",
                    "create_index"
                ]
            }
        ]
    }'
```

## Role Mappings

Once roles are defined, map them to users or IAM roles:

```bash
# Map an IAM role to the analytics_reader security role
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/rolesmapping/analytics_reader" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "backend_roles": [
            "arn:aws:iam::123456789012:role/AnalyticsTeamRole"
        ],
        "users": [
            "analyst_jane",
            "analyst_bob"
        ]
    }'

# Map the ingestion pipeline IAM role to the log_writer security role
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/rolesmapping/log_writer" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "backend_roles": [
            "arn:aws:iam::123456789012:role/LogIngestionRole"
        ]
    }'
```

## Document-Level Security

This is where FGAC gets really powerful. Document-level security (DLS) lets you filter which documents a role can see within an index. For example, you might want the US team to only see US-region logs and the EU team to only see EU-region logs.

```bash
# Create a role that can only see US-region documents
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/roles/us_team_reader" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "cluster_permissions": ["cluster_composite_ops_ro"],
        "index_permissions": [
            {
                "index_patterns": ["logs-*"],
                "dls": "{\"bool\": {\"must\": [{\"match\": {\"region\": \"us-east-1\"}}]}}",
                "allowed_actions": ["read", "search"]
            }
        ]
    }'

# Create a role that can only see EU-region documents
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/roles/eu_team_reader" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "cluster_permissions": ["cluster_composite_ops_ro"],
        "index_permissions": [
            {
                "index_patterns": ["logs-*"],
                "dls": "{\"bool\": {\"must\": [{\"match\": {\"region\": \"eu-west-1\"}}]}}",
                "allowed_actions": ["read", "search"]
            }
        ]
    }'
```

When a user in the `us_team_reader` role searches `logs-*`, they only see documents where `region` is `us-east-1`. The filter is applied transparently - the user doesn't even know other documents exist.

## Field-Level Security

Field-level security (FLS) controls which fields within a document a role can see. This is useful for hiding sensitive fields like IP addresses or user identifiers:

```bash
# Create a role that hides sensitive fields from log data
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/roles/restricted_reader" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "cluster_permissions": ["cluster_composite_ops_ro"],
        "index_permissions": [
            {
                "index_patterns": ["logs-*"],
                "fls": ["~ip_address", "~user_id", "~session_token"],
                "allowed_actions": ["read", "search"]
            }
        ]
    }'
```

The tilde (`~`) prefix means "exclude this field." Users with this role will see all fields except `ip_address`, `user_id`, and `session_token`. Alternatively, you can use include mode (without tilde) to specify only the fields that should be visible.

## Field Masking

For cases where you want to show a field exists but hide its actual value, use field masking:

```bash
# Mask sensitive fields with a hash instead of hiding them completely
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/roles/masked_reader" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "cluster_permissions": ["cluster_composite_ops_ro"],
        "index_permissions": [
            {
                "index_patterns": ["logs-*"],
                "masked_fields": ["ip_address", "user_email"],
                "allowed_actions": ["read", "search"]
            }
        ]
    }'
```

Masked fields appear as SHA-256 hashes. Users can still use them for aggregations (like counting unique masked values) but can't see the actual data.

## Setting Up Tenant-Based Dashboards

OpenSearch tenants let different teams have their own private dashboards and saved searches:

```bash
# Create a private tenant for the analytics team
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/tenants/analytics_tenant" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "description": "Private workspace for the analytics team"
    }'

# Grant the analytics role access to its tenant
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/roles/analytics_dashboard_user" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "cluster_permissions": ["cluster_composite_ops_ro"],
        "index_permissions": [
            {
                "index_patterns": ["logs-*"],
                "allowed_actions": ["read", "search"]
            }
        ],
        "tenant_permissions": [
            {
                "tenant_patterns": ["analytics_tenant"],
                "allowed_actions": ["kibana_all_write"]
            }
        ]
    }'
```

## Audit Logging

Enable audit logging to track who accessed what:

```bash
# Enable audit logging for security events
curl -XPUT "https://search-secure-search.us-east-1.es.amazonaws.com/_plugins/_security/api/audit/config" \
    -u admin:YourStr0ngP@ssword! \
    -H "Content-Type: application/json" \
    -d '{
        "enabled": true,
        "audit": {
            "enable_rest": true,
            "disabled_rest_categories": ["AUTHENTICATED"],
            "enable_transport": true,
            "disabled_transport_categories": ["AUTHENTICATED"],
            "resolve_bulk_requests": true,
            "log_request_body": false,
            "resolve_indices": true
        }
    }'
```

Fine-grained access control is essential for any shared OpenSearch deployment. It lets you consolidate multiple use cases into a single cluster while maintaining strict data isolation. For building dashboards on top of this secured data, see [building log analytics dashboards in OpenSearch](https://oneuptime.com/blog/post/2026-02-12-log-analytics-dashboards-opensearch/view).
