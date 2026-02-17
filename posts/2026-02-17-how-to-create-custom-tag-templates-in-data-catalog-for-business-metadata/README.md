# How to Create Custom Tag Templates in Data Catalog for Business Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Data Catalog, Tag Templates, Metadata, Data Governance

Description: Learn how to design and create custom tag templates in Google Cloud Data Catalog to capture business metadata like data ownership, quality metrics, and compliance status.

---

Technical metadata - column names, data types, row counts - is automatically captured by Data Catalog. But the metadata that people actually need to make decisions is usually business metadata. Who owns this data? How fresh is it? Is it approved for external reporting? What compliance regulations apply? Can I trust the numbers?

Custom tag templates in Data Catalog let you capture this business context and attach it directly to your data assets. You define the structure of the metadata (the template), and then tag individual tables, views, datasets, or even columns with specific values.

This guide covers how to design effective tag templates, create them, and use them in practice.

## Designing Your Tag Templates

Before writing any code, think about what metadata your organization needs. Most teams benefit from three to four templates covering different concerns:

### 1. Data Classification Template
Captures security and privacy information:
- Sensitivity level (public, internal, confidential, restricted)
- Contains PII (yes/no)
- Regulatory scope (GDPR, HIPAA, SOC2, none)
- Data retention requirement

### 2. Data Ownership Template
Captures accountability information:
- Data owner (team or individual)
- Data steward
- Support channel (Slack channel, email)
- Business domain

### 3. Data Quality Template
Captures data reliability information:
- Freshness SLA (how often is it updated)
- Last validation timestamp
- Quality score (percentage)
- Known issues or caveats

### 4. Business Context Template
Captures usage information:
- Business description
- Intended use cases
- Approved for external reporting (yes/no)
- Related dashboards or reports

## Creating Tag Templates

### Using gcloud CLI

```bash
# Data Classification template
gcloud data-catalog tag-templates create data_classification \
  --location=us-central1 \
  --display-name="Data Classification" \
  --field=id=sensitivity_level,display-name="Sensitivity Level",type='enum(PUBLIC,INTERNAL,CONFIDENTIAL,RESTRICTED)',required=true \
  --field=id=contains_pii,display-name="Contains PII",type=bool,required=true \
  --field=id=regulatory_scope,display-name="Regulatory Scope",type='enum(NONE,GDPR,HIPAA,SOC2,CCPA,MULTIPLE)' \
  --field=id=retention_days,display-name="Data Retention (Days)",type=double

# Data Ownership template
gcloud data-catalog tag-templates create data_ownership \
  --location=us-central1 \
  --display-name="Data Ownership" \
  --field=id=owner_team,display-name="Owner Team",type=string,required=true \
  --field=id=data_steward,display-name="Data Steward",type=string \
  --field=id=support_channel,display-name="Support Channel",type=string \
  --field=id=business_domain,display-name="Business Domain",type='enum(COMMERCE,FINANCE,MARKETING,ENGINEERING,CUSTOMER_SUCCESS,OPERATIONS)'

# Data Quality template
gcloud data-catalog tag-templates create data_quality \
  --location=us-central1 \
  --display-name="Data Quality" \
  --field=id=freshness_sla_hours,display-name="Freshness SLA (Hours)",type=double,required=true \
  --field=id=last_validated,display-name="Last Validated",type=timestamp \
  --field=id=quality_score,display-name="Quality Score (0-100)",type=double \
  --field=id=validation_status,display-name="Validation Status",type='enum(PASSING,FAILING,NOT_VALIDATED)',required=true \
  --field=id=known_issues,display-name="Known Issues",type=string
```

### Using Python

Here is a more complete example with a reusable function:

```python
# Helper function to create tag templates with less boilerplate
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

def create_tag_template(project_id, location, template_id, display_name, fields):
    """Create a Data Catalog tag template.

    Args:
        fields: List of dicts with keys: id, display_name, type, required (optional)
            type can be: 'string', 'double', 'bool', 'timestamp', or ['ENUM1', 'ENUM2']
    """
    template = datacatalog_v1.TagTemplate()
    template.display_name = display_name

    for field_def in fields:
        field = datacatalog_v1.TagTemplateField()
        field.display_name = field_def['display_name']
        field.is_required = field_def.get('required', False)

        field_type = field_def['type']

        if isinstance(field_type, list):
            # Enum type
            for value in field_type:
                field.type_.enum_type.allowed_values.append(
                    datacatalog_v1.FieldType.EnumType.EnumValue(display_name=value)
                )
        elif field_type == 'string':
            field.type_.primitive_type = datacatalog_v1.FieldType.PrimitiveType.STRING
        elif field_type == 'double':
            field.type_.primitive_type = datacatalog_v1.FieldType.PrimitiveType.DOUBLE
        elif field_type == 'bool':
            field.type_.primitive_type = datacatalog_v1.FieldType.PrimitiveType.BOOL
        elif field_type == 'timestamp':
            field.type_.primitive_type = datacatalog_v1.FieldType.PrimitiveType.TIMESTAMP

        template.fields[field_def['id']] = field

    parent = f"projects/{project_id}/locations/{location}"

    created = client.create_tag_template(
        parent=parent,
        tag_template_id=template_id,
        tag_template=template,
    )
    print(f"Created template: {created.name}")
    return created

# Create the Business Context template
create_tag_template(
    project_id="my-project",
    location="us-central1",
    template_id="business_context",
    display_name="Business Context",
    fields=[
        {
            'id': 'business_description',
            'display_name': 'Business Description',
            'type': 'string',
            'required': True,
        },
        {
            'id': 'use_cases',
            'display_name': 'Intended Use Cases',
            'type': 'string',
        },
        {
            'id': 'approved_for_external',
            'display_name': 'Approved for External Reporting',
            'type': 'bool',
            'required': True,
        },
        {
            'id': 'related_dashboards',
            'display_name': 'Related Dashboards',
            'type': 'string',
        },
        {
            'id': 'data_tier',
            'display_name': 'Data Tier',
            'type': ['GOLD', 'SILVER', 'BRONZE'],
            'required': True,
        },
    ],
)
```

### Using Terraform

```hcl
# Business Context tag template
resource "google_data_catalog_tag_template" "business_context" {
  tag_template_id = "business_context"
  region          = "us-central1"
  display_name    = "Business Context"

  fields {
    field_id     = "business_description"
    display_name = "Business Description"
    is_required  = true
    type {
      primitive_type = "STRING"
    }
  }

  fields {
    field_id     = "use_cases"
    display_name = "Intended Use Cases"
    type {
      primitive_type = "STRING"
    }
  }

  fields {
    field_id     = "approved_for_external"
    display_name = "Approved for External Reporting"
    is_required  = true
    type {
      primitive_type = "BOOL"
    }
  }

  fields {
    field_id     = "related_dashboards"
    display_name = "Related Dashboards"
    type {
      primitive_type = "STRING"
    }
  }

  fields {
    field_id     = "data_tier"
    display_name = "Data Tier"
    is_required  = true
    type {
      enum_type {
        allowed_values { display_name = "GOLD" }
        allowed_values { display_name = "SILVER" }
        allowed_values { display_name = "BRONZE" }
      }
    }
  }
}
```

## Updating Existing Templates

You can add new fields to existing templates without breaking existing tags:

```python
# Add a new field to an existing tag template
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

# Define the new field
new_field = datacatalog_v1.TagTemplateField()
new_field.display_name = "Compliance Review Date"
new_field.type_.primitive_type = datacatalog_v1.FieldType.PrimitiveType.TIMESTAMP

# Add it to the existing template
template_name = "projects/my-project/locations/us-central1/tagTemplates/data_classification"

updated = client.create_tag_template_field(
    parent=template_name,
    tag_template_field_id="compliance_review_date",
    tag_template_field=new_field,
)

print(f"Added field: {updated.name}")
```

You can also rename fields or update their display names:

```python
# Update a field's display name
field = datacatalog_v1.TagTemplateField()
field.display_name = "Data Owner (Team Email)"

client.update_tag_template_field(
    name=f"{template_name}/fields/data_owner",
    tag_template_field=field,
    update_mask={"paths": ["display_name"]},
)
```

## Applying Tags with Templates

Once templates exist, apply them to data assets:

```python
# Apply multiple tag templates to a single table
from google.cloud import datacatalog_v1

client = datacatalog_v1.DataCatalogClient()

# Look up the table
resource = "//bigquery.googleapis.com/projects/my-project/datasets/warehouse/tables/dim_customers"
entry = client.lookup_entry(request={"linked_resource": resource})

# Apply Data Classification tag
classification_tag = datacatalog_v1.Tag()
classification_tag.template = "projects/my-project/locations/us-central1/tagTemplates/data_classification"
classification_tag.fields["sensitivity_level"] = datacatalog_v1.TagField(
    enum_value=datacatalog_v1.TagField.EnumValue(display_name="RESTRICTED")
)
classification_tag.fields["contains_pii"] = datacatalog_v1.TagField(bool_value=True)
classification_tag.fields["regulatory_scope"] = datacatalog_v1.TagField(
    enum_value=datacatalog_v1.TagField.EnumValue(display_name="GDPR")
)
classification_tag.fields["retention_days"] = datacatalog_v1.TagField(double_value=730)

client.create_tag(parent=entry.name, tag=classification_tag)

# Apply Business Context tag
context_tag = datacatalog_v1.Tag()
context_tag.template = "projects/my-project/locations/us-central1/tagTemplates/business_context"
context_tag.fields["business_description"] = datacatalog_v1.TagField(
    string_value="Master customer dimension table with demographics, account details, and lifecycle status."
)
context_tag.fields["approved_for_external"] = datacatalog_v1.TagField(bool_value=False)
context_tag.fields["data_tier"] = datacatalog_v1.TagField(
    enum_value=datacatalog_v1.TagField.EnumValue(display_name="GOLD")
)
context_tag.fields["related_dashboards"] = datacatalog_v1.TagField(
    string_value="Customer Analytics Dashboard, Churn Prediction Report"
)

client.create_tag(parent=entry.name, tag=context_tag)

print(f"Applied classification and business context tags to {entry.display_name}")
```

## IAM for Tag Templates

Control who can create, edit, and use tag templates:

```hcl
# Data governance team can create and manage tag templates
resource "google_data_catalog_tag_template_iam_member" "governance_admin" {
  tag_template = google_data_catalog_tag_template.business_context.name
  role         = "roles/datacatalog.tagTemplateOwner"
  member       = "group:data-governance@company.com"
}

# Data engineers can use templates to create tags
resource "google_data_catalog_tag_template_iam_member" "engineer_user" {
  tag_template = google_data_catalog_tag_template.business_context.name
  role         = "roles/datacatalog.tagTemplateUser"
  member       = "group:data-engineers@company.com"
}
```

## Best Practices for Tag Template Design

1. **Keep templates focused.** Each template should cover one concern. Do not combine classification, ownership, and quality into a single giant template. Separate templates are easier to manage and apply selectively.

2. **Use enums whenever possible.** Free-text fields lead to inconsistency. If a field has a known set of values, use an enum. You can always add new enum values later.

3. **Make critical fields required.** If a tag without a certain field is useless (like classification without a sensitivity level), make the field required.

4. **Plan for evolution.** You will want to add fields later. Adding optional fields to existing templates is non-breaking. Removing fields or changing types is harder.

5. **Document the templates themselves.** The display names should be self-explanatory. For complex templates, maintain a wiki page that explains what each field means and how to fill it in.

6. **Standardize across the organization.** Having three different teams create three different "data quality" templates defeats the purpose. Centralize template creation with the data governance team.

## Wrapping Up

Custom tag templates are the foundation of business metadata management in Data Catalog. They let you capture the context that technical metadata cannot provide - who owns the data, how sensitive it is, whether it is reliable, and what it is used for. Design templates that match your organization's needs, keep them focused and well-structured, use enum fields for consistency, and manage them through Terraform for version control. The result is a data catalog where anyone can find not just where the data is, but what it means and whether they should use it.
