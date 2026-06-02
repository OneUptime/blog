# Validation Summary: How to Use Kinesis Firehose for Data Delivery to OpenSearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Data Firehose
- Amazon OpenSearch Service
- AWS CLI
- IAM policies and OpenSearch domain access policies
- Amazon S3 backup configuration
- Amazon CloudWatch metrics and alarms
- OpenSearch index templates and Index State Management
- Python and Boto3

## Sources Consulted
- Amazon Data Firehose API Reference: AmazonopensearchserviceDestinationConfiguration: https://docs.aws.amazon.com/firehose/latest/APIReference/API_AmazonopensearchserviceDestinationConfiguration.html
- AWS CLI Command Reference: firehose create-delivery-stream: https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- Amazon Data Firehose Developer Guide: Controlling access with Amazon Data Firehose: https://docs.aws.amazon.com/firehose/latest/dev/controlling-access.html
- Amazon Data Firehose Developer Guide: Monitor Amazon Data Firehose with CloudWatch metrics: https://docs.aws.amazon.com/firehose/latest/dev/monitoring-with-cloudwatch-metrics.html
- Boto3 documentation: Firehose put_record_batch: https://docs.aws.amazon.com/boto3/latest/reference/services/firehose/client/put_record_batch.html
- Amazon OpenSearch Service Developer Guide: Monitoring OpenSearch cluster metrics with CloudWatch: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-cloudwatchmetrics.html
- OpenSearch documentation: Date field type and formats: https://docs.opensearch.org/latest/mappings/supported-field-types/date/
- OpenSearch documentation: Index templates: https://docs.opensearch.org/latest/api-reference/index-apis/index-templates/
- Amazon OpenSearch Service Developer Guide: Index State Management: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html

## Issues Found
- The AWS CLI examples used `--amazon-opensearch-service-destination-configuration`, but the current AWS CLI option is `--amazonopensearchservice-destination-configuration`. Updated both delivery stream commands.
- The sample AWS account ID in ARNs was nine digits. AWS account IDs in ARNs are twelve digits, so the examples now use `123456789012`.
- The OpenSearch date mapping used `epoch_millis||iso8601`. OpenSearch documents `strict_date_optional_time||epoch_millis` for mixed ISO-style strings and epoch millisecond values, so the mapping was updated.
- The VPC delivery example used a security group placeholder that looked like a name rather than an ID. Updated it to an ID-shaped placeholder.
- The VPC delivery notes only mentioned outbound HTTPS from Firehose. Added the required inbound HTTPS rule on the OpenSearch domain security group and the EC2 network interface permissions Firehose needs for VPC delivery.
- The IAM role section did not state that Firehose must be able to assume the role. Added a note about trusting the `firehose.amazonaws.com` service principal.

## Review Notes
The examples remain illustrative and still require users to substitute real ARNs, subnet IDs, security group IDs, bucket names, log groups, and SNS topics. The domain access policy uses broad `es:*` permissions for simplicity; a production version should narrow that policy to the required HTTP actions and resources.
