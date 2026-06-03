# Validation Summary: How to Use Amazon Bedrock Knowledge Bases for RAG

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Bedrock Knowledge Bases
- Retrieval-Augmented Generation (RAG)
- AWS SDK for Python (Boto3)
- Amazon S3 data sources
- Amazon OpenSearch Serverless vector stores
- Amazon CloudWatch Logs
- Amazon EventBridge
- Amazon Bedrock Runtime Converse API

## Sources Consulted
- Amazon Bedrock Boto3 `create_knowledge_base` API reference: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent/client/create_knowledge_base.html
- Amazon Bedrock Boto3 `create_data_source` API reference: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent/client/create_data_source.html
- Amazon Bedrock Boto3 `start_ingestion_job` API reference: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent/client/start_ingestion_job.html
- Amazon Bedrock Agent Runtime Boto3 `retrieve` API reference: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent-runtime/client/retrieve.html
- Amazon Bedrock Agent Runtime Boto3 `retrieve_and_generate` API reference: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agent-runtime/client/retrieve_and_generate.html
- Amazon Bedrock S3 data source connector documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/s3-data-source-connector.html
- Amazon Bedrock Knowledge Bases CloudWatch Logs documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-bases-logging.html
- Amazon Bedrock monitoring documentation: https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring.html
- Amazon CloudWatch Boto3 `get_metric_statistics` API reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html

## Issues Found
- The S3 metadata sidecar example used an incorrect metadata value shape, with `value` and `type` as sibling fields. Updated it to the documented `value: { type, stringValue/numberValue }` format and included `includeForEmbedding` flags.
- The CloudWatch example used an undocumented `Retrieve.Latency` metric and passed `p99` in `Statistics`, which is invalid for `get_metric_statistics`. Replaced the snippet with a CloudWatch Logs Insights query for Knowledge Base ingestion errors, matching the documented Knowledge Bases log delivery model.

## Review Notes
- Python snippets were checked for syntax and compile successfully.
- Bedrock Knowledge Bases API shapes for creating knowledge bases, creating data sources, ingestion jobs, retrieval, metadata filters, chunking strategies, and session reuse are current as of 2026-06-03.
- Retrieval quality and end-to-end RAG latency should usually be measured at the application layer in addition to AWS service logs.
