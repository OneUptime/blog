# How to Implement Column-Level Security in BigQuery with Policy Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Security, Policy Tags, Data Governance, Column-Level Security

Description: Learn how to implement column-level security in BigQuery using policy tags to control access to sensitive data like PII and financial fields.

---

Not everyone who needs access to a BigQuery table should see every column in it. An analyst working on user behavior might need event data but should not see email addresses or phone numbers. A finance team member might need transaction amounts but not credit card details. Column-level security in BigQuery lets you control access at the individual column level using policy tags, so you can share tables broadly while protecting sensitive fields.

In this post, I will walk through setting up column-level security from scratch, including creating a taxonomy, defining policy tags, applying them to columns, and configuring access controls.

## How Column-Level Security Works

BigQuery column-level security uses a hierarchy of three components. A taxonomy is a container that groups related policy tags. A policy tag is a label that represents a data classification, such as "PII" or "Financial." When a policy tag is applied to a column, BigQuery enforces access control on that column - only users with the appropriate IAM role can read or write data in tagged columns.

When a user without access queries a tagged column, they get an access denied error. If they query other columns in the same table, the query works fine. This means you do not need to create separate views or tables for different access levels.

## Step 1 - Create a Taxonomy

A taxonomy is the top-level container for your policy tags. You might have one taxonomy for data sensitivity levels and another for regulatory compliance categories.

```bash
# Create a taxonomy for data classification
gcloud data-catalog taxonomies create \
  --display-name="Data Sensitivity" \
  --description="Classification levels for sensitive data" \
  --location=us-central1 \
  --project=my-project
```

Note the taxonomy ID from the output - you will need it for creating policy tags.

You can also create taxonomies using the Python client.

```python
from google.cloud import datacatalog_v1

# Initialize the client
client = datacatalog_v1.PolicyTagManagerClient()

# Create the taxonomy
taxonomy = datacatalog_v1.Taxonomy(
    display_name="Data Sensitivity",
    description="Classification levels for sensitive data",
    activated_policy_types=[
        datacatalog_v1.Taxonomy.PolicyType.FINE_GRAINED_ACCESS_CONTROL
    ]
)

parent = f"projects/my-project/locations/us-central1"
created_taxonomy = client.create_taxonomy(
    parent=parent,
    taxonomy=taxonomy
)

print(f"Created taxonomy: {created_taxonomy.name}")
```

The key part is `FINE_GRAINED_ACCESS_CONTROL` in the activated policy types. This enables BigQuery to enforce column-level access control based on these policy tags.

## Step 2 - Create Policy Tags

Within the taxonomy, create policy tags for each classification level.

```python
from google.cloud import datacatalog_v1

client = datacatalog_v1.PolicyTagManagerClient()
taxonomy_name = "projects/my-project/locations/us-central1/taxonomies/TAXONOMY_ID"

# Create a "PII" policy tag
pii_tag = client.create_policy_tag(
    parent=taxonomy_name,
    policy_tag=datacatalog_v1.PolicyTag(
        display_name="PII",
        description="Personally identifiable information - email, phone, SSN"
    )
)
print(f"Created PII tag: {pii_tag.name}")

# Create a "Financial" policy tag
financial_tag = client.create_policy_tag(
    parent=taxonomy_name,
    policy_tag=datacatalog_v1.PolicyTag(
        display_name="Financial",
        description="Financial data - account numbers, transaction details"
    )
)
print(f"Created Financial tag: {financial_tag.name}")

# Create a child tag under PII for more granular control
sensitive_pii_tag = client.create_policy_tag(
    parent=pii_tag.name,  # Child of PII tag
    policy_tag=datacatalog_v1.PolicyTag(
        display_name="Sensitive PII",
        description="Highly sensitive PII - SSN, passport numbers"
    )
)
print(f"Created Sensitive PII tag: {sensitive_pii_tag.name}")
```

Policy tags can be hierarchical. A user granted access to the parent "PII" tag automatically gets access to the child "Sensitive PII" tag. This makes it easy to manage broad access while still having fine-grained categories.

## Step 3 - Apply Policy Tags to Columns

With policy tags created, apply them to the columns that contain sensitive data. You do this by updating the table schema.

```python
from google.cloud import bigquery

client = bigquery.Client()

# Get the existing table
table = client.get_table("my_project.analytics.users")

# Update the schema with policy tags on sensitive columns
new_schema = []
for field in table.schema:
    if field.name == "email":
        # Apply PII policy tag to the email column
        new_field = bigquery.SchemaField(
            name=field.name,
            field_type=field.field_type,
            mode=field.mode,
            description=field.description,
            policy_tags=bigquery.PolicyTagList(
                names=["projects/my-project/locations/us-central1/taxonomies/TAXONOMY_ID/policyTags/PII_TAG_ID"]
            )
        )
        new_schema.append(new_field)
    elif field.name == "phone_number":
        # Apply PII policy tag to phone number
        new_field = bigquery.SchemaField(
            name=field.name,
            field_type=field.field_type,
            mode=field.mode,
            description=field.description,
            policy_tags=bigquery.PolicyTagList(
                names=["projects/my-project/locations/us-central1/taxonomies/TAXONOMY_ID/policyTags/PII_TAG_ID"]
            )
        )
        new_schema.append(new_field)
    elif field.name == "ssn":
        # Apply Sensitive PII tag to SSN
        new_field = bigquery.SchemaField(
            name=field.name,
            field_type=field.field_type,
            mode=field.mode,
            description=field.description,
            policy_tags=bigquery.PolicyTagList(
                names=["projects/my-project/locations/us-central1/taxonomies/TAXONOMY_ID/policyTags/SENSITIVE_PII_TAG_ID"]
            )
        )
        new_schema.append(new_field)
    else:
        new_schema.append(field)

# Apply the updated schema
table.schema = new_schema
client.update_table(table, ["schema"])
print("Schema updated with policy tags")
```

You can also apply policy tags when creating a table.

```sql
-- Create a table with policy tags on sensitive columns
CREATE TABLE `my_project.analytics.customers`
(
  customer_id STRING,
  name STRING,
  -- Apply PII policy tag to email
  email STRING OPTIONS(
    policy_tags='["projects/my-project/locations/us-central1/taxonomies/TAXONOMY_ID/policyTags/PII_TAG_ID"]'
  ),
  -- Apply Financial policy tag to account number
  account_number STRING OPTIONS(
    policy_tags='["projects/my-project/locations/us-central1/taxonomies/TAXONOMY_ID/policyTags/FINANCIAL_TAG_ID"]'
  ),
  signup_date DATE,
  subscription_tier STRING
);
```

## Step 4 - Configure Access Control

With policy tags applied to columns, you need to grant specific users or groups the ability to read tagged columns. By default, tagged columns are not accessible to anyone, even BigQuery admins.

```bash
# Grant a group access to read PII-tagged columns
gcloud data-catalog taxonomies policy-tags set-iam-policy \
  PII_TAG_ID \
  --taxonomy=TAXONOMY_ID \
  --location=us-central1 \
  --project=my-project \
  policy.json
```

The policy.json file specifies who gets access.

```json
{
  "bindings": [
    {
      "role": "roles/datacatalog.categoryFineGrainedReader",
      "members": [
        "group:pii-readers@mycompany.com",
        "serviceAccount:etl-pipeline@my-project.iam.gserviceaccount.com"
      ]
    }
  ]
}
```

You can also set IAM policies using the Python client.

```python
from google.cloud import datacatalog_v1
from google.iam.v1 import policy_pb2

client = datacatalog_v1.PolicyTagManagerClient()

# Set IAM policy on the PII policy tag
policy = policy_pb2.Policy(
    bindings=[
        policy_pb2.Binding(
            role="roles/datacatalog.categoryFineGrainedReader",
            members=[
                "group:pii-readers@mycompany.com",
                "serviceAccount:etl-pipeline@my-project.iam.gserviceaccount.com"
            ]
        )
    ]
)

client.set_iam_policy(
    request={
        "resource": "projects/my-project/locations/us-central1/taxonomies/TAXONOMY_ID/policyTags/PII_TAG_ID",
        "policy": policy
    }
)
print("IAM policy updated for PII tag")
```

## Testing the Access Control

After configuration, test that column-level security works correctly.

```sql
-- A user WITHOUT PII access runs this query:
SELECT customer_id, name, email FROM `my_project.analytics.customers`;
-- Result: Access Denied - User does not have permission to access column 'email'

-- The same user can query non-sensitive columns:
SELECT customer_id, name, signup_date FROM `my_project.analytics.customers`;
-- Result: Success - returns data normally
```

## Data Masking as an Alternative

If you want to allow users to see that a column exists but show masked values instead of denying access entirely, you can combine policy tags with authorized views that mask the data.

```sql
-- Create a view that masks PII columns
CREATE VIEW `my_project.analytics.customers_masked` AS
SELECT
  customer_id,
  name,
  -- Mask the email, showing only the domain
  CONCAT('***@', SPLIT(email, '@')[OFFSET(1)]) AS email_masked,
  -- Mask the account number, showing only last 4 digits
  CONCAT('****', RIGHT(account_number, 4)) AS account_number_masked,
  signup_date,
  subscription_tier
FROM
  `my_project.analytics.customers`;
```

## Wrapping Up

Column-level security with policy tags is one of the most practical data governance features in BigQuery. It lets you share tables broadly while keeping sensitive columns locked down to the people and services that genuinely need access. The taxonomy and policy tag structure scales well across large organizations, and the IAM integration means you manage access through the same system you use for everything else in GCP. If your tables contain any PII, financial data, or other sensitive information, this should be one of the first security controls you implement.
