# Validation Summary: How to Create an ECS Service for Long-Running Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon ECS
- AWS Fargate
- AWS CLI
- Elastic Load Balancing / Application Load Balancer
- AWS Cloud Map service discovery
- Docker containers

## Sources Consulted
- AWS CLI `ecs create-service` command reference: https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/ecs/create-service.html
- Amazon ECS rolling deployment documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html
- AWS CLI `ecs update-service` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CLI `ecs delete-service` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecs/delete-service.html
- Amazon ECS service discovery documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html
- Amazon ECS service discovery creation guide: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-service-discovery.html
- Amazon ECS ELB health check grace period announcement: https://aws.amazon.com/about-aws/whats-new/2017/12/amazon-ecs-adds-elb-health-check-grace-period/

## Issues Found
- The post stated that `maximumPercent: 200` and `minimumHealthyPercent: 100` "ensures" zero-downtime deployments. AWS documents these settings as controlling task counts during rolling deployments, but availability still depends on successful health checks and sufficient capacity. Changed the wording to "helps support zero-downtime deployments" with those assumptions.
- The "Deployment Strategies" introduction described the content as different deployment controllers, but the circuit breaker is a deployment safety feature rather than a deployment controller. Adjusted the wording to describe rolling deployments and safety features.
- The load balancer health check grace period explanation implied that the ALB waits before marking a task unhealthy. AWS documents this as ECS ignoring ELB health checks for the grace period. Updated the explanation accordingly.
- The deployment monitoring section said the old deployment would be `PRIMARY`. In ECS service deployments, the new deployment is `PRIMARY` during rollout and the previous deployment remains alongside it until completion. Corrected the wording.

## Review Notes
The AWS CLI examples use valid current parameters for ECS service creation, rolling deployment configuration, deployment circuit breaker, load balancer registration, service registries, service updates, force deployments, scaling, and deletion. The Cloud Map service discovery example is valid as a simplified placeholder workflow, but in a real setup the namespace ID should be taken from the completed namespace creation operation before creating the Cloud Map service.
