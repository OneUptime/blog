# How to Use Lake Formation Permissions for Fine-Grained Access Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lake Formation, Security, Data Governance, IAM

Description: Learn how to implement fine-grained access control in Amazon Lake Formation using column-level security, row-level filtering, cell-level security, and tag-based access control.

---

One of the biggest challenges with data lakes is making sure the right people see the right data. You've got sensitive customer information, financial records, and proprietary business data all sitting in the same S3 bucket. IAM policies alone can't handle column-level or row-level restrictions - that's where Lake Formation's fine-grained access control comes in.

Lake Formation gives you four levels of access control: table-level, column-level, row-level, and cell-level (which combines column and row filtering). On top of that, you can use tag-based access control (LF-TBAC) to manage permissions at scale. Let's dig into each one.

## Table-Level Permissions

Table-level permissions are the simplest form. You grant or deny access to entire tables within a database. If you've followed our [Lake Formation setup guide](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-lake-formation-for-data-lakes/view), you've already seen these.

```bash
# Grant SELECT on a specific table
aws lakeformation grant-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/AnalystRole"}' \
  --resource '{"Table": {"DatabaseName": "sales_db", "Name": "orders"}}' \
  --permissions '["SELECT", "DESCRIBE"]'

# Grant access to all tables in a database using wildcard
aws lakeformation grant-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/AnalystRole"}' \
  --resource '{"Table": {"DatabaseName": "sales_db", "TableWildcard": {}}}' \
  --permissions '["SELECT"]'
```

## Column-Level Permissions

Column-level permissions let you hide sensitive columns from certain users. Say your `customers` table has columns like `name`, `email`, `phone`, `ssn`, and `purchase_history`. Analysts might need purchase data but shouldn't see SSNs.

You can either include specific columns (allowlist) or exclude specific columns (blocklist).

```bash
# Include-based: only grant access to specific columns
aws lakeformation grant-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/MarketingAnalyst"}' \
  --resource '{
    "TableWithColumns": {
      "DatabaseName": "customer_db",
      "Name": "customers",
      "ColumnNames": ["customer_id", "name", "city", "state", "purchase_history"]
    }
  }' \
  --permissions '["SELECT"]'

# Exclude-based: grant access to all columns except sensitive ones
aws lakeformation grant-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/SupportAgent"}' \
  --resource '{
    "TableWithColumns": {
      "DatabaseName": "customer_db",
      "Name": "customers",
      "ColumnWildcard": {
        "ExcludedColumnNames": ["ssn", "credit_card", "bank_account"]
      }
    }
  }' \
  --permissions '["SELECT"]'
```

The exclude-based approach is usually better for tables that get new columns frequently. New columns are automatically accessible unless you explicitly exclude them.

## Row-Level Security with Data Filters

Row-level security lets you restrict which rows a user can see based on filter expressions. This is incredibly useful for multi-tenant data where each team should only see their own records.

First, create a data cell filter (which can filter rows, columns, or both).

```bash
# Create a row filter that only shows US customers
aws lakeformation create-data-cells-filter \
  --table-data '{
    "TableCatalogId": "123456789012",
    "DatabaseName": "customer_db",
    "TableName": "customers",
    "Name": "us-customers-only",
    "RowFilter": {
      "FilterExpression": "country = '\''US'\''"
    },
    "ColumnWildcard": {}
  }'

# Create a row filter for European customers
aws lakeformation create-data-cells-filter \
  --table-data '{
    "TableCatalogId": "123456789012",
    "DatabaseName": "customer_db",
    "TableName": "customers",
    "Name": "eu-customers-only",
    "RowFilter": {
      "FilterExpression": "country IN ('\''DE'\'', '\''FR'\'', '\''IT'\'', '\''ES'\'', '\''NL'\'')"
    },
    "ColumnWildcard": {}
  }'

# Grant permissions using the US filter
aws lakeformation grant-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/USAnalyst"}' \
  --resource '{
    "DataCellsFilter": {
      "TableCatalogId": "123456789012",
      "DatabaseName": "customer_db",
      "TableName": "customers",
      "Name": "us-customers-only"
    }
  }' \
  --permissions '["SELECT"]'
```

## Cell-Level Security

Cell-level security combines column and row filtering in a single filter. You restrict both which columns and which rows a user can access.

```bash
# Create a cell filter: US analysts see only non-PII columns for US customers
aws lakeformation create-data-cells-filter \
  --table-data '{
    "TableCatalogId": "123456789012",
    "DatabaseName": "customer_db",
    "TableName": "customers",
    "Name": "us-non-pii",
    "RowFilter": {
      "FilterExpression": "country = '\''US'\''"
    },
    "ColumnNames": ["customer_id", "city", "state", "purchase_history", "segment"]
  }'

# Grant access using the cell filter
aws lakeformation grant-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/USMarketingTeam"}' \
  --resource '{
    "DataCellsFilter": {
      "TableCatalogId": "123456789012",
      "DatabaseName": "customer_db",
      "TableName": "customers",
      "Name": "us-non-pii"
    }
  }' \
  --permissions '["SELECT"]'
```

When the US Marketing team queries the customers table through Athena, they'll only see the specified columns and only for US customers. Everything else is invisible.

## Tag-Based Access Control (LF-TBAC)

Managing individual table and column permissions works fine for small data lakes, but it doesn't scale. If you've got hundreds of tables and dozens of roles, the permission matrix becomes unmanageable. Tag-based access control solves this.

The idea is simple: you tag your data resources (databases, tables, columns) and then grant permissions based on tags rather than individual resources.

```bash
# Create LF-Tags
aws lakeformation create-lf-tag \
  --tag-key "sensitivity" \
  --tag-values '["public", "internal", "confidential", "restricted"]'

aws lakeformation create-lf-tag \
  --tag-key "domain" \
  --tag-values '["sales", "marketing", "finance", "engineering"]'

aws lakeformation create-lf-tag \
  --tag-key "region" \
  --tag-values '["us", "eu", "apac"]'
```

Now assign tags to your resources.

```bash
# Tag an entire database
aws lakeformation add-lf-tags-to-resource \
  --resource '{"Database": {"Name": "sales_db"}}' \
  --lf-tags '[{"TagKey": "domain", "TagValues": ["sales"]}]'

# Tag a table
aws lakeformation add-lf-tags-to-resource \
  --resource '{"Table": {"DatabaseName": "customer_db", "Name": "customers"}}' \
  --lf-tags '[
    {"TagKey": "sensitivity", "TagValues": ["confidential"]},
    {"TagKey": "domain", "TagValues": ["sales", "marketing"]}
  ]'

# Tag specific columns
aws lakeformation add-lf-tags-to-resource \
  --resource '{
    "TableWithColumns": {
      "DatabaseName": "customer_db",
      "Name": "customers",
      "ColumnNames": ["ssn", "credit_card"]
    }
  }' \
  --lf-tags '[{"TagKey": "sensitivity", "TagValues": ["restricted"]}]'
```

Now grant permissions based on tags instead of specific resources.

```bash
# Sales analysts can SELECT any resource tagged with domain=sales and sensitivity=internal or below
aws lakeformation grant-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/SalesAnalyst"}' \
  --resource '{
    "LFTagPolicy": {
      "ResourceType": "TABLE",
      "Expression": [
        {"TagKey": "domain", "TagValues": ["sales"]},
        {"TagKey": "sensitivity", "TagValues": ["public", "internal"]}
      ]
    }
  }' \
  --permissions '["SELECT", "DESCRIBE"]'

# Data stewards get full access to everything in their domain
aws lakeformation grant-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/SalesDataSteward"}' \
  --resource '{
    "LFTagPolicy": {
      "ResourceType": "TABLE",
      "Expression": [
        {"TagKey": "domain", "TagValues": ["sales"]}
      ]
    }
  }' \
  --permissions '["ALL"]' \
  --permissions-with-grant-option '["ALL"]'
```

The beauty of LF-TBAC is that when you add new tables and tag them appropriately, permissions are automatically inherited. No manual grant needed.

## Auditing Permissions

Always verify your permission setup. Lake Formation provides APIs to check effective permissions.

```bash
# List all permissions for a principal
aws lakeformation list-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/SalesAnalyst"}'

# Check effective permissions on a specific resource
aws lakeformation get-effective-permissions-for-path \
  --resource-arn "arn:aws:s3:::my-company-data-lake/raw/customers/"
```

## Best Practices

Here's what works well in production:

- **Use LF-TBAC for new data lakes.** Named resource permissions (table-level, column-level) work but don't scale. Start with tags from day one.
- **Establish a sensitivity classification early.** Four levels (public, internal, confidential, restricted) cover most use cases.
- **Revoke the IAMAllowedPrincipals default.** If you don't, Lake Formation permissions can be bypassed entirely through IAM.
- **Enable CloudTrail data events.** You'll want an audit trail of who queried what data and when.
- **Test permissions from the consumer's perspective.** Use `aws lakeformation list-permissions` to verify grants, and actually run queries as the target role to confirm behavior.

Fine-grained access control turns your data lake from a data swamp into a governed, secure analytics platform. It takes some upfront effort to design your tag taxonomy and permission model, but it pays off quickly as your data lake grows.
