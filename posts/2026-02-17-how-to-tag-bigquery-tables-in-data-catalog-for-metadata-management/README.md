# How to Tag BigQuery Tables in Data Catalog for Metadata Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Data Catalog, BigQuery, Metadata Management, Data Governance

Description: Learn how to use Google Cloud Data Catalog to tag BigQuery tables with business metadata, making it easier to discover, understand, and govern your data assets.

---

BigQuery tables can accumulate fast. After a few months of active development, you might have hundreds or thousands of tables across multiple datasets. Without metadata, they become a maze. What does `stg_orders_v3_final` contain? Who owns it? Is it safe to use for customer-facing analytics? Is the data classified as PII?

Google Cloud Data Catalog solves this by providing a centralized metadata management layer. You can tag BigQuery tables with business metadata - ownership, data classification, freshness, description, and any custom attributes your organization needs. These tags make tables searchable, understandable, and governable.

## How Data Catalog Works with BigQuery

Data Catalog automatically discovers BigQuery tables, views, and datasets. You do not need to register them manually. Once discovered, you can attach tags to these entries using tag templates.

The hierarchy is:

1. **Tag Template**: Defines the structure of your tags (like a schema). For example, a "Data Classification" template with fields for sensitivity level, data owner, and retention policy.
2. **Tag**: An instance of a tag template attached to a specific resource. For example, the `orders` table is tagged with sensitivity=HIGH, owner=data-team, retention=90days.

## Creating a Tag Template

First, create a tag template that defines what metadata you want to track:

```bash
# Create a tag template for data classification
gcloud data-catalog tag-templates create data_classification \
  --location=us-central1 \
  --display-name="Data Classification" \
  --field=id=data_owner,display-name="Data Owner",type=string,required=true \
  --field=id=sensitivity,display-name="Sensitivity Level",type='enum(PUBLIC,INTERNAL,CONFIDENTIAL,RESTRICTED)',required=true \
  --field=id=contains_pii,display-name="Contains PII",type=bool,required=true \
  --field=id=retention_days,display-name="Retention Period (Days)",type=double \
  --field=id=description,display-name="Business Description",type=string
```

In Python:

```python
# Create a tag template programmatically
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

# Define the tag template
tag_template = datacatalog_v1.TagTemplate()
tag_template.display_name = "Data Classification"

# String field for data owner
owner_field = datacatalog_v1.TagTemplateField()
owner_field.display_name = "Data Owner"
owner_field.type_.primitive_type = datacatalog_v1.FieldType.PrimitiveType.STRING
owner_field.is_required = True
tag_template.fields["data_owner"] = owner_field

# Enum field for sensitivity level
sensitivity_field = datacatalog_v1.TagTemplateField()
sensitivity_field.display_name = "Sensitivity Level"
sensitivity_field.type_.enum_type.allowed_values.append(
    datacatalog_v1.FieldType.EnumType.EnumValue(display_name="PUBLIC")
)
sensitivity_field.type_.enum_type.allowed_values.append(
    datacatalog_v1.FieldType.EnumType.EnumValue(display_name="INTERNAL")
)
sensitivity_field.type_.enum_type.allowed_values.append(
    datacatalog_v1.FieldType.EnumType.EnumValue(display_name="CONFIDENTIAL")
)
sensitivity_field.type_.enum_type.allowed_values.append(
    datacatalog_v1.FieldType.EnumType.EnumValue(display_name="RESTRICTED")
)
sensitivity_field.is_required = True
tag_template.fields["sensitivity"] = sensitivity_field

# Boolean field for PII
pii_field = datacatalog_v1.TagTemplateField()
pii_field.display_name = "Contains PII"
pii_field.type_.primitive_type = datacatalog_v1.FieldType.PrimitiveType.BOOL
pii_field.is_required = True
tag_template.fields["contains_pii"] = pii_field

# Double field for retention
retention_field = datacatalog_v1.TagTemplateField()
retention_field.display_name = "Retention Period (Days)"
retention_field.type_.primitive_type = datacatalog_v1.FieldType.PrimitiveType.DOUBLE
tag_template.fields["retention_days"] = retention_field

# Create the template
parent = f"projects/my-project/locations/us-central1"
created = client.create_tag_template(
    parent=parent,
    tag_template_id="data_classification",
    tag_template=tag_template,
)
print(f"Created tag template: {created.name}")
```

## Tagging a BigQuery Table

Once you have a tag template, attach tags to your BigQuery tables:

```python
# Tag a BigQuery table with the data classification template
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

# Look up the BigQuery table entry in Data Catalog
resource_name = (
    "//bigquery.googleapis.com/projects/my-project/datasets/analytics/tables/orders"
)
entry = client.lookup_entry(
    request={"linked_resource": resource_name}
)
print(f"Found entry: {entry.name}")

# Create a tag using the template
tag = datacatalog_v1.Tag()
tag.template = "projects/my-project/locations/us-central1/tagTemplates/data_classification"

# Set field values
tag.fields["data_owner"] = datacatalog_v1.TagField(
    string_value="commerce-team@company.com"
)
tag.fields["sensitivity"] = datacatalog_v1.TagField(
    enum_value=datacatalog_v1.TagField.EnumValue(display_name="CONFIDENTIAL")
)
tag.fields["contains_pii"] = datacatalog_v1.TagField(
    bool_value=True
)
tag.fields["retention_days"] = datacatalog_v1.TagField(
    double_value=365.0
)
tag.fields["description"] = datacatalog_v1.TagField(
    string_value="Production order data including customer names and addresses"
)

# Attach the tag to the entry
created_tag = client.create_tag(parent=entry.name, tag=tag)
print(f"Created tag: {created_tag.name}")
```

## Tagging at the Column Level

You can also tag individual columns, which is useful for marking specific fields as PII:

```python
# Tag a specific column in a BigQuery table
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

# Look up the table entry
resource_name = (
    "//bigquery.googleapis.com/projects/my-project/datasets/analytics/tables/customers"
)
entry = client.lookup_entry(request={"linked_resource": resource_name})

# Create a column-level tag
tag = datacatalog_v1.Tag()
tag.template = "projects/my-project/locations/us-central1/tagTemplates/data_classification"
tag.column = "email_address"  # Specify the column name

tag.fields["data_owner"] = datacatalog_v1.TagField(
    string_value="identity-team@company.com"
)
tag.fields["sensitivity"] = datacatalog_v1.TagField(
    enum_value=datacatalog_v1.TagField.EnumValue(display_name="RESTRICTED")
)
tag.fields["contains_pii"] = datacatalog_v1.TagField(
    bool_value=True
)

created_tag = client.create_tag(parent=entry.name, tag=tag)
print(f"Tagged column 'email_address': {created_tag.name}")
```

## Bulk Tagging Tables

When you have many tables to tag, automate the process:

```python
# Bulk tag all tables in a dataset based on naming conventions
from google.cloud import datacatalog_v1, bigquery

dc_client = datacatalog_v1.DataCatalogClient()
bq_client = bigquery.Client()

TEMPLATE = "projects/my-project/locations/us-central1/tagTemplates/data_classification"

# Define tagging rules based on table name patterns
TAGGING_RULES = {
    "raw_": {"sensitivity": "INTERNAL", "contains_pii": False, "owner": "data-eng@company.com"},
    "stg_": {"sensitivity": "INTERNAL", "contains_pii": False, "owner": "data-eng@company.com"},
    "dim_customer": {"sensitivity": "RESTRICTED", "contains_pii": True, "owner": "analytics@company.com"},
    "fact_order": {"sensitivity": "CONFIDENTIAL", "contains_pii": True, "owner": "commerce@company.com"},
    "rpt_": {"sensitivity": "INTERNAL", "contains_pii": False, "owner": "analytics@company.com"},
}

def get_rule_for_table(table_id):
    """Match a table name to a tagging rule."""
    for prefix, rule in TAGGING_RULES.items():
        if table_id.startswith(prefix):
            return rule
    return None

# List all tables in the dataset
dataset_ref = bq_client.dataset("analytics")
tables = list(bq_client.list_tables(dataset_ref))

for table_item in tables:
    rule = get_rule_for_table(table_item.table_id)
    if not rule:
        print(f"No rule for {table_item.table_id}, skipping")
        continue

    # Look up the Data Catalog entry
    resource_name = (
        f"//bigquery.googleapis.com/projects/my-project"
        f"/datasets/analytics/tables/{table_item.table_id}"
    )

    try:
        entry = dc_client.lookup_entry(request={"linked_resource": resource_name})
    except Exception as e:
        print(f"Could not find entry for {table_item.table_id}: {e}")
        continue

    # Create the tag
    tag = datacatalog_v1.Tag()
    tag.template = TEMPLATE

    tag.fields["data_owner"] = datacatalog_v1.TagField(string_value=rule["owner"])
    tag.fields["sensitivity"] = datacatalog_v1.TagField(
        enum_value=datacatalog_v1.TagField.EnumValue(display_name=rule["sensitivity"])
    )
    tag.fields["contains_pii"] = datacatalog_v1.TagField(bool_value=rule["contains_pii"])

    try:
        dc_client.create_tag(parent=entry.name, tag=tag)
        print(f"Tagged {table_item.table_id}: {rule['sensitivity']}")
    except Exception as e:
        print(f"Failed to tag {table_item.table_id}: {e}")
```

## Terraform Configuration

Manage tag templates as code:

```hcl
# Data Catalog tag template for data quality metadata
resource "google_data_catalog_tag_template" "data_quality" {
  tag_template_id = "data_quality"
  region          = "us-central1"
  display_name    = "Data Quality"

  fields {
    field_id     = "freshness_sla_hours"
    display_name = "Freshness SLA (Hours)"
    type {
      primitive_type = "DOUBLE"
    }
    is_required = true
  }

  fields {
    field_id     = "quality_score"
    display_name = "Data Quality Score"
    type {
      primitive_type = "DOUBLE"
    }
  }

  fields {
    field_id     = "last_validated"
    display_name = "Last Validation Date"
    type {
      primitive_type = "TIMESTAMP"
    }
  }

  fields {
    field_id     = "validation_status"
    display_name = "Validation Status"
    type {
      enum_type {
        allowed_values { display_name = "PASSING" }
        allowed_values { display_name = "FAILING" }
        allowed_values { display_name = "NOT_VALIDATED" }
      }
    }
    is_required = true
  }
}
```

## Searching Tagged Tables

Once tables are tagged, you can search for them using the Data Catalog search API:

```python
# Search for tables by tag values
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

# Find all tables tagged as RESTRICTED
results = client.search_catalog(
    request={
        "scope": {
            "include_project_ids": ["my-project"],
        },
        "query": "tag:data_classification.sensitivity=RESTRICTED",
    }
)

print("RESTRICTED tables:")
for result in results:
    print(f"  - {result.linked_resource}")

# Find all tables owned by the commerce team
results = client.search_catalog(
    request={
        "scope": {
            "include_project_ids": ["my-project"],
        },
        "query": 'tag:data_classification.data_owner="commerce-team@company.com"',
    }
)

print("\nCommerce team tables:")
for result in results:
    print(f"  - {result.linked_resource}")
```

## Best Practices

1. **Start with a small set of tag templates.** Two or three templates covering data classification, ownership, and quality are enough for most organizations. You can always add more later.

2. **Make critical fields required.** Fields like data owner and sensitivity level should be required. Optional fields tend to stay empty.

3. **Automate tagging.** Manual tagging does not scale. Use naming conventions, automated scripts, or Cloud Functions to tag tables when they are created.

4. **Review tags periodically.** Metadata goes stale. Set up a quarterly review process to verify that tags are still accurate.

5. **Use enum fields for standardized values.** Free-text sensitivity levels lead to inconsistency (is it "high", "HIGH", "High", or "Sensitive"?). Enums enforce consistency.

6. **Tag at the column level for PII.** Table-level PII tags are useful, but column-level tags tell you exactly which fields contain sensitive data.

## Wrapping Up

Tagging BigQuery tables in Data Catalog transforms your data warehouse from an opaque collection of tables into a well-documented, searchable, and governable data asset. Create tag templates that capture your organization's metadata needs, automate the tagging process using naming conventions and scripts, and use the search API to discover and audit your data. The investment in metadata pays dividends every time someone asks "what does this table contain?" or "which tables have PII?"
