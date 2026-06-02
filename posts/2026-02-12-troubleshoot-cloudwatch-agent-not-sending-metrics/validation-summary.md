# Validation Summary: How to Troubleshoot CloudWatch Agent Not Sending Metrics

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon CloudWatch
- Amazon CloudWatch Agent
- Amazon CloudWatch Logs
- Amazon EC2
- Amazon ECS
- Amazon EKS
- AWS IAM
- AWS CLI
- Amazon VPC interface endpoints
- JSON agent and IAM configuration

## Sources Consulted
- AWS CloudWatch documentation: Troubleshooting the CloudWatch agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/troubleshooting-CloudWatch-Agent.html
- AWS CloudWatch documentation: CloudWatch agent configuration file details: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS CloudWatch documentation: Metrics collected by the CloudWatch agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html
- AWS CloudWatch documentation: Starting the CloudWatch agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/start-CloudWatch-Agent-on-premise-SSM-onprem.html
- AWS CloudWatch documentation: Install the CloudWatch agent using AWS Systems Manager: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/installing-cloudwatch-agent-ssm.html
- AWS managed policy reference: CloudWatchAgentServerPolicy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
- AWS CloudWatch documentation: Using CloudWatch with interface VPC endpoints: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-and-interface-VPC.html
- AWS CloudWatch Logs documentation: Using CloudWatch Logs with interface VPC endpoints: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/cloudwatch-logs-and-interface-VPC.html
- AWS CloudWatch Agent upstream control script: https://github.com/aws/amazon-cloudwatch-agent/blob/main/packaging/dependencies/amazon-cloudwatch-agent-ctl

## Issues Found
- The Linux and Windows status-check examples omitted the `-m ec2` mode flag used in AWS's documented EC2 status commands. Added `-m ec2`.
- The sample status output treated `cwoc_status` as a required running field. Current AWS documentation and the upstream control script focus on `status`, `configstatus`, and `version`; changed the example and follow-up sentence to check only the relevant CloudWatch agent status fields.
- The IAM policy and agent configuration snippets were fenced as JSON but contained `//` comments, which makes them invalid JSON if pasted into IAM or an agent config file. Moved the explanation into surrounding prose and removed the comments from the JSON blocks.
- The region-source list overstated a generic precedence order, including `AWS_REGION`. Replaced it with the documented EC2 behavior: the agent uses the configured `agent.region` when set, otherwise the EC2 instance region, and a named profile in `common-config.toml` can specify a different region.
- The quick-reference command used `amazon-cloudwatch-agent-ctl -a get-config`, but the upstream control script does not support `get-config`. Replaced it with `sudo cat /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.toml`, matching AWS documentation that the generated TOML file can be useful for verifying JSON-to-TOML translation.

## Review Notes
- Verified that all JSON snippets in the post parse successfully with `jq` after correction.
- The post's VPC endpoint service names, default `CWAgent` namespace, managed policy ARN, common metric names, and `fetch-config` examples align with AWS documentation.
