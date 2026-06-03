# Validation Summary: How to Build a RAG Application with Amazon Bedrock and OpenSearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Bedrock
- Amazon Titan Text Embeddings V2
- Anthropic Claude on Amazon Bedrock
- Amazon OpenSearch Serverless
- OpenSearch k-NN vector search
- AWS Lambda
- Python
- Boto3
- opensearch-py
- requests-aws4auth

## Sources Consulted
- Amazon Bedrock documentation: Amazon Titan Text Embeddings models: https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html
- Amazon Bedrock documentation: Anthropic Claude Messages API: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html
- Boto3 documentation: Bedrock Runtime invoke_model: https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-runtime/client/invoke_model.html
- Amazon OpenSearch Service documentation: Working with vector search collections: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-vector-search.html
- Amazon OpenSearch Service documentation: Network access for Amazon OpenSearch Serverless: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-network.html
- Amazon OpenSearch Service documentation: Data access control for Amazon OpenSearch Serverless: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-data-access.html
- Amazon OpenSearch Service documentation: Collection endpoints for Amazon OpenSearch Serverless: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-collection-endpoints.html
- OpenSearch documentation: k-NN vector field type: https://docs.opensearch.org/latest/field-types/supported-field-types/knn-vector/
- OpenSearch documentation: k-NN query: https://docs.opensearch.org/latest/query-dsl/specialized/k-nn/

## Issues Found
- The vector index used `dimension: 1536` while the code used `amazon.titan-embed-text-v2:0`. Titan Text Embeddings V2 outputs 1,024 dimensions by default, with configurable output sizes. Updated the OpenSearch `knn_vector` mapping to `1024` and added `dimensions: 1024` to the embedding requests so indexed and queried vectors match.
- The embedding helper sliced `text[:8192]` while the comment described Titan's 8,192-token limit. Python string slicing counts characters, not tokens. Updated the slice to Titan V2's documented 50,000-character maximum and removed the misleading token comment.
- The OpenSearch index creation example passed `collection_endpoint` directly as the `host`. AWS collection endpoints are commonly represented as HTTPS endpoints, while `opensearch-py` expects the hostname in the `host` field. Added URL parsing so either a full endpoint URL or hostname works.
- The data access policy example used a 9-digit AWS account placeholder in an IAM ARN. Updated it to a 12-digit placeholder account ID.
- The reranking and query reformulation Bedrock examples omitted `contentType` and `accept` headers. Added `application/json` headers for consistency with Bedrock Runtime `invoke_model` usage.

## Review Notes
The examples are illustrative and still use broad `aoss:*` permissions and public network access for simplicity. A production implementation should scope data access permissions, prefer private network access where possible, validate empty inputs, and handle Bedrock/OpenSearch errors and retries.
