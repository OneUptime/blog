# Validation Summary: How to Configure ALB Target Group Health Checks for gRPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Application Load Balancer
- AWS ELBv2 target groups and health checks
- AWS CLI
- gRPC and the gRPC health checking protocol
- Go gRPC health package
- Python grpcio health checking package
- Terraform AWS provider

## Sources Consulted
- AWS Elastic Load Balancing: Target groups for Application Load Balancers: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Elastic Load Balancing: Health checks for Application Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS CLI Command Reference: elbv2 create-target-group: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS News Blog: Application Load Balancer support for end-to-end HTTP/2 and gRPC: https://aws.amazon.com/blogs/aws/new-application-load-balancer-support-for-end-to-end-http-2-and-grpc/
- gRPC Health Checking Protocol: https://github.com/grpc/grpc/blob/master/doc/health-checking.md
- gRPC Go health package documentation: https://pkg.go.dev/google.golang.org/grpc/health
- gRPC Python health checking documentation: https://grpc.github.io/grpc/python/grpc_health_checking.html
- Terraform AWS Provider aws_lb_target_group resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group

## Issues Found
- Corrected the claim that ALB requires TLS for gRPC backends. AWS requires HTTPS listeners for gRPC ALB traffic, but target groups can use either HTTP or HTTPS with protocol version GRPC. The post now explains that the backend must match the target group protocol.
- Updated the Python example from `add_secure_port` to `add_insecure_port` so it matches the post's HTTP target group configuration. The text now notes that `add_secure_port` is appropriate when the target group protocol is HTTPS.
- Clarified that the gRPC health check response contains serving status, while the ALB matcher evaluates the RPC's gRPC status code.
- Corrected troubleshooting guidance that said ALB expects TLS-based HTTP/2 for all gRPC backends. The post now distinguishes plaintext gRPC over HTTP/2 for HTTP target groups from TLS-backed gRPC for HTTPS target groups.
- Reworked the custom health check path section. AWS documents gRPC health check paths as `/package.service/method`; ALB does not expose a CLI field for populating the standard `HealthCheckRequest.service` value, so the post no longer claims that the standard path checks a specific service by service-name parameter.

## Review Notes
The AWS CLI and Terraform snippets use valid fields for an ALB target group with `protocol_version = "GRPC"` and a gRPC matcher. AWS's default gRPC health check matcher is code `12` for an unimplemented method, but using code `0` is correct when the service implements `/grpc.health.v1.Health/Check` and returns OK.
