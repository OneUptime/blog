# Validation Summary: How to Reduce NAT Gateway Data Transfer Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS NAT Gateway
- Amazon VPC
- VPC Flow Logs
- AWS PrivateLink and VPC endpoints
- Amazon ECR pull-through cache
- Amazon ECS
- Amazon CloudWatch alarms
- EC2 NAT instances on Amazon Linux 2023
- AWS CLI
- CloudFormation
- iptables

## Sources Consulted
- Amazon VPC pricing: https://aws.amazon.com/vpc/pricing/
- Pricing for NAT gateways: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- Gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS PrivateLink pricing: https://aws.amazon.com/privatelink/pricing/
- AWS CLI create-vpc-endpoint reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI create-flow-logs reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- Amazon ECR interface VPC endpoints: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- Amazon ECR pull-through cache rules: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-creating-rule.html
- Amazon ECR pull-through cache considerations: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache.html
- CodeArtifact VPC endpoints: https://docs.aws.amazon.com/codeartifact/latest/ug/vpc-endpoints.html
- NAT instances: https://docs.aws.amazon.com/vpc/latest/userguide/work-with-nat-instances.html
- AWS CLI modify-instance-attribute reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- NAT gateway CloudWatch metrics: https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html
- AWS CLI put-metric-alarm reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- NAT Gateway and interface endpoint prices were presented as universal AWS prices. Updated the text to scope the listed NAT Gateway rates to us-east-1 and many other regions, and clarified that interface endpoint hourly charges start at $0.01 per endpoint ENI.
- The VPC Flow Logs Insights query used `eni-nat-gateway-id`, which mixes a NAT gateway concept with the ENI ID field used by flow logs. Replaced it with an ENI-shaped placeholder.
- The interface endpoint examples omitted `--private-dns-enabled`, which is typically needed for existing clients to use standard AWS service hostnames through interface endpoints. Added the flag to the interface endpoint commands.
- The ECR endpoint explanation omitted the S3 gateway endpoint requirement for image layers. Added a sentence noting that ECR image pulls also require S3 access.
- The NAT instance setup omitted `iptables-services` persistence steps and used broad same-interface forwarding rules that do not match AWS's current NAT instance guidance. Updated the snippet to install and enable iptables services, persist IP forwarding through `/etc/sysctl.d`, add masquerading, and save iptables rules.
- The Docker Hub ECR pull-through cache command omitted `--credential-arn`, which AWS requires for Docker Hub pull-through cache rules. Added a Secrets Manager credential ARN placeholder.
- The ECR pull-through cache section did not mention AWS's documented first-pull caveat when using PrivateLink. Added a short note that the first pull may still need internet access to populate the cache.
- The CloudWatch alarm comment said the `BytesOutToDestination` alarm measured total NAT Gateway processing, but that metric only tracks bytes sent from the NAT gateway to destinations. Updated the comment to match the metric.

## Review Notes
The CloudFormation route snippet is partial and assumes resources such as `EIP`, `PublicSubnetA`, and private route tables are defined elsewhere. The AWS CLI was not installed in the local workspace, so command validation was performed against current AWS CLI documentation instead of local `--help`.
