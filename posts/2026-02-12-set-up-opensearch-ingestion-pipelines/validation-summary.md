# Validation Summary: How to Set Up OpenSearch Ingestion Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon OpenSearch Ingestion
- Amazon OpenSearch Service
- OpenSearch Data Prepper pipelines
- AWS IAM
- AWS CLI
- Amazon S3
- Amazon SQS
- Amazon CloudWatch
- AWS Signature Version 4

## Sources Consulted
- Amazon OpenSearch Service Developer Guide: Creating Amazon OpenSearch Ingestion pipelines: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/creating-pipeline.html
- Amazon OpenSearch Service Developer Guide: Supported plugins and options for OpenSearch Ingestion pipelines: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/pipeline-config-reference.html
- Amazon OpenSearch Service Developer Guide: Granting OpenSearch Ingestion pipelines access to domains: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/pipeline-domain-access.html
- Amazon OpenSearch Service Developer Guide: Using an OpenSearch Ingestion pipeline with Amazon S3: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/configure-client-s3.html
- Amazon OpenSearch Service Developer Guide: Tutorial ingesting data into a domain using OpenSearch Ingestion: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/osis-get-started.html
- Amazon OpenSearch Service Developer Guide: Scaling pipelines in OpenSearch Ingestion: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ingestion-scaling.html
- Amazon OpenSearch Service Developer Guide: Monitoring pipeline metrics: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/monitoring-pipeline-metrics.html
- AWS CLI Command Reference: osis create-pipeline: https://docs.aws.amazon.com/cli/latest/reference/osis/create-pipeline.html
- OpenSearch Data Prepper documentation: Date processor: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/date/
- OpenSearch Data Prepper documentation: Convert type processor: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/convert-entry-type/
- OpenSearch Data Prepper documentation: Geo IP processor: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/geoip
- OpenSearch Data Prepper documentation: Drop events processor: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/drop-events/
- OpenSearch Data Prepper documentation: S3 source: https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/s3/
- OpenSearch Data Prepper documentation: Conditional routing: https://docs.opensearch.org/latest/data-prepper/pipelines/pipelines/

## Issues Found
- The `aws osis create-pipeline` example omitted `--pipeline-role-arn`, which AWS requires when creating a pipeline through the CLI with a manually created role. Added the role ARN argument.
- The CloudWatch log group example used `/aws/osis/...`, which does not match the AWS CLI pattern for OSIS log publishing. Changed it to `/aws/vendedlogs/OpenSearchService/my-log-pipeline`.
- The advanced pipeline used the deprecated `convert_entry_type` processor. Updated it to the current `convert_type` processor.
- The advanced pipeline used `geoip_enrichment`, which is not the current Data Prepper GeoIP processor name or configuration shape. Changed it to `geoip` with an `entries` list.
- The date processor examples used older/invalid `match` mapping syntax. Updated them to the documented `key` and `patterns` list syntax.
- The S3 setup omitted source permissions for the pipeline role and the SQS queue policy required for S3 event notifications. Added the missing IAM policy and SQS queue attribute command.
- The scaling section stated that an Ingestion OCU has roughly 1 vCPU and 4 GB memory. Updated this to the current AWS-documented 2 vCPUs and 15 GiB memory.
- The CloudWatch metric example queried the suffix `recordsIn.count` without the required sub-pipeline and plugin prefix. Updated it to `log-pipeline.date.recordsIn.count`.
- The HTTP ingestion example used unsigned `curl`. OpenSearch Ingestion HTTP requests must be SigV4-signed and the signer needs `osis:Ingest`; updated the text and command to use `awscurl`.

## Review Notes
The post now uses current Data Prepper processor names and AWS OSIS command shapes. The examples still use placeholder ARNs, domains, bucket names, and account IDs, so readers must replace them with their own resources before running the commands.
