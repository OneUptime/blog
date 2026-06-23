# Validation Summary: How to Fix 'Registered Container Instance is Showing 0' in ECS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon ECS on EC2
- ECS container agent
- AWS IAM instance profiles
- Terraform AWS provider
- Amazon VPC networking
- NAT Gateway
- VPC endpoints / AWS PrivateLink
- Amazon ECR
- Auto Scaling groups
- ECS capacity providers

## Sources Consulted
- Amazon ECS container instance IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/instance_IAM_role.html
- Amazon ECS container agent configuration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html
- Bootstrapping Amazon ECS Linux container instances: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/bootstrap_container_instance.html
- Amazon ECS-optimized Linux AMIs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html
- Retrieving Amazon ECS-optimized AMI metadata: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html
- Amazon ECS interface VPC endpoints: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/vpc-endpoints.html
- Best practices for connecting Amazon ECS to AWS services from inside your VPC: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/networking-connecting-vpc.html
- Amazon ECR interface VPC endpoints: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- NAT gateways: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- VPC route table options: https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- Terraform AWS provider `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider `aws_ssm_parameter` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- Terraform AWS provider `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider `aws_ecs_capacity_provider`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_capacity_provider

## Issues Found
- The AMI lookup used an Amazon Linux 2 name filter while the text claimed to retrieve the latest ECS-optimized AMI. AWS currently recommends the ECS-optimized Amazon Linux 2023 AMI for most ECS EC2 workloads, and documents SSM public parameters for retrieving recommended AMI IDs. Changed the launch template to use `data.aws_ssm_parameter.ecs_optimized_ami.value` and added the `/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id` data source.
- The NAT Gateway example created public subnets and an Internet Gateway but did not add a public route table with a default route to the Internet Gateway. A public NAT Gateway must be in a subnet that can route internet-bound traffic to an Internet Gateway. Added a public route table and public subnet route table associations.
- The security group section said ECS instances need outbound internet access to reach ECS APIs. That is only true when using internet or NAT routing; with AWS PrivateLink, they need outbound HTTPS access to VPC endpoints instead. Updated the wording.
- The VPC endpoint section described endpoints as lower cost without qualification. Endpoint versus NAT cost depends on region, Availability Zone count, hourly charges, and data volume. Reworded the claim to focus on private connectivity and avoiding NAT for ECS/ECR traffic.
- The Auto Scaling group `AmazonECSManaged` tag used a boolean value. AWS tags are string key-value pairs, and Terraform ASG tag examples use string values. Changed it to `"true"`.

## Review Notes
The remaining examples are technically valid for the guide's scope, but production deployments may also need additional VPC endpoints such as CloudWatch Logs, Secrets Manager, SSM, or KMS depending on task logging, secret injection, debugging, and image encryption choices. The EC2 metadata troubleshooting command assumes IMDSv1 or IMDSv2 optional mode; instances configured with IMDSv2 required need a metadata token.
