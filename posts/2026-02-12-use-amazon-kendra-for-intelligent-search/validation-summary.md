# Validation Summary: How to Use Amazon Kendra for Intelligent Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Kendra
- AWS SDK for Python (boto3)
- Amazon S3
- AWS Identity and Access Management (IAM)
- Amazon CloudWatch
- Mermaid

## Sources Consulted
- Amazon Kendra create_index boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kendra/client/create_index.html
- Amazon Kendra create_data_source boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kendra/client/create_data_source.html
- Amazon Kendra create_faq boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kendra/client/create_faq.html
- Amazon Kendra query boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kendra/client/query.html
- Amazon Kendra batch_put_document boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kendra/client/batch_put_document.html
- Amazon Kendra update_index boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kendra/client/update_index.html
- Amazon Kendra QueryResultItem API reference: https://docs.aws.amazon.com/kendra/latest/APIReference/API_QueryResultItem.html
- Amazon Kendra quotas: https://docs.aws.amazon.com/kendra/latest/dg/quotas.html
- Amazon Kendra FAQ file documentation: https://docs.aws.amazon.com/kendra/latest/dg/in-creating-faq.html
- Amazon Kendra document attributes documentation: https://docs.aws.amazon.com/kendra/latest/dg/hiw-documents.html
- Amazon Kendra CloudWatch metrics documentation: https://docs.aws.amazon.com/kendra/latest/dg/cloudwatch-metrics.html
- Amazon Kendra pricing: https://aws.amazon.com/kendra/pricing/

## Issues Found
- The post described only two Kendra editions and listed Enterprise Edition as supporting up to 500,000 documents. Updated this to reflect the currently documented three index types: Developer Edition, Enterprise Edition, and GenAI Enterprise Edition, with current base document capacities and production guidance.
- The FAQ example used `_question,_answer` headers while creating the FAQ with `FileFormat='CSV'`. Updated the API call to `CSV_WITH_HEADER`, which matches the documented format for header-based FAQ CSV files.
- The attribute filter example passed `_last_updated_at` as an ISO 8601 string in `DateValue`. Updated the Python example to pass a timezone-aware `datetime`, matching boto3's documented request shape.
- The relevance tuning example set `RankOrder` on a `DATE_VALUE` field. Removed `RankOrder` because AWS documents it as applying only to `LONG` fields, while `Freshness` and `Duration` apply to date fields.
- The CloudWatch monitoring list included `DataSourceSyncJobsSucceeded/Failed`, which are not documented Kendra CloudWatch metric names. Replaced them with documented sync-related metrics for submitted and failed indexing.

## Review Notes
The post remains a valid introductory tutorial. Pricing is current as an approximate monthly framing for Basic Developer Edition based on the documented hourly price, but AWS pricing can change and should be rechecked before publication.
