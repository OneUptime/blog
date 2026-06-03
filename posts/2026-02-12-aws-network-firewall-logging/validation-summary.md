# Validation Summary: How to Set Up AWS Network Firewall Logging

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Network Firewall
- AWS CLI
- Amazon S3
- Amazon CloudWatch Logs and CloudWatch alarms
- Amazon Kinesis Data Firehose
- Terraform AWS provider
- Amazon Athena / SQL

## Sources Consulted
- AWS Network Firewall Developer Guide: Logging network traffic - https://docs.aws.amazon.com/network-firewall/latest/developerguide/firewall-logging.html
- AWS Network Firewall Developer Guide: Updating a logging configuration - https://docs.aws.amazon.com/network-firewall/latest/developerguide/firewall-update-logging-configuration.html
- AWS CLI Command Reference: `network-firewall update-logging-configuration` - https://docs.aws.amazon.com/cli/latest/reference/network-firewall/update-logging-configuration.html
- AWS CloudFormation Reference: `AWS::NetworkFirewall::LoggingConfiguration` and `LogDestinationConfig` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-networkfirewall-loggingconfiguration.html
- AWS Network Firewall Developer Guide: Logging for TLS inspection - https://docs.aws.amazon.com/network-firewall/latest/developerguide/tls-inspection-logging.html
- AWS Network Firewall Developer Guide: Contents of a Network Firewall log - https://docs.aws.amazon.com/network-firewall/latest/developerguide/firewall-logging-contents.html
- AWS Network Firewall Developer Guide: Sending logs to Amazon S3 - https://docs.aws.amazon.com/network-firewall/latest/developerguide/logging-s3.html
- AWS Network Firewall Developer Guide: Sending logs to CloudWatch Logs - https://docs.aws.amazon.com/network-firewall/latest/developerguide/logging-cw-logs.html
- Amazon Athena User Guide: Create and query a table for AWS Network Firewall alert logs - https://docs.aws.amazon.com/athena/latest/ug/querying-network-firewall-logs-sample-alert-logs-table.html
- Terraform Registry: `aws_networkfirewall_logging_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/networkfirewall_logging_configuration

## Issues Found
- **Incorrect claim that each log type can be sent to multiple destinations simultaneously.** AWS documents one destination per log type for Network Firewall logging, and the current Terraform AWS provider allows at most three destination blocks: one each for `FLOW`, `ALERT`, and `TLS`. Updated the destination explanation, the combined example, and the best-practices guidance to describe one destination per log type and downstream fan-out when needed.
- **Invalid one-shot AWS CLI examples for multiple log destination changes.** The AWS CLI/API documentation says `UpdateLoggingConfiguration` can create, delete, or change only one `LogDestinationConfig` per call. Reworked the combined CLI example into a target JSON shape and added the requirement to retrieve the current config and apply one `LogDestinationConfig` change per update call.
- **TLS inspection log description was too broad.** The post said TLS logs record certificate details and inspection results. AWS currently documents TLS logs for TLS errors, SNI mismatches/naming errors, and outbound certificate revocation check failures. Updated the description accordingly.
- **Flow log description implied all firewall-passing connections.** AWS states Network Firewall logging is for traffic forwarded to the stateful rules engine. Adjusted the flow-log description to reference traffic the stateful rules engine receives.
- **Terraform example used two `ALERT` destination blocks.** Updated it to use one destination each for `FLOW`, `ALERT`, and `TLS`, matching current provider documentation.
- **Athena table omitted `event_timestamp`.** Added the top-level field shown in AWS Network Firewall log examples and Athena sample DDL.
- **Athena alert-log section assumed alert logs were sent to S3.** Added a short condition clarifying that the table applies when S3 is selected as the alert-log destination.

## Review Notes
- The local environment did not have `aws` or `terraform` installed, so CLI and Terraform syntax were verified against official AWS CLI and Terraform Registry documentation instead of local help or `terraform validate`.
- The S3 encryption example uses an SSE-KMS alias. AWS Network Firewall supports SSE-KMS with customer-managed KMS keys for S3 log destinations, but the key and key policy must exist and allow log delivery in a real deployment.
