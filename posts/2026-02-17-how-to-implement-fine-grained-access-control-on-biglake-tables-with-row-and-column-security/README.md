# How to Implement Fine-Grained Access Control on BigLake Tables with Row and Column Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigLake, Data Security, Access Control, BigQuery

Description: A practical guide to implementing row-level security and column-level access control on BigLake tables to protect sensitive data in your data lake.

---

One of the biggest selling points of BigLake is the ability to apply fine-grained access control to data sitting in Cloud Storage. Before BigLake, if your Parquet files contained PII like email addresses or social security numbers, your only option was to create separate files with those columns removed. Now you can keep one copy of the data and control who sees what at the row and column level.

I have set this up for teams where analysts need access to behavioral data but should never see personally identifiable information, while compliance teams need the full picture. Same table, different views of the data based on who is querying. Here is how to implement it.

## How BigLake Access Control Works

BigLake tables route all data access through a connection service account. When a user runs a query, BigQuery checks their permissions against the table's security policies before returning results. For column-level security, restricted columns return NULL for unauthorized users. For row-level security, unauthorized rows are simply filtered out.

The key insight is that users never touch Cloud Storage directly. The BigLake connection service account reads the data, and BigQuery enforces the access policies. This is fundamentally different from regular external tables where users need Cloud Storage access.

## Prerequisites

Make sure you have a BigLake table already set up with a Cloud Resource connection. If not, create one first.

```bash
# Enable required APIs
gcloud services enable bigqueryconnection.googleapis.com
gcloud services enable datacatalog.googleapis.com
gcloud services enable bigquerydatapolicy.googleapis.com

# Create a connection if you do not have one
bq mk --connection \
  --connection_type=CLOUD_RESOURCE \
  --location=US \
  biglake-secure-connection
```

Create a BigLake table that contains sensitive data:

```sql
-- Create a BigLake table with sensitive columns
CREATE OR REPLACE EXTERNAL TABLE `my-project.secure_data.customer_transactions` (
  transaction_id STRING,
  customer_id STRING,
  customer_email STRING,
  customer_ssn STRING,
  transaction_amount FLOAT64,
  transaction_date DATE,
  merchant_name STRING,
  merchant_category STRING,
  region STRING,
  country STRING
)
WITH CONNECTION `my-project.US.biglake-secure-connection`
OPTIONS (
  format = 'PARQUET',
  uris = ['gs://my-secure-bucket/transactions/*.parquet'],
  max_staleness = INTERVAL 30 MINUTE,
  metadata_cache_mode = 'AUTOMATIC'
);
```

## Setting Up Column-Level Security with Policy Tags

Column-level security uses Data Catalog policy tags to restrict access to specific columns.

First, create a policy tag taxonomy:

```bash
# Create a taxonomy for data classification
gcloud data-catalog taxonomies create \
  --display-name="Data Sensitivity" \
  --description="Classification levels for sensitive data" \
  --location=us

# Note the taxonomy ID from the output, you will need it
# Example: projects/my-project/locations/us/taxonomies/1234567890
```

Create policy tags within the taxonomy:

```bash
# Create a policy tag for PII data
gcloud data-catalog taxonomies policy-tags create \
  --taxonomy="projects/my-project/locations/us/taxonomies/1234567890" \
  --display-name="PII" \
  --description="Personally Identifiable Information"

# Create a policy tag for highly restricted data
gcloud data-catalog taxonomies policy-tags create \
  --taxonomy="projects/my-project/locations/us/taxonomies/1234567890" \
  --display-name="Highly Restricted" \
  --description="Data requiring special authorization"
```

Enable the taxonomy for enforcement:

```bash
# Enable policy tag enforcement on the taxonomy
# Without this step, the tags are just labels with no access control
gcloud data-catalog taxonomies set-iam-policy \
  "projects/my-project/locations/us/taxonomies/1234567890" \
  policy.json
```

## Applying Policy Tags to Columns

Now apply the policy tags to sensitive columns on your BigLake table:

```sql
-- Apply the PII policy tag to the customer_email column
-- Users without the Fine Grained Reader role on this tag
-- will see NULL for this column
ALTER TABLE `my-project.secure_data.customer_transactions`
ALTER COLUMN customer_email
SET OPTIONS (
  policy_tags = 'projects/my-project/locations/us/taxonomies/1234567890/policyTags/111111'
);

-- Apply the Highly Restricted tag to the SSN column
ALTER TABLE `my-project.secure_data.customer_transactions`
ALTER COLUMN customer_ssn
SET OPTIONS (
  policy_tags = 'projects/my-project/locations/us/taxonomies/1234567890/policyTags/222222'
);
```

## Granting Column-Level Access

Grant specific users or groups the ability to see restricted columns:

```bash
# Grant the compliance team access to PII columns
gcloud data-catalog taxonomies policy-tags add-iam-policy-binding \
  "projects/my-project/locations/us/taxonomies/1234567890/policyTags/111111" \
  --member="group:compliance-team@example.com" \
  --role="roles/datacatalog.categoryFineGrainedReader"

# Grant the security team access to highly restricted columns
gcloud data-catalog taxonomies policy-tags add-iam-policy-binding \
  "projects/my-project/locations/us/taxonomies/1234567890/policyTags/222222" \
  --member="group:security-team@example.com" \
  --role="roles/datacatalog.categoryFineGrainedReader"
```

Now when an analyst without PII access runs a query:

```sql
-- An analyst without PII access runs this query
-- customer_email and customer_ssn will return NULL
SELECT
  transaction_id,
  customer_id,
  customer_email,    -- Returns NULL for unauthorized users
  customer_ssn,      -- Returns NULL for unauthorized users
  transaction_amount,
  transaction_date
FROM `my-project.secure_data.customer_transactions`
WHERE transaction_date = '2026-02-17'
LIMIT 10;
```

## Implementing Row-Level Security

Row-level security filters entire rows based on who is running the query. This is done through row access policies.

```sql
-- Create a row access policy that limits analysts to
-- only see transactions from their assigned region
CREATE ROW ACCESS POLICY region_filter
ON `my-project.secure_data.customer_transactions`
GRANT TO ('group:us-analysts@example.com')
FILTER USING (region = 'US');

-- Create another policy for EU analysts
CREATE ROW ACCESS POLICY eu_region_filter
ON `my-project.secure_data.customer_transactions`
GRANT TO ('group:eu-analysts@example.com')
FILTER USING (region = 'EU');

-- Allow the data engineering team to see all rows
CREATE ROW ACCESS POLICY full_access
ON `my-project.secure_data.customer_transactions`
GRANT TO ('group:data-engineering@example.com')
FILTER USING (TRUE);
```

When a US analyst queries the table, they only see US transactions. They do not even know that EU transactions exist - the rows are silently filtered.

```sql
-- When a US analyst runs this, they only get US rows
-- The WHERE clause is implicitly applied by the row access policy
SELECT
  region,
  COUNT(*) AS transaction_count,
  SUM(transaction_amount) AS total_amount
FROM `my-project.secure_data.customer_transactions`
WHERE transaction_date >= '2026-02-01'
GROUP BY region;
-- Result: only shows US region, not EU
```

## Combining Row and Column Security

The real power comes from combining both. You can have different users see different rows and different columns from the same table.

```sql
-- View existing row access policies on the table
SELECT *
FROM `my-project.secure_data.INFORMATION_SCHEMA.TABLE_OPTIONS`
WHERE table_name = 'customer_transactions';
```

Here is a practical example showing how different roles experience the same table:

```sql
-- Data Engineer (full access): sees all rows, all columns
-- US Analyst (row filter + no PII): sees US rows, email/SSN are NULL
-- Compliance (full rows + PII access): sees all rows including PII

-- To test what a specific user would see, use the SESSION_USER()
-- function in your row access policy filter
CREATE OR REPLACE ROW ACCESS POLICY dynamic_access
ON `my-project.secure_data.customer_transactions`
GRANT TO ('group:all-analysts@example.com')
FILTER USING (
  region IN (
    SELECT allowed_region
    FROM `my-project.secure_data.user_region_mapping`
    WHERE user_email = SESSION_USER()
  )
);
```

## Managing and Auditing Access

Monitor who is accessing what data through BigQuery audit logs:

```sql
-- Query audit logs to see who accessed the secured table
-- This helps verify that access controls are working correctly
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
  protopayload_auditlog.methodName AS method,
  timestamp,
  resource.labels.dataset_id,
  protopayload_auditlog.status.code AS status_code
FROM `my-project.region-us.INFORMATION_SCHEMA.JOBS`
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND referenced_tables.table_id = 'customer_transactions'
ORDER BY creation_time DESC;
```

List all row access policies on a table:

```sql
-- List row access policies
SELECT
  row_access_policy_name,
  grantees,
  filter_predicate
FROM `my-project.secure_data.INFORMATION_SCHEMA.ROW_ACCESS_POLICIES`
WHERE table_name = 'customer_transactions';
```

## Summary

Fine-grained access control on BigLake tables lets you maintain a single copy of your data while enforcing different access levels for different users. Column-level security through policy tags restricts who can see sensitive columns like PII, while row-level security through access policies controls which rows each user can query. Both work together seamlessly, and since all access goes through the BigLake connection, users never need direct Cloud Storage permissions. The setup takes some upfront work with taxonomies and policies, but once in place, it dramatically simplifies data governance across your organization.
