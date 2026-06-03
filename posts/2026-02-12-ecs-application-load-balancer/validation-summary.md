# Validation Summary: How to Set Up ECS with Application Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Amazon EC2 launch type for ECS
- Application Load Balancer
- Elastic Load Balancing target groups, listeners, listener rules, health checks, sticky sessions, and deregistration delay
- AWS CLI
- Amazon EC2 security groups
- AWS Certificate Manager
- Amazon CloudWatch alarms and ApplicationELB metrics

## Sources Consulted
- Amazon ECS Developer Guide: Use an Application Load Balancer for Amazon ECS - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html
- Amazon ECS API Reference: LoadBalancer - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LoadBalancer.html
- AWS CLI Command Reference: ecs create-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI Command Reference: elbv2 create-target-group - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI Command Reference: elbv2 create-listener - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-listener.html
- AWS CLI Command Reference: elbv2 create-rule - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-rule.html
- AWS CLI Command Reference: ec2 authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Elastic Load Balancing documentation: Target groups for your Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- Elastic Load Balancing documentation: Edit target group attributes for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- Elastic Load Balancing documentation: CloudWatch metrics for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Elastic Load Balancing documentation: Security policies for your Application Load Balancer - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS Certificate Manager documentation: Request a public certificate - https://docs.aws.amazon.com/acm/latest/userguide/acm-public-certificates.html

## Issues Found
- The ECS/ALB overview said EC2 launch type services register "instance IPs with dynamic ports." For `instance` target groups, ECS registers the container instance with the relevant host port. Updated the wording to "container instances with dynamic host ports."
- Several AWS ARN, account ID, subnet, and security group examples used placeholder values that did not match AWS identifier formats. Replaced them with realistic 12-digit account IDs, ARN suffixes, subnet IDs, and security group IDs so the command examples match AWS CLI/API expectations while still remaining examples.
- The ACM sentence said the SSL certificate is free for ALB use without distinguishing certificate type. Updated it to say public ACM certificates are free for ALB use.

## Review Notes
The core ECS, ALB, target group, listener, routing rule, sticky session, deregistration delay, and CloudWatch metric concepts are technically sound. AWS recommends monitoring non-zero `UnHealthyHostCount` with the `Minimum` statistic for cases where every load balancer node sees unhealthy targets; the post's `Maximum` alarm can still be useful as an earlier, more sensitive alarm.
