# Validation Summary: How to Set Up Multi-AZ Deployments for High Availability

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Availability Zones
- Amazon VPC and NAT Gateway
- AWS CDK v2
- Amazon EC2 Auto Scaling
- Elastic Load Balancing Application Load Balancers
- Amazon RDS for PostgreSQL Multi-AZ
- Amazon Aurora PostgreSQL
- Amazon ElastiCache for Redis OSS
- Amazon SQS and Amazon SNS
- Amazon MQ for RabbitMQ
- Amazon CloudWatch
- Node.js `pg` connection pooling

## Sources Consulted
- AWS Regions and Availability Zones documentation: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions-availability-zones.html
- Amazon VPC NAT Gateway basics: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- AWS CDK `Vpc` construct documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
- Amazon EC2 Auto Scaling Availability Zone distribution: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-availability-zone-balanced.html
- Elastic Load Balancing cross-zone load balancing documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
- AWS CDK `ApplicationLoadBalancerProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationLoadBalancerProps.html
- Amazon RDS Multi-AZ DB instance documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- Amazon Aurora high availability documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- AWS CDK `DatabaseClusterProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseClusterProps.html
- AWS CDK `CfnReplicationGroup` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticache.CfnReplicationGroup.html
- Amazon SQS FAQ on redundant storage: https://aws.amazon.com/sqs/faqs/
- Amazon SNS FAQ on message durability: https://aws.amazon.com/sns/faqs/
- Amazon MQ for RabbitMQ deployment options: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-broker-architecture.html
- AWS CloudFormation `AWS::AmazonMQ::Broker` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-amazonmq-broker.html
- Amazon MQ for RabbitMQ version management: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-version-management.html
- Application Load Balancer CloudWatch metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- node-postgres pooling documentation: https://node-postgres.com/apis/pool
- Referenced OneUptime monitoring post: https://oneuptime.com/blog/post/2026-02-12-build-logging-and-monitoring-stack-on-aws/view

## Issues Found
- The post described an Availability Zone as a separate data center. Updated this to AWS's definition of one or more discrete data centers.
- The VPC example used two NAT Gateways for a three-AZ VPC. Updated it to one NAT Gateway per AZ and corrected the explanation to match AWS NAT Gateway resiliency guidance.
- The Auto Scaling example used three desired instances, which would not leave enough capacity if one AZ failed. Updated the example and text to use enough capacity to tolerate losing the AZ with the most instances.
- The ALB listener used port 443 without a certificate and did not assign `listener.addTargets()` to the `targetGroup` variable used later. Changed the sample listener to port 80 and assigned the target group.
- The Aurora CDK example used deprecated `instances` and `instanceProps` properties. Updated it to the current `writer` and `readers` API.
- The ElastiCache Redis example combined `preferredCacheClusterAZs` with `replicasPerNodeGroup`/`numNodeGroups` in a way that does not match the documented `NumCacheClusters` requirement. Updated the sample to use `numCacheClusters: 3`.
- The Amazon MQ RabbitMQ example used the ActiveMQ-only active/standby Multi-AZ deployment mode. Updated it to the RabbitMQ `CLUSTER_MULTI_AZ` mode and refreshed the engine version from 3.11 to 3.13.
- The CloudWatch per-AZ alarm hard-coded an AZ name by appending `a` to the region token. Updated it to select an actual VPC availability zone and to use the defined target group.
- The text referred to RabbitMQ on Amazon MQ as self-managed. Updated it to managed message brokers.

## Review Notes
Local checks: `validation.json` was validated with `jq`, and the referenced OneUptime monitoring URL resolved to the intended article. Runtime validation with AWS CDK synthesis or a live AWS deployment was not performed in this workspace; the review relied on official AWS and CDK documentation plus static inspection of the snippets.
