# Validation Summary: How to Build a Custom Search Engine with Amazon OpenSearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch query DSL, mappings, analyzers, aggregations, highlighting, completion suggester, and function score queries
- Python
- Boto3
- opensearch-py
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB Streams
- Amazon CloudWatch

## Sources Consulted
- Amazon OpenSearch Service Boto3 `create_domain` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/opensearch/client/create_domain.html
- Amazon OpenSearch Service infrastructure security and TLS guidance: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/infrastructure-security.html
- Amazon OpenSearch Service dedicated master node guidance: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-dedicatedmasternodes.html
- OpenSearch Python low-level client documentation: https://docs.opensearch.org/latest/clients/python-low-level/
- OpenSearch Python client source/API reference for document delete behavior: https://opensearch-project.github.io/opensearch-py/_modules/opensearchpy/client.html
- OpenSearch completion field documentation: https://docs.opensearch.org/latest/mappings/supported-field-types/completion/
- OpenSearch multi-match query documentation: https://docs.opensearch.org/latest/query-dsl/full-text/multi-match/
- OpenSearch function score query documentation: https://docs.opensearch.org/latest/query-dsl/compound/function-score/
- OpenSearch aggregations documentation: https://docs.opensearch.org/latest/aggregations/
- Amazon DynamoDB Streams and Lambda triggers documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html
- Boto3 DynamoDB `TypeDeserializer` source documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/_modules/boto3/dynamodb/types.html
- Amazon OpenSearch Service CloudWatch metrics documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-cloudwatchmetrics.html

## Issues Found
- The OpenSearch domain example used `Policy-Min-TLS-1-2-PF-2023-10`, which is not a valid `TLSSecurityPolicy` enum. Updated it to the documented `Policy-Min-TLS-1-2-PFS-2023-10` value.
- The DynamoDB Streams Lambda example called `deserialize_dynamodb(new_image)` without defining that helper. Added a `TypeDeserializer`-based helper so DynamoDB stream attribute values are converted before indexing.
- The DynamoDB deserialization path can produce `Decimal` and set values that are not JSON-serializable by the default OpenSearch client serializer. Added a small normalization helper to convert `Decimal` values and sets into JSON-compatible values.
- The Lambda delete path used `client.delete(..., ignore=[404])`, but the current generated opensearch-py `delete` method signature does not accept an `ignore` keyword argument. Replaced it with `NotFoundError` handling.

## Review Notes
- The examples are intentionally simplified and use basic authentication placeholders. For production AWS deployments, IAM-signed requests, Secrets Manager, VPC access controls, and least-privilege policies should be considered.
- OpenSearch `2.11` remains a valid Amazon OpenSearch Service engine version, though newer versions may be available depending on region and account.
