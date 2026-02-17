# How to Implement Column-Level Data Masking in BigQuery Using Policy Tags and DLP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Data Masking, DLP, Data Security

Description: Learn how to implement column-level data masking in BigQuery using policy tags and Cloud DLP to protect sensitive data while keeping it accessible for analysis.

---

Data masking is the practice of replacing sensitive values with obfuscated versions so that people can work with data without seeing the actual sensitive content. Instead of showing a full email address, you show `j***@example.com`. Instead of a social security number, you show `***-**-1234`. In BigQuery, you can implement this at the column level using policy tags combined with data masking rules.

This approach is better than creating separate masked copies of tables because there is only one table with one source of truth. Different users see different versions of the same column based on their access level. I set this up for a healthcare analytics team where analysts needed to run queries on patient data but could not see actual patient identifiers. Same table, same queries, but personally identifiable columns were automatically masked.

## How Column-Level Masking Works

BigQuery column-level masking sits on top of the policy tag infrastructure used for column-level security. You create a policy tag, attach a data masking rule to it, and apply the tag to sensitive columns. When a user queries the table:

- If they have the Fine Grained Reader role, they see the actual data
- If they have the Masked Reader role, they see the masked version
- If they have neither role, they see NULL

This is all transparent to the query itself. Users write standard SQL and the masking happens automatically.

## Setting Up the Policy Tag Taxonomy

First, create a taxonomy and policy tags for your sensitive data categories:

```bash
# Enable required APIs
gcloud services enable datacatalog.googleapis.com
gcloud services enable bigquerydatapolicy.googleapis.com
gcloud services enable dlp.googleapis.com

# Create a taxonomy for data classification
gcloud data-catalog taxonomies create \
  --display-name="Data Sensitivity Classification" \
  --description="Classification for column-level data masking" \
  --location=us \
  --activated-policy-types=FINE_GRAINED_ACCESS_CONTROL
```

Note the taxonomy ID from the output. Then create policy tags:

```bash
# Create a policy tag for email addresses
gcloud data-catalog taxonomies policy-tags create \
  --taxonomy="projects/my-project/locations/us/taxonomies/TAXONOMY_ID" \
  --display-name="Email PII" \
  --description="Email addresses requiring masking"

# Create a policy tag for phone numbers
gcloud data-catalog taxonomies policy-tags create \
  --taxonomy="projects/my-project/locations/us/taxonomies/TAXONOMY_ID" \
  --display-name="Phone PII" \
  --description="Phone numbers requiring masking"

# Create a policy tag for financial data
gcloud data-catalog taxonomies policy-tags create \
  --taxonomy="projects/my-project/locations/us/taxonomies/TAXONOMY_ID" \
  --display-name="Financial Data" \
  --description="Financial amounts and account numbers"

# Create a policy tag for government IDs (SSN, etc.)
gcloud data-catalog taxonomies policy-tags create \
  --taxonomy="projects/my-project/locations/us/taxonomies/TAXONOMY_ID" \
  --display-name="Government ID" \
  --description="Social security numbers and government identifiers"
```

## Creating Data Masking Rules

Attach masking rules to your policy tags. BigQuery supports several built-in masking types:

```bash
# Create a masking rule for email addresses
# SHA256 hashing preserves the ability to join and group
# while hiding the actual email
gcloud bigquery datapolicies create email-mask-policy \
  --location=us \
  --policy-tag="projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/EMAIL_TAG_ID" \
  --data-masking-policy-predefined-expression="SHA256" \
  --data-policy-type="DATA_MASKING_POLICY"

# Create a masking rule that always returns NULL
# for highly sensitive fields
gcloud bigquery datapolicies create ssn-mask-policy \
  --location=us \
  --policy-tag="projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/GOV_ID_TAG_ID" \
  --data-masking-policy-predefined-expression="ALWAYS_NULL" \
  --data-policy-type="DATA_MASKING_POLICY"

# Create a masking rule that shows the default masking
# (replaces with a fixed value based on data type)
gcloud bigquery datapolicies create phone-mask-policy \
  --location=us \
  --policy-tag="projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/PHONE_TAG_ID" \
  --data-masking-policy-predefined-expression="DEFAULT_MASKING_VALUE" \
  --data-policy-type="DATA_MASKING_POLICY"
```

For custom masking using Cloud DLP (for example, partial masking that shows the last 4 digits):

```python
# create_custom_masking.py
# Create a custom masking rule using Cloud DLP for partial masking
from google.cloud import bigquery_datapolicies_v1

def create_custom_masking_policy(project_id, location, policy_tag_id):
    """Create a data masking policy with custom DLP transformation."""
    client = bigquery_datapolicies_v1.DataPolicyServiceClient()

    # Define the masking policy with a DLP transformation
    data_policy = bigquery_datapolicies_v1.DataPolicy()
    data_policy.policy_tag = policy_tag_id
    data_policy.data_policy_type = (
        bigquery_datapolicies_v1.DataPolicy.DataPolicyType.DATA_MASKING_POLICY
    )

    # Use a DLP deidentify template for custom masking
    data_policy.data_masking_policy = (
        bigquery_datapolicies_v1.DataMaskingPolicy()
    )
    data_policy.data_masking_policy.predefined_expression = (
        bigquery_datapolicies_v1.DataMaskingPolicy.PredefinedExpression.LAST_FOUR_CHARACTERS
    )

    parent = f"projects/{project_id}/locations/{location}"

    policy = client.create_data_policy(
        request=bigquery_datapolicies_v1.CreateDataPolicyRequest(
            parent=parent,
            data_policy=data_policy,
        )
    )

    print(f"Created masking policy: {policy.name}")
    return policy

create_custom_masking_policy(
    "my-project",
    "us",
    "projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/FINANCIAL_TAG_ID",
)
```

## Applying Policy Tags to Table Columns

Apply the policy tags to sensitive columns in your BigQuery tables:

```sql
-- Apply the email PII policy tag to the email column
ALTER TABLE `my-project.analytics.customers`
ALTER COLUMN email
SET OPTIONS (
  policy_tags = 'projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/EMAIL_TAG_ID'
);

-- Apply the phone PII tag
ALTER TABLE `my-project.analytics.customers`
ALTER COLUMN phone_number
SET OPTIONS (
  policy_tags = 'projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/PHONE_TAG_ID'
);

-- Apply the government ID tag to SSN
ALTER TABLE `my-project.analytics.customers`
ALTER COLUMN ssn
SET OPTIONS (
  policy_tags = 'projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/GOV_ID_TAG_ID'
);

-- Apply the financial data tag
ALTER TABLE `my-project.analytics.transactions`
ALTER COLUMN account_number
SET OPTIONS (
  policy_tags = 'projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/FINANCIAL_TAG_ID'
);
```

You can also apply tags during table creation:

```sql
-- Create a table with policy tags on sensitive columns
CREATE TABLE `my-project.analytics.patient_records` (
  patient_id STRING NOT NULL,
  -- Full name gets the PII tag
  full_name STRING OPTIONS (
    policy_tags = 'projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/EMAIL_TAG_ID'
  ),
  -- Medical record number gets the government ID tag
  mrn STRING OPTIONS (
    policy_tags = 'projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/GOV_ID_TAG_ID'
  ),
  diagnosis_code STRING,
  admission_date DATE,
  discharge_date DATE,
  total_charges FLOAT64 OPTIONS (
    policy_tags = 'projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/FINANCIAL_TAG_ID'
  )
);
```

## Granting Access Roles

Configure who sees what:

```bash
# Grant the Masked Reader role to analysts
# They will see masked versions of sensitive columns
gcloud bigquery datapolicies add-iam-policy-binding email-mask-policy \
  --location=us \
  --member="group:analysts@example.com" \
  --role="roles/bigquerydatapolicy.maskedReader"

# Grant the Fine Grained Reader role to compliance team
# They will see the actual unmasked values
gcloud data-catalog taxonomies policy-tags add-iam-policy-binding \
  "projects/my-project/locations/us/taxonomies/TAXONOMY_ID/policyTags/EMAIL_TAG_ID" \
  --member="group:compliance@example.com" \
  --role="roles/datacatalog.categoryFineGrainedReader"
```

## What Users See

Here is what different users experience when querying the same table:

```sql
-- All users run the exact same query
SELECT
  patient_id,
  full_name,
  mrn,
  diagnosis_code,
  admission_date,
  total_charges
FROM `my-project.analytics.patient_records`
LIMIT 5;

-- Compliance team (Fine Grained Reader) sees:
-- patient_id | full_name     | mrn        | diagnosis_code | total_charges
-- P001       | John Smith    | MRN-12345  | J18.9          | 15420.50

-- Analyst team (Masked Reader) sees:
-- patient_id | full_name                          | mrn  | diagnosis_code | total_charges
-- P001       | a7f3b2c1d4e5f6a7b8c9d0e1f2a3b4c5 | NULL | J18.9          | 5420

-- No access role sees:
-- patient_id | full_name | mrn  | diagnosis_code | total_charges
-- P001       | NULL      | NULL | J18.9          | NULL
```

The key point is that the query is identical for all users. The masking is applied transparently by BigQuery based on the user's roles.

## Using Cloud DLP for Automated Discovery

Use Cloud DLP to automatically find sensitive data and suggest policy tags:

```python
# discover_sensitive_data.py
# Use Cloud DLP to scan BigQuery tables for sensitive data
from google.cloud import dlp_v2

def inspect_table_for_pii(project_id, dataset_id, table_id):
    """Scan a BigQuery table for PII using Cloud DLP."""
    dlp_client = dlp_v2.DlpServiceClient()

    # Configure what types of sensitive data to look for
    inspect_config = dlp_v2.InspectConfig(
        info_types=[
            dlp_v2.InfoType(name="EMAIL_ADDRESS"),
            dlp_v2.InfoType(name="PHONE_NUMBER"),
            dlp_v2.InfoType(name="US_SOCIAL_SECURITY_NUMBER"),
            dlp_v2.InfoType(name="CREDIT_CARD_NUMBER"),
            dlp_v2.InfoType(name="PERSON_NAME"),
            dlp_v2.InfoType(name="STREET_ADDRESS"),
        ],
        min_likelihood=dlp_v2.Likelihood.LIKELY,
        include_quote=False,
    )

    # Configure the BigQuery table to scan
    storage_config = dlp_v2.StorageConfig(
        big_query_options=dlp_v2.BigQueryOptions(
            table_reference=dlp_v2.BigQueryTable(
                project_id=project_id,
                dataset_id=dataset_id,
                table_id=table_id,
            ),
            rows_limit=10000,  # Scan a sample
            sample_method=dlp_v2.BigQueryOptions.SampleMethod.RANDOM_START,
        ),
    )

    # Save findings to BigQuery for analysis
    action = dlp_v2.Action(
        save_findings=dlp_v2.Action.SaveFindings(
            output_config=dlp_v2.OutputStorageConfig(
                table=dlp_v2.BigQueryTable(
                    project_id=project_id,
                    dataset_id="dlp_results",
                    table_id=f"findings_{table_id}",
                ),
            ),
        ),
    )

    # Create and run the inspection job
    job = dlp_client.create_dlp_job(
        request=dlp_v2.CreateDlpJobRequest(
            parent=f"projects/{project_id}/locations/global",
            inspect_job=dlp_v2.InspectJobConfig(
                inspect_config=inspect_config,
                storage_config=storage_config,
                actions=[action],
            ),
        )
    )

    print(f"DLP inspection job started: {job.name}")
    return job.name

inspect_table_for_pii("my-project", "analytics", "customers")
```

After the DLP scan completes, query the findings to see which columns contain sensitive data:

```sql
-- Review DLP findings to determine which columns need masking
SELECT
  location.content_locations[SAFE_OFFSET(0)].record_location.field_id.name AS column_name,
  info_type.name AS sensitive_data_type,
  likelihood,
  COUNT(*) AS finding_count
FROM `my-project.dlp_results.findings_customers`
GROUP BY column_name, sensitive_data_type, likelihood
ORDER BY finding_count DESC;
```

## Monitoring Masking Activity

Track who is accessing masked versus unmasked data:

```sql
-- Query audit logs to see data access patterns
-- This shows which users accessed tables with policy tags
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
  resource.labels.dataset_id,
  resource.labels.project_id,
  timestamp,
  protopayload_auditlog.methodName
FROM `my-project.region-us.INFORMATION_SCHEMA.JOBS`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY timestamp DESC
LIMIT 100;
```

## Summary

Column-level data masking in BigQuery through policy tags and DLP provides transparent data protection without duplicating tables or changing queries. Create a taxonomy with policy tags for each sensitivity category, attach masking rules (SHA256, NULL, default masking, or custom DLP transformations), and apply the tags to sensitive columns. Grant the Masked Reader role to users who should see obfuscated data and the Fine Grained Reader role to users who need the actual values. Use Cloud DLP to automatically discover which columns contain sensitive data before applying tags. The result is a single source of truth where different users see different levels of detail based on their role, all without any changes to the SQL they write.
