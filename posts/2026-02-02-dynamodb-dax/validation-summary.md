# Validation Summary: How to Use DynamoDB Accelerator (DAX)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB Accelerator (DAX)
- AWS CLI (`aws dax` subcommands)
- AWS CloudFormation (`AWS::DAX::Cluster`, `AWS::DAX::SubnetGroup`, `AWS::DAX::ParameterGroup`, `AWS::IAM::Role`, `AWS::EC2::SecurityGroup`)
- AWS IAM
- `amazon-dax-client` (Node.js, npm)
- AWS SDK for JavaScript v2 (`aws-sdk`) and v3 (`@aws-sdk/client-dax`, `@aws-sdk/lib-dynamodb`)
- `amazon-dax-client` (Python, `amazondax`)
- boto3 (Python)
- Amazon CloudWatch (metrics, dashboards, alarms)

## Sources Consulted
- [DAX: How it works (DynamoDB Developer Guide)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.concepts.html)
- [DAX and DynamoDB consistency models](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html)
- [Node.js and DAX (TryDax sample)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.client.run-application-nodejs.html)
- [Node.js TryDax 03-getitem-test.js source](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.client.run-application-nodejs.03-getitem-test.html)
- [Python and DAX (TryDax sample)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.client.run-application-python.html)
- [Java and DAX (endpoint URL format)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.client.run-application-java.html)
- [`aws dax create-cluster` CLI reference](https://docs.aws.amazon.com/cli/latest/reference/dax/create-cluster.html)
- [`AWS::DAX::Cluster` CloudFormation reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dax-cluster.html)
- [`@aws-sdk/client-dax` (npm) and AWS re:Post discussion about V3 DAX data-plane support](https://repost.aws/questions/QUW2_4tPQMRritkjQkytT_cA/how-to-use-js-sdk-v3-to-getitem-from-dax-aws-sdk-client-dax-instead-of-amazon-dax-client)
- [Constraints in Amazon DynamoDB (item size limit)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html)

## Issues Found

1. **AWS CLI flag names were wrong in `aws dax create-cluster`.**
   The post used `--subnet-group` and `--parameter-group`. The actual flag names per the AWS CLI reference are `--subnet-group-name` and `--parameter-group-name`. As written, the command would fail with "Unknown options". Fixed to use the correct flag names.

2. **Node.js examples mixed AWS SDK v3 imports with the v2-only `amazon-dax-client`.**
   The original code did:
   ```js
   const AmazonDaxClient = require('amazon-dax-client');
   const { DynamoDBDocumentClient, GetCommand, ... } = require('@aws-sdk/lib-dynamodb');
   const docClient = DynamoDBDocumentClient.from(daxClient, { ... });
   ```
   `amazon-dax-client` is built for AWS SDK for JavaScript v2 — it exposes a v2-style "service" object — and is not a valid argument to v3's `DynamoDBDocumentClient.from()`, which expects a v3 `DynamoDBClient`. The official `@aws-sdk/client-dax` in v3 currently only supports DAX control-plane operations (cluster/subnet/parameter-group management), not data-plane GetItem/PutItem/Query through DAX. Rewrote all three Node.js code blocks (basic client setup, resilient fallback class, cache-aware repository) to use the AWS SDK v2 pattern that the official AWS DAX docs themselves use (`new AWS.DynamoDB.DocumentClient({ service: dax })`), updated the install command to `npm install amazon-dax-client aws-sdk`, switched method-style calls to `.get(...).promise()`, etc., and added a short note pointing readers at the v3 control-plane client and the community `amazon-dax-client-v3` port for full v3 compatibility.

3. **"Items > 64 KB not cached" was wrong.**
   The DAX docs do not impose a 64 KB cap on cached items; DAX caches items up to DynamoDB's 400 KB max item size. (64 KB was DynamoDB's original item-size limit years ago, before it was raised to 400 KB, which is likely the source of the confusion.) Reworded the row to describe the real concern — large items consume cache memory and increase LRU eviction pressure — and noted the 400 KB ceiling.

4. **"Full table scans bypass cache effectively" was wrong.**
   The AWS DAX consistency-model docs explicitly state: "DAX caches the results from Query and Scan requests in its query cache." Scans are cached. The real issue is that large Scan result sets fill the query cache and cause LRU eviction of more useful entries. Reworded the row accordingly while keeping the "Avoid Scan, use Query" workaround.

5. **"Consistent reads not cached" — minor accuracy improvement.**
   Per the docs, DAX also passes `TransactGetItems` through to DynamoDB without caching, in addition to `ConsistentRead`. Added `TransactGetItems` to the impact column for completeness.

## Review Notes

- The CloudFormation template enables only at-rest encryption (`SSESpecification: SSEEnabled: true`) and does not set `ClusterEndpointEncryptionType: TLS`. The connection examples accordingly use the `dax://` URL prefix, which matches what the template deploys. The Security Best Practices section later mentions `clusterEndpointEncryptionType: 'TLS'` as a recommendation; if a reader follows that, they should switch the endpoint URL to the `daxs://` prefix. I added a short comment to that effect on the endpoint constant rather than rewriting the CFN template (which would have been scope creep for this review).
- The Python sections (boto3-style `amazondax.AmazonDaxClient.resource(...)`, table `get_item`/`put_item`/`query`/`batch_get_item` calls) match the official AWS Python DAX sample code and were left unchanged.
- The CloudWatch dashboard/alarm JavaScript blocks are illustrative configuration objects (not literal AWS API call payloads) and use the correct CloudWatch metric names (`ItemCacheHits`, `ItemCacheMisses`, `QueryCacheHits`, `QueryCacheMisses`, `CPUUtilization`, etc.) under the `AWS/DAX` namespace, so they were left as-is.
- The "Configuration Recommendations" and "Security Best Practices" JavaScript blocks are similarly descriptive config objects rather than concrete API calls, so the casing of fields like `sseSpecification`/`clusterEndpointEncryptionType` (which would be capitalized in real CFN/CLI) is acceptable as illustrative pseudo-config.
- The DAX node type `dax.r5.large` / `dax.r5.xlarge`, port numbers (8111 unencrypted, 9111 TLS), CloudFormation property names (`IAMRoleARN`, `SSESpecification`, `ClusterDiscoveryEndpoint` GetAtt attribute), the cluster discovery endpoint URL format, the write-through behavior, and the item/query cache distinction were all verified against current AWS documentation and are correct as written.
