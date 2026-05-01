# Validation Summary: How to Deploy ECS with an Application Load Balancer Using OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Amazon ECS
- AWS Fargate
- Application Load Balancer (ALB)
- AWS Certificate Manager (ACM)
- Amazon ECR
- Amazon CloudWatch Logs
- AWS IAM
- Amazon VPC and subnets

## Sources Consulted
- Amazon ECS: Use an Application Load Balancer for Amazon ECS - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html
- Amazon ECS: Use load balancing to distribute Amazon ECS service traffic - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html
- Amazon ECS: Amazon ECS task networking options for Fargate - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html
- Amazon ECS: Best practices for connecting Amazon ECS to AWS services from inside your VPC - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/networking-connecting-vpc.html
- Amazon ECS: Amazon ECS task execution IAM role - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECS: Troubleshoot Amazon ECS task definition invalid CPU or memory errors - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html
- Amazon ECS: Send Amazon ECS logs to CloudWatch - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html
- Amazon ECR: Amazon ECR interface VPC endpoints (AWS PrivateLink) - https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- Elastic Load Balancing: Security policies for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- Elastic Load Balancing: SSL certificates for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/https-listener-certificates.html
- Terraform Registry: `aws_subnets` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- Terraform Registry: `aws_acm_certificate` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate.html
- Terraform Registry: `aws_iam_role` data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_role

## Issues Found
- The post referenced `data.aws_acm_certificate.main.arn` without defining the ACM certificate data source. I added a valid `aws_acm_certificate` lookup so the HTTPS listener snippet is internally consistent.
- The subnet lookups filtered only on the `Tier` tag. I added a `vpc-id` filter to both `aws_subnets` data sources so the ALB and ECS service cannot accidentally select subnets from a different VPC.
- The ECS task definition referenced undefined IAM and ECR resources. I replaced those references with valid data sources for the task execution role and ECR repository, and removed the unnecessary `task_role_arn` because no application-level AWS permissions were shown or required in the example.
- The logging configuration hard-coded `awslogs-region = "us-east-1"` and referenced a log group that was never created. I switched the log region to `data.aws_region.current.name` and added an `aws_cloudwatch_log_group` resource so the task definition matches AWS logging requirements.
- The health check explanation said unhealthy tasks would “drain and restart.” I corrected this to the AWS-documented behavior: tasks that fail the load balancer health check are stopped and replaced.
- The private subnet best-practice note implied no additional outbound path was needed. I corrected it to note that private-subnet Fargate tasks still need outbound access through a NAT gateway or the required VPC endpoints for services such as ECR and CloudWatch Logs.
- The ACM certificate best-practice note did not mention regional scope. I clarified that the certificate used by the ALB must be in the same AWS Region as the load balancer.

## Review Notes
- The post is now technically sound, but it still assumes several existing dependencies: a tagged VPC, tagged public/private subnets, an issued ACM certificate, an ECR repository named `app`, and the `ecsTaskExecutionRole` IAM role.
- The selected TLS policy `ELBSecurityPolicy-TLS13-1-2-2021-06` is valid as of May 1, 2026. AWS currently recommends newer post-quantum-capable policies for new deployments, but the policy used in the post is not deprecated.
