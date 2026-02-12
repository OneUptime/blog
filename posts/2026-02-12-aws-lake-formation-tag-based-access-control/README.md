# How to Use AWS Lake Formation Tag-Based Access Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lake Formation, Security, Data Lake

Description: Learn how to implement tag-based access control in AWS Lake Formation to manage fine-grained permissions across your data lake without per-table grants.

---

Managing permissions in a data lake gets messy fast. When you have hundreds or thousands of tables, granting access one table at a time becomes a full-time job. AWS Lake Formation's tag-based access control (LF-TBAC) solves this by letting you attach tags to databases, tables, and columns, then grant access based on those tags instead of individual resource names.

It's a massive improvement over the named resource method, and once you set it up, adding new tables to your lake automatically inherits the right permissions based on their tags.

## Why Tag-Based Access Control

Consider this scenario: you have 200 tables in your data lake. Your analytics team needs access to 150 of them, the marketing team needs 50, and the finance team needs 30. With named resource permissions, you'd need to create individual grants for each table-team combination. That's hundreds of permission entries to manage.

With LF-TBAC, you tag tables with something like `department=analytics` or `sensitivity=public`, then grant access to the tag expression. When new tables get created with the same tags, the permissions flow automatically.

## Setting Up LF-Tags

First, you need to define the tags (called LF-Tags) in Lake Formation. Think of these as the vocabulary your organization will use to classify data.

```bash
# Create an LF-Tag for data classification level
aws lakeformation create-lf-tag \
    --tag-key "classification" \
    --tag-values '["public", "internal", "confidential", "restricted"]'

# Create an LF-Tag for the owning department
aws lakeformation create-lf-tag \
    --tag-key "department" \
    --tag-values '["analytics", "engineering", "marketing", "finance", "hr"]'

# Create an LF-Tag for data domain
aws lakeformation create-lf-tag \
    --tag-key "domain" \
    --tag-values '["sales", "product", "customer", "operations"]'
```

You can have up to 50 LF-Tags per account, and each tag can have up to 50 values. That's plenty for most organizations.

## Assigning Tags to Resources

Once your tags exist, assign them to databases, tables, and even individual columns:

```bash
# Tag an entire database as belonging to the analytics department
aws lakeformation add-lf-tags-to-resource \
    --resource '{
        "Database": {
            "Name": "analytics_db"
        }
    }' \
    --lf-tags '[
        {"TagKey": "department", "TagValues": ["analytics"]},
        {"TagKey": "classification", "TagValues": ["internal"]}
    ]'

# Tag a specific table with its domain and classification
aws lakeformation add-lf-tags-to-resource \
    --resource '{
        "Table": {
            "DatabaseName": "analytics_db",
            "Name": "customer_transactions"
        }
    }' \
    --lf-tags '[
        {"TagKey": "domain", "TagValues": ["customer"]},
        {"TagKey": "classification", "TagValues": ["confidential"]}
    ]'

# Tag sensitive columns separately from the rest of the table
aws lakeformation add-lf-tags-to-resource \
    --resource '{
        "TableWithColumns": {
            "DatabaseName": "analytics_db",
            "Name": "customer_transactions",
            "ColumnNames": ["ssn", "credit_card_number", "date_of_birth"]
        }
    }' \
    --lf-tags '[
        {"TagKey": "classification", "TagValues": ["restricted"]}
    ]'
```

Column-level tags are especially powerful. You can make most of a table accessible while restricting sensitive columns to specific roles.

## Granting Permissions with Tag Expressions

Now the fun part. Instead of granting access to specific tables, you grant access to tag expressions:

```bash
# Grant the analytics team SELECT on all tables tagged department=analytics AND classification=internal
aws lakeformation grant-permissions \
    --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/AnalyticsTeamRole"}' \
    --resource '{
        "LFTagPolicy": {
            "ResourceType": "TABLE",
            "Expression": [
                {
                    "TagKey": "department",
                    "TagValues": ["analytics"]
                },
                {
                    "TagKey": "classification",
                    "TagValues": ["internal", "public"]
                }
            ]
        }
    }' \
    --permissions '["SELECT", "DESCRIBE"]'
```

The expression above works like an AND condition - it matches tables that have department=analytics AND classification in (internal, public). Multiple values within a single tag key work as OR. So this grant covers:
- Tables tagged department=analytics AND classification=internal
- Tables tagged department=analytics AND classification=public

But it does NOT cover tables tagged classification=confidential or classification=restricted.

## Cross-Account Tag Sharing

If you're running a multi-account setup (which you should be), you can share LF-Tags across accounts using AWS RAM (Resource Access Manager):

```bash
# Share LF-Tags with another account
aws lakeformation grant-permissions \
    --principal '{"DataLakePrincipalIdentifier": "123456789013"}' \
    --resource '{
        "LFTag": {
            "TagKey": "classification",
            "TagValues": ["public", "internal"]
        }
    }' \
    --permissions '["DESCRIBE", "ASSOCIATE"]'
```

This lets the other account use your tags on their resources and receive permissions based on tag expressions. It's a clean way to manage data sharing in organizations with separate AWS accounts per team.

## Combining with Column-Level Security

Here's a realistic example. Say you have a `customers` table with columns like `customer_id`, `name`, `email`, `phone`, `ssn`, and `purchase_history`. You want the marketing team to see everything except SSN, while the compliance team sees everything.

```bash
# Tag the table itself as customer domain, internal
aws lakeformation add-lf-tags-to-resource \
    --resource '{
        "Table": {
            "DatabaseName": "main_db",
            "Name": "customers"
        }
    }' \
    --lf-tags '[
        {"TagKey": "domain", "TagValues": ["customer"]},
        {"TagKey": "classification", "TagValues": ["internal"]}
    ]'

# Tag the SSN column as restricted
aws lakeformation add-lf-tags-to-resource \
    --resource '{
        "TableWithColumns": {
            "DatabaseName": "main_db",
            "Name": "customers",
            "ColumnNames": ["ssn"]
        }
    }' \
    --lf-tags '[
        {"TagKey": "classification", "TagValues": ["restricted"]}
    ]'

# Marketing gets access to internal customer data (but not restricted columns)
aws lakeformation grant-permissions \
    --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/MarketingRole"}' \
    --resource '{
        "LFTagPolicy": {
            "ResourceType": "TABLE",
            "Expression": [
                {"TagKey": "domain", "TagValues": ["customer"]},
                {"TagKey": "classification", "TagValues": ["internal"]}
            ]
        }
    }' \
    --permissions '["SELECT"]' \
    --permissions-with-grant-option '[]'

# Compliance team gets access to everything including restricted
aws lakeformation grant-permissions \
    --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/ComplianceRole"}' \
    --resource '{
        "LFTagPolicy": {
            "ResourceType": "TABLE",
            "Expression": [
                {"TagKey": "domain", "TagValues": ["customer"]},
                {"TagKey": "classification", "TagValues": ["internal", "confidential", "restricted"]}
            ]
        }
    }' \
    --permissions '["SELECT"]'
```

When the marketing team queries the customers table through Athena, they simply won't see the SSN column. No errors, no special handling - the column is invisible to them.

## Verifying Effective Permissions

After setting up your tag-based permissions, you should verify what a given principal can actually access:

```bash
# Check what permissions a role has through tag-based grants
aws lakeformation list-permissions \
    --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/AnalyticsTeamRole"}' \
    --resource-type "TABLE"

# See which resources match a given tag expression
aws lakeformation search-tables-by-lf-tags \
    --expression '[
        {"TagKey": "department", "TagValues": ["analytics"]},
        {"TagKey": "classification", "TagValues": ["internal"]}
    ]'
```

## Best Practices

**Start with a tagging strategy.** Before you create a single LF-Tag, agree on the taxonomy with your data governance team. Changing tags later means rewriting all your permission grants.

**Use inheritance wisely.** Tags on databases propagate to new tables by default. This means you can tag a database once and all future tables pick up those tags.

**Audit regularly.** Lake Formation integrates with CloudTrail, so you can see who accessed what data and whether tag-based grants were modified.

**Keep your tag values limited.** It's tempting to create very specific tag values, but that defeats the purpose. The power of LF-TBAC comes from broad categories that apply to many resources.

Tag-based access control in Lake Formation pairs nicely with [Amazon DataZone for governance](https://oneuptime.com/blog/post/amazon-datazone-data-governance/view) and with [registering data sources in Lake Formation](https://oneuptime.com/blog/post/register-data-sources-aws-lake-formation/view). Together, these services give you a solid data governance foundation.
