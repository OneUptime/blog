# Validation Summary: How to Optimize DynamoDB Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB capacity modes
- DynamoDB reserved capacity
- DynamoDB Time To Live (TTL)
- DynamoDB Global Tables
- DynamoDB Streams
- Amazon CloudWatch metrics
- AWS Application Auto Scaling
- AWS Cost Explorer
- AWS Compute Optimizer
- Python
- boto3

## Sources Consulted
- Amazon DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- DynamoDB read and write operations: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
- DynamoDB provisioned capacity mode: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html
- DynamoDB on-demand capacity mode: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html
- DynamoDB reserved capacity: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/reserved-capacity.html
- DynamoDB Time To Live: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- DynamoDB expired TTL items: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ttl-expired-items.html
- DynamoDB global tables: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html
- DynamoDB global tables core concepts: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables-CoreConcepts.html
- DynamoDB billing and usage reports: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-understanding-billing.html
- boto3 DynamoDB create_table reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/client/create_table.html
- AWS Cost Explorer reservation recommendations: https://docs.aws.amazon.com/cost-management/latest/userguide/ri-recommendations.html
- AWS Compute Optimizer supported resources: https://docs.aws.amazon.com/compute-optimizer/latest/ug/supported-resources.html

## Issues Found
- The on-demand example stated that on-demand costs about 6.5x more per unit than well-utilized provisioned capacity. Current us-east-1 DynamoDB Standard pricing makes the ratio closer to 3.5x, so the claim was updated.
- The capacity decision matrix used a 20% utilization threshold for provisioned capacity. Based on current on-demand and provisioned pricing, the break-even point is closer to 30%, so the matrix was updated.
- Reserved capacity was described as discounted from on-demand pricing. Reserved capacity applies to provisioned capacity for DynamoDB Standard tables, so the description, savings comments, and cost comparison labels were corrected.
- The reserved capacity cost comparison labeled standard provisioned WCU cost as on-demand and used stale savings figures. It now labels the baseline as Standard Provisioned and uses current published maximum savings percentages.
- The attribute compression example used `datetime.utcnow()` without importing `datetime`. Added the missing import so the snippet is syntactically complete.
- TTL deletion timing was stated as within 48 hours. AWS documents TTL deletion as typically occurring within a few days, so the prose and diagram were corrected.
- TTL was described as free without the global-table caveat. Added the distinction that the initial TTL delete is free in the source Region, while replicated TTL deletes in global table replica Regions are charged.
- The TTL manual cleanup cost example overstated the on-demand cost of 1 million deletes. Updated it to the current DynamoDB Standard on-demand write request pricing example.
- The Global Tables example implied selective replication within Global Tables. DynamoDB Global Tables replicate every item, so the text and code now describe application-managed replication through regional tables plus Streams/Lambda.
- The summary-only Global Tables code wrote both regional detail items and global summary items to the same table object. The class now accepts separate global and regional table names and writes each item to the correct table.
- The Global Tables estimator truncated item sizes instead of rounding writes up to the next KB. It now uses `math.ceil()`.
- The Global Tables estimator double-counted write cost by multiplying by the number of Regions after already calculating total write units across Regions. The calculation now bills total replicated write request units once.
- The Global Tables estimator used outdated write pricing and generic WCU labels for an on-demand example. Updated it to current DynamoDB Standard on-demand replicated write request unit pricing and clearer terminology.
- The best-practices section referenced a DynamoDB-specific Cost Explorer lens and generic Compute Optimizer provisioned-capacity recommendations. Updated it to Cost Explorer spend analysis, Cost Explorer reserved capacity recommendations, and Compute Optimizer idle resource recommendations.

## Review Notes
- All Python code blocks were parsed with Python's `ast` module after edits; no syntax errors were found.
- The snippets still use `datetime.utcnow()`, which works but is discouraged in newer Python code in favor of timezone-aware UTC datetimes.
- Pricing examples are region- and table-class-specific. The post now labels the main hard-coded examples as us-east-1 / DynamoDB Standard where applicable, but future reviews should re-check AWS pricing before publication.
