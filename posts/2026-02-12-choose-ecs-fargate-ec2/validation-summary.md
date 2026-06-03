# Validation Summary: How to Choose Between ECS Fargate and EC2 Launch Type

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon EC2
- ECS capacity providers
- AWS CLI
- Container networking

## Sources Consulted
- AWS Fargate Pricing: https://aws.amazon.com/fargate/pricing/
- Amazon ECS task definition differences for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- Amazon ECS clusters for Fargate capacity providers: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html
- AWS CLI `ecs create-cluster` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-cluster.html
- AWS CLI `ecs create-capacity-provider` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-capacity-provider.html
- AWS CLI `ecs create-service` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI `ecs run-task` reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/run-task.html
- Amazon EC2 T3 instance type pricing and specs: https://aws.amazon.com/ec2/instance-types/t3/
- AWS Security Blog, security considerations for running containers on Amazon ECS: https://aws.amazon.com/blogs/security/security-considerations-for-running-containers-on-amazon-ecs/

## Issues Found
- The post said Fargate bills for resources a task "uses." AWS pricing is based on requested vCPU, memory, OS, architecture, and storage resources, so this was changed to "requests."
- The Fargate cost calculation for a 0.5 vCPU, 1 GB task running 24/7 was too high. Using AWS's Linux/x86 us-east-1 per-second prices, the monthly cost is about $18, not $29. The related 3-task table was updated from about $87 to about $54.
- The Fargate Spot table entry was based on the incorrect on-demand cost and did not reflect AWS's "up to 70% discount" description. It was changed to "as low as ~$16" for the 3-task example.
- The 3-year t3.large reserved estimate was adjusted from about $24/month to about $26/month to better match current AWS T3 listed effective hourly pricing.
- The post stated that Fargate maxes out at 4 vCPU and 30 GB memory and implied a 16 GB memory task required EC2. AWS now supports Fargate Linux tasks up to 16 vCPU and 120 GB memory, so the resource ceiling section was corrected.
- The ECS capacity provider CLI example included EC2 capacity provider names without noting that EC2 Auto Scaling group capacity providers must already exist. The example now states that the `ec2-gpu` capacity provider is pre-created.
- The Fargate `create-service` and `run-task` examples omitted the required `awsvpc` network configuration. The commands now include `--network-configuration` with placeholder subnet and security group IDs.

## Review Notes
Pricing varies by region, operating system, CPU architecture, Spot availability, public IPv4 usage, storage configuration, Savings Plans, and discounts. The post now frames the pricing examples as rough Linux/x86 us-east-1 estimates, but future updates should re-check AWS pricing before publication.
