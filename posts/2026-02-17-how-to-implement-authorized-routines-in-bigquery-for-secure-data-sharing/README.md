# How to Implement Authorized Routines in BigQuery for Secure Data Sharing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Security, Data Sharing, Authorized Routines

Description: Learn how to use authorized routines in BigQuery to share data securely by granting access to specific functions rather than underlying tables.

---

Sharing data in BigQuery is straightforward when you can just grant table-level access. But what happens when you need to share specific slices of data without exposing the entire table? Or when you want to enforce business logic on every query? Authorized routines solve this by letting you grant access to a function or stored procedure that queries the data, without granting direct access to the underlying tables. Users can execute the routine but cannot see or query the raw data directly.

## The Problem with Direct Table Access

Imagine you have a customer table with sensitive fields like social security numbers, credit scores, and full addresses. Your analytics team needs customer demographics for reporting but should not see the sensitive fields. You could create a view that excludes sensitive columns, but views in BigQuery require the user to have at least read access to the underlying dataset. That is often too broad.

Authorized routines offer a better approach. You create a function that returns only the data you want to share, authorize that function to access the protected dataset, and grant users permission to execute the function. The users never get direct access to the tables.

## How Authorized Routines Work

The flow is:

1. Create a routine (function or procedure) in a dataset the users can access
2. The routine queries tables in a protected dataset
3. Authorize the routine to access the protected dataset
4. Users call the routine and get results, but cannot query the protected tables directly

## Setting Up the Protected Dataset

First, let us set up the scenario. You have a dataset with sensitive customer data:

```sql
-- Protected dataset: contains sensitive customer data
-- Only administrators have direct access to this dataset
CREATE SCHEMA IF NOT EXISTS `my_project.protected_data`
OPTIONS (
  description = 'Contains sensitive customer data - restricted access'
);

-- Customer table with sensitive fields
CREATE TABLE `my_project.protected_data.customers` (
  customer_id STRING,
  first_name STRING,
  last_name STRING,
  email STRING,
  ssn STRING,              -- Sensitive
  credit_score INT64,       -- Sensitive
  date_of_birth DATE,
  city STRING,
  state STRING,
  signup_date DATE,
  account_tier STRING
);
```

## Creating the Shared Dataset and Routine

Create a separate dataset where the authorized routine will live. This is the dataset users will have access to:

```sql
-- Shared dataset: users have access to routines here
-- but NOT to the protected_data dataset
CREATE SCHEMA IF NOT EXISTS `my_project.shared_analytics`
OPTIONS (
  description = 'Contains authorized routines for safe data access'
);
```

Now create a table-valued function that returns only non-sensitive customer data:

```sql
-- Table-valued function that returns safe customer demographics
-- This function queries the protected table but only exposes safe columns
CREATE OR REPLACE TABLE FUNCTION `my_project.shared_analytics.get_customer_demographics`(
  filter_state STRING,
  filter_tier STRING
)
AS (
  SELECT
    customer_id,
    -- Mask names to first initial + last name
    CONCAT(SUBSTR(first_name, 1, 1), '. ', last_name) AS display_name,
    city,
    state,
    EXTRACT(YEAR FROM date_of_birth) AS birth_year,
    signup_date,
    account_tier
  FROM `my_project.protected_data.customers`
  WHERE (filter_state IS NULL OR state = filter_state)
    AND (filter_tier IS NULL OR account_tier = filter_tier)
);
```

## Authorizing the Routine

Now authorize this routine to access the protected dataset. You do this by adding the routine to the protected dataset's authorized routines list:

```bash
# Authorize the routine to access the protected dataset
# This grants the routine (not the user) access to query protected_data
bq update --authorized_routine \
  my_project:shared_analytics.get_customer_demographics \
  my_project:protected_data
```

You can also do this through the BigQuery API or Terraform:

```bash
# Using gcloud to update dataset access
# Add the routine as an authorized routine on the protected dataset
bq show --format=prettyjson my_project:protected_data > /tmp/dataset.json

# Edit the JSON to add authorizedRoutine entry, then update
bq update --source /tmp/dataset.json my_project:protected_data
```

## Granting User Access

Grant users access to the shared dataset (where the routine lives) but NOT to the protected dataset:

```bash
# Grant the analytics team permission to use routines in shared_analytics
# They can execute functions but cannot access protected_data directly
gcloud projects add-iam-policy-binding my_project \
  --member="group:analytics-team@company.com" \
  --role="roles/bigquery.dataViewer" \
  --condition='expression=resource.name.startsWith("projects/my_project/datasets/shared_analytics"),title=shared-analytics-access'
```

Or at the dataset level:

```bash
# Grant access to the shared_analytics dataset only
bq add-iam-policy-binding \
  --member="group:analytics-team@company.com" \
  --role="roles/bigquery.dataViewer" \
  my_project:shared_analytics
```

## Using the Authorized Routine

Now the analytics team can call the function and get data:

```sql
-- Analytics team can call this function
-- They get demographics data without seeing SSN, credit score, etc.
SELECT *
FROM `my_project.shared_analytics.get_customer_demographics`('CA', NULL)
ORDER BY signup_date DESC
LIMIT 100;
```

If they try to query the protected table directly, they get a permission denied error:

```sql
-- This query fails - user does not have access to protected_data
SELECT * FROM `my_project.protected_data.customers`;
-- Error: Access Denied: Table my_project:protected_data.customers
```

## Authorized Stored Procedures

You can also use stored procedures as authorized routines. This is useful for more complex logic:

```sql
-- Stored procedure that calculates aggregated metrics
-- from sensitive data without exposing individual records
CREATE OR REPLACE PROCEDURE `my_project.shared_analytics.get_tier_statistics`(
  IN target_state STRING,
  OUT result_json STRING
)
BEGIN
  -- Calculate aggregate statistics without exposing individual data
  SET result_json = (
    SELECT TO_JSON_STRING(ARRAY_AGG(tier_stats))
    FROM (
      SELECT
        account_tier,
        COUNT(*) AS customer_count,
        AVG(credit_score) AS avg_credit_score,
        MIN(signup_date) AS earliest_signup,
        MAX(signup_date) AS latest_signup
      FROM `my_project.protected_data.customers`
      WHERE state = target_state
      GROUP BY account_tier
    ) tier_stats
  );
END;
```

## Row-Level Security with Authorized Routines

You can implement row-level security where different users see different subsets of data:

```sql
-- Function that filters data based on the calling user's role
-- Each user only sees customers in their assigned region
CREATE OR REPLACE TABLE FUNCTION `my_project.shared_analytics.get_my_customers`()
AS (
  SELECT
    c.customer_id,
    CONCAT(SUBSTR(c.first_name, 1, 1), '. ', c.last_name) AS display_name,
    c.city,
    c.state,
    c.account_tier
  FROM `my_project.protected_data.customers` c
  INNER JOIN `my_project.protected_data.user_region_assignments` ura
    ON c.state = ura.assigned_state
  WHERE ura.user_email = SESSION_USER()
);
```

The `SESSION_USER()` function returns the email of the user executing the query, enabling automatic row-level filtering.

## Combining with Column-Level Security

For defense in depth, combine authorized routines with column-level security:

```sql
-- Even within the routine, apply column masking for extra safety
CREATE OR REPLACE TABLE FUNCTION `my_project.shared_analytics.get_customer_contacts`(
  filter_tier STRING
)
AS (
  SELECT
    customer_id,
    first_name,
    last_name,
    -- Mask email: show domain only
    CONCAT('***@', SPLIT(email, '@')[SAFE_OFFSET(1)]) AS masked_email,
    city,
    state,
    account_tier
  FROM `my_project.protected_data.customers`
  WHERE account_tier = filter_tier
);
```

## Auditing Access

Authorized routines work with BigQuery audit logs. Every call to an authorized routine is logged, giving you a clear trail of who accessed what data and when:

```bash
# Query audit logs for authorized routine usage
gcloud logging read \
  'resource.type="bigquery_resource" AND protoPayload.methodName="jobservice.jobcompleted" AND protoPayload.serviceData.jobCompletedEvent.job.jobConfiguration.query.query:"shared_analytics"' \
  --limit=50 \
  --format=json
```

## Best Practices

Keep routines focused. Each routine should serve a specific use case. Do not create one giant function that returns everything - that defeats the purpose of controlled access.

Document what each routine exposes. When you create an authorized routine, add a clear description of what data it returns and what it filters out. This helps both users and auditors.

Test access controls. After setting up authorized routines, test them with a user account that has only the shared dataset permissions. Verify they can call the routines and cannot access the protected tables directly.

Authorized routines are a powerful pattern for data sharing in BigQuery. They give you fine-grained control over what data is exposed, enforce business logic at query time, and maintain a clear audit trail. For organizations dealing with sensitive data, they are an essential tool for balancing data accessibility with security.
