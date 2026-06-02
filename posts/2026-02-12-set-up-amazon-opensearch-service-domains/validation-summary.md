# Validation Summary: How to Set Up Amazon OpenSearch Service Domains

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Service
- AWS CLI
- AWS Identity and Access Management access policies
- Amazon VPC networking
- UltraWarm and cold storage
- OpenSearch Index State Management
- OpenSearch index templates
- Amazon CloudWatch alarms
- AWS CloudFormation

## Sources Consulted
- Amazon OpenSearch Service API Reference: ClusterConfig: https://docs.aws.amazon.com/opensearch-service/latest/APIReference/API_ClusterConfig.html
- AWS CLI Command Reference: `aws opensearch create-domain`: https://docs.aws.amazon.com/cli/latest/reference/opensearch/create-domain.html
- AWS CLI Command Reference: `aws opensearch update-domain-config`: https://docs.aws.amazon.com/cli/latest/reference/opensearch/update-domain-config.html
- Amazon OpenSearch Service Developer Guide: Sizing domains: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/sizing-domains.html
- Amazon OpenSearch Service Developer Guide: Choosing the number of shards: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp-sharding.html
- Amazon OpenSearch Service Developer Guide: VPC domains: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/vpc.html
- Amazon OpenSearch Service Developer Guide: Identity and Access Management: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ac.html
- Amazon OpenSearch Service Developer Guide: UltraWarm storage: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ultrawarm.html
- Amazon OpenSearch Service Developer Guide: Cold storage: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cold-storage.html
- Amazon OpenSearch Service Developer Guide: Index State Management: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html
- OpenSearch documentation: Index State Management: https://docs.opensearch.org/latest/im-plugin/ism/index/
- OpenSearch documentation: Index templates: https://docs.opensearch.org/latest/api-reference/index-apis/index-templates/
- Amazon OpenSearch Service Developer Guide: CloudWatch metrics: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-cloudwatchmetrics.html
- AWS CloudFormation Template Reference: AWS::OpenSearchService::Domain ClusterConfig: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-opensearchservice-domain-clusterconfig.html
- AWS CloudFormation Template Reference: AWS::OpenSearchService::Domain EBSOptions: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-opensearchservice-domain-ebsoptions.html
- AWS CloudFormation Template Reference: AWS::OpenSearchService::Domain MasterUserOptions: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-opensearchservice-domain-masteruseroptions.html
- AWS CloudFormation User Guide: AWS-specific parameter types: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html
- Amazon OpenSearch Service Developer Guide: Making configuration changes: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-configuration-changes.html

## Issues Found
- Corrected the 30-50 GB sizing guidance from per-node data sizing to shard sizing, matching AWS shard guidance for write-heavy workloads.
- Replaced malformed placeholder subnet, security group, account ID, SNS ARN, IAM ARN, and KMS key values with syntactically valid example values.
- Corrected the access policy explanation from identity-based policy to resource-based domain access policy.
- Changed the UltraWarm wording to match the `update-domain-config` command, which updates an existing eligible domain rather than creating one.
- Removed the ISM rollover action because the post did not configure a rollover alias, which is required for rollover policies.
- Removed the separate `force_merge` action from the warm state and kept the AWS-supported `warm_migration` action.
- Replaced `delete` with `cold_delete` for deleting cold indexes, as required by Amazon OpenSearch Service.
- Added `schema_version` to the ISM policy for consistency with AWS examples.
- Added missing CloudFormation parameters for `AdminPassword`, private subnets, and the security group so the template no longer references undefined values.
- Corrected the blue/green deployment explanation: OpenSearch Service aims to minimize downtime, but blue/green changes can temporarily increase latency while data is migrated.

## Review Notes
- `OpenSearch_2.11` is still listed in AWS-supported OpenSearch versions, but newer OpenSearch Service versions are available. Future updates could use a newer engine version if the surrounding examples are retested against that version.
- The AWS CLI was not installed in the workspace, so command validation was performed against official AWS CLI documentation rather than local `aws --help` output.
- Local syntax checks confirmed the JSON snippets and CloudFormation YAML parse correctly, with a CloudFormation-aware YAML loader for `!Ref`.
