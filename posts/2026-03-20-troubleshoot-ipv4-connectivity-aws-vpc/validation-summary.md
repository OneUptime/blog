# Validation Summary: How to Troubleshoot IPv4 Connectivity in AWS VPC

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- AWS VPC
- Amazon EC2
- AWS CLI
- Security groups
- Route tables
- Internet Gateway
- Network ACLs
- NAT Gateway
- VPC Flow Logs
- Amazon CloudWatch Logs Insights
- AWS Systems Manager Session Manager

## Sources Consulted
- AWS CLI Command Reference: describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: describe-security-groups - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-security-groups.html
- AWS CLI Command Reference: describe-route-tables - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS CLI Command Reference: describe-internet-gateways - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-internet-gateways.html
- AWS CLI Command Reference: describe-network-acls - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-acls.html
- AWS CLI Command Reference: describe-nat-gateways - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-nat-gateways.html
- AWS CLI Command Reference: create-flow-logs - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- AWS CLI Command Reference: start-session - https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html
- Amazon VPC User Guide: Security groups - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html
- Amazon VPC User Guide: Network ACLs - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- Amazon VPC User Guide: Internet gateways - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC User Guide: Route table options - https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- Amazon VPC User Guide: NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- Amazon VPC User Guide: Create a flow log that publishes to CloudWatch Logs - https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-cwl-create-flow-log.html
- Amazon VPC User Guide: Flow log records - https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- Amazon CloudWatch Logs User Guide: Supported logs and discovered fields - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html

## Issues Found
- The security group check only queried `IpPermissions` even though the surrounding text tells readers to verify both inbound and outbound rules. Updated the query to return both `IpPermissions` and `IpPermissionsEgress`.
- The route table lookup only handled explicit subnet route table associations. AWS documents that subnets without an explicit association use the VPC's main route table, and the subnet ID is not returned for implicit associations. Added a main-route-table fallback command and a short note.
- The NAT gateway check only validated that the gateway state was `available`. For internet-bound IPv4 traffic, AWS requires a public NAT gateway in a public subnet with a route to an Internet Gateway. Added that clarification.
- The VPC Flow Logs command targeted CloudWatch Logs but omitted `--deliver-logs-permission-arn`, which AWS CLI documentation marks as required for `cloud-watch-logs` destinations. Added an IAM role ARN placeholder to the command.

## Review Notes
The remaining AWS CLI commands and CloudWatch Logs Insights query are syntactically valid for current AWS CLI v2 documentation. The guide stays intentionally high level; future improvements could mention that Systems Manager sessions require the instance to be a managed node with the required IAM permissions and SSM Agent connectivity.
