# Validation Summary: How to Deploy Portainer with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS ECS Fargate
- Amazon EFS
- Application Load Balancer (ALB)
- Amazon Route 53
- Portainer Community Edition

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer CE initial setup: https://docs.portainer.io/start/install-ce/server/setup
- Portainer API initialization example: https://docs.portainer.io/admin/environments/add/api
- Amazon ECS: Pass Secrets Manager secrets through environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Amazon ECS: Specify an Amazon EFS file system in an Amazon ECS task definition: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html
- Amazon ECS: Optimize load balancer health check parameters for Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-healthcheck.html
- Elastic Load Balancing: Health checks for Application Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- Elastic Load Balancing: Target groups for your Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- Elastic Load Balancing: Security policies for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html

## Issues Found
- The introduction said the guide deployed Portainer Business Edition or Community Edition, but the task definition only deployed `portainer/portainer-ce:latest` and did not include Business Edition licensing. I corrected the text to state that the guide deploys Portainer Community Edition.
- The ECS EFS example put `access_point_id` directly inside `efs_volume_configuration`. I moved it into `authorization_config { access_point_id = ... }`, which matches the ECS EFS authorization model.
- The admin password bootstrap was not workable as written. ECS `secrets` inject environment variables, but Portainer `--admin-password-file` expects a file path, and the snippet stored plaintext while the comment said Portainer expected a bcrypt hash. I removed the broken secret-based bootstrap and replaced it with documented first-access/API initialization guidance.
- The container health check used an ad hoc `wget` probe against Portainer over HTTPS. I removed it so the example relies on the already-configured ALB target group health check, which ECS can use to determine service health.

## Review Notes
- The post still uses `portainer/portainer-ce:latest`. This is valid, but pinning `lts` or an explicit version would make future deployments more predictable.
- If the post is later expanded to cover Portainer Business Edition, it should switch to the `portainer/portainer-ee` image and document license setup explicitly.
