# Validation Summary: How to Use Graviton Instances for Cost-Effective Compute

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Graviton processors
- Amazon EC2
- EC2 Image Builder
- Docker Buildx
- Amazon ECS and AWS Fargate
- AWS Lambda
- Amazon RDS
- Amazon ElastiCache
- Python and boto3
- AWS CLI

## Sources Consulted
- AWS Graviton and EC2 Graviton instance announcements: https://aws.amazon.com/about-aws/whats-new/2025/12/ec2-m9g-instances-graviton5-processors-preview/
- Amazon EC2 C7g instances: https://aws.amazon.com/ec2/instance-types/c7g/
- AWS CLI `ec2 describe-instances`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI `imagebuilder create-image-recipe`: https://docs.aws.amazon.com/cli/latest/reference/imagebuilder/create-image-recipe.html
- EC2 Image Builder image recipe documentation: https://docs.aws.amazon.com/imagebuilder/latest/userguide/create-image-recipes.html
- Amazon ECS ARM64 task definition documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-arm-specifying.html
- Amazon ECS runtime platform API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_RuntimePlatform.html
- AWS Lambda architecture documentation: https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html
- Amazon RDS modify DB instance documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.DBInstance.Modifying.html
- AWS CLI `elasticache modify-replication-group`: https://docs.aws.amazon.com/cli/latest/reference/elasticache/modify-replication-group.html

## Issues Found
- The introduction described Graviton3 as the latest generation. This is outdated as of June 1, 2026 because AWS has announced Graviton5 preview instances and Graviton4 instance families are generally available for several workloads. Updated the wording to describe Graviton3 performance relative to Graviton2 while noting newer Graviton4 and Graviton5-based families.
- The EC2 Image Builder example used `--version` with `aws imagebuilder create-image-recipe`. Current AWS CLI v2 uses `--semantic-version` for this command. Updated the command accordingly.

## Review Notes
- AWS CLI was not installed in the local environment, so CLI validation was performed against the current AWS CLI documentation.
- The pricing examples are region- and date-sensitive. The cited EC2 instance prices are plausible for common US East on-demand Linux pricing, but future readers should confirm current prices in their target AWS Region before using the exact dollar amounts for planning.
- RDS and ElastiCache Graviton migrations depend on engine, version, instance family, and Region availability. The commands are structurally correct, but production migrations should confirm valid target classes with AWS service-specific compatibility checks before scheduling changes.
