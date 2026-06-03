# Validation Summary: How to Use Amazon OpenSearch Serverless

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Serverless
- AWS CLI
- AWS IAM and data access policies
- AWS KMS encryption policies
- OpenSearch network policies
- OpenSearch Python client (`opensearch-py`)
- AWS Signature Version 4 authentication

## Sources Consulted
- Amazon OpenSearch Serverless overview and collection types: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-overview.html
- Amazon OpenSearch Serverless client examples: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-clients.html
- Data access control for Amazon OpenSearch Serverless: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-data-access.html
- Network access for Amazon OpenSearch Serverless: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-network.html
- Encryption in Amazon OpenSearch Serverless: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-encryption.html
- Managing capacity limits for Amazon OpenSearch Serverless: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-scaling.html
- AWS CLI `create-collection` command reference: https://docs.aws.amazon.com/cli/latest/reference/opensearchserverless/create-collection.html
- AWS CLI `create-access-policy` command reference: https://docs.aws.amazon.com/cli/latest/reference/opensearchserverless/create-access-policy.html
- Amazon OpenSearch Service pricing: https://aws.amazon.com/opensearch-service/pricing/
- Comparing OpenSearch Service and OpenSearch Serverless: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-comparison.html

## Issues Found
- The post stated that OpenSearch Serverless has two collection types. Current AWS documentation lists three primary collection types: time series, search, and vector search. Added vector search to the collection type list.
- The post described a collection as sharing the same access policy and encryption settings. Current AWS documentation describes collections as logical groups of indexes, with encryption and data access controlled by policies that match collection and index patterns. Reworded the definition to avoid implying a single shared access policy.
- The encryption policy comment called `AWSOwnedKey` an AWS-managed key. AWS documentation names this option an AWS owned key and distinguishes it from customer-managed KMS keys. Updated the comment.
- The Python example used `requests_aws4auth.AWS4Auth`. AWS's current OpenSearch Serverless Python example uses `AWSV4SignerAuth` from `opensearch-py` with service name `aoss`. Updated the import and signer construction.
- The index creation example set `number_of_shards` and `number_of_replicas`. OpenSearch Serverless documentation says shard count, interval count, and refresh interval are handled by OpenSearch Serverless and are not modifiable. Removed the shard and replica settings and added a short note in the code comment.
- The post stated that the minimum cost was 4 OCUs, 2 for indexing and 2 for search, or about $700/month. Current AWS documentation says the first collection with redundant active replicas is billed for a minimum of 1 OCU for ingestion and 1 OCU for search, and development/test collections can disable standby replicas to lower the minimum. Updated the cost section accordingly.
- The post described a difference as "No multi-tenancy within a collection." Current AWS documentation frames the security difference as data access policies for collections and indexes instead of fine-grained access control. Reworded that item to avoid an overbroad claim.

## Review Notes
- The AWS CLI is not installed in this workspace, so command syntax was verified against the official AWS CLI command reference rather than local `aws --help` output.
- The public and VPC network policy examples, encryption policy example, data access policy shape, collection creation commands, and capacity limit command match the current AWS documentation patterns.
