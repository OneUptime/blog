# How to Implement Field-Level Security in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Field-Level Security, Document Security, RBAC, Access Control, Data Protection

Description: A comprehensive guide to implementing field-level and document-level security in Elasticsearch for fine-grained access control over sensitive data.

---

Field-level security (FLS) and document-level security (DLS) in Elasticsearch provide fine-grained access control over your data. FLS restricts which fields users can see, while DLS restricts which documents users can access. This guide covers both features in detail.

## Understanding Field and Document Security

- **Field-Level Security (FLS)** - Controls which fields are visible to users
- **Document-Level Security (DLS)** - Controls which documents users can access

Both are configured through role definitions and work together to provide comprehensive data protection.

## Prerequisites

Ensure security is enabled:

```yaml
# elasticsearch.yml
xpack.security.enabled: true
```

## Field-Level Security

### Basic Field Grant

Allow access to only specific fields:

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/limited_fields" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["customer-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": ["name", "email", "created_at", "status"]
      }
    }
  ]
}'
```

### Field Exclusion

Grant all fields except specific ones:

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/exclude_sensitive" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["customer-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": ["*"],
        "except": ["ssn", "credit_card", "password_hash", "internal_notes"]
      }
    }
  ]
}'
```

### Wildcard Field Patterns

Use wildcards for field groups:

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/pii_restricted" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["users-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": ["*"],
        "except": ["pii.*", "internal.*", "*.encrypted"]
      }
    }
  ]
}'
```

### Nested Field Access

Control access to nested object fields:

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/nested_access" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["orders-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": [
          "order_id",
          "created_at",
          "status",
          "customer.name",
          "customer.email",
          "items.product_name",
          "items.quantity",
          "items.price"
        ],
        "except": [
          "customer.ssn",
          "customer.credit_card",
          "items.cost",
          "internal_margin"
        ]
      }
    }
  ]
}'
```

## Document-Level Security

### Basic Document Query

Restrict access based on document content:

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/team_a_only" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["projects-*"],
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

### Complex Document Queries

Use bool queries for complex conditions:

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/active_public_docs" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["documents-*"],
      "privileges": ["read"],
      "query": {
        "bool": {
          "must": [
            {"term": {"status": "active"}},
            {"term": {"visibility": "public"}}
          ],
          "must_not": [
            {"term": {"confidential": true}}
          ]
        }
      }
    }
  ]
}'
```

### Template Variables in DLS

Use template variables for dynamic queries:

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/own_documents" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["documents-*"],
      "privileges": ["read", "write"],
      "query": {
        "template": {
          "source": {
            "term": {
              "owner": "{{_user.username}}"
            }
          }
        }
      }
    }
  ]
}'
```

### Using User Metadata in Queries

```bash
# Create user with metadata
curl -u elastic:password -X PUT "localhost:9200/_security/user/john_doe" -H 'Content-Type: application/json' -d'
{
  "password": "password123",
  "roles": ["department_role"],
  "metadata": {
    "department": "engineering",
    "region": "us-west"
  }
}'

# Create role using metadata
curl -u elastic:password -X PUT "localhost:9200/_security/role/department_role" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["company-data-*"],
      "privileges": ["read"],
      "query": {
        "template": {
          "source": {
            "bool": {
              "should": [
                {"term": {"department": "{{_user.metadata.department}}"}},
                {"term": {"visibility": "all"}}
              ]
            }
          }
        }
      }
    }
  ]
}'
```

## Combining Field and Document Security

### Complete Example

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/restricted_team_access" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["hr-data-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": ["employee_id", "name", "department", "title", "start_date"],
        "except": ["salary", "ssn", "bank_account", "performance_reviews"]
      },
      "query": {
        "term": {
          "department": "engineering"
        }
      }
    }
  ]
}'
```

### Multi-Index Configuration

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/multi_index_restricted" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["public-*"],
      "privileges": ["read"]
    },
    {
      "names": ["internal-*"],
      "privileges": ["read"],
      "field_security": {
        "except": ["confidential_notes"]
      },
      "query": {
        "term": {"published": true}
      }
    },
    {
      "names": ["sensitive-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": ["id", "title", "summary", "created_at"]
      },
      "query": {
        "bool": {
          "must": [
            {"term": {"classification": "internal"}},
            {"term": {"approved": true}}
          ]
        }
      }
    }
  ]
}'
```

## Multi-Tenancy Implementation

### Tenant Isolation Role

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/tenant_isolated" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["shared-data-*"],
      "privileges": ["read", "write"],
      "query": {
        "template": {
          "source": {
            "term": {
              "tenant_id": "{{_user.metadata.tenant_id}}"
            }
          }
        }
      }
    }
  ]
}'
```

### Create Tenant Users

```bash
# Tenant A user
curl -u elastic:password -X PUT "localhost:9200/_security/user/tenant_a_user" -H 'Content-Type: application/json' -d'
{
  "password": "password123",
  "roles": ["tenant_isolated"],
  "metadata": {
    "tenant_id": "tenant-a"
  }
}'

# Tenant B user
curl -u elastic:password -X PUT "localhost:9200/_security/user/tenant_b_user" -H 'Content-Type: application/json' -d'
{
  "password": "password456",
  "roles": ["tenant_isolated"],
  "metadata": {
    "tenant_id": "tenant-b"
  }
}'
```

## Testing Security Configuration

### Verify Field Restriction

```bash
# As restricted user - should only see allowed fields
curl -u limited_user:password -X GET "localhost:9200/customer-data/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {"match_all": {}},
  "size": 1
}'
```

Expected response with FLS:

```json
{
  "hits": {
    "hits": [
      {
        "_source": {
          "name": "John Doe",
          "email": "john@example.com",
          "created_at": "2024-01-21",
          "status": "active"
        }
      }
    ]
  }
}
```

### Verify Document Restriction

```bash
# As team-a user - should only see team-a documents
curl -u team_a_user:password -X GET "localhost:9200/projects-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {"match_all": {}},
  "aggs": {
    "teams": {
      "terms": {"field": "team.keyword"}
    }
  }
}'
```

Expected response with DLS:

```json
{
  "aggregations": {
    "teams": {
      "buckets": [
        {"key": "team-a", "doc_count": 50}
      ]
    }
  }
}
```

### Check User Privileges

```bash
curl -u restricted_user:password -X POST "localhost:9200/_security/user/_has_privileges" -H 'Content-Type: application/json' -d'
{
  "index": [
    {
      "names": ["customer-data"],
      "privileges": ["read"]
    }
  ]
}'
```

## Common Use Cases

### PII Protection

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/pii_protected" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["users-*", "customers-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": ["*"],
        "except": [
          "ssn",
          "social_security_number",
          "tax_id",
          "credit_card_number",
          "bank_account",
          "passport_number",
          "drivers_license",
          "date_of_birth",
          "home_address.*",
          "phone_number"
        ]
      }
    }
  ]
}'
```

### Healthcare Data (HIPAA)

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/healthcare_limited" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["patient-records-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": [
          "record_id",
          "department",
          "visit_date",
          "diagnosis_code",
          "procedure_code"
        ],
        "except": [
          "patient_name",
          "patient_ssn",
          "patient_address",
          "patient_phone",
          "insurance_details.*",
          "physician_notes"
        ]
      },
      "query": {
        "term": {
          "department": "{{_user.metadata.department}}"
        }
      }
    }
  ]
}'
```

### Financial Data Access

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/financial_analyst" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["transactions-*"],
      "privileges": ["read"],
      "field_security": {
        "grant": [
          "transaction_id",
          "date",
          "amount",
          "category",
          "merchant_name",
          "status"
        ],
        "except": [
          "account_number",
          "card_number",
          "cvv",
          "customer_id",
          "ip_address"
        ]
      },
      "query": {
        "range": {
          "date": {
            "gte": "now-90d"
          }
        }
      }
    }
  ]
}'
```

### Content Management System

```bash
curl -u elastic:password -X PUT "localhost:9200/_security/role/content_editor" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["content-*"],
      "privileges": ["read", "write"],
      "field_security": {
        "grant": ["*"],
        "except": ["internal_review_notes", "legal_approval.*"]
      },
      "query": {
        "bool": {
          "should": [
            {"term": {"author": "{{_user.username}}"}},
            {"term": {"status": "published"}},
            {"term": {"shared_with": "{{_user.username}}"}}
          ]
        }
      }
    }
  ]
}'
```

## Performance Considerations

### Index Design for DLS

Optimize indices for document-level security:

```bash
# Ensure fields used in DLS queries are keyword type
curl -u elastic:password -X PUT "localhost:9200/optimized-index" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "tenant_id": {
        "type": "keyword"
      },
      "department": {
        "type": "keyword"
      },
      "owner": {
        "type": "keyword"
      },
      "visibility": {
        "type": "keyword"
      }
    }
  }
}'
```

### Caching Considerations

DLS queries are cached, but complex queries may impact performance:

```yaml
# Increase security cache size if needed
xpack.security.authz.store.roles.index.cache.max_size: 10000
xpack.security.authz.store.roles.index.cache.ttl: 20m
```

## Troubleshooting

### Debug Role Application

```bash
# Check effective roles for user
curl -u elastic:password -X GET "localhost:9200/_security/user/john_doe?pretty"

# Authenticate and check privileges
curl -u john_doe:password -X GET "localhost:9200/_security/_authenticate?pretty"
```

### Verify Field Security

```bash
# Search with _source to see which fields are returned
curl -u restricted_user:password -X GET "localhost:9200/test-index/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {"match_all": {}},
  "_source": true,
  "size": 1
}'
```

### Check Document Access

```bash
# Count accessible documents
curl -u restricted_user:password -X GET "localhost:9200/test-index/_count?pretty"

# Compare with admin count
curl -u elastic:password -X GET "localhost:9200/test-index/_count?pretty"
```

## Best Practices

1. **Use keyword fields** for DLS query fields
2. **Test thoroughly** before deploying to production
3. **Document role definitions** for audit purposes
4. **Use role templates** for consistent configuration
5. **Monitor performance** impact of complex DLS queries
6. **Combine with index-level security** for defense in depth
7. **Regular access reviews** to ensure appropriate restrictions

## Summary

Field-level and document-level security provide:

1. **Fine-grained access control** - Restrict data at field and document level
2. **Compliance support** - Meet regulatory requirements for data protection
3. **Multi-tenancy** - Isolate tenant data within shared indices
4. **Flexible configuration** - Use queries and templates for dynamic restrictions

With properly configured FLS and DLS, you can ensure users only see the data they're authorized to access while maintaining a single shared index infrastructure.
