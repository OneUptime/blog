# Validation Summary: How to Configure Health Checks for EC2 Behind a Load Balancer

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Elastic Load Balancing v2
- Application Load Balancer health checks
- Network Load Balancer health checks
- Amazon EC2 Auto Scaling health checks
- AWS CLI
- Terraform AWS provider
- Node.js / Express
- Python / Flask
- PostgreSQL via psycopg2
- Redis via redis-py

## Sources Consulted
- AWS Elastic Load Balancing: Health checks for Application Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS Elastic Load Balancing: Health checks for Network Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS CLI Command Reference: `elbv2 create-target-group`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CLI Command Reference: `elbv2 modify-target-group`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group.html
- AWS CLI Command Reference: `elbv2 describe-target-health`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/describe-target-health.html
- Amazon EC2 Auto Scaling: Set the health check grace period for an Auto Scaling group: https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-check-grace-period.html
- Terraform AWS provider: `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Express 4.x API Reference: https://expressjs.com/en/4x/api.html
- Node.js process API: https://nodejs.org/api/process.html
- Flask Quickstart and response handling: https://flask.palletsprojects.com/en/stable/quickstart/
- Psycopg 2 basic module usage: https://www.psycopg.org/docs/usage
- redis-py connection documentation: https://redis.readthedocs.io/en/stable/connections.html

## Issues Found
- The health check defaults table listed NLB health check path and matcher as `N/A`. This is only true for TCP health checks. NLB HTTP/HTTPS health checks use `/` as the default path and `200-399` as the default matcher, so the table now distinguishes TCP from HTTP/HTTPS defaults.
- The NLB timeout default was listed as only `10` seconds. AWS documents `10` seconds for TCP/HTTPS health checks and `6` seconds for HTTP health checks, so the table now reflects both cases.
- The Node.js readiness example initialized `isReady` to `false` and never set it to `true`, which meant the endpoint would always return `503` even if dependency checks passed. The snippet now starts ready and flips readiness to `false` on `SIGTERM`.
- The post presented failure detection time as an exact `interval * unhealthy_threshold` formula. AWS health check timing depends on where the failure occurs in the interval and whether a timeout must elapse, so the text now describes this as a rule of thumb and labels the examples as approximate.

## Review Notes
- The AWS CLI and Terraform examples match current documented option names and resource fields. Local `aws` and `terraform` binaries were not installed, so command validation was performed against official documentation.
- The JavaScript and Python examples are syntactically valid. They assume application-specific database, Redis, and disk-usage helpers or settings are defined elsewhere.
