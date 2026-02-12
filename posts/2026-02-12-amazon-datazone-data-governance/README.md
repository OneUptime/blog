# How to Set Up Amazon DataZone for Data Governance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DataZone, Data Governance, Data Management

Description: A practical walkthrough for setting up Amazon DataZone to implement data governance, build a data catalog, and enable self-service data access across your organization.

---

Data governance sounds like something only heavily regulated industries need to worry about. In reality, once you have more than a handful of data producers and consumers in your organization, you need some structure around who owns what data, who can access it, and what it actually means. That's where Amazon DataZone comes in.

DataZone is AWS's data management service that lets you catalog, discover, share, and govern data across accounts and teams. Think of it as a data marketplace for your company - teams can publish their datasets and other teams can request access to them, all with proper approval workflows.

## Core Concepts

Before diving into the setup, here are the key building blocks:

- **Domain** - A top-level organizational boundary (like "Analytics" or "Engineering")
- **Project** - A workspace within a domain where teams collaborate on data
- **Environment** - The compute and storage resources attached to a project (Redshift, Athena, etc.)
- **Data Source** - A connection to where your data lives (S3, Redshift, Glue catalog)
- **Asset** - A published dataset that other projects can discover and subscribe to
- **Subscription** - A request from one project to access another project's asset

## Setting Up a DataZone Domain

Start by creating a domain. This is the top-level container for all your governance activities.

```bash
# Create a DataZone domain - this is your governance boundary
aws datazone create-domain \
    --name "company-data-domain" \
    --description "Central data governance domain for all business units" \
    --domain-execution-role "arn:aws:iam::123456789012:role/DataZoneDomainRole"
```

The domain execution role needs permissions to access Glue, S3, Redshift, and other data services. Here's the IAM policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "glue:GetDatabase*",
                "glue:GetTable*",
                "glue:GetPartition*",
                "s3:GetObject",
                "s3:ListBucket",
                "redshift:DescribeClusters",
                "redshift-data:ExecuteStatement",
                "redshift-data:GetStatementResult"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ram:CreateResourceShare",
                "ram:AssociateResourceShare",
                "ram:GetResourceShares"
            ],
            "Resource": "*"
        }
    ]
}
```

## Creating Projects

Projects are where teams do their actual work. Each project can have its own members, environments, and published assets.

```bash
# Create a project for the analytics team
aws datazone create-project \
    --domain-identifier "dzd_abc123" \
    --name "analytics-team" \
    --description "Analytics team project for sales and marketing data"

# Create a project for the data engineering team
aws datazone create-project \
    --domain-identifier "dzd_abc123" \
    --name "data-engineering" \
    --description "Data engineering project for raw and processed data assets"
```

Add members to projects so they can publish and subscribe to data:

```bash
# Add a user to the analytics project as a contributor
aws datazone create-project-membership \
    --domain-identifier "dzd_abc123" \
    --project-identifier "proj_analytics123" \
    --member '{"userIdentifier": "arn:aws:iam::123456789012:user/analyst-jane"}' \
    --designation CONTRIBUTOR
```

## Setting Up Environments

Environments provide the compute resources for working with data. For example, you might create an Athena environment so the analytics team can query data they've subscribed to.

```bash
# Create an environment profile (template for environments)
aws datazone create-environment-profile \
    --domain-identifier "dzd_abc123" \
    --project-identifier "proj_analytics123" \
    --name "athena-analytics-env" \
    --environment-blueprint-identifier "DefaultDataLake" \
    --aws-account-id "123456789012" \
    --aws-account-region "us-east-1"

# Create an actual environment from the profile
aws datazone create-environment \
    --domain-identifier "dzd_abc123" \
    --project-identifier "proj_analytics123" \
    --name "analytics-athena" \
    --environment-profile-identifier "envprofile_abc123"
```

## Registering and Publishing Data Sources

This is where the data catalog starts to come together. You register a data source (like a Glue database) and DataZone automatically discovers the tables and schemas.

```bash
# Register a Glue database as a data source
aws datazone create-data-source \
    --domain-identifier "dzd_abc123" \
    --project-identifier "proj_dataeng123" \
    --name "sales-data-source" \
    --type "GLUE" \
    --configuration '{
        "glueRunConfiguration": {
            "relationalFilterConfigurations": [
                {
                    "databaseName": "sales_database",
                    "filterExpressions": [
                        {
                            "type": "INCLUDE",
                            "expression": "*"
                        }
                    ]
                }
            ]
        }
    }' \
    --enable-setting "ENABLED" \
    --schedule '{
        "schedule": "cron(0 6 * * ? *)",
        "timezone": "UTC"
    }'
```

After the data source runs its discovery, you'll see all the tables from that Glue database as draft assets. You can then enrich them with business descriptions, glossary terms, and ownership information before publishing them to the catalog.

## Adding Business Metadata

Raw table names and column names rarely make sense to business users. DataZone lets you add business context:

```bash
# Create a glossary for business terms
aws datazone create-glossary \
    --domain-identifier "dzd_abc123" \
    --owning-project-identifier "proj_dataeng123" \
    --name "Sales Glossary" \
    --description "Standard definitions for sales and revenue metrics"

# Add a glossary term
aws datazone create-glossary-term \
    --domain-identifier "dzd_abc123" \
    --glossary-identifier "gloss_abc123" \
    --name "Annual Recurring Revenue" \
    --short-description "ARR - The annualized value of active subscriptions" \
    --long-description "Calculated as the sum of all active subscription values normalized to a 12-month period. Excludes one-time fees, professional services, and churned accounts."
```

Linking glossary terms to table columns creates a shared vocabulary. When someone searches the catalog for "ARR," they'll find the exact tables and columns that contain that metric.

## The Subscription Workflow

This is the governance part that really matters. When the analytics team wants access to a dataset owned by data engineering, they don't just get it automatically. They submit a subscription request, and the data owner approves or denies it.

```bash
# Request access to a published asset (from the analytics project)
aws datazone create-subscription-request \
    --domain-identifier "dzd_abc123" \
    --request-reason "Need sales data for quarterly business review dashboard" \
    --subscribed-listings '[
        {
            "identifier": "listing_abc123"
        }
    ]' \
    --subscribed-principals '[
        {
            "project": {
                "identifier": "proj_analytics123"
            }
        }
    ]'
```

The data owner gets a notification and can approve:

```bash
# Approve the subscription request (from the data engineering project)
aws datazone accept-subscription-request \
    --domain-identifier "dzd_abc123" \
    --identifier "subreq_abc123" \
    --decision-comment "Approved for Q1 dashboard. Access valid for 90 days."
```

Once approved, DataZone automatically grants the necessary permissions - Lake Formation grants, Redshift shares, or S3 policies - depending on the environment type.

## Automating Governance with Approval Rules

For commonly accessed datasets, you can set up auto-approval rules so that certain projects don't need manual approval:

```bash
# Create a subscription grant for automatic approvals
# Any project in the domain can auto-access public reference data
aws datazone create-subscription-target \
    --domain-identifier "dzd_abc123" \
    --environment-identifier "env_abc123" \
    --name "auto-approve-reference-data" \
    --type "DEFAULT" \
    --subscribed-listing-asset-scope '{
        "asset-scope": "ALL_ASSETS"
    }'
```

## Monitoring Your Data Governance

You should track a few things to make sure your governance setup is working:

- How many assets are published vs. draft
- Subscription request approval times
- Which datasets are most accessed
- Whether metadata is being maintained

DataZone integrates with CloudWatch, so you can set up dashboards and alarms:

```bash
# Get metrics on data source runs to ensure discovery is working
aws cloudwatch get-metric-statistics \
    --namespace "AWS/DataZone" \
    --metric-name "DataSourceRunsCompleted" \
    --dimensions Name=DomainId,Value=dzd_abc123 \
    --start-time 2026-02-05T00:00:00Z \
    --end-time 2026-02-12T00:00:00Z \
    --period 86400 \
    --statistics Sum
```

Setting up DataZone is an investment, but it pays off quickly once your data team grows beyond a few people. Instead of Slack messages asking "who owns the sales table?" and "can I get access to the revenue data?", you have a structured catalog with approval workflows. It's not just about compliance - it's about making data actually usable. For more on controlling data access, see how [AWS Lake Formation tag-based access control](https://oneuptime.com/blog/post/aws-lake-formation-tag-based-access-control/view) can complement your DataZone setup.
