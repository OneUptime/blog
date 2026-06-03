# Validation Summary: How to Build a Knowledge Base Q&A System with Bedrock

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Bedrock Knowledge Bases
- Amazon Bedrock Agents Runtime APIs
- Amazon OpenSearch Serverless
- Amazon S3
- AWS Lambda
- Amazon EventBridge
- AWS CloudFormation
- Python
- Boto3

## Sources Consulted
- Amazon Bedrock API Reference: CreateKnowledgeBase and OpenSearchServerlessConfiguration: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_OpenSearchServerlessConfiguration.html
- Amazon Bedrock API Reference: CreateDataSource and fixed-size chunking configuration: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_CreateDataSource.html
- Amazon Bedrock API Reference: RetrieveAndGenerate: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrieveAndGenerate.html
- Amazon Bedrock API Reference: Retrieve: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html
- Amazon Bedrock API Reference: RetrievedReference: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrievedReference.html
- Amazon Bedrock User Guide: prerequisites for OpenSearch Serverless vector stores: https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html
- Amazon OpenSearch Service Developer Guide: working with vector search collections: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-vector-search.html
- Amazon OpenSearch Service Developer Guide: data access control for OpenSearch Serverless: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-data-access.html
- Amazon OpenSearch Service Developer Guide: OpenSearch Serverless Python clients and SigV4 service name: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-clients.html
- AWS CloudFormation: AWS::S3::Bucket LambdaConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-lambdaconfiguration.html
- AWS CloudFormation: AWS::Lambda::Permission: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- AWS Lambda Developer Guide: event source mappings versus direct triggers: https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html
- Amazon OpenSearch Service pricing: https://aws.amazon.com/opensearch-service/pricing/
- Amazon Bedrock pricing overview: https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-pricing.html

## Issues Found
- The Knowledge Base creation code created an OpenSearch Serverless collection but did not create the required vector index before passing `vectorIndexName` to Bedrock. Added an `opensearch-py` client configured for OpenSearch Serverless SigV4 signing and a `create_vector_index` helper with a Titan Text Embeddings V2-compatible 1024-dimension `knn_vector` field.
- The OpenSearch Serverless data access policy did not grant the index-creation principal access to the collection. Added the current IAM role/user ARN to the access policy, including normalization from STS assumed-role ARN to IAM role ARN.
- The example IAM ARNs used a 9-digit placeholder account ID, which is not a valid AWS account ID format. Replaced hardcoded account placeholders with the current account ID from STS.
- The embedding model ARN was hardcoded to `us-east-1` while the clients might run in another region. Changed it to use the active Boto3 region.
- The `RetrieveAndGenerate` citation extraction included a `score` value from `reference.metadata`, but the `RetrievedReference` shape does not expose retrieval scores. Changed the citation payload to include returned metadata instead.
- The CloudFormation snippet used `AWS::Lambda::EventSourceMapping` for S3 object events. S3 invokes Lambda through bucket notification configuration and Lambda permissions, not Lambda event source mappings. Replaced it with `AWS::S3::Bucket` notification configuration and `AWS::Lambda::Permission`.
- The scheduled EventBridge rule targeted the Lambda function without granting EventBridge permission to invoke it. Added the required `AWS::Lambda::Permission`.
- The multi-turn example always passed `sessionId`, even when it was `None`, which can fail SDK parameter validation. Changed it to include `sessionId` only when supplied.

## Review Notes
The pricing section is directionally correct for the referenced models and OpenSearch Serverless minimums, but AWS pricing varies by region and can change. Production code should also handle duplicate OpenSearch policy names, ingestion-job concurrency, IAM least-privilege policies, and private network access instead of `AllowFromPublic: True`.
