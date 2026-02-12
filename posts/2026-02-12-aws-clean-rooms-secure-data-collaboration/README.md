# How to Set Up AWS Clean Rooms for Secure Data Collaboration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Clean Rooms, Data Collaboration, Privacy

Description: A practical guide to setting up AWS Clean Rooms for secure multi-party data collaboration without exposing raw data between organizations.

---

There are plenty of situations where two companies need to analyze data together but neither wants to share their raw data with the other. A retailer and an ad platform want to measure campaign effectiveness. Two healthcare organizations want to do population health research. A bank wants to enrich its data with third-party demographic info. AWS Clean Rooms was built for exactly these scenarios.

Clean Rooms lets multiple parties bring their data to a shared analysis environment where they can run approved queries without ever seeing each other's raw data. The data never leaves your AWS account, and you control exactly which computations are allowed.

## How Clean Rooms Works

The basic model involves a few concepts:

- **Collaboration** - An agreement between two or more parties to analyze data together
- **Membership** - Each party that joins a collaboration
- **Configured table** - A Glue table that a member makes available to the collaboration with specific restrictions
- **Analysis rule** - Controls what can be done with a configured table (aggregation only, list output, or custom)
- **Query runner** - The member who actually runs queries against the collaboration

The key constraint is that the party running the query can only see the results in the form allowed by the analysis rules. They never see individual rows from the other party's data.

## Setting Up a Collaboration

Let's walk through a realistic example. Say CompanyA (a retailer) and CompanyB (an ad platform) want to measure how ad impressions drive purchases.

First, one party creates the collaboration:

```bash
# CompanyA creates the collaboration
aws cleanrooms create-collaboration \
    --name "retail-ads-measurement" \
    --description "Measure ad campaign effectiveness on retail purchases" \
    --creator-member-abilities '["CAN_QUERY", "CAN_RECEIVE_RESULTS"]' \
    --creator-display-name "RetailCo" \
    --members '[
        {
            "accountId": "222233334444",
            "memberAbilities": ["CAN_QUERY"],
            "displayName": "AdPlatformCo"
        }
    ]' \
    --query-log-status "ENABLED" \
    --data-encryption-metadata '{
        "allowCleartext": true,
        "allowDuplicates": true,
        "preserveNulls": false
    }'
```

CompanyB then accepts the invitation by creating their membership:

```bash
# CompanyB creates their membership in the collaboration
aws cleanrooms create-membership \
    --collaboration-identifier "collab-abc123" \
    --query-log-status "ENABLED" \
    --default-result-configuration '{
        "outputConfiguration": {
            "s3": {
                "resultFormat": "CSV",
                "bucket": "companb-cleanroom-results",
                "keyPrefix": "results/"
            }
        }
    }'
```

## Configuring Tables

Each party needs to make their data available to the collaboration. This involves creating a configured table from a Glue table and setting analysis rules that control how the data can be used.

CompanyA configures their purchases table:

```bash
# CompanyA makes their purchase data available with aggregation rules
aws cleanrooms create-configured-table \
    --name "retail-purchases" \
    --table-reference '{
        "glue": {
            "tableName": "purchases",
            "databaseName": "retail_db"
        }
    }' \
    --allowed-columns '["hashed_email", "purchase_date", "category", "amount", "store_region"]' \
    --analysis-method "DIRECT_QUERY"
```

Now set the analysis rule. This is where you define what queries are allowed:

```bash
# Only allow aggregation queries - no raw data output
# Minimum aggregation threshold of 100 prevents identification of individuals
aws cleanrooms create-configured-table-analysis-rule \
    --configured-table-identifier "ct-abc123" \
    --analysis-rule-type "AGGREGATION" \
    --analysis-rule-policy '{
        "v1": {
            "aggregation": {
                "aggregateColumns": [
                    {
                        "columnNames": ["amount"],
                        "function": "SUM"
                    },
                    {
                        "columnNames": ["amount"],
                        "function": "AVG"
                    },
                    {
                        "columnNames": ["hashed_email"],
                        "function": "COUNT_DISTINCT"
                    }
                ],
                "joinColumns": ["hashed_email"],
                "joinRequired": "QUERY_RUNNER",
                "dimensionColumns": ["purchase_date", "category", "store_region"],
                "scalarFunctions": ["COALESCE", "CAST"],
                "outputConstraints": [
                    {
                        "columnName": "hashed_email",
                        "minimum": 100,
                        "type": "COUNT_DISTINCT"
                    }
                ]
            }
        }
    }'
```

The `outputConstraints` section is crucial. Setting a minimum of 100 on `COUNT_DISTINCT` of `hashed_email` means any query result group must contain at least 100 unique people. This prevents someone from writing a query that narrows down to a single individual.

CompanyB configures their ad impressions table:

```bash
# CompanyB makes their ad impression data available
aws cleanrooms create-configured-table \
    --name "ad-impressions" \
    --table-reference '{
        "glue": {
            "tableName": "impressions",
            "databaseName": "ads_db"
        }
    }' \
    --allowed-columns '["hashed_email", "impression_date", "campaign_id", "ad_format", "impressions_count"]' \
    --analysis-method "DIRECT_QUERY"
```

## Associating Tables with the Collaboration

After configuring tables, each party associates them with the collaboration:

```bash
# CompanyA associates their configured table
aws cleanrooms create-configured-table-association \
    --membership-identifier "mem-abc123" \
    --configured-table-identifier "ct-retailpurchases" \
    --name "purchases" \
    --role-arn "arn:aws:iam::111122223333:role/CleanRoomsServiceRole"

# CompanyB associates their configured table
aws cleanrooms create-configured-table-association \
    --membership-identifier "mem-def456" \
    --configured-table-identifier "ct-adimpressions" \
    --name "impressions" \
    --role-arn "arn:aws:iam::222233334444:role/CleanRoomsServiceRole"
```

## Running Queries

Now the query runner can analyze the combined data. The query must comply with all analysis rules from all parties:

```bash
# Run an aggregation query to measure ad campaign effectiveness
aws cleanrooms start-protected-query \
    --type "SQL" \
    --membership-identifier "mem-abc123" \
    --sql-parameters '{
        "queryString": "SELECT i.campaign_id, p.category, DATE_TRUNC(month, p.purchase_date) AS purchase_month, COUNT_DISTINCT(p.hashed_email) AS unique_buyers, SUM(p.amount) AS total_spend, AVG(p.amount) AS avg_order_value FROM purchases p INNER JOIN impressions i ON p.hashed_email = i.hashed_email WHERE p.purchase_date >= DATE(2026-01-01) GROUP BY i.campaign_id, p.category, DATE_TRUNC(month, p.purchase_date) HAVING COUNT_DISTINCT(p.hashed_email) >= 100"
    }' \
    --result-configuration '{
        "outputConfiguration": {
            "s3": {
                "resultFormat": "CSV",
                "bucket": "cleanroom-query-results",
                "keyPrefix": "campaign-analysis/"
            }
        }
    }'
```

The result tells you how many unique buyers who saw a particular ad campaign went on to purchase in each category, along with their total and average spend. Neither party sees the other's raw data.

## Monitoring Query Results

Check on your protected query:

```bash
# Get the status and results of a protected query
aws cleanrooms get-protected-query \
    --membership-identifier "mem-abc123" \
    --protected-query-identifier "pq-xyz789"
```

## Cryptographic Computing (Optional)

For extra security, Clean Rooms supports cryptographic computing. With this feature, data is encrypted before it leaves each party's account, and the computation happens on encrypted data:

```bash
# Create a collaboration with cryptographic computing enabled
aws cleanrooms create-collaboration \
    --name "secure-collab" \
    --description "Collaboration with cryptographic computing" \
    --creator-member-abilities '["CAN_QUERY", "CAN_RECEIVE_RESULTS"]' \
    --creator-display-name "PartyA" \
    --members '[
        {
            "accountId": "222233334444",
            "memberAbilities": ["CAN_QUERY"],
            "displayName": "PartyB"
        }
    ]' \
    --query-log-status "ENABLED" \
    --data-encryption-metadata '{
        "allowCleartext": false,
        "allowDuplicates": false,
        "preserveNulls": false
    }'
```

When `allowCleartext` is false, both parties must encrypt their join columns using the same shared encryption key before loading data. This adds a setup step but provides stronger privacy guarantees.

## IAM Role for Clean Rooms

The service role that Clean Rooms uses needs read access to the Glue tables and S3 data:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "glue:GetTable",
                "glue:GetDatabase",
                "glue:GetPartitions",
                "glue:BatchGetPartition"
            ],
            "Resource": [
                "arn:aws:glue:us-east-1:111122223333:catalog",
                "arn:aws:glue:us-east-1:111122223333:database/retail_db",
                "arn:aws:glue:us-east-1:111122223333:table/retail_db/purchases"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:GetBucketLocation",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::retail-data-bucket",
                "arn:aws:s3:::retail-data-bucket/purchases/*"
            ]
        }
    ]
}
```

AWS Clean Rooms is a solid choice when you need to collaborate on data analysis without the legal and technical complexity of actually sharing raw data. For related data governance topics, check out [setting up Amazon DataZone](https://oneuptime.com/blog/post/amazon-datazone-data-governance/view) for managing data assets across your organization.
